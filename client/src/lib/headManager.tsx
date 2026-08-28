import { createContext, useContext, type ReactNode } from "react";

export type HeadCollector = {
  addMarkup: (markup: string, options?: { fallback?: boolean }) => void;
  getMarkup: () => string;
};

export function createHeadCollector(): HeadCollector {
  // SEOHead is rendered once at the App shell level (a generic fallback,
  // canonical-only, passing fallback: true) and again by most individual
  // pages with page-specific title/description/schema (not fallback).
  // Streaming SSR doesn't guarantee the shell's call happens before a
  // page's (lazy-loaded routes especially can resolve out of document
  // order), so "last write wins" isn't reliable - a fallback call only
  // fills in when nothing specific has been set yet, and a non-fallback
  // call always wins outright, regardless of which order they arrive in.
  let markup = "";
  let hasSpecific = false;

  return {
    addMarkup(markupString: string, options) {
      if (!markupString) return;
      if (options?.fallback) {
        if (!hasSpecific) markup = markupString;
        return;
      }
      markup = markupString;
      hasSpecific = true;
    },
    getMarkup() {
      return markup;
    },
  };
}

const HeadContext = createContext<HeadCollector | null>(null);

export function HeadProvider({
  collector,
  children,
}: {
  collector: HeadCollector;
  children: ReactNode;
}) {
  return (
    <HeadContext.Provider value={collector}>{children}</HeadContext.Provider>
  );
}

export function useHeadCollector(): HeadCollector | null {
  return useContext(HeadContext);
}
