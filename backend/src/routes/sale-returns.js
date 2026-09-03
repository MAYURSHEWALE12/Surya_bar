const express = require("express")
const SaleReturn = require("../models/SaleReturn.js")
const Sale = require("../models/Sale.js")
const Inventory = require("../models/Inventory.js")
const StockMovement = require("../models/StockMovement.js")
const Product = require("../models/Product.js")
const { authenticate, authorize } = require("../middleware/auth.js")

const router = express.Router()

// @route   GET /api/sale-returns
// @desc    Get all sale returns
// @access  Private (Admin + Cashier)
router.get("/", authenticate, authorize("ADMIN", "CASHIER"), async (req, res) => {
  try {
    const returns = await SaleReturn.find({})
      .populate("sale", "invoiceNumber cashier createdAt")
      .populate("items.product", "name barcode")
      .sort({ createdAt: -1 })
    res.json(returns)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/sale-returns/:id
// @desc    Get return by ID
// @access  Private (Admin + Cashier)
router.get("/:id", authenticate, authorize("ADMIN", "CASHIER"), async (req, res) => {
  try {
    const ret = await SaleReturn.findById(req.params.id)
      .populate("sale", "invoiceNumber cashier createdAt")
      .populate("items.product", "name barcode")
    if (!ret) {
      return res.status(404).json({ message: "Return not found" })
    }
    res.json(ret)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router