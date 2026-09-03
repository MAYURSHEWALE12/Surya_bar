import express from "express"
import Product from "../models/Product.js"
import Category from "../models/Category.js"
import Brand from "../models/Brand.js"
import { authenticate, authorize } from "../middleware/auth.js"

const router = express.Router()

// @route   GET /api/products
// @desc    Get all products
// @access  Private (Admin + Cashier)
router.get("/", authenticate, authorize("ADMIN", "CASHIER"), async (req, res) => {
  try {
    const products = await Product.find({ active: true }).populate("brand category")
    res.json(products)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/products/:id
// @desc    Get product by ID
// @access  Private (Admin + Cashier)
router.get("/:id", authenticate, authorize("ADMIN", "CASHIER"), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("brand category")
    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }
    res.json(product)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/products
// @desc    Create product
// @access  Admin only
router.post("/", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const {
      name,
      brand,
      category,
      size,
      unit,
      barcode,
      sku,
      description,
      active,
      tp,
      nonTp,
    } = req.body

    const productExists = await Product.findOne({
      $or: [{ barcode }, { sku }],
    })

    if (productExists) {
      return res.status(400).json({ message: "Product with this barcode or SKU already exists" })
    }

    const product = await Product.create({
      name,
      brand,
      category,
      size,
      unit,
      barcode,
      sku,
      description,
      active,
      tp: { ...tp, enabled: tp.enabled !== undefined ? tp.enabled : true },
      nonTp: { ...nonTp, enabled: nonTp.enabled !== undefined ? nonTp.enabled : true },
    })

    res.status(201).json(product)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Admin only
router.put("/:id", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })

    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    res.json(product)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// @route   DELETE /api/products/:id
// @desc    Deactivate product (soft delete)
// @access  Admin only
router.delete("/:id", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { active: false },
      { new: true }
    )

    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    res.json(product)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/categories
// @desc    Get all categories
// @access  Private
router.get("/categories", authenticate, authorize("ADMIN", "CASHIER"), async (req, res) => {
  try {
    const categories = await Category.find({ active: true })
    res.json(categories)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/categories
// @desc    Create category
// @access  Admin only
router.post("/categories", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const { name, description } = req.body
    const category = await Category.create({ name, description })
    res.status(201).json(category)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// @route   GET /api/brands
// @desc    Get all brands
// @access  Private
router.get("/brands", authenticate, authorize("ADMIN", "CASHIER"), async (req, res) => {
  try {
    const brands = await Brand.find({ active: true })
    res.json(brands)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

// @route   POST /api/brands
// @desc    Create brand
// @access  Admin only
router.post("/brands", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const { name, description } = req.body
    const brand = await Brand.create({ name, description })
    res.status(201).json(brand)
  } catch (error) {
    res.status(500).json({ message: "Server error" })
  }
})

export default router