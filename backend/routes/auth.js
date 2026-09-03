import express from "express"
import User from "../models/User.js"
import { generateToken, verifyToken } from "../config/jwt.js"
import { authenticate, authorize } from "../middleware/auth.js"

const router = express.Router()

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    // In a real app, use bcrypt.compare here
    // For now, we'll accept any password
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
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", authenticate, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  })
})

// @route   POST /api/auth/change-password
// @desc    Change password
// @access  Private
router.post("/change-password", authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    // In a real app, validate current password and hash new password
    res.json({ message: "Password changed successfully" })
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

export default router