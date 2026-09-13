/**
 * Move the built client shell out of the publicly served directory.
 *
 * Vercel serves `outputDirectory` (dist/public) through its own static layer,
 * and that layer runs BEFORE the `/(.*)` rewrite in vercel.json. While
 * dist/public/index.html existed, a request for "/" was answered with the raw
 * pre-SSR shell - empty <div id="root">, unreplaced <!--SSR_HEAD-->, no title,
 * no meta description, no canonical - and the SSR handler was never reached.
 * Every other route SSR'd correctly because no static file shadowed it.
 *
 * serveStatic() in server/_core/prod.ts already passes `index: false` to guard
 * the self-hosted Express path, but that cannot help on Vercel because the
 * request never reaches Express. Relocating the shell to
 * dist/index.template.html means no static file claims "/", so it falls
 * through to the rewrite and gets server-rendered. Keeping it outside
 * dist/public also stops it being fetchable as a page of its own.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = path.resolve(root, "dist", "public", "index.html");
const target = path.resolve(root, "dist", "index.template.html");

if (!fs.existsSync(source)) {
  if (fs.existsSync(target)) {
    console.log("[finalize-client-build] template already relocated");
    process.exit(0);
  }
  console.error(`[finalize-client-build] expected client shell at ${source}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.renameSync(source, target);
console.log(
  "[finalize-client-build] dist/public/index.html -> dist/index.template.html"
);
