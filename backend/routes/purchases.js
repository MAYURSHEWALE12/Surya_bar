import express from "express"
import Purchase from "../models/Purchase.js"
import Vendor from "../models/Vendor.js"
import Product from "../models/Product.js"
import { authenticate, authorize } from "../middleware/auth.js"

const router = express.Router()

// @route   GET /api/purchases
// @desc    Get all purchases
// @access  Private (Admin + Cashier)
router.get("/", authenticate, authorize("ADMIN", "CASHIER"), async (req, res) => {
  try {
    const purchases = await Purchase.find({})
      .populate("vendor", "name")
      .populate("items.product", "name barcode")
      .sort({ createdAt: -1 })
    res.json(purchases)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/purchases/:id
// @desc    Get purchase by ID
// @access  Private (Admin + Cashier)
router.get("/:id", authenticate, authorize("ADMIN", "CASHIER"), async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate("vendor", "name")
      .populate("items.product", "name barcode")
    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" })
    }
    res.json(purchase)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/purchases
// @desc    Create purchase
// @access  Admin only
router.post("/", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const {
      vendorId,
      invoiceNumber,
      items,
    } = req.body

    // Find vendor
    const vendor = await Vendor.findById(vendorId)
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" })
    }

    // Calculate totals
    let subtotal = 0
    const processedItems = []

    for (const item of items) {
      const product = await Product.findById(item.product)
      if (!product) {
        return res.status(404).json({ message: `Product ${item.product} not found` })
      }

      // Determine price based on stock type
      let purchasePrice
      if (item.stockType === "TP") {
        purchasePrice = product.tp.purchasePrice
      } else {
        purchasePrice = product.nonTp.purchasePrice
      }

      const total = purchasePrice * item.quantity - (item.discount || 0)
      subtotal += total

      processedItems.push({
        product: item.product,
        stockType: item.stockType,
        quantity: item.quantity,
        purchasePrice,
        discount: item.discount || 0,
        tax: item.tax || 0,
        total,
      })
    }

    const tax = subtotal * 0.18 // Assuming 18% GST
    const grandTotal = subtotal + tax

    const purchase = await Purchase.create({
      vendor: vendorId,
      invoiceNumber,
      items: processedItems,
      subtotal,
      discount: 0,
      tax,
      grandTotal,
      status: "DRAFT",
      createdBy: req.user.id,
    })

    res.status(201).json(purchase)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// @route   PUT /api/purchases/:id
// @desc    Update purchase
// @access  Admin only
router.put("/:id", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const purchase = await Purchase.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })

    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" })
    }

    res.json(purchase)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/purchases/:id/receive
// @desc    Receive purchase (update inventory)
// @access  Admin only
router.post("/:id/receive", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate("items.product")
      .populate("items.product", "tp nonTp")

    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" })
    }

    if (purchase.status === "RECEIVED" || purchase.status === "COMPLETED") {
      return res.status(400).json({ message: "Purchase already received" })
    }

    // Update inventory for each item
    for (const item of purchase.items) {
      const stockType = item.stockType
      let inventory = await Inventory.findOne({ product: item.product._id, stockType })

      if (!inventory) {
        // Create new inventory record
        inventory = new Inventory({
          product: item.product._id,
          stockType,
          quantity: 0,
          purchasePrice: stockType === "TP" ? item.purchasePrice : 0,
          sellingPrice: stockType === "TP" ? item.sellingPrice : 0,
        })
      }

      // Increase stock
      const previousStock = inventory.quantity
      inventory.quantity += item.quantity
      const newStock = inventory.quantity

      await inventory.save()

      // Create stock movement
      await StockMovement.create({
        product: item.product._id,
        stockType,
        movementType: "PURCHASE",
        quantity: item.quantity,
        previousStock,
        newStock,
        referenceType: "PURCHASE",
        referenceId: purchase._id,
        reason: "Purchase received",
        createdBy: req.user.id,
      })

      // Create audit log
      await mongoose.model("AuditLog").create({
        user: req.user.id,
        action: "Purchase Received",
        module: "Purchases",
        entity: "Inventory",
        entityId: inventory._id,
        oldValue: previousStock,
        newValue: newStock,
      })
    }

    // Update purchase status
    purchase.status = "RECEIVED"
    purchase.receivedAt = Date.now()
    await purchase.save()

    res.json({
      purchase,
      message: "Purchase received and inventory updated",
    })
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/vendors/:id/payment
// @desc    Record vendor payment
// @access  Admin only
router.post("/vendors/:id/payment", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const { vendorId } = req.params
    const { amount, paymentMethod, notes } = req.body

    const vendor = await Vendor.findById(vendorId)
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" })
    }

    // Update vendor balance
    vendor.currentBalance = Math.max(0, vendor.currentBalance - amount)
    await vendor.save()

    // Record payment
    const payment = await mongoose.model("VendorPayment").create({
      vendor: vendorId,
      amount,
      method: paymentMethod,
      notes,
      recordedBy: req.user.id,
    })

    res.json({
      vendor,
      payment,
      message: "Payment recorded successfully",
    })
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

export default router