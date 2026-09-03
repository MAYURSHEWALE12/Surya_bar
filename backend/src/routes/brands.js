const express = require("express")
const router = express.Router()
const Brand = require("../models/Brand.js")
const { authenticate, authorize } = require("../middleware/auth.js")

router.get("/", authenticate, authorize("ADMIN", "CASHIER"), async (req, res) => {
  try {
    const brands = await Brand.find({ active: true })
    res.json(brands)
  } catch (error) {
    res.status(500).json({ message: "Server error: " + error.message })
  }
})

router.post("/", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const { name, description } = req.body
    const brand = await Brand.create({ name, description })
    res.status(201).json(brand)
  } catch (error) {
    res.status(500).json({ message: "Server error: " + error.message })
  }
})

module.exports = router
