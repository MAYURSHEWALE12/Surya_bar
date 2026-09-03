const mongoose = require("mongoose")
const { STOCK_TYPES } = require("../constants/index.js")

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    size: {
      type: String,
      trim: true,
    },
    unit: {
      type: String,
      default: "pcs",
    },
    barcode: {
      type: String,
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },

    tp: {
      enabled: {
        type: Boolean,
        default: true,
      },
      purchasePrice: {
        type: Number,
        default: 0,
      },
      sellingPrice: {
        type: Number,
        default: 0,
      },
      minStock: {
        type: Number,
        default: 0,
      },
      maxStock: {
        type: Number,
        default: Number.MAX_SAFE_INTEGER,
      },
    },

    nonTp: {
      enabled: {
        type: Boolean,
        default: true,
      },
      purchasePrice: {
        type: Number,
        default: 0,
      },
      sellingPrice: {
        type: Number,
        default: 0,
      },
      minStock: {
        type: Number,
        default: 0,
      },
      maxStock: {
        type: Number,
        default: Number.MAX_SAFE_INTEGER,
      },
    },
  },
  { timestamps: true }
)

// Index for barcode lookups
productSchema.index({ barcode: 1 })
productSchema.index({ sku: 1 })

module.exports = mongoose.model("Product", productSchema)