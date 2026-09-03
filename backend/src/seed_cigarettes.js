const mongoose = require('mongoose');
const Category = require('./models/Category');
const Brand = require('./models/Brand');
const Product = require('./models/Product');
const Inventory = require('./models/Inventory');

mongoose.connect('mongodb://localhost:27017/surya_bar').then(async () => {
  // 1. Remove TEST / TEST2 dummy records
  await Category.deleteMany({ name: { $in: ['TEST', 'TEST2'] } });
  await Brand.deleteMany({ name: { $in: ['TEST', 'TEST2'] } });
  await Product.deleteMany({ name: { $in: ['TEST', 'TEST2'] } });

  // 2. Ensure Cigarettes category
  let cigCat = await Category.findOne({ name: 'Cigarettes' });
  if (!cigCat) {
    cigCat = await Category.create({ name: 'Cigarettes', description: 'Cigarettes & Tobacco' });
    console.log('Created Cigarettes category');
  }

  // 3. Brands
  const brandNames = ['Gold Flake', 'Classic', 'Marlboro', 'Wills'];
  const brands = {};
  for (const b of brandNames) {
    let brandDoc = await Brand.findOne({ name: b });
    if (!brandDoc) {
      brandDoc = await Brand.create({ name: b, description: b + ' Cigarettes' });
    }
    brands[b] = brandDoc._id;
  }

  // 4. Cigarette products
  const cigProducts = [
    {
      name: 'Gold Flake Kings (Single)',
      brand: brands['Gold Flake'],
      category: cigCat._id,
      size: '1 Stick',
      unit: 'stick',
      tp: { enabled: false, purchasePrice: 0, sellingPrice: 0, quantity: 0, minStock: 0 },
      nonTp: { enabled: true, purchasePrice: 15, sellingPrice: 18, quantity: 150, minStock: 20 },
    },
    {
      name: 'Gold Flake Kings (Pack 20s)',
      brand: brands['Gold Flake'],
      category: cigCat._id,
      size: 'Pack 20s',
      unit: 'pack',
      tp: { enabled: false, purchasePrice: 0, sellingPrice: 0, quantity: 0, minStock: 0 },
      nonTp: { enabled: true, purchasePrice: 300, sellingPrice: 360, quantity: 25, minStock: 5 },
    },
    {
      name: 'Classic Milds (Single)',
      brand: brands['Classic'],
      category: cigCat._id,
      size: '1 Stick',
      unit: 'stick',
      tp: { enabled: false, purchasePrice: 0, sellingPrice: 0, quantity: 0, minStock: 0 },
      nonTp: { enabled: true, purchasePrice: 15, sellingPrice: 18, quantity: 120, minStock: 20 },
    },
    {
      name: 'Classic Milds (Pack 20s)',
      brand: brands['Classic'],
      category: cigCat._id,
      size: 'Pack 20s',
      unit: 'pack',
      tp: { enabled: false, purchasePrice: 0, sellingPrice: 0, quantity: 0, minStock: 0 },
      nonTp: { enabled: true, purchasePrice: 300, sellingPrice: 360, quantity: 30, minStock: 5 },
    },
    {
      name: 'Marlboro Lights (Single)',
      brand: brands['Marlboro'],
      category: cigCat._id,
      size: '1 Stick',
      unit: 'stick',
      tp: { enabled: false, purchasePrice: 0, sellingPrice: 0, quantity: 0, minStock: 0 },
      nonTp: { enabled: true, purchasePrice: 17, sellingPrice: 20, quantity: 100, minStock: 15 },
    },
    {
      name: 'Marlboro Red / Lights (Pack 20s)',
      brand: brands['Marlboro'],
      category: cigCat._id,
      size: 'Pack 20s',
      unit: 'pack',
      tp: { enabled: false, purchasePrice: 0, sellingPrice: 0, quantity: 0, minStock: 0 },
      nonTp: { enabled: true, purchasePrice: 320, sellingPrice: 380, quantity: 20, minStock: 5 },
    },
    {
      name: 'Wills Navy Cut (Pack 10s)',
      brand: brands['Wills'],
      category: cigCat._id,
      size: 'Pack 10s',
      unit: 'pack',
      tp: { enabled: false, purchasePrice: 0, sellingPrice: 0, quantity: 0, minStock: 0 },
      nonTp: { enabled: true, purchasePrice: 90, sellingPrice: 110, quantity: 40, minStock: 10 },
    },
    {
      name: 'Gold Flake Super Star (Pack 10s)',
      brand: brands['Gold Flake'],
      category: cigCat._id,
      size: 'Pack 10s',
      unit: 'pack',
      tp: { enabled: false, purchasePrice: 0, sellingPrice: 0, quantity: 0, minStock: 0 },
      nonTp: { enabled: true, purchasePrice: 65, sellingPrice: 80, quantity: 35, minStock: 10 },
    }
  ];

  for (const item of cigProducts) {
    let existing = await Product.findOne({ name: item.name });
    if (!existing) {
      existing = await Product.create(item);
      await Inventory.create({
        product: existing._id,
        stockType: 'NON_TP',
        quantity: item.nonTp.quantity,
        purchasePrice: item.nonTp.purchasePrice,
        sellingPrice: item.nonTp.sellingPrice,
        minStock: item.nonTp.minStock
      });
      console.log('Created product & inventory:', item.name);
    }
  }

  console.log('Cigarettes setup completed successfully!');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
