import express from "express"
import Sale from "../models/Sale.js"
import SaleReturn from "../models/SaleReturn.js"
import Inventory from "../models/Inventory.js"
import StockMovement from "../models/StockMovement.js"
import Product from "../models/Product.js"
import { authenticate, authorize } from "../middleware/auth.js"

const router = express.Router()

// @route   GET /api/sales
// @desc    Get all sales
// @access  Private (Admin + Cashier)
router.get("/", authenticate, authorize("ADMIN", "CASHIER"), async (req, res) => {
  try {
    const sales = await Sale.find({})
      .populate("cashier", "name")
      .populate("items.product", "name barcode")
      .sort({ createdAt: -1 })
    res.json(sales)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/sales/:id
// @desc    Get sale by ID
// @access  Private (Admin + Cashier)
router.get("/:id", authenticate, authorize("ADMIN", "CASHIER"), async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate("cashier", "name")
      .populate("items.product", "name barcode")
    if (!sale) {
      return res.status(404).json({ message: "Sale not found" })
    }
    res.json(sale)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/sales
// @desc    Create sale (with inventory update)
// @access  Admin + Cashier
router.post("/", authenticate, authorize("ADMIN", "CASHIER"), async (req, res) => {
  try {
    const { items, paymentMethod } = req.body

    // Calculate totals
    let subtotal = 0

    const processedItems = []

    for (const item of items) {
      const product = await Product.findById(item.product)
      if (!product) {
        return res.status(404).json({ message: `Product ${item.product} not found` })
      }

      // Determine price based on stock type
      let unitPrice
      if (item.stockType === "TP") {
        unitPrice = product.tp.sellingPrice
      } else {
        unitPrice = product.nonTp.sellingPrice
      }

      const total = unitPrice * item.quantity
      subtotal += total

      processedItems.push({
        product: item.product,
        productName: product.name,
        stockType: item.stockType,
        quantity: item.quantity,
        unitPrice,
        discount: item.discount || 0,
        tax: item.tax || 0,
        total,
      })

      // Update inventory - decrease stock
      let inventory = await Inventory.findOne({ product: item.product._id, stockType: item.stockType })

      if (!inventory) {
        return res.status(400).json({ message: `No inventory for product ${item.product} with stock type ${item.stockType}` })
      }

      if (inventory.quantity < item.quantity) {
        // Check if negative stock is allowed
        const allowNeg = process.env.ALLOW_NEGATIVE_STOCK === "true"
        if (!allowNeg) {
          return res.status(400).json({ message: `Insufficient TP stock. Current: ${inventory.quantity}, Requested: ${item.quantity}` })
        }
      }

      const previousStock = inventory.quantity
      inventory.quantity -= item.quantity
      const newStock = inventory.quantity

      await inventory.save()

      // Create stock movement
      await StockMovement.create({
        product: item.product._id,
        stockType: item.stockType,
        movementType: "SALE",
        quantity: item.quantity,
        previousStock,
        newStock,
        referenceType: "SALE",
        referenceId: sale._id || null,
        reason: "Sale completed",
        createdBy: req.user.id,
      })

      // Create audit log
      await mongoose.model("AuditLog").create({
        user: req.user.id,
        action: "Sale Completed",
        module: "Sales",
        entity: "Inventory",
        entityId: inventory._id,
        oldValue: previousStock,
        newValue: newStock,
      })
    }

    const tax = subtotal * 0.18 // Assuming 18% GST
    const grandTotal = subtotal + tax

    // Create sale
    const sale = await Sale.create({
      invoiceNumber: `SURYA-${Date.now()}`,
      cashier: req.user.id,
      items: processedItems,
      subtotal,
      discount: 0,
      tax,
      grandTotal,
      paymentMethod,
      status: "ACTIVE",
    })

    res.status(201).json(sale)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/sales/:id/void
// @desc    Void a sale
// @access  Admin only
router.post("/:id/void", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
    if (!sale) {
      return res.status(404).json({ message: "Sale not found" })
    }
    if (sale.status === "VOIDED") {
      return res.status(400).json({ message: "Sale already voided" })
    }

    // Reverse stock movement
    for (const item of sale.items) {
      let inventory = await Inventory.findOne({ product: item.product._id, stockType: item.stockType })

      if (inventory) {
        const previousStock = inventory.quantity
        inventory.quantity += item.quantity
        const newStock = inventory.quantity

        await inventory.save()

        // Create stock movement (reversal)
        await StockMovement.create({
          product: item.product._id,
          stockType: item.stockType,
          movementType: "VOID_REVERSAL",
          quantity: item.quantity,
          previousStock: previousStock + item.quantity, // Will be newStock after reversal
          newStock: previousStock, // Restore to original
          referenceType: "VOID",
          referenceId: sale._id,
          reason: "Sale voided",
          createdBy: req.user.id,
        })

        // Create audit log
        await mongoose.model("AuditLog").create({
          user: req.user.id,
          action: "Sale Voided",
          module: "Sales",
          entity: "Inventory",
          entityId: inventory._id,
          oldValue: previousStock,
          newValue: newStock,
        })
      }
    }

    // Update sale status
    sale.status = "VOIDED"
    await sale.save()

    res.json({
      sale,
      message: "Sale voided successfully",
    })
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/sales/:id/return
// @desc    Process sale return
// @access  Admin + Cashier (if enabled)
router.post("/:id/return", authenticate, authorize("ADMIN", "CASHIER"), async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
    if (!sale) {
      return res.status(404).json({ message: "Sale not found" })
    }
    if (sale.status === "VOIDED") {
      return res.status(400).json({ message: "Cannot return voided sale" })
    }

    // Create return
    const saleReturn = await SaleReturn.create({
      sale: sale._id,
      items: sale.items.map((item) => ({
        product: item.product,
        stockType: item.stockType,
        quantity: item.quantity,
        reason: "Customer return",
      })),
      subtotal: sale.subtotal,
      refundAmount: sale.grandTotal,
      status: "PENDING",
    })

    // Update inventory - increase stock for the original stock type
    for (const item of sale.items) {
      let inventory = await Inventory.findOne({ product: item.product._id, stockType: item.stockType })

      if (!inventory) {
        // Create new inventory record if not exists
        const product = await Product.findById(item.product)
        inventory = new Inventory({
          product: item.product._id,
          stockType: item.stockType,
          quantity: 0,
          purchasePrice: item.stockType === "TP" ? product.tp.purchasePrice : product.nonTp.purchasePrice,
          sellingPrice: item.stockType === "TP" ? product.tp.sellingPrice : product.nonTp.sellingPrice,
        })
      }

      const previousStock = inventory.quantity
      inventory.quantity += item.quantity
      const newStock = inventory.quantity

      await inventory.save()

      // Create stock movement
      await StockMovement.create({
        product: item.product._id,
        stockType: item.stockType,
        movementType: "SALE_RETURN",
        quantity: item.quantity,
        previousStock,
        newStock,
        referenceType: "SALE_RETURN",
        referenceId: saleReturn._id,
        reason: "Sale return",
        createdBy: req.user.id,
      })

      // Create audit log
      await mongoose.model("AuditLog").create({
        user: req.user.id,
        action: "Sale Return",
        module: "Sales",
        entity: "Inventory",
        entityId: inventory._id,
        oldValue: previousStock,
        newValue: newStock,
      })
    }

    res.json({
      saleReturn,
      message: "Sale return processed successfully",
    })
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

export default router