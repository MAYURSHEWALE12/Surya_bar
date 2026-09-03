const jwt = require("jsonwebtoken")

exports.generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET || "surya_bar_secret_key", { expiresIn: "30d" })

exports.verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET || "surya_bar_secret_key")