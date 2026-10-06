import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ShareButtonProps = {
  /** Title passed to the native share sheet. */
  title: string;
  /** Path or absolute URL to share; defaults to the current page. */
  url?: string;
  className?: string;
};

/**
 * "Share" control: opens the device share sheet where there is one, and
 * otherwise copies the page link. It shares the clean page URL (no tracking
 * parameters are added).
 */
export function ShareButton({ title, url, className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const target = new URL(
      url || window.location.pathname,
      window.location.origin
    ).href;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url: target });
        return;
      }
      await navigator.clipboard.writeText(target);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Share sheet dismissed or clipboard unavailable: nothing to do.
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={cn(
        "inline-flex min-h-10 items-center gap-2 rounded-md px-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-ink",
        className
      )}
    >
      {copied ? (
        <Check className="h-4 w-4 text-success" aria-hidden="true" />
      ) : (
        <Share2 className="h-4 w-4" aria-hidden="true" />
      )}
      <span key={copied ? "copied" : "share"} aria-live="polite">
        {copied ? "Link copied" : "Share"}
      </span>
    </button>
  );
}

export default ShareButton;
