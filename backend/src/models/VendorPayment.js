const mongoose = require("mongoose")

const vendorPaymentSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
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
    notes: {
      type: String,
      trim: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model("VendorPayment", vendorPaymentSchema)