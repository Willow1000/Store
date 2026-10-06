import { createContext, useContext } from "react";

/**
 * Lets a page tell the server what HTTP status its render should be sent
 * with. Only the server provides a value; in the browser it is null and
 * marking does nothing.
 *
 * Without it every URL - including unknown paths, deleted products and
 * made-up category slugs - was answered with 200, so search engines saw
 * "soft 404s" instead of real ones.
 */
export type SsrStatus = { status: number };

export const SsrStatusContext = createContext<SsrStatus | null>(null);

/** Marks the current server render as a 404. */
export function useMarkNotFound(): void {
  const status = useContext(SsrStatusContext);
  if (status) status.status = 404;
}
