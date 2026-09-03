const express = require("express")
const Inventory = require("../models/Inventory.js")
const StockMovement = require("../models/StockMovement.js")
const Product = require("../models/Product.js")
const { authenticate, authorize } = require("../middleware/auth.js")

const router = express.Router()

// @route   GET /api/inventory
// @desc    Get all inventory items
// @access  Private (Admin + Cashier)
router.get("/", authenticate, authorize("ADMIN", "CASHIER"), async (req, res) => {
  try {
    const inventory = await Inventory.find({})
      .populate({
        path: "product",
        select: "name size active brand category",
        populate: [{ path: "brand", select: "name" }, { path: "category", select: "name" }],
      })
      .sort({ createdAt: -1 })
    res.json(inventory)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   GET /api/inventory/:productId
// @desc    Get inventory for a specific product
// @access  Private (Admin + Cashier)
router.get("/:productId", authenticate, authorize("ADMIN", "CASHIER"), async (req, res) => {
  try {
    const inventory = await Inventory.find({ product: req.params.productId }).populate("product")
    if (!inventory) {
      return res.status(404).json({ message: "Inventory not found" })
    }
    res.json(inventory)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   GET /api/inventory/movements
// @desc    Get stock movements
// @access  Private (Admin only)
router.get("/movements", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const movements = await StockMovement.find({})
      .populate("product", "name size")
      .sort({ createdAt: -1 })
    res.json(movements)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// @route   POST /api/inventory/adjust
// @desc    Adjust or set stock count
// @access  Admin only
router.post("/adjust", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const { productId, stockType, adjustmentQuantity, newQuantity, reason } = req.body

    if (!productId || !stockType) {
      return res.status(400).json({ message: "Product ID and stock type are required" })
    }

    const normalizedStockType = stockType === "TP" ? "TP" : "NON_TP"

    // Find or create inventory record
    let inventory = await Inventory.findOne({ product: productId, stockType: normalizedStockType })

    if (!inventory) {
      const product = await Product.findById(productId)
      if (!product) {
        return res.status(404).json({ message: "Product not found" })
      }

      inventory = new Inventory({
        product: productId,
        stockType: normalizedStockType,
        quantity: 0,
        minimumStock: product.tp?.minStock || 0,
        purchasePrice: normalizedStockType === "TP" ? product.tp?.purchasePrice || 0 : product.nonTp?.purchasePrice || 0,
        sellingPrice: normalizedStockType === "TP" ? product.tp?.sellingPrice || 0 : product.nonTp?.sellingPrice || 0,
      })
    }

    const previousStock = inventory.quantity

    if (newQuantity !== undefined && newQuantity !== null && !isNaN(Number(newQuantity))) {
      inventory.quantity = Math.max(0, Number(newQuantity))
    } else if (adjustmentQuantity !== undefined && !isNaN(Number(adjustmentQuantity))) {
      inventory.quantity = Math.max(0, inventory.quantity + Number(adjustmentQuantity))
    } else {
      return res.status(400).json({ message: "Provide newQuantity or adjustmentQuantity" })
    }

    const newStock = inventory.quantity
    await inventory.save()

    // Create stock movement
    const movement = await StockMovement.create({
      product: productId,
      stockType: normalizedStockType,
      movementType: "ADJUSTMENT",
      quantity: newStock - previousStock,
      previousStock,
      newStock,
      referenceType: "ADJUSTMENT",
      referenceId: inventory._id,
      reason: reason || "Manual stock adjustment",
      createdBy: req.user.id || req.user._id,
    })

    // Create audit log safely
    try {
      await require("../models/AuditLog").create({
        user: req.user.id || req.user._id,
        action: "Inventory Adjusted",
        module: "Inventory",
        entity: "Inventory",
        entityId: inventory._id,
        oldValue: previousStock,
        newValue: newStock,
      })
    } catch (auditErr) {
      console.warn("Audit log creation skipped:", auditErr.message)
    }

    res.json({
      inventory,
      movement,
      message: `Stock updated to ${newStock} units successfully`,
    })
  } catch (error) {
    res.status(500).json({ message: "Server error: " + error.message })
  }
})

module.exports = router