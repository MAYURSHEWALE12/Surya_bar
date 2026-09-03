const mongoose = require("mongoose")
const { STOCK_TYPES } = require("../constants/index.js")

const saleReturnSchema = new mongoose.Schema(
  {
    sale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      required: true,
    },
    items: [
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
        quantity: {
          type: Number,
          required: true,
        },
        reason: {
          type: String,
          trim: true,
        },
      },
    ],
    subtotal: {
      type: Number,
      default: 0,
    },
    refundAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["CASH", "UPI", "CARD"],
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED"],
      default: "PENDING",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
)

// Index for sale queries
saleReturnSchema.index({ sale: 1 })

module.exports = mongoose.model("SaleReturn", saleReturnSchema)