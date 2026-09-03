const express = require("express")
const router = express.Router()
const Product = require("../models/Product.js")
const Category = require("../models/Category.js")
const Brand = require("../models/Brand.js")
const Inventory = require("../models/Inventory.js")
const StockMovement = require("../models/StockMovement.js")
const { authenticate, authorize } = require("../middleware/auth.js")

// @route   GET /api/products
// @desc    Get all products or search by barcode/name with live stock
// @access  Private (Admin + Cashier)
router.get("/", authenticate, authorize("ADMIN", "CASHIER"), async (req, res) => {
  try {
    const { barcode, search } = req.query
    let query = { active: true }

    const term = search || barcode
    if (term && term.trim()) {
      query.$or = [
        { name: { $regex: term.trim(), $options: "i" } },
        { size: { $regex: term.trim(), $options: "i" } },
        { description: { $regex: term.trim(), $options: "i" } },
      ]
    }

    const products = await Product.find(query).populate("brand category").lean()
    const productIds = products.map((p) => p._id)
    const inventories = await Inventory.find({ product: { $in: productIds } }).lean()

    const productsWithStock = products.map((p) => {
      const tpInv = inventories.find(
        (i) => i.product.toString() === p._id.toString() && i.stockType === "TP"
      )
      const nonTpInv = inventories.find(
        (i) => i.product.toString() === p._id.toString() && i.stockType === "NON_TP"
      )
      return {
        ...p,
        tp: {
          ...p.tp,
          quantity: tpInv ? tpInv.quantity : p.tp?.quantity || 0,
        },
        nonTp: {
          ...p.nonTp,
          quantity: nonTpInv ? nonTpInv.quantity : p.nonTp?.quantity || 0,
        },
      }
    })

    res.json(productsWithStock)
  } catch (error) {
    res.status(500).json({ message: "Server error: " + error.message })
  }
})

// @route   GET /api/products/categories
router.get("/categories", authenticate, authorize("ADMIN", "CASHIER"), async (req, res) => {
  try {
    const categories = await Category.find({ active: true })
    res.json(categories)
  } catch (error) {
    res.status(500).json({ message: "Server error: " + error.message })
  }
})

// @route   POST /api/products/categories
router.post("/categories", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const { name, description } = req.body
    const category = await Category.create({ name, description })
    res.status(201).json(category)
  } catch (error) {
    res.status(500).json({ message: "Server error: " + error.message })
  }
})

// @route   GET /api/products/brands
router.get("/brands", authenticate, authorize("ADMIN", "CASHIER"), async (req, res) => {
  try {
    const brands = await Brand.find({ active: true })
    res.json(brands)
  } catch (error) {
    res.status(500).json({ message: "Server error: " + error.message })
  }
})

// @route   POST /api/products/brands
router.post("/brands", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const { name, description } = req.body
    const brand = await Brand.create({ name, description })
    res.status(201).json(brand)
  } catch (error) {
    res.status(500).json({ message: "Server error: " + error.message })
  }
})

// @route   GET /api/products/:id
// @desc    Get product by ID with stock
// @access  Private (Admin + Cashier)
router.get("/:id", authenticate, authorize("ADMIN", "CASHIER"), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("brand category").lean()
    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    const inventories = await Inventory.find({ product: product._id }).lean()
    const tpInv = inventories.find((i) => i.stockType === "TP")
    const nonTpInv = inventories.find((i) => i.stockType === "NON_TP")

    res.json({
      ...product,
      tp: { ...product.tp, quantity: tpInv ? tpInv.quantity : product.tp?.quantity || 0 },
      nonTp: { ...product.nonTp, quantity: nonTpInv ? nonTpInv.quantity : product.nonTp?.quantity || 0 },
    })
  } catch (error) {
    res.status(500).json({ message: "Server error: " + error.message })
  }
})

