const express = require("express")
const router = express.Router()
const Customer = require("../models/Customer")
const CreditTransaction = require("../models/CreditTransaction")
const { authenticate, authorize } = require("../middleware/auth")

// GET /api/customers - List all customers with search and balance metrics
router.get("/", authenticate, async (req, res) => {
  try {
    const { search, hasBalance } = req.query
    let query = {}

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), "i")
      query.$or = [{ name: regex }, { phone: regex }]
    }

    if (hasBalance === "true") {
      query.currentBalance = { $gt: 0 }
    }

    const customers = await Customer.find(query).sort({ currentBalance: -1, updatedAt: -1 })

    // Summary calculation
    const allCustomers = await Customer.find({})
    const totalMarketOutstanding = allCustomers.reduce((sum, c) => sum + (c.currentBalance || 0), 0)
    const totalWithDue = allCustomers.filter((c) => (c.currentBalance || 0) > 0).length
    const totalPaid = allCustomers.reduce((sum, c) => sum + (c.totalPaid || 0), 0)

    res.json({
      customers,
      metrics: {
        totalMarketOutstanding,
        totalWithDue,
        totalCustomers: allCustomers.length,
        totalPaid,
      },
    })
  } catch (error) {
    console.error("Error fetching customers:", error)
    res.status(500).json({ message: "Failed to fetch customer khata directory" })
  }
})

// POST /api/customers - Create or find customer
router.post("/", authenticate, async (req, res) => {
  try {
    const { name, phone, email, creditLimit, notes } = req.body

    if (!name || !phone) {
      return res.status(400).json({ message: "Customer name and phone number are required" })
    }

    const cleanPhone = phone.toString().trim().replace(/\D/g, "")
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ message: `Mobile number must be exactly 10 digits (received ${cleanPhone.length} digits)` })
    }

    let customer = await Customer.findOne({ phone: cleanPhone })

    if (customer) {
      // Update name or notes if provided
      if (name) customer.name = name.trim()
      if (email !== undefined) customer.email = email.trim()
      if (creditLimit !== undefined) customer.creditLimit = Number(creditLimit) || 0
      if (notes !== undefined) customer.notes = notes.trim()
      await customer.save()
      return res.json({ customer, isNew: false })
    }

    customer = await Customer.create({
      name: name.trim(),
      phone: cleanPhone,
      email: email ? email.trim() : "",
      creditLimit: Number(creditLimit) || 0,
      notes: notes ? notes.trim() : "",
    })

    res.status(201).json({ customer, isNew: true })
  } catch (error) {
    console.error("Error creating customer:", error)
    res.status(500).json({ message: "Failed to save customer profile" })
  }
})

// GET /api/customers/:id - Customer Statement and Ledger
router.get("/:id", authenticate, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" })
    }

    const transactions = await CreditTransaction.find({ customer: customer._id })
      .populate("sale", "invoiceNumber grandTotal items createdAt paymentMethod")
      .populate("recordedBy", "name email")
      .sort({ createdAt: -1 })

    res.json({
      customer,
      transactions,
    })
  } catch (error) {
    console.error("Error fetching customer statement:", error)
    res.status(500).json({ message: "Failed to load customer statement" })
  }
})

// POST /api/customers/:id/payments - Record Settlement / Repayment
router.post("/:id/payments", authenticate, async (req, res) => {
  try {
    const { amount, paymentMethod = "CASH", notes } = req.body
    const payAmt = Number(amount)

    if (!payAmt || payAmt <= 0) {
      return res.status(400).json({ message: "Please enter a valid repayment amount" })
    }

    const customer = await Customer.findById(req.params.id)
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" })
    }

    const prevBalance = customer.currentBalance || 0
    const newBalance = Math.max(0, prevBalance - payAmt)

    const transaction = await CreditTransaction.create({
      customer: customer._id,
      type: "CREDIT_PAYMENT",
      amount: payAmt,
      balanceAfter: newBalance,
      paymentMethod,
      notes: notes ? notes.trim() : `Repayment received via ${paymentMethod}`,
      recordedBy: req.user?._id || req.user?.id,
    })

    customer.currentBalance = newBalance
    customer.totalPaid = (customer.totalPaid || 0) + payAmt
    await customer.save()

    res.status(201).json({
      message: "Payment recorded successfully",
      transaction,
      customer,
      settlementReceipt: {
        receiptId: `SETTLE-${transaction._id.toString().slice(-6).toUpperCase()}`,
        customerName: customer.name,
        customerPhone: customer.phone,
        amountPaid: payAmt,
        previousBalance: prevBalance,
        remainingBalance: newBalance,
        paymentMethod,
        date: transaction.createdAt,
      },
    })
  } catch (error) {
    console.error("Error recording customer payment:", error)
    res.status(500).json({ message: "Failed to record payment" })
  }
})

// DELETE /api/customers/:id - Delete customer (if no balance)
router.delete("/:id", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" })
    }

    if ((customer.currentBalance || 0) > 0) {
      return res.status(400).json({
        message: `Cannot delete customer with an outstanding balance of ₹${customer.currentBalance}. Settle the balance first.`,
      })
    }

    await CreditTransaction.deleteMany({ customer: customer._id })
    await Customer.findByIdAndDelete(req.params.id)

    res.json({ message: "Customer profile and cleared ledger removed" })
  } catch (error) {
    console.error("Error deleting customer:", error)
    res.status(500).json({ message: "Failed to delete customer" })
  }
})

module.exports = router
