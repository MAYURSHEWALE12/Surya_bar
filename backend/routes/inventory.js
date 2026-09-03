import express from "express"
import mongoose from "mongoose"
import Inventory from "../models/Inventory.js"
import StockMovement from "../models/StockMovement.js"
import Product from "../models/Product.js"
import { STOCK_TYPES } from "../constants/index.js"
import { authenticate, authorize } from "../middleware/auth.js"

const router = express.Router()

// @route   GET /api/inventory
// @desc    Get all inventory items
// @access  Private (Admin + Cashier)
router.get("/", authenticate, authorize("ADMIN", "CASHIER"), async (req, res) => {
  try {
    const inventory = await Inventory.find({}).populate("product", "name barcode")
    res.json(inventory)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/inventory/:productId
// @desc    Get inventory for a specific product
// @access  Private (Admin + Cashier)
router.get("/:productId", authenticate, authorize("ADMIN", "CASHIER"), async (req, res) => {
  try {
    const inventory = await Inventory.find({ product: req.params.productId })
    if (!inventory) {
      return res.status(404).json({ message: "Inventory not found" })
    }
    res.json(inventory)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/inventory/movements
// @desc    Get stock movements
// @access  Private (Admin only)
router.get("/movements", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const movements = await StockMovement.find({})
      .populate("product", "name")
      .sort({ createdAt: -1 })
    res.json(movements)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/inventory/adjust
// @desc    Adjust stock
// @access  Admin only
router.post("/adjust", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const { productId, stockType, adjustmentQuantity, reason } = req.body

    if (!productId || !stockType || adjustmentQuantity === undefined) {
      return res.status(400).json({ message: "Missing required fields" })
    }

    if (!STOCK_TYPES.includes(stockType)) {
      return res.status(400).json({ message: "Invalid stock type" })
    }

    // Find or create inventory record
    let inventory = await Inventory.findOne({ product: productId, stockType })

    if (!inventory) {
      // Get product details to set default prices
      const product = await Product.findById(productId)
      if (!product) {
        return res.status(404).json({ message: "Product not found" })
      }

      inventory = new Inventory({
        product: productId,
        stockType,
        quantity: 0,
        minimumStock: product.tp.minStock,
        purchasePrice: stockType === "TP" ? product.tp.purchasePrice : product.nonTp.purchasePrice,
        sellingPrice: stockType === "TP" ? product.tp.sellingPrice : product.nonTp.sellingPrice,
      })
    }

    // Adjust stock
    const previousStock = inventory.quantity
    inventory.quantity = Math.max(0, inventory.quantity + adjustmentQuantity)
    const newStock = inventory.quantity

    // Save inventory
    await inventory.save()

    // Create stock movement
    const movement = await StockMovement.create({
      product: productId,
      stockType,
      movementType: adjustmentQuantity > 0 ? "ADJUSTMENT" : "ADJUSTMENT",
      quantity: adjustmentQuantity,
      previousStock,
      newStock,
      referenceType: "ADJUSTMENT",
      referenceId: inventory._id,
      reason,
      createdBy: req.user.id,
    })

    // Create audit log
    await mongoose.model("AuditLog").create({
      user: req.user.id,
      action: "Inventory Adjusted",
      module: "Inventory",
      entity: "Inventory",
      entityId: inventory._id,
      oldValue: previousStock,
      newValue: newStock,
    })

    res.json({
      inventory,
      movement,
      message: "Stock adjusted successfully",
    })
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

export default router