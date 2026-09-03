const express = require("express")
const router = express.Router()
const bcrypt = require("bcryptjs")
const User = require("../models/User.js")
const { authenticate, authorize } = require("../middleware/auth.js")

// Protect all user routes for Admin
router.use(authenticate)
router.use(authorize("ADMIN"))

// @route   GET /api/users
// @desc    Get all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 })
    res.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    res.status(500).json({ message: "Server error: " + error.message })
  }
})

// @route   POST /api/users
// @desc    Create new user / cashier / admin
router.post("/", async (req, res) => {
  try {
    const { name, email, password, role, status } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" })
    }

    const cleanEmail = email.toLowerCase().trim()
    const existing = await User.findOne({ email: cleanEmail })
    if (existing) {
      return res.status(400).json({ message: "A user with this email already exists" })
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: role || "CASHIER",
      status: status || "ACTIVE",
    })

    const userObj = newUser.toObject()
    delete userObj.password

    res.status(201).json(userObj)
  } catch (error) {
    console.error("Error creating user:", error)
    res.status(500).json({ message: "Server error: " + error.message })
  }
})

// @route   PUT /api/users/:id
// @desc    Update user details or password
router.put("/:id", async (req, res) => {
  try {
    const { name, email, role, status, password } = req.body
    const user = await User.findById(req.params.id)

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    if (name) user.name = name.trim()
    if (email) {
      const cleanEmail = email.toLowerCase().trim()
      if (cleanEmail !== user.email) {
        const existing = await User.findOne({ email: cleanEmail })
        if (existing) {
          return res.status(400).json({ message: "Email is already taken" })
        }
        user.email = cleanEmail
      }
    }
    if (role) user.role = role
    if (status) user.status = status

    if (password && password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10)
      user.password = await bcrypt.hash(password.trim(), salt)
    }

    await user.save()

    const userObj = user.toObject()
    delete userObj.password

    res.json(userObj)
  } catch (error) {
    console.error("Error updating user:", error)
    res.status(500).json({ message: "Server error: " + error.message })
  }
})

// @route   DELETE /api/users/:id
// @desc    Delete user
router.delete("/:id", async (req, res) => {
  try {
    const currentUserId = (req.user?.id || req.user?._id)?.toString()
    if (currentUserId === req.params.id) {
      return res.status(400).json({ message: "You cannot delete your own account" })
    }

    const user = await User.findByIdAndDelete(req.params.id)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json({ message: "User deleted successfully" })
  } catch (error) {
    console.error("Error deleting user:", error)
    res.status(500).json({ message: "Server error: " + error.message })
  }
})

module.exports = router
