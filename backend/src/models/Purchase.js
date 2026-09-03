const mongoose = require("mongoose")
const { STOCK_TYPES } = require("../constants/index.js")

const purchaseSchema = new mongoose.Schema(
  {
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },
    invoiceNumber: {
      type: String,
      required: [true, "Invoice number is required"],
      trim: true,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
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
        purchasePrice: {
          type: Number,
          required: true,
        },
        discount: {
          type: Number,
          default: 0,
        },
        tax: {
          type: Number,
          default: 0,
        },
        total: {
          type: Number,
          required: true,
        },
      },
    ],
    subtotal: {
      type: Number,
      default: 0,
    },
    discount: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["DRAFT", "PENDING", "RECEIVED", "COMPLETED"],
      default: "DRAFT",
    },
    receivedAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
)

// Index for vendor and status queries
purchaseSchema.index({ vendor: 1, createdAt: -1 })
purchaseSchema.index({ status: 1 })

module.exports = mongoose.model("Purchase", purchaseSchema)