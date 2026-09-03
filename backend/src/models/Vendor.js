const mongoose = require("mongoose")

const vendorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Vendor name is required"],
      trim: true,
    },
    contactNumber: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      trim: true,
    },
    gstin: {
      type: String,
      trim: true,
    },
    licenseDetails: {
      type: String,
      trim: true,
    },
    paymentTerms: {
      type: String,
      default: "Net 30",
    },
    openingBalance: {
      type: Number,
      default: 0,
    },
    currentBalance: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model("Vendor", vendorSchema)