const Brand = require("../models/Brand.js")
const Category = require("../models/Category.js")
const User = require("../models/User.js")
const bcrypt = require("bcryptjs")

const Product = require("../models/Product.js")
const Inventory = require("../models/Inventory.js")

const defaultCategories = [
  { name: "Whiskey", description: "Whiskey and Single Malts" },
  { name: "Beer", description: "Draught and Bottled Beers" },
  { name: "Rum", description: "Dark and White Rum" },
  { name: "Vodka", description: "Plain and Flavored Vodka" },
  { name: "Brandy", description: "Brandy and Cognac" },
  { name: "Gin", description: "Classic and Flavored Gin" },
  { name: "Wine", description: "Red and White Wine" },
  { name: "Cigarettes", description: "Cigarettes & Tobacco" },
  { name: "Soft Drinks / Mixers", description: "Soda, Juice, Energy drinks" },
  { name: "Snacks", description: "Bar bites and snacks" },
]

const defaultBrands = [
  { name: "Royal Challenge", description: "United Spirits" },
  { name: "McDowell's No.1", description: "United Spirits" },
  { name: "Officer's Choice", description: "Allied Blenders" },
  { name: "Imperial Blue", description: "Pernod Ricard" },
  { name: "Royal Stag", description: "Pernod Ricard" },
  { name: "Blenders Pride", description: "Pernod Ricard" },
  { name: "Kingfisher", description: "United Breweries" },
  { name: "Budweiser", description: "Anheuser-Busch InBev" },
  { name: "Carlsberg", description: "Carlsberg Group" },
  { name: "Tuborg", description: "Carlsberg Group" },
  { name: "Old Monk", description: "Mohan Meakin" },
  { name: "Bacardi", description: "Bacardi Limited" },
  { name: "Magic Moments", description: "Radico Khaitan" },
  { name: "Smirnoff", description: "Diageo" },
  { name: "Mansion House", description: "Tilaknagar Industries" },
  { name: "Gold Flake", description: "ITC Limited" },
  { name: "Classic", description: "ITC Limited" },
  { name: "Marlboro", description: "Philip Morris" },
  { name: "Wills", description: "ITC Limited" },
]