// @route   POST /api/products
// @desc    Create product & initialize inventory
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

    const tpQty = Number(tp?.quantity) || Number(tp?.stock) || 0
    const nonTpQty = Number(nonTp?.quantity) || Number(nonTp?.stock) || 0

    const product = await Product.create({
      name,
      brand: brand || null,
      category: category || null,
      size: size || "",
      unit: unit || "pcs",
      barcode: barcode || "",
      sku: sku || "",
      description: description || "",
      active: active !== undefined ? active : true,
      tp: {
        ...tp,
        enabled: tp?.enabled !== undefined ? tp.enabled : true,
        purchasePrice: Number(tp?.purchasePrice) || 0,
        sellingPrice: Number(tp?.sellingPrice) || 0,
        minStock: Number(tp?.minStock) || 0,
      },
      nonTp: {
        ...nonTp,
        enabled: nonTp?.enabled !== undefined ? nonTp.enabled : true,
        purchasePrice: Number(nonTp?.purchasePrice) || 0,
        sellingPrice: Number(nonTp?.sellingPrice) || 0,
        minStock: Number(nonTp?.minStock) || 0,
      },
    })

    // Upsert Inventory records for TP and Non-TP
    await Inventory.findOneAndUpdate(
      { product: product._id, stockType: "TP" },
      {
        product: product._id,
        stockType: "TP",
        quantity: tpQty,
        purchasePrice: Number(tp?.purchasePrice) || 0,
        sellingPrice: Number(tp?.sellingPrice) || 0,
        minimumStock: Number(tp?.minStock) || 0,
      },
      { upsert: true, new: true }
    )

    await Inventory.findOneAndUpdate(
      { product: product._id, stockType: "NON_TP" },
      {
        product: product._id,
        stockType: "NON_TP",
        quantity: nonTpQty,
        purchasePrice: Number(nonTp?.purchasePrice) || 0,
        sellingPrice: Number(nonTp?.sellingPrice) || 0,
        minimumStock: Number(nonTp?.minStock) || 0,
      },
      { upsert: true, new: true }
    )

    res.status(201).json({
      ...product.toObject(),
      tp: { ...product.tp, quantity: tpQty },
      nonTp: { ...product.nonTp, quantity: nonTpQty },
    })
  } catch (error) {
    res.status(500).json({ message: "Server error: " + error.message })
  }
})

// @route   PUT /api/products/:id
// @desc    Update product & update inventory
// @access  Admin only
router.put("/:id", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const { tp, nonTp, ...rest } = req.body

    const updatePayload = { ...rest }
    if (tp) {
      updatePayload.tp = {
        enabled: tp.enabled !== undefined ? tp.enabled : true,
        purchasePrice: Number(tp.purchasePrice) || 0,
        sellingPrice: Number(tp.sellingPrice) || 0,
        minStock: Number(tp.minStock) || 0,
      }
    }
    if (nonTp) {
      updatePayload.nonTp = {
        enabled: nonTp.enabled !== undefined ? nonTp.enabled : true,
        purchasePrice: Number(nonTp.purchasePrice) || 0,
        sellingPrice: Number(nonTp.sellingPrice) || 0,
        minStock: Number(nonTp.minStock) || 0,
      }
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updatePayload, {
      new: true,
      runValidators: true,
    })

    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    if (tp) {
      const tpInvUpdate = {
        purchasePrice: Number(tp.purchasePrice) || 0,
        sellingPrice: Number(tp.sellingPrice) || 0,
        minimumStock: Number(tp.minStock) || 0,
      }
      if (tp.quantity !== undefined || tp.stock !== undefined) {
        tpInvUpdate.quantity = Number(tp.quantity !== undefined ? tp.quantity : tp.stock) || 0
      }
      await Inventory.findOneAndUpdate(
        { product: product._id, stockType: "TP" },
        { $set: tpInvUpdate },
        { upsert: true, new: true }
      )
    }

    if (nonTp) {
      const nonTpInvUpdate = {
        purchasePrice: Number(nonTp.purchasePrice) || 0,
        sellingPrice: Number(nonTp.sellingPrice) || 0,
        minimumStock: Number(nonTp.minStock) || 0,
      }
      if (nonTp.quantity !== undefined || nonTp.stock !== undefined) {
        nonTpInvUpdate.quantity = Number(nonTp.quantity !== undefined ? nonTp.quantity : nonTp.stock) || 0
      }
      await Inventory.findOneAndUpdate(
        { product: product._id, stockType: "NON_TP" },
        { $set: nonTpInvUpdate },
        { upsert: true, new: true }
      )
    }

    const inventories = await Inventory.find({ product: product._id }).lean()
    const tpInv = inventories.find((i) => i.stockType === "TP")
    const nonTpInv = inventories.find((i) => i.stockType === "NON_TP")

    res.json({
      ...product.toObject(),
      tp: { ...product.tp, quantity: tpInv ? tpInv.quantity : product.tp?.quantity || 0 },
      nonTp: { ...product.nonTp, quantity: nonTpInv ? nonTpInv.quantity : product.nonTp?.quantity || 0 },
    })
  } catch (error) {
    res.status(500).json({ message: "Server error: " + error.message })
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
    res.status(500).json({ message: "Server error: " + error.message })
  }
})

module.exports = router