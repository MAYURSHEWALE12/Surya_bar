import express from "express"
import SaleReturn from "../models/SaleReturn.js"
import Sale from "../models/Sale.js"
import Inventory from "../models/Inventory.js"
import StockMovement from "../models/StockMovement.js"
import Product from "../models/Product.js"
import { authenticate, authorize } from "../middleware/auth.js"

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

export default router