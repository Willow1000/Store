/**
 * Vehicle landing pages (/vehicle/:slug): "F-150 accessories", "Ram 1500
 * accessories", "Tesla Model Y accessories" and similar are among the most
 * searched phrases in the store's niche (Google autocomplete research,
 * 2026-10), and the sites ranking for them all have one page per vehicle.
 *
 * Products are matched by title: catalogue titles carry the fitment
 * ("... for 2015-2026 Ford F-150 SuperCrew"). Match terms are specific enough
 * not to catch other words ("Ram 1500", never a bare "Ram", which would match
 * "Ceramic").
 */

import type { CategoryFaq } from "./categoryContent";

export type VehicleContent = {
  slug: string;
  /** Display name, e.g. "Ford F-150". */
  name: string;
  /** Case-insensitive substrings of product titles that mean "fits this". */
  matchTerms: string[];
  seoTitle: string;
  metaDescription: string;
  intro: string;
  faqs: CategoryFaq[];
};

const FITMENT_FAQ = (name: string): CategoryFaq => ({
  question: `How do I know a part fits my ${name}?`,
  answer: `Each listing states the model years, cab or bed size and trims it fits. Model generations change mounting points, so compare your year carefully. If you are unsure, decode your VIN with our free VIN decoder or send it to us on WhatsApp or by email before ordering.`,
});

