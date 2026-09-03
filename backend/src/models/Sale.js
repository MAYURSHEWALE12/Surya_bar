const mongoose = require("mongoose")
const { STOCK_TYPES } = require("../constants/index.js")

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, "Invoice number is required"],
      trim: true,
    },
    cashier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        productName: {
          type: String,
          required: true,
          trim: true,
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
        unitPrice: {
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
    discountType: {
      type: String,
      enum: ["PERCENT", "FLAT"],
      default: "FLAT",
    },
    discountValue: {
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
    paymentMethod: {
      type: String,
      enum: ["CASH", "UPI", "CARD", "BORROW", "CREDIT"],
      default: "CASH",
    },
    paymentStatus: {
      type: String,
      enum: ["PAID", "UNPAID", "PARTIAL"],
      default: "PAID",
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
    customerName: {
      type: String,
      trim: true,
    },
    customerPhone: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "VOIDED"],
      default: "ACTIVE",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
)

// Index for cashier and date queries
saleSchema.index({ cashier: 1, createdAt: -1 })
saleSchema.index({ status: 1 })
saleSchema.index({ invoiceNumber: 1 })

module.exports = mongoose.model("Sale", saleSchema)