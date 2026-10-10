import { useEffect, useState } from "react";
import type { SiteLanguageCode } from "./language";
import {
  getStaticSourcePairs,
  getStaticallyTranslatedValues,
} from "./language";
import {
  getUiStringPairs,
  getUiStringValues,
  type TranslatableLanguage,
} from "@/i18n/uiStrings";

type AttrName = "placeholder" | "title" | "aria-label" | "alt";

const ATTR_TRANSLATE_ELEMENTS = [
  "input",
  "textarea",
  "button",
  "img",
  "a",
  "select",
  "option",
].join(",");

const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "CODE",
  "PRE",
  "TEXTAREA",
  "INPUT",
]);
const ATTRS: AttrName[] = ["placeholder", "title", "aria-label", "alt"];
const SECTION_TRANSLATE_SELECTOR =
  "header, main, footer, section, article, aside, nav, [data-translate-section]";
const SECTION_PENDING_ATTR = "data-translate-pending";
const LEGACY_SECTION_STYLE_ID = "mv-translate-section-style";

const translationCache = new Map<string, string>();
const TRANSLATE_CONCURRENCY = 6;
const TRANSLATE_BATCH_SIZE = 40;
/** Keeps one request body small enough that long descriptions never fail it. */
const TRANSLATE_BATCH_CHARS = 5000;
const RETRY_DELAY_MS = 2000;
const MAX_RETRIES = 3;
const APPLY_DEBOUNCE_MS = 0;
const TRANSLATION_CACHE_KEY = "site-translation-cache-v1";
const MAX_PERSISTED_TRANSLATIONS = 4000;
const PERSIST_DEBOUNCE_MS = 500;
const ENABLE_RUNTIME_TRANSLATION =
  import.meta.env.VITE_ENABLE_RUNTIME_TRANSLATION !== "false";

let persistedCacheLoaded = false;

const seededLanguages = new Set<SiteLanguageCode>();
const alreadyTranslatedByLanguage = new Map<SiteLanguageCode, Set<string>>();

/**
 * Prime the cache from the build-time dictionaries so site chrome resolves with
 * no network at all, and remember which strings are already a finished
 * translation for this language.
 *
 * Two separate wins:
 *  - Chrome not rendered through translateText() (filter panel, buttons) now
 *    hits the cache instead of the network.
 *  - Chrome that IS rendered through translateText() is already localised in
 *    the DOM, and used to be sent to the endpoint anyway with sl=auto just to
 *    come back unchanged. Recognising those strings skips the request.
 */
function seedStaticTranslations(language: SiteLanguageCode): void {
  if (language === "en" || seededLanguages.has(language)) return;
  seededLanguages.add(language);

  const finished = new Set<string>();

  getStaticSourcePairs(language).forEach(([source, translated]) => {
    translationCache.set(`${language}:${source}`, translated);
    finished.add(translated);
  });

  getUiStringPairs(language as TranslatableLanguage).forEach(
    ([source, translated]) => {
      translationCache.set(`${language}:${source}`, translated);
      finished.add(translated);
    }
  );

  getStaticallyTranslatedValues(language).forEach(value => finished.add(value));
  getUiStringValues(language as TranslatableLanguage).forEach(value =>
    finished.add(value)
  );

  alreadyTranslatedByLanguage.set(language, finished);
}

function isAlreadyTranslated(
  language: SiteLanguageCode,
  text: string
): boolean {
  return alreadyTranslatedByLanguage.get(language)?.has(text.trim()) ?? false;
}

