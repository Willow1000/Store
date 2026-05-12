import { supabase } from '@/lib/supabase';

export function getHighResImageUrl(url: string | null | undefined): string {
  if (!url) return '';

  let normalized = url.trim();

  // eBay thumbnails are often served from /thumbs/images/... and low s-lNNN sizes.
  normalized = normalized.replace('/thumbs/images/', '/images/');
  normalized = normalized.replace(/s-l\d+(\.(?:jpe?g|png|webp))/i, 's-l1600$1');

  // If the URL looks like a Supabase storage path (no protocol), try to convert it to a public URL.
  // Handle formats like:
  // - "products/abc.webp"
  // - "public/products/abc.webp"
  // - "/public/products/abc.webp"
  // - "/storage/v1/object/public/<bucket>/<path>"
  try {
    if (!/^https?:\/\//i.test(normalized)) {
      let candidate = normalized;

      // Handle the '/storage/v1/object/public/<bucket>/<path>' form
      const storagePrefix = '/storage/v1/object/public/';
      const storageIdx = candidate.indexOf(storagePrefix);
      if (storageIdx !== -1) {
        const after = candidate.slice(storageIdx + storagePrefix.length);
        const parts = after.split('/');
        if (parts.length > 1) {
          const bucket = parts[0];
          const path = parts.slice(1).join('/');
          const { data } = supabase.storage.from(bucket).getPublicUrl(path);
          if (data?.publicUrl) return data.publicUrl;
        }
      }

      // Trim a single leading slash when path starts with '/public/' so '/public/..' also works
      if (candidate.startsWith('/public/')) candidate = candidate.slice(1);

      // Now, if the candidate looks like '<bucket>/<path>' try to build a public URL
      const looksLikeBucketPath = /^[^:\/]+\/.+/i.test(candidate);
      if (looksLikeBucketPath) {
        const parts = candidate.split('/');
        let bucket = parts[0];
        let path = parts.slice(1).join('/');

        // If the bucket looks like a common static folder (images or data), avoid converting
        const staticFolders = ['images', 'data'];
        if (staticFolders.includes(bucket)) {
          // Keep as-is so browser will resolve `/images/...` or `/data/...` from public folder
          // If original had no leading slash, add one for relative-to-root access
          return normalized.startsWith('/') ? normalized : `/${normalized}`;
        }

        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        if (data?.publicUrl) {
          normalized = data.publicUrl;
        }
      }
    }
  } catch (e) {
    // Fall back to original value
  }

  return normalized;
}