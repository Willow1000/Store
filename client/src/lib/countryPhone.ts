import { Country } from 'country-state-city';

export type CountryPhoneOption = {
  value: string;
  label: string;
  dialCode: string;
  flag: string;
};

const formatDialCode = (phonecode: string | undefined) => {
  const cleaned = String(phonecode || '').trim();
  if (!cleaned) return '';
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
};

export const COUNTRY_PHONE_OPTIONS: CountryPhoneOption[] = Country.getAllCountries()
  .map((country) => ({
    value: country.isoCode,
    label: country.name,
    dialCode: formatDialCode(country.phonecode),
    flag: country.flag || '',
  }))
  .filter((option) => option.value && option.label && option.dialCode)
  .sort((a, b) => a.label.localeCompare(b.label));

export const DEFAULT_PHONE_COUNTRY = 'US';

export function getCountryPhoneOption(country: string) {
  return COUNTRY_PHONE_OPTIONS.find((option) => option.value === country) || COUNTRY_PHONE_OPTIONS[0];
}

export function getCountryPhoneLabel(country: string) {
  const option = getCountryPhoneOption(country);
  return `${option.flag} ${option.label} ${option.dialCode}`;
}

export function getCountryDialCode(country: string) {
  return getCountryPhoneOption(country).dialCode;
}

export function normalizeLocalPhoneDigits(input: string | null | undefined, country: string, maxLength = 15) {
  const digits = String(input ?? '').replace(/\D/g, '');
  const dialDigits = getCountryDialCode(country).replace(/\D/g, '');
  const localDigits = dialDigits && digits.startsWith(dialDigits) ? digits.slice(dialDigits.length) : digits;
  return localDigits.slice(0, maxLength);
}

export function formatLocalPhoneNumber(input: string | null | undefined, country: string) {
  const digits = normalizeLocalPhoneDigits(input, country, 15);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`.trim();
}

export function buildInternationalPhoneNumber(country: string, localPhone: string | null | undefined) {
  const digits = normalizeLocalPhoneDigits(localPhone, country, 15);
  if (!digits) return '';
  return `${getCountryDialCode(country)} ${formatLocalPhoneNumber(digits, country)}`.trim();
}
