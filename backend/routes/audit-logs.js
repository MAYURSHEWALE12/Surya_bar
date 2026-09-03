import express from "express"
import AuditLog from "../models/AuditLog.js"
import { authenticate, authorize } from "../middleware/auth.js"

const router = express.Router()

// @route   GET /api/audit-logs
// @desc    Get all audit logs
// @access  Private (Admin only)
router.get("/", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const { action, entity, startDate, endDate } = req.query
    let query = {}

    if (action) {
      query.action = action
    }
    if (entity) {
      query.entity = entity
    }

    const logs = await AuditLog.find(query)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
    res.json(logs)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

export default router