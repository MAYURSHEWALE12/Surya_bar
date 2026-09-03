const Brand = require("../models/Brand.js")
const Category = require("../models/Category.js")
const User = require("../models/User.js")
const bcrypt = require("bcryptjs")

const defaultCategories = [
  { name: "Whiskey", description: "Whiskey and Single Malts" },
  { name: "Beer", description: "Draught and Bottled Beers" },
  { name: "Rum", description: "Dark and White Rum" },
  { name: "Vodka", description: "Plain and Flavored Vodka" },
  { name: "Brandy", description: "Brandy and Cognac" },
  { name: "Gin", description: "Classic and Flavored Gin" },
  { name: "Wine", description: "Red and White Wine" },
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
]

const seedDefaults = async () => {
  try {
    const categoryCount = await Category.countDocuments()
    if (categoryCount === 0) {
      await Category.insertMany(defaultCategories)
      console.log("Default categories seeded successfully")
    }

    const brandCount = await Brand.countDocuments()
    if (brandCount === 0) {
      await Brand.insertMany(defaultBrands)
      console.log("Default brands seeded successfully")
    }

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
  } catch (error) {
    console.error("Error during auto-seeding:", error.message)
  }
}

module.exports = seedDefaults
