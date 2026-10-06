/**
 * Store policy facts that more than one place publishes - the product feed,
 * product structured data and the policy pages - kept in one place so they
 * cannot drift apart.
 *
 * OWNER TO CONFIRM: this is the country list the product feed already
 * advertised. It includes Russia (RU) and Belarus (BY); check that shipping
 * auto parts there is something the business really does and is permitted
 * to do before relying on it.
 */
export const SHIPPING_COUNTRIES: string[] = [
  "US",
  "CA",
  "AL",
  "AD",
  "AM",
  "AT",
  "AZ",
  "BY",
  "BE",
  "BA",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "GE",
  "DE",
  "GR",
  "HU",
  "IS",
  "IE",
  "IT",
  "KZ",
  "XK",
  "LV",
  "LI",
  "LT",
  "LU",
  "MT",
  "MD",
  "MC",
  "ME",
  "NL",
  "MK",
  "NO",
  "PL",
  "PT",
  "RO",
  "RU",
  "SM",
  "RS",
  "SK",
  "SI",
  "ES",
  "SE",
  "CH",
  "TR",
  "UA",
  "GB",
  "VA",
];

/** Return window promised on /returns ("within 30 days of delivery"). */
export const RETURN_WINDOW_DAYS = 30;