export const VEHICLES: VehicleContent[] = [
  {
    slug: "ford-f150",
    name: "Ford F-150",
    matchTerms: ["F-150", "F150"],
    seoTitle: "Ford F-150 Accessories & Parts | MotorVault",
    metaDescription:
      "F-150 accessories and parts: tonneau covers, leveling kits, running boards, rain guards, lighting, floor liners and towing gear for 2004–2026 trucks.",
    intro:
      "Tonneau covers, leveling kits, rain guards, lighting, floor liners, tow hook covers and towing gear for the Ford F-150, with the model years each part fits.",
    faqs: [
      FITMENT_FAQ("F-150"),
      {
        question: "What are the most popular F-150 accessories?",
        answer:
          "Tonneau covers, all-weather floor liners, running boards, leveling kits, LED lighting and towing upgrades are the accessories F-150 owners buy most often.",
      },
      {
        question: "What bed length is my F-150?",
        answer:
          "Current F-150s come with 5.5 ft, 6.5 ft or 8 ft beds depending on cab style; SuperCrew trucks usually have 5.5 or 6.5 ft. Measure inside the bed at the rails if unsure: bed covers are size-specific.",
      },
    ],
  },
  {
    slug: "ram-1500",
    name: "Ram 1500",
    matchTerms: ["Ram 1500", "Ram 2500", "Ram 3500", "Ram 1500/2500"],
    seoTitle: "Ram 1500 Accessories & Parts | MotorVault",
    metaDescription:
      "Ram 1500, 2500 and 3500 accessories: leveling kits, tonneau covers, bed racks, lighting, tow hook covers and towing gear, with model-year fitment.",
    intro:
      "Leveling kits, bed covers and racks, lighting, tow hook covers and towing gear for Ram 1500 and Heavy Duty trucks, with the model years each part fits.",
    faqs: [
      FITMENT_FAQ("Ram"),
      {
        question: "Which Ram generation do I have?",
        answer:
          "The current Ram 1500 (DT) launched for 2019; the previous body continued as the Ram 1500 Classic. Parts for the two are usually not interchangeable, so check whether a listing says DT, Classic or a year range.",
      },
    ],
  },
  {
    slug: "chevy-silverado",
    name: "Chevy Silverado",
    matchTerms: ["Silverado"],
    seoTitle: "Chevy Silverado Accessories & Parts | MotorVault",
    metaDescription:
      "Chevy Silverado 1500 and HD accessories: leveling kits, bed accessories, lighting, fender lights, tow hook covers and towing gear, with year fitment.",
    intro:
      "Lighting, bed accessories, leveling kits, tow hook covers and towing gear for the Silverado 1500 and Silverado HD.",
    faqs: [
      FITMENT_FAQ("Silverado"),
      {
        question: "Do Silverado parts fit the GMC Sierra?",
        answer:
          "Many do, because the trucks share a platform, especially bed, suspension and towing parts. Body panels, grilles, lights and trim usually differ, so check the listing for Sierra compatibility.",
      },
    ],
  },
  {
    slug: "gmc-sierra",
    name: "GMC Sierra",
    matchTerms: ["Sierra"],
    seoTitle: "GMC Sierra Accessories & Parts | MotorVault",
    metaDescription:
      "GMC Sierra 1500 and HD accessories: leveling kits, bed accessories, lighting and towing gear, with model-year fitment for each part.",
    intro:
      "Bed accessories, lighting, leveling kits and towing gear for the GMC Sierra 1500 and Sierra HD.",
    faqs: [FITMENT_FAQ("Sierra")],
  },
  {
    slug: "toyota-tacoma",
    name: "Toyota Tacoma",
    matchTerms: ["Tacoma"],
    seoTitle: "Toyota Tacoma Accessories & Parts | MotorVault",
    metaDescription:
      "Toyota Tacoma accessories: bed racks, tonneau covers, lighting, leveling kits, floor liners and recovery gear for 3rd and 4th gen Tacomas.",
    intro:
      "Bed racks, covers, lighting, leveling kits and floor liners for the Toyota Tacoma, with the generation each part fits.",
    faqs: [
      FITMENT_FAQ("Tacoma"),
      {
        question: "Which Tacoma generation do I have?",
        answer:
          "The 3rd generation covers 2016–2023 and the 4th generation started with the 2024 model year. Parts between generations are rarely interchangeable.",
      },
    ],
  },
  {
    slug: "toyota-tundra",
    name: "Toyota Tundra",
    matchTerms: ["Tundra"],
    seoTitle: "Toyota Tundra Accessories & Parts | MotorVault",
    metaDescription:
      "Toyota Tundra accessories: bed covers, lighting, leveling kits and towing gear, with model-year fitment for each part.",
    intro:
      "Bed covers, lighting, leveling kits and towing gear for the Toyota Tundra.",
    faqs: [FITMENT_FAQ("Tundra")],
  },
  {
    slug: "jeep-wrangler",
    name: "Jeep Wrangler",
    matchTerms: ["Wrangler"],
    seoTitle: "Jeep Wrangler Accessories & Parts (JK, JL) | MotorVault",
    metaDescription:
      "Jeep Wrangler JK and JL accessories: steps, lighting, floor liners, recovery gear, bumpers and suspension parts, with fitment for each generation.",
    intro:
      "Steps, lighting, floor liners, bumpers, recovery gear and suspension parts for the Jeep Wrangler JK and JL.",
    faqs: [
      FITMENT_FAQ("Wrangler"),
      {
        question: "Do JK parts fit a JL Wrangler?",
        answer:
          "Mostly not. The JL (2018 onward) changed the body, mounting points and electrical system, so check whether a listing says JK (2007–2018) or JL.",
      },
    ],
  },
  {
    slug: "jeep-gladiator",
    name: "Jeep Gladiator",
    matchTerms: ["Gladiator"],
    seoTitle: "Jeep Gladiator Accessories & Parts | MotorVault",
    metaDescription:
      "Jeep Gladiator JT accessories: bed covers and racks, steps, lighting, floor liners and recovery gear, with fitment for each part.",
    intro:
      "Bed accessories, steps, lighting, floor liners and recovery gear for the Jeep Gladiator (JT).",
    faqs: [
      FITMENT_FAQ("Gladiator"),
      {
        question: "Do Wrangler JL accessories fit the Gladiator?",
        answer:
          "Many front-end and cabin parts are shared with the JL Wrangler, but anything behind the front doors, plus the bed, frame and some suspension parts, is Gladiator-specific. Check the listing.",
      },
    ],
  },
  {
    slug: "tesla-model-y",
    name: "Tesla Model Y",
    matchTerms: ["Model Y"],
    seoTitle: "Tesla Model Y Accessories | MotorVault",
    metaDescription:
      "Tesla Model Y accessories: all-weather floor mats, trunk liners, screen protectors, organizers, chargers and protection, for Model Y including Juniper.",
    intro:
      "All-weather mats and liners, screen protectors, organizers, charging accessories and protection for the Tesla Model Y.",
    faqs: [
      FITMENT_FAQ("Model Y"),
      {
        question: "What accessories does a new Model Y need?",
        answer:
          "Owners most often add all-weather floor mats and a trunk liner, a screen protector, center console organizers and, for home charging, a suitable charger or adapter.",
      },
      {
        question:
          "Do accessories for the older Model Y fit the 2025 Model Y (Juniper)?",
        answer:
          "Not always: the 2025 refresh changed the interior, screen and some trim. Check that the listing names your model year.",
      },
    ],
  },
  {
    slug: "tesla-model-3",
    name: "Tesla Model 3",
    matchTerms: ["Model 3"],
    seoTitle: "Tesla Model 3 Accessories | MotorVault",
    metaDescription:
      "Tesla Model 3 accessories: floor mats, trunk liners, screen protectors, organizers and protection, including the Highland refresh.",
    intro:
      "Floor mats, liners, screen protectors, organizers and protection for the Tesla Model 3.",
    faqs: [FITMENT_FAQ("Model 3")],
  },
];

export function getVehicleContent(slug: string | null | undefined) {
  if (!slug) return null;
  return VEHICLES.find(v => v.slug === slug.trim().toLowerCase()) ?? null;
}

/**
 * The vehicle pages a product belongs on, by the same title match the pages
 * themselves use, so a product links to exactly the pages that list it.
 */
export function vehiclesMatchingTitle(
  title: string | null | undefined
): VehicleContent[] {
  const haystack = String(title ?? "").toLowerCase();
  if (!haystack) return [];
  return VEHICLES.filter(vehicle =>
    vehicle.matchTerms.some(term => haystack.includes(term.toLowerCase()))
  );
}

/** PostgREST `or` filter matching any of the vehicle's terms in the title. */
export function vehicleTitleFilter(vehicle: VehicleContent): string {
  return vehicle.matchTerms
    .map(term => `title.ilike."*${term.replace(/[,()*%"]/g, " ")}*"`)
    .join(",");
}
