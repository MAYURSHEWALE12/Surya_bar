const mongoose = require("mongoose")

const creditTransactionSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["DEBIT_SALE", "CREDIT_PAYMENT", "ADJUSTMENT"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    sale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
    },
    invoiceNumber: {
      type: String,
    },
    paymentMethod: {
      type: String,
      enum: ["CASH", "UPI", "CARD", "BANK_TRANSFER", "WAIVER"],
      default: "CASH",
    },
    notes: {
      type: String,
      trim: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
)

module.exports = mongoose.model("CreditTransaction", creditTransactionSchema)
