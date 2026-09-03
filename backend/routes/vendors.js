import express from "express"
import Vendor from "../models/Vendor.js"
import { authenticate, authorize } from "../middleware/auth.js"

const router = express.Router()

// @route   GET /api/vendors
// @desc    Get all vendors
// @access  Private (Admin + Cashier)
router.get("/", authenticate, authorize("ADMIN", "CASHIER"), async (req, res) => {
  try {
    const vendors = await Vendor.find({ active: true })
    res.json(vendors)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/vendors/:id
// @desc    Get vendor by ID
// @access  Private (Admin + Cashier)
router.get("/:id", authenticate, authorize("ADMIN", "CASHIER"), async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id)
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" })
    }
    res.json(vendor)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/vendors
// @desc    Create vendor
// @access  Admin only
router.post("/", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const {
      name,
      contactNumber,
      email,
      address,
      gstin,
      licenseDetails,
      paymentTerms,
      openingBalance,
      notes,
    } = req.body

    const vendor = await Vendor.create({
      name,
      contactNumber,
      email,
      address,
      gstin,
      licenseDetails,
      paymentTerms,
      openingBalance,
      currentBalance: openingBalance,
      notes,
    })

    res.status(201).json(vendor)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// @route   PUT /api/vendors/:id
// @desc    Update vendor
// @access  Admin only
router.put("/:id", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" })
    }

    res.json(vendor)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/vendors/:id/ledger
// @desc    Get vendor ledger
// @access  Private (Admin only)
router.get("/:id/ledger", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id)
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" })
    }

    // Get all purchases for this vendor
    const purchases = await Purchase.find({ vendor: req.params.id }).sort({ createdAt: -1 })

    // Calculate ledger entries
    let openingBalance = vendor.openingBalance || 0
    let currentBalance = vendor.currentBalance || 0

    const ledgerEntries = []

    // Add opening balance
    if (openingBalance > 0) {
      ledgerEntries.push({
        type: "Opening Balance",
        amount: openingBalance,
        balance: openingBalance,
      })
    }

    // Add purchase and payment entries
    for (const purchase of purchases) {
      // Purchase entry
      ledgerEntries.push({
        type: "Purchase",
        amount: purchase.grandTotal,
        balance: currentBalance + purchase.grandTotal,
      })
      currentBalance += purchase.grandTotal

      // Payment entries (we'll need to track these separately)
      // For now, just show the purchase
    }

    // Reset currentBalance to original and recalculate
    currentBalance = vendor.openingBalance || 0
    ledgerEntries.length = 0 // Clear existing

    if (openingBalance > 0) {
      ledgerEntries.push({
        type: "Opening Balance",
        amount: openingBalance,
        balance: openingBalance,
      })
    }

    for (const purchase of purchases) {
      ledgerEntries.push({
        type: "Purchase",
        amount: purchase.grandTotal,
        balance: currentBalance + purchase.grandTotal,
      })
      currentBalance += purchase.grandTotal
    }

    res.json({
      vendor,
      ledgerEntries,
      outstanding: currentBalance,
    })
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/vendors/:id/payment
// @desc    Record vendor payment
// @access  Admin only
router.post("/:id/payment", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const { id } = req.params
    const { amount, paymentMethod, notes } = req.body

    const vendor = await Vendor.findById(id)
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" })
    }

    // Update vendor balance
    vendor.currentBalance = Math.max(0, vendor.currentBalance - amount)
    await vendor.save()

    res.json({
      vendor,
      outstanding: vendor.currentBalance,
      message: "Payment recorded successfully",
    })
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

export default router