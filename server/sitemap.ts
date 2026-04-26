import { getDb } from './db';

export async function generateSitemap(baseUrl: string): Promise<string> {
  const db = await getDb();
  if (!db) {
    return generateBasicSitemap(baseUrl);
  }

  try {
    // Fetch all products
    const { products } = await import('../drizzle/schema');
    const allProducts = await db.select().from(products).limit(10000);

    // Fetch all categories
    const { categories } = await import('../drizzle/schema');
    const allCategories = await db.select().from(categories).limit(1000);

    // Generate XML sitemap
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '         xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n';
    xml += '         xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0">\n';

    // Homepage
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>1.0</priority>\n`;
    xml += `  </url>\n`;

    // Products page
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/products</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.9</priority>\n`;
    xml += `  </url>\n`;

    // Category pages
    allCategories.forEach((category: any) => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/products?category=${category.slug}</loc>\n`;
      xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    });

    // Product detail pages
    allProducts.forEach((product: any) => {
      const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/product/${product.id}</loc>\n`;
      xml += `    <lastmod>${new Date(product.updatedAt).toISOString().split('T')[0]}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;

      // Add product images
      if (Array.isArray(images) && images.length > 0) {
        images.slice(0, 10).forEach((image: string) => {
          xml += `    <image:image>\n`;
          xml += `      <image:loc>${image}</image:loc>\n`;
          xml += `      <image:title>${product.name}</image:title>\n`;
          xml += `    </image:image>\n`;
        });
      }

      xml += `  </url>\n`;
    });

    // Other important pages
    const otherPages = [
      { loc: '/account', priority: 0.6, changefreq: 'monthly' },
      { loc: '/orders', priority: 0.6, changefreq: 'monthly' },
    ];

    otherPages.forEach((page: any) => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}${page.loc}</loc>\n`;
      xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    });

    xml += '</urlset>';

    return xml;
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return generateBasicSitemap(baseUrl);
  }
}

function generateBasicSitemap(baseUrl: string): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  const pages = [
    { loc: '/', priority: 1.0, changefreq: 'daily' },
    { loc: '/products', priority: 0.9, changefreq: 'daily' },
    { loc: '/account', priority: 0.6, changefreq: 'monthly' },
    { loc: '/orders', priority: 0.6, changefreq: 'monthly' },
  ];

  pages.forEach((page: any) => {
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}${page.loc}</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += `  </url>\n`;
  });

  xml += '</urlset>';

  return xml;
}
