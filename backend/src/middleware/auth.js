const { verifyToken } = require("../config/jwt.js")
const { ROLES } = require("../constants/index.js")
const User = require("../models/User.js")

exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null
    if (!token) {
      return res.status(401).json({ message: "No token, authorization denied" })
    }
    const decoded = verifyToken(token)
    const user = await User.findById(decoded.id).select("-password")
    if (user) {
      req.user = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    } else {
      req.user = decoded
    }
    next()
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" })
  }
}

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" })
    }
    next()
  }
}