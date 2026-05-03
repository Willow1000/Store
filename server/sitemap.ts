import { getDb } from './db';

export async function generateSitemap(baseUrl: string): Promise<string> {
  const db = await getDb();
  if (!db) {
    return generateBasicSitemap(baseUrl);
  }

  try {
    // Fetch all products
    const { products } = await import('../drizzle/schema');
    const allProducts = await db.select().from(products).limit(50000);

    // Fetch all categories
    const { categories } = await import('../drizzle/schema');
    const allCategories = await db.select().from(categories).limit(1000);

    // Generate XML sitemap with proper namespaces for images and mobile
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '         xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n';
    xml += '         xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0">\n';

    // Priority pages
    const priorityPages = [
      { loc: '/', changefreq: 'daily', priority: 1.0 },
      { loc: '/products', changefreq: 'daily', priority: 0.95 },
      { loc: '/new', changefreq: 'daily', priority: 0.9 },
      { loc: '/deals', changefreq: 'daily', priority: 0.9 },
      { loc: '/trending', changefreq: 'daily', priority: 0.85 },
      { loc: '/search', changefreq: 'weekly', priority: 0.7 },
    ];

    priorityPages.forEach((page: any) => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}${page.loc}</loc>\n`;
      xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `    <mobile:mobile/>\n`;
      xml += `  </url>\n`;
    });

    // Category pages
    allCategories.forEach((category: any) => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/products?category=${category.slug}</loc>\n`;
      xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `    <mobile:mobile/>\n`;
      xml += `  </url>\n`;
    });

    // Product detail pages with enhanced metadata
    allProducts.forEach((product: any) => {
      const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/product/${product.id}</loc>\n`;
      xml += `    <lastmod>${new Date(product.updatedAt).toISOString().split('T')[0]}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `    <mobile:mobile/>\n`;

      // Add product images (up to 1000 per URL per Google specs)
      if (Array.isArray(images) && images.length > 0) {
        images.slice(0, 1000).forEach((image: string) => {
          xml += `    <image:image>\n`;
          xml += `      <image:loc>${encodeURI(image)}</image:loc>\n`;
          xml += `      <image:title>${escapeXml(product.name)}</image:title>\n`;
          if (product.description) {
            xml += `      <image:caption>${escapeXml(product.description.substring(0, 2048))}</image:caption>\n`;
          }
          xml += `    </image:image>\n`;
        });
      }

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
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '         xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0">\n';

  const pages = [
    { loc: '/', priority: 1.0, changefreq: 'daily' },
    { loc: '/products', priority: 0.9, changefreq: 'daily' },
    { loc: '/new', priority: 0.9, changefreq: 'daily' },
    { loc: '/deals', priority: 0.9, changefreq: 'daily' },
    { loc: '/trending', priority: 0.85, changefreq: 'weekly' },
    { loc: '/search', priority: 0.7, changefreq: 'weekly' },
    { loc: '/account', priority: 0.6, changefreq: 'monthly' },
    { loc: '/orders', priority: 0.6, changefreq: 'monthly' },
  ];

  pages.forEach((page: any) => {
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}${page.loc}</loc>\n`;
    xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += `    <mobile:mobile/>\n`;
    xml += `  </url>\n`;
  });

  xml += '</urlset>';

  return xml;
}

// Helper function to escape XML special characters
function escapeXml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