function ensurePersistedCacheLoaded(): void {
  if (persistedCacheLoaded) return;
  persistedCacheLoaded = true;

  try {
    const raw = localStorage.getItem(TRANSLATION_CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, string>;
    if (!parsed || typeof parsed !== "object") return;
    Object.entries(parsed).forEach(([k, v]) => {
      if (typeof v === "string") {
        translationCache.set(k, v);
      }
    });
  } catch {
    // Ignore malformed cache.
  }
}

let persistTimer: number | null = null;

function writeTranslationCache(): void {
  try {
    const entries = Array.from(translationCache.entries());
    const trimmed = entries.slice(
      Math.max(0, entries.length - MAX_PERSISTED_TRANSLATIONS)
    );
    localStorage.setItem(
      TRANSLATION_CACHE_KEY,
      JSON.stringify(Object.fromEntries(trimmed))
    );
  } catch {
    // Ignore storage issues.
  }
}

/**
 * Serializing the whole cache after every single translated string made a page
 * with N strings do N JSON.stringify passes over a map that grows to 4000
 * entries - quadratic main-thread work that showed up as jank while switching
 * language. Coalesce writes instead; the cache is a nice-to-have, so losing the
 * last few entries on an abrupt unload is acceptable.
 */
function persistTranslationCache(): void {
  if (typeof window === "undefined") return;
  if (persistTimer !== null) return;

  const flush = () => {
    persistTimer = null;
    writeTranslationCache();
  };

  persistTimer = window.setTimeout(() => {
    const idle = (
      window as unknown as {
        requestIdleCallback?: (
          cb: () => void,
          opts?: { timeout: number }
        ) => number;
      }
    ).requestIdleCallback;
    if (typeof idle === "function") {
      idle(flush, { timeout: 2000 });
    } else {
      flush();
    }
  }, PERSIST_DEBOUNCE_MS);
}

type TranslationResult = {
  text: string;
  ok: boolean;
};

function isLikelyTranslatable(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  if (normalized.length < 2) return false;
  if (/^[\d\s.,:/%+-]+$/.test(normalized)) return false;
  return true;
}

async function translateTextValue(
  language: SiteLanguageCode,
  text: string
): Promise<TranslationResult> {
  ensurePersistedCacheLoaded();

  if (language === "en") return { text, ok: true };
  if (!ENABLE_RUNTIME_TRANSLATION) return { text, ok: true };

  const cacheKey = `${language}:${text}`;
  const cached = translationCache.get(cacheKey);
  if (cached) return { text: cached, ok: true };

  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "auto");
  url.searchParams.set("tl", language);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);

  try {
    const res = await fetch(url.toString(), { method: "GET" });
    if (!res.ok) return { text, ok: false };

    const data = (await res.json()) as unknown;
    if (!Array.isArray(data) || !Array.isArray(data[0]))
      return { text, ok: false };

    const translated = (data[0] as unknown[])
      .map(segment => (Array.isArray(segment) ? String(segment[0] ?? "") : ""))
      .join("")
      .trim();

    const value = translated || text;
    translationCache.set(cacheKey, value);
    persistTranslationCache();
    return { text: value, ok: true };
  } catch {
    return { text, ok: false };
  }
}

/**
 * Translate several strings in ONE request.
 *
 * This used to repeat `q` on translate_a/single, which only ever translates
 * the first `q`: every batch came back "malformed", was thrown away, and each
 * string was then requested on its own, one after the other. translate_a/t is
 * the endpoint that takes several `q` and answers with one entry per input, in
 * order. It is sent as a form POST (no CORS preflight) so long product
 * descriptions cannot overflow the URL.
 *
 * Returns "failed" when the request itself failed (offline, rate limited) -
 * asking again string by string would only make that worse - and "unexpected"
 * when the answer does not line up with the inputs, in which case the caller
 * falls back to per-string requests rather than mis-assigning translations.
 */
async function translateChunk(
  language: SiteLanguageCode,
  texts: string[]
): Promise<Map<string, string> | "failed" | "unexpected"> {
  if (texts.length === 0) return new Map();

  const url = new URL("https://translate.googleapis.com/translate_a/t");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "auto");
  url.searchParams.set("tl", language);
  url.searchParams.set("format", "text");

  const body = new URLSearchParams();
  texts.forEach(text => body.append("q", text));

  try {
    const res = await fetch(url.toString(), { method: "POST", body });
    if (!res.ok) return "failed";

    const data = (await res.json()) as unknown;
    if (!Array.isArray(data) || data.length !== texts.length) {
      return "unexpected";
    }

    const out = new Map<string, string>();
    for (let i = 0; i < texts.length; i += 1) {
      // With sl=auto each entry is [translation, detectedLanguage]; with a
      // fixed source language it is the bare translation.
      const entry = data[i] as unknown;
      const value = Array.isArray(entry) ? entry[0] : entry;
      if (typeof value !== "string") return "unexpected";
      out.set(texts[i], value.trim() || texts[i]);
    }
    return out;
  } catch {
    return "failed";
  }
}