const seedDefaults = async () => {
  try {
    // 1. Seed / Upsert Categories
    for (const cat of defaultCategories) {
      await Category.findOneAndUpdate({ name: cat.name }, cat, { upsert: true, new: true })
    }

    // 2. Seed / Upsert Brands
    const brandMap = {}
    for (const br of defaultBrands) {
      const doc = await Brand.findOneAndUpdate({ name: br.name }, br, { upsert: true, new: true })
      brandMap[br.name] = doc._id
    }

    const cigCat = await Category.findOne({ name: "Cigarettes" })
    const beerCat = await Category.findOne({ name: "Beer" })
    const whiskyCat = await Category.findOne({ name: "Whiskey" })
    const rumCat = await Category.findOne({ name: "Rum" })

    // 3. Seed Users
    const userCount = await User.countDocuments()
    if (userCount === 0) {
      const adminPass = await bcrypt.hash("admin123", 10)
      const cashierPass = await bcrypt.hash("cashier123", 10)
      await User.create([
        { name: "Admin", email: "admin@suryabar.com", password: adminPass, role: "ADMIN" },
        { name: "Cashier", email: "cashier@suryabar.com", password: cashierPass, role: "CASHIER" },
      ])
      console.log("Default admin & cashier users seeded")
    }

    // 4. Seed Essential Starter Products & Cigarettes if product collection is empty
    const productCount = await Product.countDocuments()
    if (productCount === 0 && cigCat) {
      const starterProducts = [
        {
          name: "Classic Milds (Pack 20s)",
          brand: brandMap["Classic"],
          category: cigCat._id,
          size: "Pack 20s",
          unit: "pack",
          tp: { enabled: false, purchasePrice: 0, sellingPrice: 0, quantity: 0, minStock: 0 },
          nonTp: { enabled: true, purchasePrice: 300, sellingPrice: 360, quantity: 50, minStock: 10 },
        },
        {
          name: "Classic Milds (1 Stick)",
          brand: brandMap["Classic"],
          category: cigCat._id,
          size: "1 Stick",
          unit: "stick",
          tp: { enabled: false, purchasePrice: 0, sellingPrice: 0, quantity: 0, minStock: 0 },
          nonTp: { enabled: true, purchasePrice: 15, sellingPrice: 18, quantity: 200, minStock: 25 },
        },
        {
          name: "Gold Flake Kings (Pack 20s)",
          brand: brandMap["Gold Flake"],
          category: cigCat._id,
          size: "Pack 20s",
          unit: "pack",
          tp: { enabled: false, purchasePrice: 0, sellingPrice: 0, quantity: 0, minStock: 0 },
          nonTp: { enabled: true, purchasePrice: 300, sellingPrice: 360, quantity: 40, minStock: 8 },
        },
        {
          name: "Gold Flake Kings (1 Stick)",
          brand: brandMap["Gold Flake"],
          category: cigCat._id,
          size: "1 Stick",
          unit: "stick",
          tp: { enabled: false, purchasePrice: 0, sellingPrice: 0, quantity: 0, minStock: 0 },
          nonTp: { enabled: true, purchasePrice: 15, sellingPrice: 18, quantity: 180, minStock: 20 },
        },
        {
          name: "Marlboro Lights (Pack 20s)",
          brand: brandMap["Marlboro"],
          category: cigCat._id,
          size: "Pack 20s",
          unit: "pack",
          tp: { enabled: false, purchasePrice: 0, sellingPrice: 0, quantity: 0, minStock: 0 },
          nonTp: { enabled: true, purchasePrice: 320, sellingPrice: 380, quantity: 30, minStock: 5 },
        },
        {
          name: "Kingfisher Premium Lager 650ml",
          brand: brandMap["Kingfisher"],
          category: beerCat?._id,
          size: "650ml",
          unit: "bottle",
          tp: { enabled: true, purchasePrice: 145, sellingPrice: 190, quantity: 48, minStock: 6 },
          nonTp: { enabled: true, purchasePrice: 140, sellingPrice: 180, quantity: 24, minStock: 4 },
        },
        {
          name: "Royal Challenge Whisky 750ml",
          brand: brandMap["Royal Challenge"],
          category: whiskyCat?._id,
          size: "750ml",
          unit: "bottle",
          tp: { enabled: true, purchasePrice: 620, sellingPrice: 780, quantity: 24, minStock: 4 },
          nonTp: { enabled: true, purchasePrice: 600, sellingPrice: 750, quantity: 12, minStock: 3 },
        },
        {
          name: "Old Monk Legend Rum 750ml",
          brand: brandMap["Old Monk"],
          category: rumCat?._id,
          size: "750ml",
          unit: "bottle",
          tp: { enabled: true, purchasePrice: 420, sellingPrice: 540, quantity: 20, minStock: 3 },
          nonTp: { enabled: true, purchasePrice: 400, sellingPrice: 520, quantity: 10, minStock: 2 },
        },
      ]

      for (const pData of starterProducts) {
        if (!pData.category) continue
        const prod = await Product.create(pData)
        if (pData.tp && pData.tp.enabled) {
          await Inventory.create({
            product: prod._id,
            stockType: "TP",
            quantity: pData.tp.quantity,
            purchasePrice: pData.tp.purchasePrice,
            sellingPrice: pData.tp.sellingPrice,
            minStock: pData.tp.minStock,
          })
        }
        if (pData.nonTp && pData.nonTp.enabled) {
          await Inventory.create({
            product: prod._id,
            stockType: "NON_TP",
            quantity: pData.nonTp.quantity,
            purchasePrice: pData.nonTp.purchasePrice,
            sellingPrice: pData.nonTp.sellingPrice,
            minStock: pData.nonTp.minStock,
          })
        }
      }
      console.log("Seeded starter products and cigarettes successfully!")
    }
  } catch (error) {
    console.error("Error during auto-seeding:", error.message)
  }
}

module.exports = seedDefaults
