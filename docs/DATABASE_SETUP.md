# Database Setup & Product Seeding

## Prerequisites

Make sure you have:
1. MySQL database running and accessible
2. `DATABASE_URL` environment variable set (e.g., `mysql://user:password@localhost:3306/modernmart`)
3. Database migrations run: `npm run db:migrate`

## Seeding the Database

The website requires products in the database to display on pages like `/deals`, `/new`, `/trending`.

### Step 1: Set Up Environment Variables

Create or update your `.env.local` file with:
```bash
DATABASE_URL=mysql://username:password@localhost:3306/modernmart
```

### Step 2: Run Migrations

Apply all pending migrations:
```bash
npm run db:migrate
```

Or with Drizzle CLI:
```bash
npx drizzle-kit migrate
```

### Step 3: Seed the Database

Populate the database with sample products:
```bash
npx ts-node server/seed.ts
```

You should see output like:
```
🌱 Starting database seed...
📁 Inserting categories...
✅ Created 5 categories
📦 Inserting products...
✅ Created 16 products
✨ Database seed completed successfully!
```

## Verify Data

Check your database to confirm products were inserted:
```bash
# MySQL
mysql> SELECT COUNT(*) FROM products;
mysql> SELECT COUNT(*) FROM categories;
```

## What Gets Seeded

The seed script creates:
- **5 Categories**: Electronics, Fashion, Home & Garden, Sports & Outdoors, Books & Media
- **16 Sample Products** with:
  - Product names and descriptions
  - Pricing (with original prices for deals)
  - Categories
  - Ratings and reviews
  - Free shipping flags
  - Featured product marks

## Pages That Need Products

After seeding, these pages will display products:

| Page | Query | Min Required |
|------|-------|--------------|
| `/new` (New Arrivals) | Newest products by `createdAt` | 30 products |
| `/deals` | Products with 20%+ discount | 20 products |
| `/trending` | Popular products by rating + recency | 20 products |
| `/products` | All products | Any amount |
| `/` (Home) | Featured products + recently viewed | Featured items |

## Adding More Products

You can add products directly via:

### Option 1: Extend the seed script
Edit `server/seed.ts` and add more products to the `productData` array, then run seed again.

### Option 2: Create via tRPC (if you implement a CMS)
Update the server to accept product creation mutations.

### Option 3: Direct database insert
```sql
INSERT INTO products (name, description, price, originalPrice, categoryId, sellerId, rating, totalReviews, featured, freeShipping, createdAt, updatedAt) 
VALUES ('Product Name', 'Description', 99.99, 199.99, 1, 1, 4.5, 100, true, true, NOW(), NOW());
```

## Troubleshooting

### Seed script fails with "Database connection failed"
- Check that `DATABASE_URL` is set correctly
- Verify MySQL server is running
- Ensure database exists and is accessible

### Products not showing on pages
1. Run `npm run db:migrate` to create tables
2. Run seed: `npx ts-node server/seed.ts`
3. Refresh the browser page
4. Check browser DevTools console for errors

### Categories created but no products
- This means the seed script ran but products didn't insert
- Check database logs for INSERT errors
- Delete existing categories and run seed again

## Database Schema

### Products Table
```sql
CREATE TABLE products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  originalPrice DECIMAL(10, 2),
  categoryId INT NOT NULL,
  sellerId INT NOT NULL,
  condition ENUM('new', 'like-new', 'good', 'fair', 'used') DEFAULT 'new',
  images JSON,
  stock INT DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 0,
  totalReviews INT DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  freeShipping BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Categories Table
```sql
CREATE TABLE categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(255),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Next Steps

After seeding:
1. ✅ Visit `/deals` to see discounted products
2. ✅ Visit `/new` to see newest products
3. ✅ Visit `/trending` to see trending products
4. ✅ Visit `/products` to see all products
5. ✅ Test filters and sorting on product pages

## Production Considerations

For production:
- Don't run seed.ts in production (it can cause duplicates)
- Use a proper database backup and restore strategy
- Implement a CMS or admin panel for product management
- Consider using transaction migrations for larger datasets
- Monitor database growth and implement cleanup policies

## References

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [tRPC Documentation](https://trpc.io/)
