import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { mergeConfig } from 'vite';

const ROUTES_TO_PRERENDER = [
  '/',
  '/about',
  '/products',
  '/contact',
  '/shipping',
  '/returns',
  '/faq',
  '/help',
  '/privacy',
  '/terms',
  '/cookies',
  '/accessibility',
] as const;

function normalizeRoute(route: string): string {
  if (route === '/') return '/';
  return route.startsWith('/') ? route : `/${route}`;
}

function routeOutputPath(distPublicDir: string, route: string): string {
  if (route === '/') {
    return path.join(distPublicDir, 'index.html');
  }

  const slug = route.replace(/^\//, '');
  return path.join(distPublicDir, slug, 'index.html');
}

async function ensureDir(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function prerender(): Promise<void> {
  const projectRoot = process.cwd();
  const distPublicDir = path.join(projectRoot, 'dist', 'public');
  const distTemplatePath = path.join(distPublicDir, 'index.html');

  const baseTemplate = await fs.readFile(distTemplatePath, 'utf-8');

  const mainViteConfig = (await import('../vite.config.ts')).default;
  const prerenderConfig = mergeConfig(
    mainViteConfig,
    {
      appType: 'custom',
      server: {
        middlewareMode: true,
        hmr: false,
      },
      optimizeDeps: {
        noDiscovery: true,
        include: [],
      },
    },
    false,
  );

  const vite = await createServer(prerenderConfig);

  try {
    const ssrModule = await vite.ssrLoadModule('/src/entry-server.tsx');
    const render = ssrModule.render as ((url: string) => Promise<string>) | undefined;

    if (typeof render !== 'function') {
      throw new Error('SSR render function not found in /src/entry-server.tsx');
    }

    for (const rawRoute of ROUTES_TO_PRERENDER) {
      const route = normalizeRoute(rawRoute);
      const appHtml = await render(route);
      const html = baseTemplate.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);
      const outPath = routeOutputPath(distPublicDir, route);
      await ensureDir(outPath);
      await fs.writeFile(outPath, html, 'utf-8');
      process.stdout.write(`[prerender] ${route} -> ${path.relative(projectRoot, outPath)}\n`);
    }
  } finally {
    await vite.close();
  }
}

prerender().catch((error) => {
  console.error('[prerender] Failed to generate SSR pages:', error);
  process.exitCode = 1;
});
