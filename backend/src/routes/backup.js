const express = require("express")
const router = express.Router()
const { authenticate, authorize } = require("../middleware/auth.js")

// Import all models
const User = require("../models/User.js")
const Category = require("../models/Category.js")
const Brand = require("../models/Brand.js")
const Product = require("../models/Product.js")
const Inventory = require("../models/Inventory.js")
const StockMovement = require("../models/StockMovement.js")
const Customer = require("../models/Customer.js")
const CreditTransaction = require("../models/CreditTransaction.js")
const Sale = require("../models/Sale.js")
const Purchase = require("../models/Purchase.js")
const Vendor = require("../models/Vendor.js")
const VendorPayment = require("../models/VendorPayment.js")
const Expense = require("../models/Expense.js")
const Payment = require("../models/Payment.js")
const SaleReturn = require("../models/SaleReturn.js")
const AuditLog = require("../models/AuditLog.js")

// @route   GET /api/backup/stats
// @desc    Get counts of all records in database for backup preview
// @access  Private (ADMIN only)
router.get("/stats", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const [
      productsCount,
      categoriesCount,
      brandsCount,
      inventoriesCount,
      customersCount,
      salesCount,
      purchasesCount,
      vendorsCount,
      creditTxCount,
      usersCount,
    ] = await Promise.all([
      Product.countDocuments(),
      Category.countDocuments(),
      Brand.countDocuments(),
      Inventory.countDocuments(),
      Customer.countDocuments(),
      Sale.countDocuments(),
      Purchase.countDocuments(),
      Vendor.countDocuments(),
      CreditTransaction.countDocuments(),
      User.countDocuments(),
    ])

    res.json({
      success: true,
      counts: {
        products: productsCount,
        categories: categoriesCount,
        brands: brandsCount,
        inventories: inventoriesCount,
        customers: customersCount,
        sales: salesCount,
        purchases: purchasesCount,
        vendors: vendorsCount,
        creditTransactions: creditTxCount,
        users: usersCount,
      },
      databaseName: "surya_bar",
      serverTime: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({ message: "Failed to get database stats: " + error.message })
  }
})

// @route   GET /api/backup/export
// @desc    Export full database as JSON snapshot
// @access  Private (ADMIN only)
router.get("/export", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const [
      categories,
      brands,
      products,
      inventories,
      stockMovements,
      customers,
      creditTransactions,
      sales,
      purchases,
      vendors,
      vendorPayments,
      expenses,
      payments,
      saleReturns,
      users,
    ] = await Promise.all([
      Category.find().lean(),
      Brand.find().lean(),
      Product.find().lean(),
      Inventory.find().lean(),
      StockMovement.find().lean(),
      Customer.find().lean(),
      CreditTransaction.find().lean(),
      Sale.find().lean(),
      Purchase.find().lean(),
      Vendor.find().lean(),
      VendorPayment.find().lean(),
      Expense.find().lean(),
      Payment.find().lean(),
      SaleReturn.find().lean(),
      User.find().lean(),
    ])

    const now = new Date()
    const pad = (n) => String(n).padStart(2, "0")
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}`

    const backupPayload = {
      meta: {
        appName: "Surya Bar & Restaurant POS",
        version: "2.0",
        exportTimestamp: now.toISOString(),
        exportedBy: req.user?.name || req.user?.email || "Admin",
        database: "surya_bar",
        totalCollections: 15,
        recordCounts: {
          categories: categories.length,
          brands: brands.length,
          products: products.length,
          inventories: inventories.length,
          stockMovements: stockMovements.length,
          customers: customers.length,
          creditTransactions: creditTransactions.length,
          sales: sales.length,
          purchases: purchases.length,
          vendors: vendors.length,
          vendorPayments: vendorPayments.length,
          expenses: expenses.length,
          payments: payments.length,
          saleReturns: saleReturns.length,
          users: users.length,
        },
      },
      data: {
        categories,
        brands,
        products,
        inventories,
        stockMovements,
        customers,
        creditTransactions,
        sales,
        purchases,
        vendors,
        vendorPayments,
        expenses,
        payments,
        saleReturns,
        users,
      },
    }

    res.setHeader("Content-Type", "application/json")
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=surya_bar_backup_${dateStr}.json`
    )
    res.json(backupPayload)
  } catch (error) {
    res.status(500).json({ message: "Backup export failed: " + error.message })
  }
})

