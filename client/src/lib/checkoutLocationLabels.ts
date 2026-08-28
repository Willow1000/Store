const POSTAL_LABEL_BY_COUNTRY: Record<string, string> = {
  US: "ZIP Code",
  GB: "Postcode",
  IE: "Eircode",
};

export function getStateLabel(country: string | undefined | null): string {
  if (!country) return "State/Province/Region";
  const c = String(country).toUpperCase();
  if (c === "US") return "State";
  if (c === "CA") return "Province";
  if (c === "GB") return "Region";
  if (c === "IE") return "County";
  return "State/Province/Region";
}

export function getPostalCodeLabel(country: string | undefined | null): string {
  if (!country) return "Postal code";
  const c = String(country).toUpperCase();
  return POSTAL_LABEL_BY_COUNTRY[c] || "Postal code";
}
