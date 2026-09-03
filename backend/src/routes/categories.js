const express = require("express")
const router = express.Router()
const Category = require("../models/Category.js")
const { authenticate, authorize } = require("../middleware/auth.js")

router.get("/", authenticate, authorize("ADMIN", "CASHIER"), async (req, res) => {
  try {
    const categories = await Category.find({ active: true })
    res.json(categories)
  } catch (error) {
    res.status(500).json({ message: "Server error: " + error.message })
  }
})

router.post("/", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const { name, description } = req.body
    const category = await Category.create({ name, description })
    res.status(201).json(category)
  } catch (error) {
    res.status(500).json({ message: "Server error: " + error.message })
  }
})

module.exports = router
