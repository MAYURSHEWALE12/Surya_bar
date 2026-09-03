-- Surya Bar & Restaurant POS - MySQL Schema
-- 1-Click Import for phpMyAdmin / cPanel MySQL

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+05:30";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('ADMIN', 'CASHIER') DEFAULT 'CASHIER',
  `status` ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT,
  `active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Brands Table
CREATE TABLE IF NOT EXISTS `brands` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT,
  `active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Products Table
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `brand_id` INT NULL,
  `category_id` INT NULL,
  `size` VARCHAR(50) DEFAULT '750ml',
  `unit` VARCHAR(20) DEFAULT 'bottle',
  `barcode` VARCHAR(100) NULL,
  `sku` VARCHAR(100) NULL,
  `description` TEXT,
  `active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Inventories Table (Dual stock: TP vs NON_TP)
CREATE TABLE IF NOT EXISTS `inventories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `stock_type` ENUM('TP', 'NON_TP') NOT NULL,
  `enabled` TINYINT(1) DEFAULT 1,
  `quantity` INT NOT NULL DEFAULT 0,
  `purchase_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `selling_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `min_stock` INT NOT NULL DEFAULT 5,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `prod_stock_type` (`product_id`, `stock_type`),
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Customers Table (Khata / Borrow Ledger)
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(15) NOT NULL UNIQUE,
  `email` VARCHAR(100) NULL,
  `address` TEXT NULL,
  `credit_limit` DECIMAL(10,2) DEFAULT 10000.00,
  `current_balance` DECIMAL(10,2) DEFAULT 0.00,
  `active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Credit Transactions Table
CREATE TABLE IF NOT EXISTS `credit_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT NOT NULL,
  `sale_id` INT NULL,
  `type` ENUM('BORROW', 'PAYMENT') NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `balance_after` DECIMAL(10,2) NOT NULL,
  `payment_method` VARCHAR(50) DEFAULT 'CASH',
  `notes` TEXT NULL,
  `cashier_id` INT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Sales Table (Invoices)
CREATE TABLE IF NOT EXISTS `sales` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_number` VARCHAR(50) NOT NULL UNIQUE,
  `customer_id` INT NULL,
  `cashier_id` INT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `discount_type` ENUM('PERCENT', 'FLAT') DEFAULT 'PERCENT',
  `discount_value` DECIMAL(10,2) DEFAULT 0.00,
  `discount_amount` DECIMAL(10,2) DEFAULT 0.00,
  `tax` DECIMAL(10,2) DEFAULT 0.00,
  `grand_total` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `payment_method` ENUM('CASH', 'UPI', 'CARD', 'BORROW', 'OTHER') DEFAULT 'CASH',
  `status` ENUM('ACTIVE', 'VOIDED') DEFAULT 'ACTIVE',
  `void_reason` TEXT NULL,
  `voided_at` DATETIME NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`cashier_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Sale Items Table
CREATE TABLE IF NOT EXISTS `sale_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sale_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `stock_type` ENUM('TP', 'NON_TP') NOT NULL,
  `product_name` VARCHAR(150) NOT NULL,
  `size` VARCHAR(50) NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `total` DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Vendors Table
CREATE TABLE IF NOT EXISTS `vendors` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `contact_person` VARCHAR(100) NULL,
  `phone` VARCHAR(20) NULL,
  `email` VARCHAR(100) NULL,
  `address` TEXT NULL,
  `gstin` VARCHAR(30) NULL,
  `active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Purchases Table (Inward Stock)
CREATE TABLE IF NOT EXISTS `purchases` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `purchase_number` VARCHAR(50) NOT NULL UNIQUE,
  `vendor_id` INT NULL,
  `invoice_date` DATE NOT NULL,
  `total_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `payment_status` ENUM('PAID', 'PENDING', 'PARTIAL') DEFAULT 'PAID',
  `payment_method` VARCHAR(50) DEFAULT 'BANK_TRANSFER',
  `notes` TEXT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. Purchase Items Table
CREATE TABLE IF NOT EXISTS `purchase_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `purchase_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `stock_type` ENUM('TP', 'NON_TP') NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `purchase_price` DECIMAL(10,2) NOT NULL,
  `selling_price` DECIMAL(10,2) NOT NULL,
  `total` DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Audit Logs Table
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity` VARCHAR(100) NOT NULL,
  `details` TEXT NULL,
  `ip` VARCHAR(50) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Default Data Seeds
INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `status`) VALUES
(1, 'Admin', 'admin@suryabar.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ADMIN', 'ACTIVE'),
(2, 'Cashier', 'cashier@suryabar.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'CASHIER', 'ACTIVE')
ON DUPLICATE KEY UPDATE `id`=`id`;

INSERT INTO `categories` (`id`, `name`, `description`) VALUES
(1, 'Whiskey', 'Whiskey and Single Malts'),
(2, 'Beer', 'Draught and Bottled Beers'),
(3, 'Rum', 'Dark and White Rum'),
(4, 'Vodka', 'Plain and Flavored Vodka'),
(5, 'Brandy', 'Brandy and Cognac'),
(6, 'Gin', 'Classic and Flavored Gin'),
(7, 'Wine', 'Red and White Wine'),
(8, 'Cigarettes', 'Cigarettes & Tobacco'),
(9, 'Soft Drinks / Mixers', 'Soda, Juice, Energy drinks'),
(10, 'Snacks', 'Bar bites and snacks')
ON DUPLICATE KEY UPDATE `id`=`id`;

INSERT INTO `brands` (`id`, `name`, `description`) VALUES
(1, 'Royal Challenge', 'United Spirits'),
(2, 'McDowell''s No.1', 'United Spirits'),
(3, 'Officer''s Choice', 'Allied Blenders'),
(4, 'Imperial Blue', 'Pernod Ricard'),
(5, 'Royal Stag', 'Pernod Ricard'),
(6, 'Blenders Pride', 'Pernod Ricard'),
(7, 'Kingfisher', 'United Breweries'),
(8, 'Budweiser', 'Anheuser-Busch InBev'),
(9, 'Carlsberg', 'Carlsberg Group'),
(10, 'Tuborg', 'Carlsberg Group'),
(11, 'Old Monk', 'Mohan Meakin'),
(12, 'Bacardi', 'Bacardi Limited'),
(13, 'Magic Moments', 'Radico Khaitan'),
(14, 'Gold Flake', 'ITC Limited'),
(15, 'Classic', 'ITC Limited'),
(16, 'Marlboro', 'Philip Morris')
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Starter Products
INSERT INTO `products` (`id`, `name`, `brand_id`, `category_id`, `size`, `unit`, `barcode`, `sku`) VALUES
(1, 'Royal Challenge Premium', 1, 1, '750ml', 'bottle', '890103001', 'RC-750'),
(2, 'Blenders Pride Rare', 6, 1, '750ml', 'bottle', '890103002', 'BP-750'),
(3, 'Kingfisher Premium Lager', 7, 2, '650ml', 'bottle', '890103003', 'KF-650'),
(4, 'Budweiser Magnum Strong', 8, 2, '650ml', 'bottle', '890103004', 'BUD-650'),
(5, 'Old Monk Legend Rum', 11, 3, '750ml', 'bottle', '890103005', 'OM-750'),
(6, 'Magic Moments Grain Vodka', 13, 4, '750ml', 'bottle', '890103006', 'MM-750'),
(7, 'Classic Regular 20s Pack', 15, 8, 'Pack', 'packet', '890103007', 'CLS-20'),
(8, 'Gold Flake Kings 10s', 14, 8, 'Pack', 'packet', '890103008', 'GFK-10')
ON DUPLICATE KEY UPDATE `id`=`id`;

-- Dual TP and Non-TP Starter Stock
INSERT INTO `inventories` (`product_id`, `stock_type`, `enabled`, `quantity`, `purchase_price`, `selling_price`, `min_stock`) VALUES
(1, 'TP', 1, 45, 620.00, 850.00, 5),
(1, 'NON_TP', 1, 60, 580.00, 780.00, 5),
(2, 'TP', 1, 30, 720.00, 980.00, 5),
(2, 'NON_TP', 1, 40, 680.00, 920.00, 5),
(3, 'TP', 1, 120, 140.00, 220.00, 12),
(3, 'NON_TP', 1, 80, 130.00, 200.00, 12),
(4, 'TP', 1, 90, 170.00, 260.00, 10),
(4, 'NON_TP', 1, 50, 160.00, 240.00, 10),
(5, 'TP', 1, 55, 450.00, 650.00, 5),
(5, 'NON_TP', 1, 70, 420.00, 600.00, 5),
(6, 'TP', 1, 35, 510.00, 720.00, 5),
(6, 'NON_TP', 1, 45, 480.00, 680.00, 5),
(7, 'TP', 1, 50, 280.00, 360.00, 5),
(7, 'NON_TP', 1, 100, 270.00, 340.00, 10),
(8, 'TP', 1, 80, 150.00, 190.00, 10),
(8, 'NON_TP', 1, 120, 140.00, 180.00, 10)
ON DUPLICATE KEY UPDATE `id`=`id`;

COMMIT;

