import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCProxyClient } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../../../server/routers";
import { supabase } from "./supabase";

// React hooks client for use within components
export const trpc = createTRPCReact<AppRouter>();

// Promise-based client for use outside of React components
export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      async headers() {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            return {
              Authorization: `Bearer ${session.access_token}`,
            };
          }
        } catch (error) {
          console.warn('[tRPC] Failed to get Supabase session:', error);
        }

        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});