async function translateBatch(
  language: SiteLanguageCode,
  values: string[]
): Promise<{ map: Map<string, string>; hasError: boolean }> {
  const uniq = Array.from(new Set(values.filter(isLikelyTranslatable)));
  const out = new Map<string, string>();
  let hasError = false;

  if (language === "en" || !ENABLE_RUNTIME_TRANSLATION) {
    uniq.forEach(value => out.set(value, value));
    return { map: out, hasError };
  }

  ensurePersistedCacheLoaded();
  seedStaticTranslations(language);

  // Serve everything already cached - or already localised by the build-time
  // dictionary - without touching the network.
  const missing: string[] = [];
  uniq.forEach(value => {
    const cached = translationCache.get(`${language}:${value}`);
    if (cached) {
      out.set(value, cached);
      return;
    }
    if (isAlreadyTranslated(language, value)) {
      out.set(value, value);
      return;
    }
    missing.push(value);
  });

  if (missing.length === 0) return { map: out, hasError };

  const chunks: string[][] = [];
  let chunk: string[] = [];
  let chunkChars = 0;
  missing.forEach(value => {
    if (
      chunk.length > 0 &&
      (chunk.length >= TRANSLATE_BATCH_SIZE ||
        chunkChars + value.length > TRANSLATE_BATCH_CHARS)
    ) {
      chunks.push(chunk);
      chunk = [];
      chunkChars = 0;
    }
    chunk.push(value);
    chunkChars += value.length;
  });
  if (chunk.length > 0) chunks.push(chunk);

  let index = 0;
  const workers = Array.from(
    { length: Math.min(TRANSLATE_CONCURRENCY, chunks.length) },
    async () => {
      while (index < chunks.length) {
        const chunk = chunks[index++];
        const batched = await translateChunk(language, chunk);

        if (batched === "failed") {
          // Left untranslated and uncached; the hook retries shortly.
          hasError = true;
          chunk.forEach(value => out.set(value, value));
          continue;
        }

        if (batched !== "unexpected") {
          batched.forEach((translated, original) => {
            translationCache.set(`${language}:${original}`, translated);
            out.set(original, translated);
          });
          continue;
        }

        // The answer did not line up with the inputs - per string.
        for (const value of chunk) {
          const translated = await translateTextValue(language, value);
          if (!translated.ok) hasError = true;
          out.set(value, translated.text);
        }
      }
    }
  );

  await Promise.all(workers);
  persistTranslationCache();

  return { map: out, hasError };
}

export async function preloadTranslations(
  language: SiteLanguageCode,
  values: string[]
): Promise<void> {
  if (language === "en") return;
  const uniq = Array.from(new Set(values.filter(isLikelyTranslatable)));
  if (uniq.length === 0) return;
  await translateBatch(language, uniq);
}

function collectTextNodes(root: ParentNode): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  let current = walker.nextNode();
  while (current) {
    const textNode = current as Text;
    const parent = textNode.parentElement;
    if (
      parent &&
      !SKIP_TAGS.has(parent.tagName) &&
      isLikelyTranslatable(textNode.nodeValue || "")
    ) {
      nodes.push(textNode);
    }
    current = walker.nextNode();
  }

  return nodes;
}

/**
 * What this module last wrote into each element attribute. Lets
 * getOriginalAttr() tell "still showing our translation" apart from "the app
 * re-rendered a new source value into this attribute".
 */
const lastWrittenAttrs = new WeakMap<
  Element,
  Partial<Record<AttrName, string>>
>();

