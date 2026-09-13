import { useEffect, useState } from "react";
import {
  SITE_LANGUAGE_CHANGED_EVENT,
  getSiteLanguage,
  type SiteLanguageCode,
} from "@/lib/language";

/**
 * Current site language, re-rendering the caller when it changes.
 *
 * Reading getSiteLanguage() directly during render returns the right value on
 * first paint but never updates, so a component that did that stayed in the old
 * language until something else happened to re-render it. Region detection also
 * resolves asynchronously after mount, so the first value is frequently the
 * pre-detection default.
 *
 * The "storage" listener covers the language being changed in another tab.
 */
export function useSiteLanguage(): SiteLanguageCode {
  const [language, setLanguage] = useState<SiteLanguageCode>(getSiteLanguage);

  useEffect(() => {
    const sync = () => setLanguage(getSiteLanguage());

    const onStorage = (event: StorageEvent) => {
      if (event.key === "site-language") sync();
    };

    // Detection may have resolved between first render and this effect.
    sync();

    window.addEventListener(SITE_LANGUAGE_CHANGED_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SITE_LANGUAGE_CHANGED_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return language;
}
