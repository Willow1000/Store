import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { getHighResImageUrl } from "@/lib/images";

type ProductImageProps = {
  src: string | null | undefined;
  alt: string;
  /** Classes for the well (set the aspect ratio / size here). */
  className?: string;
  /** Classes for the <img> itself (padding etc). */
  imgClassName?: string;
  /** Above-the-fold images load eagerly; everything else is lazy. */
  priority?: boolean;
  sizes?: string;
  /** Hide the "no image" caption on tiny thumbnails. */
  compactFallback?: boolean;
};

/**
 * Catalogue photos are hot-linked from many third-party hosts, so they arrive
 * in every aspect ratio, on every background, and some URLs are simply dead.
 * This renders any of them consistently: contained (never cropped) on one
 * neutral well, with a quiet placeholder instead of a broken-image icon or an
 * empty box when the file is missing or fails to load.
 *
 * No `crossOrigin` attribute: forcing CORS mode makes the image fail outright
 * on any host that does not send CORS headers, and nothing reads the pixels.
 */
export function ProductImage({
  src,
  alt,
  className,
  imgClassName,
  priority = false,
  sizes,
  compactFallback = false,
}: ProductImageProps) {
  const resolved = getHighResImageUrl(src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  const showFallback = !resolved || failed;

  return (
    <div className={cn("relative isolate overflow-hidden bg-well", className)}>
      {showFallback ? (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-gray-400"
          role="img"
          aria-label={alt}
        >
          <ImageOff
            className={compactFallback ? "h-4 w-4" : "h-7 w-7"}
            strokeWidth={1.5}
            aria-hidden="true"
          />
          {!compactFallback && (
            <span className="text-xs font-medium tracking-wide">
              Photo unavailable
            </span>
          )}
        </div>
      ) : (
        <img
          src={resolved}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          sizes={sizes}
          referrerPolicy="no-referrer"
          draggable={false}
          onError={() => setFailed(true)}
          className={cn(
            // multiply lets white studio backgrounds melt into the well
            "absolute inset-0 h-full w-full object-contain mix-blend-multiply",
            imgClassName
          )}
        />
      )}
    </div>
  );
}

export default ProductImage;