// @route   POST /api/backup/restore
// @desc    Restore database from JSON snapshot payload
// @access  Private (ADMIN only)
router.post("/restore", authenticate, authorize("ADMIN"), async (req, res) => {
  try {
    const { backupData, mode } = req.body // mode: "REPLACE" | "MERGE"

    if (!backupData || !backupData.data) {
      return res.status(400).json({
        message: "Invalid backup file. The uploaded JSON does not contain valid Surya Bar backup data.",
      })
    }

    const { data, meta } = backupData
    const restoreMode = mode || "REPLACE"
    const restoredCounts = {}

    const restoreCollection = async (Model, records, name) => {
      if (!Array.isArray(records)) {
        restoredCounts[name] = 0
        return
      }

      if (restoreMode === "REPLACE") {
        await Model.deleteMany({})
        if (records.length > 0) {
          await Model.insertMany(records, { ordered: false })
        }
        restoredCounts[name] = records.length
      } else {
        // MERGE / UPSERT mode
        let count = 0
        for (const item of records) {
          if (item._id) {
            await Model.findByIdAndUpdate(item._id, item, { upsert: true })
            count++
          }
        }
        restoredCounts[name] = count
      }
    }

    // Sequentially restore collections to respect dependencies
    if (data.categories) await restoreCollection(Category, data.categories, "categories")
    if (data.brands) await restoreCollection(Brand, data.brands, "brands")
    if (data.products) await restoreCollection(Product, data.products, "products")
    if (data.inventories) await restoreCollection(Inventory, data.inventories, "inventories")
    if (data.stockMovements) await restoreCollection(StockMovement, data.stockMovements, "stockMovements")
    if (data.customers) await restoreCollection(Customer, data.customers, "customers")
    if (data.creditTransactions) await restoreCollection(CreditTransaction, data.creditTransactions, "creditTransactions")
    if (data.vendors) await restoreCollection(Vendor, data.vendors, "vendors")
    if (data.purchases) await restoreCollection(Purchase, data.purchases, "purchases")
    if (data.vendorPayments) await restoreCollection(VendorPayment, data.vendorPayments, "vendorPayments")
    if (data.sales) await restoreCollection(Sale, data.sales, "sales")
    if (data.expenses) await restoreCollection(Expense, data.expenses, "expenses")
    if (data.payments) await restoreCollection(Payment, data.payments, "payments")
    if (data.saleReturns) await restoreCollection(SaleReturn, data.saleReturns, "saleReturns")

    // For users, don't overwrite current admin unless explicit
    if (data.users && Array.isArray(data.users)) {
      for (const u of data.users) {
        if (u._id) {
          await User.findByIdAndUpdate(u._id, u, { upsert: true })
        }
      }
      restoredCounts["users"] = data.users.length
    }

    // Log the restore in AuditLog
    await AuditLog.create({
      user: req.user?._id || req.user?.id,
      action: "RESTORE_DATABASE",
      entity: "DATABASE",
      details: `Restored backup from snapshot (${meta?.exportTimestamp || "unknown date"}) in ${restoreMode} mode.`,
      ip: req.ip,
    }).catch(() => {})

    res.json({
      success: true,
      message: `Database successfully restored in ${restoreMode} mode.`,
      meta,
      restoredCounts,
    })
  } catch (error) {
    res.status(500).json({ message: "Database restore failed: " + error.message })
  }
})

module.exports = router;
