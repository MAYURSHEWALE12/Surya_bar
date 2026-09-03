const mongoose = require("mongoose")
const express = require("express")
const Sale = require("../models/Sale.js")
const SaleReturn = require("../models/SaleReturn.js")
const Inventory = require("../models/Inventory.js")
const StockMovement = require("../models/StockMovement.js")
const Product = require("../models/Product.js")
const Customer = require("../models/Customer.js")
const CreditTransaction = require("../models/CreditTransaction.js")
const { authenticate, authorize } = require("../middleware/auth.js")

const router = express.Router()

// @route   GET /api/sales
// @desc    Get all sales
// @access  Private (Admin + Cashier)
router.get("/", authenticate, authorize("ADMIN", "CASHIER"), async (req, res) => {
  try {
    const sales = await Sale.find({})
      .populate("cashier", "name")
      .populate("customer", "name phone currentBalance")
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
    const { items, paymentMethod, discount, discountType, discountValue, tax } = req.body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items provided for sale" })
    }

    let subtotal = 0
    const processedItems = []

    // Validate stock and prepare processed items
    for (const item of items) {
      const productId = item.product?._id || item.product
      const product = await Product.findById(productId)
      if (!product) {
        return res.status(404).json({ message: `Product not found: ${productId}` })
      }

      const normalizedStockType = item.stockType === "TP" ? "TP" : "NON_TP"
      const quantity = Number(item.quantity) || 1

      // Check current inventory
      const inventory = await Inventory.findOne({
        product: product._id,
        stockType: normalizedStockType,
      })

      const availableStock = inventory ? inventory.quantity : 0
      if (quantity > availableStock) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name} (${normalizedStockType}). In Stock: ${availableStock}, Requested: ${quantity}`,
        })
      }

      let unitPrice = 0
      if (normalizedStockType === "TP") {
        unitPrice = product.tp?.sellingPrice || 0
      } else {
        unitPrice = product.nonTp?.sellingPrice || 0
      }

      const total = unitPrice * quantity
      subtotal += total

      processedItems.push({
        product: product._id,
        productName: product.name,
        stockType: normalizedStockType,
        quantity,
        unitPrice,
        discount: Number(item.discount) || 0,
        tax: Number(item.tax) || 0,
        total,
      })
    }

    const isCredit = paymentMethod === "BORROW" || paymentMethod === "CREDIT"
    const validPaymentMethod = isCredit
      ? "BORROW"
      : ["CASH", "UPI", "CARD"].includes(paymentMethod)
      ? paymentMethod
      : "CASH"
    const paymentStatus = isCredit ? "UNPAID" : "PAID"

    // If Credit sale, resolve or create customer
    let customerObj = null
    let customerName = req.body.customerName || ""
    let customerPhone = req.body.customerPhone || ""

    if (isCredit) {
      if (req.body.customerId || req.body.customer) {
        const cId = req.body.customerId || req.body.customer
        customerObj = await Customer.findById(cId)
      } else if (customerPhone && customerPhone.toString().trim()) {
        const cleanPhone = customerPhone.toString().trim().replace(/\D/g, "")
        if (cleanPhone.length !== 10) {
          return res.status(400).json({ message: `Mobile number must be exactly 10 digits (received ${cleanPhone.length} digits)` })
        }
        customerObj = await Customer.findOne({ phone: cleanPhone })
        if (!customerObj) {
          customerObj = await Customer.create({
            name: customerName.trim() || "Borrow Customer",
            phone: cleanPhone,
          })
        }
      }

      if (customerObj) {
        customerName = customerObj.name
        customerPhone = customerObj.phone
      }
    }

    // Calculate discount amount and grand total
    const numDiscount = Math.max(0, Number(discount) || 0)
    const numTax = Math.max(0, Number(tax) || 0)
    const grandTotal = Math.max(0, Math.round((subtotal - numDiscount + numTax) * 100) / 100)

    // Create sale record
    const sale = await Sale.create({
      invoiceNumber: `SURYA-${Date.now().toString().slice(-6)}`,
      cashier: req.user.id || req.user._id,
      items: processedItems,
      subtotal,
      discount: numDiscount,
      discountType: discountType === "PERCENT" ? "PERCENT" : "FLAT",
      discountValue: Number(discountValue) || (discountType === "PERCENT" && subtotal > 0 ? Math.round((numDiscount / subtotal) * 10000) / 100 : numDiscount),
      tax: numTax,
      grandTotal,
      paymentMethod: validPaymentMethod,
      paymentStatus,
      customer: customerObj ? customerObj._id : undefined,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      status: "ACTIVE",
    })

    // If credit sale, update customer balance & record debit transaction
    if (isCredit && customerObj) {
      const newBal = (customerObj.currentBalance || 0) + grandTotal
      customerObj.currentBalance = newBal
      customerObj.totalPurchased = (customerObj.totalPurchased || 0) + grandTotal
      await customerObj.save()

      await CreditTransaction.create({
        customer: customerObj._id,
        type: "DEBIT_SALE",
        amount: grandTotal,
        balanceAfter: newBal,
        sale: sale._id,
        invoiceNumber: sale.invoiceNumber,
        notes: `Counter bill ${sale.invoiceNumber} taken on credit`,
        recordedBy: req.user.id || req.user._id,
      })
    }

    // Deduct stock from inventory and record stock movements
    for (const item of processedItems) {
      try {
        let inventory = await Inventory.findOne({
          product: item.product,
          stockType: item.stockType,
        })

        if (!inventory) {
          inventory = await Inventory.create({
            product: item.product,
            stockType: item.stockType,
            quantity: 0,
            minimumStock: 0,
            sellingPrice: item.unitPrice,
          })
        }

        const previousStock = inventory.quantity
        inventory.quantity = Math.max(0, inventory.quantity - item.quantity)
        const newStock = inventory.quantity
        await inventory.save()

        await StockMovement.create({
          product: item.product,
          stockType: item.stockType,
          movementType: "SALE",
          quantity: -item.quantity,
          previousStock,
          newStock,
          referenceType: "SALE",
          referenceId: sale._id,
          reason: `POS Sale #${sale.invoiceNumber}`,
          createdBy: req.user.id || req.user._id,
        })
      } catch (invErr) {
        console.error("Inventory deduction error for item:", item.productName, invErr.message)
      }
    }

    res.status(201).json(sale)
  } catch (error) {
    console.error("Sale error:", error)
    res.status(500).json({ message: "Server error: " + error.message })
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

module.exports = router