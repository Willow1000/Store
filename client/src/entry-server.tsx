import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { renderToString } from 'react-dom/server';
import superjson from 'superjson';
import App from './App';
import { trpc } from './lib/trpc';

type MemoryStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

function createMemoryStorage(): MemoryStorage {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

function ensureServerPolyfills(): void {
  const g = globalThis as any;
  if (typeof g.localStorage === 'undefined') {
    g.localStorage = createMemoryStorage();
  }
  if (typeof g.sessionStorage === 'undefined') {
    g.sessionStorage = createMemoryStorage();
  }
}

export async function render(url: string): Promise<string> {
  ensureServerPolyfills();

  const queryClient = new QueryClient();
  const trpcClient = trpc.createClient({
    links: [
      httpBatchLink({
        url: '/api/trpc',
        transformer: superjson,
      }),
    ],
  });

  return renderToString(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App initialPath={url} ssr />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