function getOriginalAttr(el: Element, attr: AttrName): string | null {
  const dataKey = `translateOriginal${attr.replace("-", "").replace(/^[a-z]/, c => c.toUpperCase())}`;
  const datasetValue = (el as HTMLElement).dataset[
    dataKey as keyof DOMStringMap
  ];
  const current = el.getAttribute(attr);

  if (datasetValue && datasetValue.length > 0) {
    // The stored original is only stale when the attribute now holds a value
    // that is neither that original nor the translation we wrote: i.e. the
    // app re-rendered a new source string in place. Adopt it as the original
    // instead of translating (or restoring) the old one over it.
    const written = lastWrittenAttrs.get(el)?.[attr];
    if (current && current !== datasetValue && current !== written) {
      (el as HTMLElement).dataset[dataKey as keyof DOMStringMap] = current;
      return current;
    }
    return datasetValue;
  }

  if (!current) return null;

  (el as HTMLElement).dataset[dataKey as keyof DOMStringMap] = current;
  return current;
}

function setTranslatedAttr(el: Element, attr: AttrName, value: string): void {
  if (el.getAttribute(attr) === value) return;
  el.setAttribute(attr, value);
  const written = lastWrittenAttrs.get(el) ?? {};
  written[attr] = value;
  lastWrittenAttrs.set(el, written);
}

