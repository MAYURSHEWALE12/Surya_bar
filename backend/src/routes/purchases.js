const mongoose = require("mongoose")
const express = require("express")
const Purchase = require("../models/Purchase.js")
const Vendor = require("../models/Vendor.js")
const Product = require("../models/Product.js")
const Inventory = require("../models/Inventory.js")
const StockMovement = require("../models/StockMovement.js")
const { authenticate, authorize } = require("../middleware/auth.js")

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
// @desc    Create purchase & optionally receive into inventory
// @access  Admin only
router.post("/", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const {
      vendorId,
      vendor: vendorField,
      invoiceNumber,
      items,
      paymentMethod,
      paymentStatus,
      notes,
      directReceive = true,
    } = req.body

    const effectiveVendorId = vendorId || vendorField
    let vendor = null
    if (effectiveVendorId) {
      vendor = await Vendor.findById(effectiveVendorId)
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Purchase must include at least one item" })
    }

    let subtotal = 0
    const processedItems = []

    for (const item of items) {
      const productId = item.product?._id || item.product
      const product = await Product.findById(productId)
      if (!product) {
        return res.status(404).json({ message: `Product ${productId} not found` })
      }

      const stockType = item.stockType === "TP" ? "TP" : "NON_TP"
      const quantity = Number(item.quantity) || 1
      const purchasePrice =
        item.purchasePrice !== undefined && item.purchasePrice !== ""
          ? Number(item.purchasePrice)
          : stockType === "TP"
          ? product.tp?.purchasePrice || 0
          : product.nonTp?.purchasePrice || 0

      const total = purchasePrice * quantity - (Number(item.discount) || 0)
      subtotal += total

      processedItems.push({
        product: product._id,
        productName: product.name,
        stockType,
        quantity,
        purchasePrice,
        discount: Number(item.discount) || 0,
        tax: Number(item.tax) || 0,
        total,
      })
    }

    const tax = req.body.tax !== undefined ? Number(req.body.tax) : subtotal * 0.18
    const grandTotal = subtotal + tax

    const purchase = await Purchase.create({
      vendor: effectiveVendorId || null,
      invoiceNumber: invoiceNumber || `PUR-${Date.now().toString().slice(-6)}`,
      items: processedItems,
      subtotal,
      discount: Number(req.body.discount) || 0,
      tax,
      grandTotal,
      status: directReceive ? "RECEIVED" : "DRAFT",
      paymentStatus: paymentStatus || "PAID",
      paymentMethod: paymentMethod || "CASH",
      notes: notes || "",
      createdBy: req.user.id || req.user._id,
    })

    // If directReceive is enabled, immediately increment Inventory
    if (directReceive) {
      for (const item of processedItems) {
        let inventory = await Inventory.findOne({
          product: item.product,
          stockType: item.stockType,
        })

        if (!inventory) {
          inventory = new Inventory({
            product: item.product,
            stockType: item.stockType,
            quantity: 0,
            purchasePrice: item.purchasePrice,
            sellingPrice: item.purchasePrice * 1.25,
            minimumStock: 10,
          })
        }

        const previousStock = inventory.quantity
        inventory.quantity += item.quantity
        inventory.purchasePrice = item.purchasePrice
        const newStock = inventory.quantity
        await inventory.save()

        await StockMovement.create({
          product: item.product,
          stockType: item.stockType,
          movementType: "PURCHASE",
          quantity: item.quantity,
          previousStock,
          newStock,
          referenceType: "PURCHASE",
          referenceId: purchase._id,
          reason: `Inward Purchase #${purchase.invoiceNumber}`,
          createdBy: req.user.id || req.user._id,
        })
      }
    }

    res.status(201).json(purchase)
  } catch (error) {
    console.error("Purchase creation error:", error)
    res.status(500).json({ message: "Server error: " + error.message })
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

module.exports = router