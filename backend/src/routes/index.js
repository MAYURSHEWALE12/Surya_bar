const express = require("express")
const router = express.Router()

// Health check route
router.get("/", (req, res) => {
  res.json({ message: "Surya Bar POS API is running" })
})

module.exports = router