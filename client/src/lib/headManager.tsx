import { createContext, useContext, type ReactNode } from 'react';

export type HeadCollector = {
  addMarkup: (markup: string) => void;
  getMarkup: () => string;
};

export function createHeadCollector(): HeadCollector {
  const markup: string[] = [];

  return {
    addMarkup(markupString: string) {
      if (!markupString) return;
      markup.push(markupString);
    },
    getMarkup() {
      return markup.join('\n');
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
  return <HeadContext.Provider value={collector}>{children}</HeadContext.Provider>;
}

export function useHeadCollector(): HeadCollector | null {
  return useContext(HeadContext);
}
