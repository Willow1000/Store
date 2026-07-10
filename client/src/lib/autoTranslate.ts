import { useEffect, useState } from 'react';
import type { SiteLanguageCode } from './language';

type AttrName = 'placeholder' | 'title' | 'aria-label' | 'alt';

const ATTR_TRANSLATE_ELEMENTS = [
  'input', 'textarea', 'button', 'img', 'a', 'select', 'option'
].join(',');

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA', 'INPUT']);
const ATTRS: AttrName[] = ['placeholder', 'title', 'aria-label', 'alt'];
const SECTION_TRANSLATE_SELECTOR = 'header, main, footer, section, article, aside, nav, [data-translate-section]';
const SECTION_PENDING_ATTR = 'data-translate-pending';
const LEGACY_SECTION_STYLE_ID = 'mv-translate-section-style';

const translationCache = new Map<string, string>();
const TRANSLATE_CONCURRENCY = 6;
const APPLY_DEBOUNCE_MS = 0;
const TRANSLATION_CACHE_KEY = 'site-translation-cache-v1';
const MAX_PERSISTED_TRANSLATIONS = 4000;
const ENABLE_RUNTIME_TRANSLATION = import.meta.env.VITE_ENABLE_RUNTIME_TRANSLATION !== 'false';

let persistedCacheLoaded = false;

function ensurePersistedCacheLoaded(): void {
  if (persistedCacheLoaded) return;
  persistedCacheLoaded = true;

  try {
    const raw = localStorage.getItem(TRANSLATION_CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, string>;
    if (!parsed || typeof parsed !== 'object') return;
    Object.entries(parsed).forEach(([k, v]) => {
      if (typeof v === 'string') {
        translationCache.set(k, v);
      }
    });
  } catch {
    // Ignore malformed cache.
  }
}

function persistTranslationCache(): void {
  try {
    const entries = Array.from(translationCache.entries());
    const trimmed = entries.slice(Math.max(0, entries.length - MAX_PERSISTED_TRANSLATIONS));
    localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(Object.fromEntries(trimmed)));
  } catch {
    // Ignore storage issues.
  }
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

async function translateTextValue(language: SiteLanguageCode, text: string): Promise<TranslationResult> {
  ensurePersistedCacheLoaded();

  if (language === 'en') return { text, ok: true };
  if (!ENABLE_RUNTIME_TRANSLATION) return { text, ok: true };

  const cacheKey = `${language}:${text}`;
  const cached = translationCache.get(cacheKey);
  if (cached) return { text: cached, ok: true };

  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'auto');
  url.searchParams.set('tl', language);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', text);

  try {
    const res = await fetch(url.toString(), { method: 'GET' });
    if (!res.ok) return { text, ok: false };

    const data = await res.json() as unknown;
    if (!Array.isArray(data) || !Array.isArray(data[0])) return { text, ok: false };

    const translated = (data[0] as unknown[])
      .map((segment) => Array.isArray(segment) ? String(segment[0] ?? '') : '')
      .join('')
      .trim();

    const value = translated || text;
    translationCache.set(cacheKey, value);
    persistTranslationCache();
    return { text: value, ok: true };
  } catch {
    return { text, ok: false };
  }
}

async function translateBatch(language: SiteLanguageCode, values: string[]): Promise<{ map: Map<string, string>; hasError: boolean }> {
  const uniq = Array.from(new Set(values.filter(isLikelyTranslatable)));
  const out = new Map<string, string>();
  let hasError = false;

  let index = 0;
  const workers = Array.from({ length: Math.min(TRANSLATE_CONCURRENCY, uniq.length) }, async () => {
    while (index < uniq.length) {
      const value = uniq[index++];
      const translated = await translateTextValue(language, value);
      if (!translated.ok) hasError = true;
      out.set(value, translated.text);
      }
  });

  await Promise.all(workers);

  return { map: out, hasError };
}

