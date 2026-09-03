const mongoose = require("mongoose")
const { STOCK_TYPES } = require("../constants/index.js")

const inventorySchema = new mongoose.Schema(
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
      default: 0,
    },
    minimumStock: {
      type: Number,
      default: 0,
    },
    maximumStock: {
      type: Number,
      default: Number.MAX_SAFE_INTEGER,
    },
    purchasePrice: {
      type: Number,
      default: 0,
    },
    sellingPrice: {
      type: Number,
      default: 0,
    },
    stockValuation: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
)

// Compound index for fast lookup by product + stock type
inventorySchema.index({ product: 1, stockType: 1 }, { unique: true })

module.exports = mongoose.model("Inventory", inventorySchema)