const mongoose = require("mongoose")

exports.notFound = (req, res) => {
  res.status(404).json({ message: "Route not found" })
}

exports.errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode
  res.status(statusCode).json({
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  })
}