const mongoose = require("mongoose")

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config()
}

const seedDefaults = require("./seed.js")

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/surya_bar")
    console.log("MongoDB connected")
    await seedDefaults()
  } catch (error) {
    console.error("MongoDB connection error:", error)
    process.exit(1)
  }
}

module.exports = connectDB