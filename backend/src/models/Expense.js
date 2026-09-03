const mongoose = require("mongoose")

const expenseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Expense name is required"],
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      enum: ["Electricity", "Salary", "Transport", "Maintenance", "Rent", "Miscellaneous", "Other"],
    },
    description: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model("Expense", expenseSchema)