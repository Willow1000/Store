import { getDb } from './db';

type SitemapKind = 'site' | 'products';

export async function generateSitemap(baseUrl: string, kind: SitemapKind = 'site'): Promise<string> {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  const db = await getDb();
  if (!db) {
    return generateBasicSitemap(normalizedBaseUrl, kind);
  }

  try {
    const now = new Date().toISOString().split('T')[0];

    const { products } = await import('../drizzle/schema');
    const allProducts = await db.select().from(products).limit(50000);

    if (kind === 'products') {
      let xml = createUrlsetOpen(true);
      allProducts.forEach((product: any) => {
        xml += renderProductUrl(normalizedBaseUrl, product);
      });
      xml += '</urlset>';
      return xml;
    }

    const { categories } = await import('../drizzle/schema');
    const allCategories = await db.select().from(categories).limit(1000);
    let xml = createUrlsetOpen(false);
    const priorityPages = [
      { loc: '/', changefreq: 'daily', priority: '1.0' },
      { loc: '/products', changefreq: 'daily', priority: '0.95' },
      { loc: '/about', changefreq: 'monthly', priority: '0.7' },
      { loc: '/help', changefreq: 'monthly', priority: '0.65' },
      { loc: '/contact', changefreq: 'monthly', priority: '0.65' },
      { loc: '/shipping', changefreq: 'monthly', priority: '0.6' },
      { loc: '/returns', changefreq: 'monthly', priority: '0.6' },
      { loc: '/faq', changefreq: 'monthly', priority: '0.6' },
      { loc: '/privacy', changefreq: 'yearly', priority: '0.3' },
      { loc: '/terms', changefreq: 'yearly', priority: '0.3' },
      { loc: '/cookies', changefreq: 'yearly', priority: '0.3' },
      { loc: '/accessibility', changefreq: 'yearly', priority: '0.3' },
    ];

    priorityPages.forEach((page) => {
      xml += renderUrl({
        loc: `${normalizedBaseUrl}${page.loc}`,
        lastmod: now,
        changefreq: page.changefreq,
        priority: page.priority,
      });
    });

    allCategories.forEach((category: any) => {
      const categoryValue = String(category.slug || category.name || '').trim();
      if (!categoryValue) return;

      xml += renderUrl({
        loc: `${normalizedBaseUrl}/products?category=${encodeURIComponent(categoryValue)}`,
        lastmod: now,
        changefreq: 'weekly',
        priority: '0.8',
      });
    });

    xml += '</urlset>';
    return xml;
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return generateBasicSitemap(normalizedBaseUrl, kind);
  }
}

function generateBasicSitemap(baseUrl: string, kind: SitemapKind): string {
  let xml = createUrlsetOpen(false);

  if (kind === 'products') {
    xml += '</urlset>';
    return xml;
  }

  const pages = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/products', priority: '0.95', changefreq: 'daily' },
    { loc: '/about', priority: '0.7', changefreq: 'monthly' },
    { loc: '/help', priority: '0.65', changefreq: 'monthly' },
    { loc: '/contact', priority: '0.65', changefreq: 'monthly' },
    { loc: '/shipping', priority: '0.6', changefreq: 'monthly' },
    { loc: '/returns', priority: '0.6', changefreq: 'monthly' },
    { loc: '/faq', priority: '0.6', changefreq: 'monthly' },
  ];

  const now = new Date().toISOString().split('T')[0];
  pages.forEach((page) => {
    xml += renderUrl({
      loc: `${baseUrl}${page.loc}`,
      lastmod: now,
      changefreq: page.changefreq,
      priority: page.priority,
    });
  });

  xml += '</urlset>';

  return xml;
}

function createUrlsetOpen(withImages: boolean): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
  if (withImages) {
    xml += '\n        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"';
  }
  xml += '>\n';
  return xml;
}

function renderUrl({
  loc,
  lastmod,
  changefreq,
  priority,
}: {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
}): string {
  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
    '',
  ].join('\n');
}

function renderProductUrl(baseUrl: string, product: any): string {
  const updatedAt = product.updatedAt || product.updated_at || product.createdAt || product.created_at || new Date();
  const lastmod = Number.isNaN(new Date(updatedAt).getTime())
    ? new Date().toISOString().split('T')[0]
    : new Date(updatedAt).toISOString().split('T')[0];
  const title = product.name || product.title || 'MotorVault product';
  const description = product.description || product.item_specifics || '';
  const images = normalizeImages(product.images || product.image_urls || product.coverImageUrl || product.cover_image_url, baseUrl);

  let xml = [
    '  <url>',
    `    <loc>${escapeXml(`${baseUrl}/product/${product.id}`)}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    '    <changefreq>weekly</changefreq>',
    '    <priority>0.7</priority>',
  ].join('\n');

  images.slice(0, 1000).forEach((image) => {
    xml += '\n    <image:image>';
    xml += `\n      <image:loc>${escapeXml(image)}</image:loc>`;
    xml += `\n      <image:title>${escapeXml(title)}</image:title>`;
    if (description) {
      xml += `\n      <image:caption>${escapeXml(String(description).substring(0, 2048))}</image:caption>`;
    }
    xml += '\n    </image:image>';
  });

  xml += '\n  </url>\n';
  return xml;
}

function normalizeImages(value: unknown, baseUrl: string): string[] {
  let images = value;

  if (typeof images === 'string') {
    try {
      images = JSON.parse(images);
    } catch {
      images = [images];
    }
  }

  const rawImages = Array.isArray(images) ? images : images ? [images] : [];

  return Array.from(
    new Set(
      rawImages
        .map((image) => {
          if (typeof image === 'string') return image;
          if (image && typeof image === 'object' && 'url' in image) return String((image as any).url || '');
          if (image && typeof image === 'object' && 'image_url' in image) return String((image as any).image_url || '');
          return '';
        })
        .map((image) => image.trim())
        .filter(Boolean)
        .map((image) => {
          try {
            return new URL(image, baseUrl).href;
          } catch {
            return image;
          }
        })
    )
  );
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
