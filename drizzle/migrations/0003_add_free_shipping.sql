-- Add freeShipping column to products table
ALTER TABLE `products` ADD COLUMN `freeShipping` boolean NOT NULL DEFAULT false;
