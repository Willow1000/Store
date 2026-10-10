/**
 * Which blog guides belong on which shop pages.
 *
 * Category and vehicle pages used to link only to the blog index, and the
 * guides received links from nowhere but the blog itself. Listing the relevant
 * guides on the shop pages they support (and the shop pages in each guide's
 * "Related site resources") ties each topic together for shoppers and
 * crawlers.
 *
 * Only add a guide where it genuinely answers a question about that category
 * or vehicle; a page with no relevant guide shows none.
 */

export type GuideLink = { href: string; label: string };

const VIN_FITMENT = "vin-fitment-guide-european-auto-parts";
const USED_VS_OEM = "used-vs-refurbished-vs-oem-auto-parts";
const ECU_FAILURES = "opel-zafira-astra-ecu-and-sensor-failures";
const DPF_COST = "dpf-and-catalytic-replacement-cost-guide-europe";
const EV_BATTERY = "save-on-ev-and-hybrid-battery-replacements";
const RECARO = "recaro-seats-buying-and-fitment-guide-europe";
const EV_CHARGING = "home-ev-charging-mobile-charger-guide";
const VIN_DECODER = "vin-decoder-guide-find-right-parts";
const BRAKES = "oem-vs-aftermarket-brake-pads-rotors";
const CHECK_ENGINE = "check-engine-light-diagnostic-guide";
const SEAT_REPLACEMENT = "car-seat-replacement-airbags-sensors-fitment";

/**
 * Guide titles by slug. Kept here rather than read from blogPosts.ts so shop
 * pages do not ship every article's text just to print a few link labels;
 * guideLinks.test.ts fails if a title here drifts from the post's.
 */
export const GUIDE_TITLES: Record<string, string> = {
  [VIN_FITMENT]: "VIN Number Lookup for Parts: Check Fitment Before You Buy",
  [USED_VS_OEM]: "Used vs OEM vs Aftermarket Parts: Which Should You Buy?",
  [ECU_FAILURES]:
    "Opel Astra & Zafira ECU and Sensor Failures: Symptoms and Fixes",
  [DPF_COST]: "DPF and Catalytic Converter Replacement Cost Guide",
  [EV_BATTERY]: "Hybrid and EV Battery Replacement Cost: How to Save",
  [RECARO]: "Recaro Seats Buying Guide: Fitment, Wiring and Airbags",
  [EV_CHARGING]: "Home EV Charger Guide: Level 1, Level 2 and Mobile Chargers",
  [VIN_DECODER]: "Free VIN Decoder: How to Use a VIN to Find the Right Parts",
  [BRAKES]: "OEM vs Aftermarket Brake Pads and Rotors: Which Is Better?",
  [CHECK_ENGINE]:
    "Check Engine Light On? What It Means and How to Read the Code",
  [SEAT_REPLACEMENT]:
    "Replacing Car Seats with Airbags: Sensors, Wiring and Fitment",
};

/** The two guides about decoding a VIN and using it to match parts. */
export const VIN_GUIDE_SLUGS = [VIN_DECODER, VIN_FITMENT];

/** Blog post slugs by category slug. */
const CATEGORY_GUIDES: Record<string, string[]> = {
  engine: [CHECK_ENGINE, USED_VS_OEM, VIN_FITMENT],
  transmission: [USED_VS_OEM, VIN_FITMENT],
  seats: [RECARO, SEAT_REPLACEMENT],
  brakes: [BRAKES, VIN_DECODER],
  exhaust: [DPF_COST],
  electrical: [ECU_FAILURES, CHECK_ENGINE],
  "tools-emergency": [CHECK_ENGINE],
  body: [USED_VS_OEM, VIN_FITMENT],
  bumpers: [USED_VS_OEM, VIN_FITMENT],
  panels: [USED_VS_OEM, VIN_FITMENT],
  steering: [USED_VS_OEM, VIN_FITMENT],
};

const TRUCK_GUIDES = [VIN_DECODER];
const EV_GUIDES = [EV_CHARGING, EV_BATTERY];

/** Blog post slugs by vehicle slug (see vehicleContent.ts). */
const VEHICLE_GUIDES: Record<string, string[]> = {
  "ford-f150": TRUCK_GUIDES,
  "ram-1500": TRUCK_GUIDES,
  "chevy-silverado": TRUCK_GUIDES,
  "gmc-sierra": TRUCK_GUIDES,
  "toyota-tacoma": TRUCK_GUIDES,
  "toyota-tundra": TRUCK_GUIDES,
  "jeep-wrangler": TRUCK_GUIDES,
  "jeep-gladiator": TRUCK_GUIDES,
  "tesla-model-y": EV_GUIDES,
  "tesla-model-3": EV_GUIDES,
  opel: [ECU_FAILURES, USED_VS_OEM, VIN_FITMENT],
  bmw: [USED_VS_OEM, VIN_FITMENT],
  audi: [RECARO, USED_VS_OEM, VIN_FITMENT],
  fiat: [USED_VS_OEM, VIN_FITMENT],
};

export function guideLinks(slugs: string[] | undefined): GuideLink[] {
  if (!slugs) return [];
  return slugs.flatMap(slug => {
    const title = GUIDE_TITLES[slug];
    return title ? [{ href: `/blog/${slug}`, label: title }] : [];
  });
}

export function getGuidesForCategory(
  slug: string | null | undefined
): GuideLink[] {
  return guideLinks(CATEGORY_GUIDES[String(slug ?? "").toLowerCase()]);
}

export function getGuidesForVehicle(
  slug: string | null | undefined
): GuideLink[] {
  return guideLinks(VEHICLE_GUIDES[String(slug ?? "").toLowerCase()]);
}