export async function preloadTranslations(language: SiteLanguageCode, values: string[]): Promise<void> {
  if (language === 'en') return;
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
    if (parent && !SKIP_TAGS.has(parent.tagName) && isLikelyTranslatable(textNode.nodeValue || '')) {
      nodes.push(textNode);
    }
    current = walker.nextNode();
  }

  return nodes;
}

function getOriginalAttr(el: Element, attr: AttrName): string | null {
  const dataKey = `translateOriginal${attr.replace('-', '').replace(/^[a-z]/, (c) => c.toUpperCase())}`;
  const datasetValue = (el as HTMLElement).dataset[dataKey as keyof DOMStringMap];
  if (datasetValue && datasetValue.length > 0) return datasetValue;

  const current = el.getAttribute(attr);
  if (!current) return null;

  (el as HTMLElement).dataset[dataKey as keyof DOMStringMap] = current;
  return current;
}

function setTranslatedAttr(el: Element, attr: AttrName, value: string): void {
  el.setAttribute(attr, value);
}

export function useGlobalAutoTranslation(language: SiteLanguageCode): {
  isTranslating: boolean;
  hasTranslationError: boolean;
  readyLanguage: SiteLanguageCode | null;
} {
  const [isTranslating, setIsTranslating] = useState(false);
  const [hasTranslationError, setHasTranslationError] = useState(false);
  const [readyLanguage, setReadyLanguage] = useState<SiteLanguageCode | null>(null);

  useEffect(() => {
    if (!ENABLE_RUNTIME_TRANSLATION) {
      setIsTranslating(false);
      setHasTranslationError(false);
      setReadyLanguage(language);
      return;
    }

    const root = document.getElementById('root');
    if (!root) return;

    // Cleanup from earlier implementations that visually hid pending sections.
    const legacyStyle = document.getElementById(LEGACY_SECTION_STYLE_ID);
    if (legacyStyle) {
      legacyStyle.remove();
    }
    root.querySelectorAll(`[${SECTION_PENDING_ATTR}]`).forEach((el) => {
      el.removeAttribute(SECTION_PENDING_ATTR);
    });

    const textOriginals = new WeakMap<Text, string>();
    let disposed = false;
    let inFlight = false;
    let pendingRerun = false;
    let debounceTimer: number | null = null;
    let needFullScan = true;
    let writingTranslatedContent = false;
    const pendingTextNodes = new Set<Text>();
    const pendingAttrElements = new Set<Element>();
    const pendingSections = new Set<HTMLElement>();

    setHasTranslationError(false);
    setReadyLanguage(language === 'en' ? 'en' : null);
    const getTopLevelSections = (): HTMLElement[] => {
      const candidates = Array.from(root.querySelectorAll(SECTION_TRANSLATE_SELECTOR)) as HTMLElement[];
      const topLevel = candidates.filter((el) => !el.parentElement?.closest(SECTION_TRANSLATE_SELECTOR));
      return topLevel.length > 0 ? topLevel : [root];
    };

    const resolveSectionElement = (node: Node | null): HTMLElement => {
      if (!node) return root;
      const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
      const section = element?.closest(SECTION_TRANSLATE_SELECTOR) as HTMLElement | null;
      return section || root;
    };

    const setSectionPending = (section: HTMLElement, isPending: boolean) => {
      // Keep this as a non-visual marker only; do not hide section content.
      if (language === 'en' || !isPending) {
        section.removeAttribute(SECTION_PENDING_ATTR);
        return;
      }
      section.setAttribute(SECTION_PENDING_ATTR, '1');
    };

    const collectAttrElementsFromSection = (section: HTMLElement): Element[] => {
      const attrElements = Array.from(section.querySelectorAll(ATTR_TRANSLATE_ELEMENTS));
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
        if (parent && !SKIP_TAGS.has(parent.tagName) && isLikelyTranslatable(textNode.nodeValue || '')) {
          nodes.push(textNode);
        }
        current = walker.nextNode();
      }
      return nodes;
    };

    const processNodes = async (textNodes: Text[], attrElements: Element[]) => {
      const textOriginalValues: string[] = [];

      textNodes.forEach((node) => {
        const original = textOriginals.get(node) ?? (node.nodeValue || '');
        if (!textOriginals.has(node)) textOriginals.set(node, original);
        textOriginalValues.push(original);
      });

      const attrOriginalValues: string[] = [];
      const attrMap: Array<{ el: Element; attr: AttrName; original: string }> = [];

      attrElements.forEach((el) => {
        ATTRS.forEach((attr) => {
          const original = getOriginalAttr(el, attr);
          if (!original || !isLikelyTranslatable(original)) return;
          attrOriginalValues.push(original);
          attrMap.push({ el, attr, original });
        });
      });

      if (language === 'en') {
        writingTranslatedContent = true;
        textNodes.forEach((node) => {
          const original = textOriginals.get(node);
          if (typeof original === 'string') node.nodeValue = original;
        });
        attrMap.forEach(({ el, attr, original }) => setTranslatedAttr(el, attr, original));
        writingTranslatedContent = false;
        return;
      }

      const translatedTexts = await translateBatch(language, textOriginalValues);
      const translatedAttrs = await translateBatch(language, attrOriginalValues);

      if (disposed) return;
      if (translatedTexts.hasError || translatedAttrs.hasError) {
        setHasTranslationError(true);
      }

      writingTranslatedContent = true;
      textNodes.forEach((node) => {
        const original = textOriginals.get(node);
        if (!original) return;
        const translated = translatedTexts.map.get(original);
        if (translated) node.nodeValue = translated;
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
          sections.forEach((section) => setSectionPending(section, true));

          for (const section of sections) {
            const textNodes = collectTextNodes(section);
            const attrElements = collectAttrElementsFromSection(section);
            await processNodes(textNodes, attrElements);
            if (disposed) return;
            setSectionPending(section, false);
          }

          setReadyLanguage(language);
        } else {
          const sections = Array.from(pendingSections);
          pendingTextNodes.clear();
          pendingAttrElements.clear();
          pendingSections.clear();

          for (const section of sections) {
            setSectionPending(section, true);
            const textNodes = collectTextNodes(section);
            const attrElements = collectAttrElementsFromSection(section);
            if (textNodes.length === 0 && attrElements.length === 0) {
              setSectionPending(section, false);
              continue;
            }
            await processNodes(textNodes, attrElements);
            if (disposed) return;
            setSectionPending(section, false);
          }

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

    const observer = new MutationObserver((records) => {
      if (writingTranslatedContent) return;

      records.forEach((record) => {
        if (record.type === 'characterData') {
          const node = record.target;
          if (node.nodeType === Node.TEXT_NODE) {
            const textNode = node as Text;
            const parent = textNode.parentElement;
            if (parent && !SKIP_TAGS.has(parent.tagName) && isLikelyTranslatable(textNode.nodeValue || '')) {
              pendingTextNodes.add(textNode);
              pendingSections.add(resolveSectionElement(textNode));
            }
          }
          return;
        }

        if (record.type === 'childList') {
          record.addedNodes.forEach((added) => {
            if (added.nodeType === Node.TEXT_NODE) {
              const textNode = added as Text;
              const parent = textNode.parentElement;
              if (parent && !SKIP_TAGS.has(parent.tagName) && isLikelyTranslatable(textNode.nodeValue || '')) {
                pendingTextNodes.add(textNode);
                pendingSections.add(resolveSectionElement(textNode));
              }
              return;
            }

            if (added.nodeType === Node.ELEMENT_NODE) {
              const element = added as Element;
              collectTextNodesFromElement(element).forEach((n) => pendingTextNodes.add(n));
              if (element.matches(ATTR_TRANSLATE_ELEMENTS)) {
                pendingAttrElements.add(element);
              }
              element.querySelectorAll(ATTR_TRANSLATE_ELEMENTS).forEach((el) => pendingAttrElements.add(el));
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
      observer.disconnect();
    };
  }, [language]);

  return { isTranslating, hasTranslationError, readyLanguage };
}
