import { createClient } from "@supabase/supabase-js";
import { ENV } from "./_core/env";
import { logger } from "./_core/logger";

/**
 * Promo codes, read from the live Supabase `offers` table.
 *
 * db.ts's resolveOfferByCode() applies the same rules through Drizzle, which
 * only works when DATABASE_URL is set; without it every code resolved to
 * nothing. Checkout prices discounts from here, so the amount a customer is
 * charged never depends on a discount figure the browser sent.
 */

export type ServerResolvedOffer = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  type: string;
  value: string;
  minimumSubtotal: string | null;
  discountAmount: number;
};

type OfferRow = {
  id: number;
  code: string;
  name: string | null;
  description: string | null;
  type: string;
  value: number | string;
  minimumSubtotal: number | string | null;
  maxUses: number | null;
  usedCount: number | null;
  active: boolean | null;
  startsAt: string | null;
  endsAt: string | null;
};

function getClient() {
  if (!ENV.supabaseUrl) return null;
  return createClient(
    ENV.supabaseUrl,
    ENV.supabaseServiceKey || ENV.supabaseAnonKey || "",
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/** Applies an offer's rules to a subtotal; null when it does not apply. */
export function applyOffer(
  offer: OfferRow,
  subtotal: number,
  now = new Date()
): ServerResolvedOffer | null {
  if (!offer.active) return null;
  if (offer.startsAt && new Date(offer.startsAt) > now) return null;
  if (offer.endsAt && new Date(offer.endsAt) < now) return null;
  if (
    offer.maxUses !== null &&
    offer.maxUses !== undefined &&
    Number(offer.usedCount ?? 0) >= offer.maxUses
  ) {
    return null;
  }
  if (offer.minimumSubtotal && subtotal < Number(offer.minimumSubtotal)) {
    return null;
  }

  const value = Number(offer.value);
  if (!Number.isFinite(value) || value <= 0 || subtotal <= 0) return null;

  const raw =
    offer.type === "percentage"
      ? subtotal * (Math.min(value, 100) / 100)
      : Math.min(value, subtotal);

  return {
    id: offer.id,
    code: offer.code,
    name: offer.name || offer.code,
    description: offer.description ?? null,
    type: offer.type,
    value: String(offer.value),
    minimumSubtotal:
      offer.minimumSubtotal !== null && offer.minimumSubtotal !== undefined
        ? String(offer.minimumSubtotal)
        : null,
    discountAmount: Math.round(raw * 100) / 100,
  };
}

async function findOffer(code: string): Promise<OfferRow | null> {
  const normalized = code.trim().toUpperCase();
  // Codes are short alphanumerics; anything else cannot match and must not
  // reach the ilike pattern below.
  if (!/^[A-Z0-9_-]{1,64}$/.test(normalized)) return null;

  const supabase = getClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("offers")
    .select(
      "id, code, name, description, type, value, minimumSubtotal, maxUses, usedCount, active, startsAt, endsAt"
    )
    // Case-insensitive exact match: `_` is escaped so it is not a wildcard.
    .ilike("code", normalized.replace(/_/g, "\\_"))
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.warn({ data: [error.message] }, "[Offers] Lookup failed:");
    return null;
  }
  return (data as OfferRow | null) ?? null;
}

export async function resolveOffer(
  code: string | null | undefined,
  subtotal: number
): Promise<ServerResolvedOffer | null> {
  if (!code || !code.trim()) return null;
  const offer = await findOffer(code);
  return offer ? applyOffer(offer, subtotal) : null;
}

/** Counts one redemption against an offer's maxUses. */
export async function recordOfferRedemption(offerId: number): Promise<void> {
  const supabase = getClient();
  if (!supabase || !Number.isInteger(offerId)) return;

  const { data, error } = await supabase
    .from("offers")
    .select("usedCount")
    .eq("id", offerId)
    .maybeSingle();
  if (error || !data) return;

  const { error: updateError } = await supabase
    .from("offers")
    .update({
      usedCount: Number(data.usedCount ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    })
    .eq("id", offerId);
  if (updateError) {
    logger.warn(
      { data: [updateError.message] },
      "[Offers] Could not record redemption:"
    );
  }
}
