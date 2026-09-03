const express = require("express")
const router = express.Router()
const bcrypt = require("bcryptjs")
const User = require("../models/User.js")
const { generateToken } = require("../config/jwt.js")
const { authenticate } = require("../middleware/auth.js")

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" })
    }

    const cleanEmail = email.toLowerCase().trim()
    let user = await User.findOne({ email: cleanEmail })

    if (!user) {
      const userCount = await User.countDocuments()
      if (userCount === 0) {
        // Create initial default admin account on first login
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)
        user = await User.create({
          name: "Admin",
          email: cleanEmail,
          password: hashedPassword,
          role: "ADMIN",
        })
      } else {
        return res.status(401).json({ message: "Invalid email or password" })
      }
    } else {
      // Compare password
      let isMatch = false
      if (user.password && (user.password.startsWith("$2a$") || user.password.startsWith("$2b$"))) {
        isMatch = await bcrypt.compare(password, user.password)
      } else {
        isMatch = user.password === password
      }

      if (!isMatch) {
        return res.status(401).json({ message: "Invalid email or password" })
      }
    }

    const token = generateToken(user._id)
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ message: "Server error: " + error.message })
  }
})

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", authenticate, (req, res) => {
  res.json({ user: req.user })
})

module.exports = router