const mongoose = require("mongoose")

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    module: {
      type: String,
      required: true,
      trim: true,
    },
    entity: {
      type: String,
      trim: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    oldValue: {
      type: String,
    },
    newValue: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
)

// Index for queries
auditLogSchema.index({ user: 1, createdAt: -1 })
auditLogSchema.index({ entity: 1, entityId: 1 })

module.exports = mongoose.model("AuditLog", auditLogSchema)