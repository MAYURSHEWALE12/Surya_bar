const mongoose = require("mongoose")

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    creditLimit: {
      type: Number,
      default: 0, // 0 = unlimited or unconstrained
    },
    currentBalance: {
      type: Number,
      default: 0, // Total outstanding debt owed to bar
    },
    totalPurchased: {
      type: Number,
      default: 0, // Lifetime total billing amount
    },
    totalPaid: {
      type: Number,
      default: 0, // Lifetime settlements repaid
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "BLOCKED"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  }
)

module.exports = mongoose.model("Customer", customerSchema)