export function useGlobalAutoTranslation(language: SiteLanguageCode): {
  isTranslating: boolean;
  hasTranslationError: boolean;
  readyLanguage: SiteLanguageCode | null;
} {
  const [isTranslating, setIsTranslating] = useState(false);
  const [hasTranslationError, setHasTranslationError] = useState(false);
  const [readyLanguage, setReadyLanguage] = useState<SiteLanguageCode | null>(
    null
  );

  useEffect(() => {
    if (!ENABLE_RUNTIME_TRANSLATION) {
      setIsTranslating(false);
      setHasTranslationError(false);
      setReadyLanguage(language);
      return;
    }

    // The whole body, not just #root: dialogs, menus, drawers and toasts are
    // portalled next to #root and were never translated.
    const root = document.body;
    if (!root) return;

    // Cleanup from earlier implementations that visually hid pending sections.
    const legacyStyle = document.getElementById(LEGACY_SECTION_STYLE_ID);
    if (legacyStyle) {
      legacyStyle.remove();
    }
    root.querySelectorAll(`[${SECTION_PENDING_ATTR}]`).forEach(el => {
      el.removeAttribute(SECTION_PENDING_ATTR);
    });

    const textOriginals = new WeakMap<Text, string>();
    // The value this hook last wrote into each text node (a translation, or
    // the restored original). Used to recognise when the app itself has put
    // new source text into a node we already know about.
    const textLastWritten = new WeakMap<Text, string>();
    let disposed = false;
    let inFlight = false;
    let pendingRerun = false;
    let debounceTimer: number | null = null;
    let needFullScan = true;
    let writingTranslatedContent = false;
    let retryTimer: number | null = null;
    let retries = 0;
    const pendingTextNodes = new Set<Text>();
    const pendingAttrElements = new Set<Element>();
    const pendingSections = new Set<HTMLElement>();

    setHasTranslationError(false);
    setReadyLanguage(language === "en" ? "en" : null);
    const getTopLevelSections = (): HTMLElement[] => {
      const candidates = Array.from(
        root.querySelectorAll(SECTION_TRANSLATE_SELECTOR)
      ) as HTMLElement[];
      const topLevel = candidates.filter(
        el => !el.parentElement?.closest(SECTION_TRANSLATE_SELECTOR)
      );
      return topLevel.length > 0 ? topLevel : [root];
    };

    const resolveSectionElement = (node: Node | null): HTMLElement => {
      if (!node) return root;
      const element =
        node.nodeType === Node.ELEMENT_NODE
          ? (node as Element)
          : node.parentElement;
      const section = element?.closest(
        SECTION_TRANSLATE_SELECTOR
      ) as HTMLElement | null;
      return section || root;
    };

    const setSectionPending = (section: HTMLElement, isPending: boolean) => {
      // Keep this as a non-visual marker only; do not hide section content.
      if (language === "en" || !isPending) {
        section.removeAttribute(SECTION_PENDING_ATTR);
        return;
      }
      section.setAttribute(SECTION_PENDING_ATTR, "1");
    };

    const collectAttrElementsFromSection = (
      section: HTMLElement
    ): Element[] => {
      const attrElements = Array.from(
        section.querySelectorAll(ATTR_TRANSLATE_ELEMENTS)
      );
      if (section.matches(ATTR_TRANSLATE_ELEMENTS)) {
        attrElements.push(section);
      }
      return Array.from(new Set(attrElements));
    };

    const collectTextNodesFromElement = (el: Element): Text[] => {
      const nodes: Text[] = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let current = walker.nextNode();
      while (current) {
        const textNode = current as Text;
        const parent = textNode.parentElement;
        if (
          parent &&
          !SKIP_TAGS.has(parent.tagName) &&
          isLikelyTranslatable(textNode.nodeValue || "")
        ) {
          nodes.push(textNode);
        }
        current = walker.nextNode();
      }
      return nodes;
    };

    // A failed request used to leave its strings in English until something
    // else happened to re-render them. Rescan a few times instead; whatever
    // did translate is cached, so only the failures are requested again.
    const scheduleRetry = () => {
      if (disposed || retryTimer !== null || retries >= MAX_RETRIES) return;
      retries += 1;
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        needFullScan = true;
        scheduleApply(true);
      }, RETRY_DELAY_MS * retries);
    };

    const processNodes = async (textNodes: Text[], attrElements: Element[]) => {
      const textOriginalValues: string[] = [];

      textNodes.forEach(node => {
        const current = node.nodeValue || "";
        const known = textOriginals.get(node);
        // React updates text in place (a cart total after a quantity change,
        // the hero copy on the next slide), reusing the same Text node. If
        // the node now holds something that is neither the original we
        // recorded nor what we last wrote, that is new source text: adopt it.
        // Keeping the first-seen value here used to write stale text back
        // over every in-place update, in every language including English.
        const isNewSourceText =
          known !== undefined &&
          current !== known &&
          current !== textLastWritten.get(node);
        if (known === undefined || isNewSourceText) {
          textOriginals.set(node, current);
        }
        textOriginalValues.push(textOriginals.get(node) ?? current);
      });

      const attrOriginalValues: string[] = [];
      const attrMap: Array<{ el: Element; attr: AttrName; original: string }> =
        [];

      attrElements.forEach(el => {
        ATTRS.forEach(attr => {
          const original = getOriginalAttr(el, attr);
          if (!original || !isLikelyTranslatable(original)) return;
          attrOriginalValues.push(original);
          attrMap.push({ el, attr, original });
        });
      });

      if (language === "en") {
        writingTranslatedContent = true;
        textNodes.forEach(node => {
          const original = textOriginals.get(node);
          if (typeof original === "string" && node.nodeValue !== original) {
            node.nodeValue = original;
            textLastWritten.set(node, original);
          }
        });
        attrMap.forEach(({ el, attr, original }) =>
          setTranslatedAttr(el, attr, original)
        );
        writingTranslatedContent = false;
        return;
      }

      // These were awaited one after the other, so attribute strings did not
      // start translating until every text node had finished. Run them together.
      const [translatedTexts, translatedAttrs] = await Promise.all([
        translateBatch(language, textOriginalValues),
        translateBatch(language, attrOriginalValues),
      ]);

      if (disposed) return;
      if (translatedTexts.hasError || translatedAttrs.hasError) {
        setHasTranslationError(true);
        scheduleRetry();
      }

      writingTranslatedContent = true;
      textNodes.forEach(node => {
        const original = textOriginals.get(node);
        if (!original) return;
        // The app may have re-rendered this node while the request was in
        // flight; that newer text is handled by the pass its mutation queued.
        const current = node.nodeValue || "";
        if (current !== original && current !== textLastWritten.get(node)) {
          return;
        }
        const translated = translatedTexts.map.get(original);
        if (translated && current !== translated) {
          node.nodeValue = translated;
          textLastWritten.set(node, translated);
        }
      });

      attrMap.forEach(({ el, attr, original }) => {
        const translated = translatedAttrs.map.get(original);
        if (translated) setTranslatedAttr(el, attr, translated);
      });
      writingTranslatedContent = false;

      setReadyLanguage(language);
    };

    const applyTranslations = async () => {
      if (disposed) return;
      if (inFlight) {
        pendingRerun = true;
        return;
      }
      inFlight = true;
      setIsTranslating(true);

      try {
        if (needFullScan) {
          needFullScan = false;
          pendingTextNodes.clear();
          pendingAttrElements.clear();

          const sections = getTopLevelSections();
          sections.forEach(section => setSectionPending(section, true));

          // Together, not one after the other: the page body used to wait
          // for the header to finish before it even started.
          await Promise.all(
            sections.map(async section => {
              const textNodes = collectTextNodes(section);
              const attrElements = collectAttrElementsFromSection(section);
              await processNodes(textNodes, attrElements);
              if (!disposed) setSectionPending(section, false);
            })
          );
          if (disposed) return;

          // Then everything, to catch text that sits outside any of those
          // sections. What was just translated comes straight from the cache.
          if (sections.length !== 1 || sections[0] !== root) {
            await processNodes(
              collectTextNodes(root),
              collectAttrElementsFromSection(root)
            );
            if (disposed) return;
          }

          setReadyLanguage(language);
        } else {
          const sections = Array.from(pendingSections);
          pendingTextNodes.clear();
          pendingAttrElements.clear();
          pendingSections.clear();

          await Promise.all(
            sections.map(async section => {
              setSectionPending(section, true);
              const textNodes = collectTextNodes(section);
              const attrElements = collectAttrElementsFromSection(section);
              if (textNodes.length > 0 || attrElements.length > 0) {
                await processNodes(textNodes, attrElements);
              }
              if (!disposed) setSectionPending(section, false);
            })
          );
          if (disposed) return;

          if (sections.length > 0) {
            setReadyLanguage(language);
          }
        }
      } finally {
        writingTranslatedContent = false;
        inFlight = false;
        if (pendingRerun && !disposed) {
          pendingRerun = false;
          window.setTimeout(() => {
            void applyTranslations();
          }, 0);
        } else if (!disposed) {
          setIsTranslating(false);
        }
      }
    };

    const scheduleApply = (immediate = false) => {
      if (disposed) return;
      if (immediate) {
        if (debounceTimer !== null) {
          window.clearTimeout(debounceTimer);
          debounceTimer = null;
        }
        void applyTranslations();
        return;
      }
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        void applyTranslations();
      }, APPLY_DEBOUNCE_MS);
    };

    const observer = new MutationObserver(records => {
      if (writingTranslatedContent) return;

      records.forEach(record => {
        if (record.type === "characterData") {
          const node = record.target;
          if (node.nodeType === Node.TEXT_NODE) {
            const textNode = node as Text;
            const parent = textNode.parentElement;
            if (
              parent &&
              !SKIP_TAGS.has(parent.tagName) &&
              isLikelyTranslatable(textNode.nodeValue || "")
            ) {
              pendingTextNodes.add(textNode);
              pendingSections.add(resolveSectionElement(textNode));
            }
          }
          return;
        }

        if (record.type === "childList") {
          record.addedNodes.forEach(added => {
            if (added.nodeType === Node.TEXT_NODE) {
              const textNode = added as Text;
              const parent = textNode.parentElement;
              if (
                parent &&
                !SKIP_TAGS.has(parent.tagName) &&
                isLikelyTranslatable(textNode.nodeValue || "")
              ) {
                pendingTextNodes.add(textNode);
                pendingSections.add(resolveSectionElement(textNode));
              }
              return;
            }

            if (added.nodeType === Node.ELEMENT_NODE) {
              const element = added as Element;
              collectTextNodesFromElement(element).forEach(n =>
                pendingTextNodes.add(n)
              );
              if (element.matches(ATTR_TRANSLATE_ELEMENTS)) {
                pendingAttrElements.add(element);
              }
              element
                .querySelectorAll(ATTR_TRANSLATE_ELEMENTS)
                .forEach(el => pendingAttrElements.add(el));
              pendingSections.add(resolveSectionElement(element));
            }
          });
        }
      });

      scheduleApply(true);
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: false,
    });

    needFullScan = true;
    scheduleApply(true);

    return () => {
      disposed = true;
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
      }
      observer.disconnect();
    };
  }, [language]);

  return { isTranslating, hasTranslationError, readyLanguage };
}
