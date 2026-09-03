const express = require("express")
const Expense = require("../models/Expense.js")
const { authenticate, authorize } = require("../middleware/auth.js")

const router = express.Router()

// @route   GET /api/expenses
// @desc    Get all expenses
// @access  Private (Admin + Cashier)
router.get("/", authenticate, authorize("ADMIN", "CASHIER"), async (req, res) => {
  try {
    const expenses = await Expense.find({}).sort({ createdAt: -1 })
    res.json(expenses)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/expenses
// @desc    Create expense
// @access  Admin only
router.post("/", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const { name, amount, category, description } = req.body
    const expense = await Expense.create({
      name,
      amount,
      category,
      description,
    })
    res.status(201).json(expense)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

module.exports = router