export type CountryPhoneOption = {
  value: string;
  label: string;
  dialCode: string;
  flag: string;
};

export const COUNTRY_PHONE_OPTIONS: CountryPhoneOption[] = [
  { value: 'US', label: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { value: 'CA', label: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  { value: 'GB', label: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { value: 'DE', label: 'Germany', dialCode: '+49', flag: '🇩🇪' },
  { value: 'FR', label: 'France', dialCode: '+33', flag: '🇫🇷' },
  { value: 'ES', label: 'Spain', dialCode: '+34', flag: '🇪🇸' },
  { value: 'IT', label: 'Italy', dialCode: '+39', flag: '🇮🇹' },
  { value: 'PT', label: 'Portugal', dialCode: '+351', flag: '🇵🇹' },
  { value: 'NL', label: 'Netherlands', dialCode: '+31', flag: '🇳🇱' },
  { value: 'BE', label: 'Belgium', dialCode: '+32', flag: '🇧🇪' },
  { value: 'IE', label: 'Ireland', dialCode: '+353', flag: '🇮🇪' },
  { value: 'PL', label: 'Poland', dialCode: '+48', flag: '🇵🇱' },
  { value: 'SE', label: 'Sweden', dialCode: '+46', flag: '🇸🇪' },
  { value: 'NO', label: 'Norway', dialCode: '+47', flag: '🇳🇴' },
  { value: 'CH', label: 'Switzerland', dialCode: '+41', flag: '🇨🇭' },
  { value: 'SG', label: 'Singapore', dialCode: '+65', flag: '🇸🇬' },
  { value: 'MX', label: 'Mexico', dialCode: '+52', flag: '🇲🇽' },
  { value: 'AR', label: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
  { value: 'CO', label: 'Colombia', dialCode: '+57', flag: '🇨🇴' },
  { value: 'CL', label: 'Chile', dialCode: '+56', flag: '🇨🇱' },
  { value: 'BR', label: 'Brazil', dialCode: '+55', flag: '🇧🇷' },
];

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
