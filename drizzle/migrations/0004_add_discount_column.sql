-- Add discount column to products table (stores original price before discount)
ALTER TABLE `products` ADD COLUMN `discount` DECIMAL(10, 2) NULL;
