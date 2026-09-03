const mongoose = require("mongoose")

const paymentSchema = new mongoose.Schema(
  {
    sale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
    },
    purchase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Purchase",
    },
    amount: {
      type: Number,
      required: true,
    },
    method: {
      type: String,
      enum: ["CASH", "UPI", "CARD"],
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED"],
      default: "PENDING",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model("Payment", paymentSchema)