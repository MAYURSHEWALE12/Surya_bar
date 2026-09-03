const mongoose = require("mongoose")
const { STOCK_TYPES, MOVEMENT_TYPES } = require("../constants/index.js")

const stockMovementSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    stockType: {
      type: String,
      enum: STOCK_TYPES,
      required: true,
    },
    movementType: {
      type: String,
      enum: MOVEMENT_TYPES,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    referenceType: {
      type: String,
      enum: ["PURCHASE", "SALE", "SALE_RETURN", "PURCHASE_RETURN", "ADJUSTMENT", "DAMAGE", "VOID_REVERSAL"],
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
)

// Index for queries
stockMovementSchema.index({ product: 1, stockType: 1, createdAt: -1 })
stockMovementSchema.index({ referenceType: 1, referenceId: 1 })

module.exports = mongoose.model("StockMovement", stockMovementSchema)