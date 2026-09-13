import { AlertCircle, ChevronRight } from "lucide-react";
import {
  COUNTRY_PHONE_OPTIONS,
  getCountryPhoneLabel,
} from "@/lib/countryPhone";
import {
  getStateLabel,
  getPostalCodeLabel,
} from "@/lib/checkoutLocationLabels";
import {
  t,
  type CheckoutFormData,
  type CountryOption,
  type StateOption,
} from "@/pages/Checkout";

export type CheckoutAddressFieldsProps = {
  formData: CheckoutFormData;
  formErrors: Record<string, string>;
  handleShippingChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  handlePhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePhoneBlur: () => void;
  countryOptions: CountryOption[];
  manualLocationFields: boolean;
  structuredStateOptions: StateOption[];
  manualCityField: boolean;
  cityOptions: string[];
  isAuthenticated: boolean;
  handleContinueToPayment: () => void | Promise<void>;
  isSavingAddress: boolean;
};

/**
 * The shipping-address form shown on Checkout's "shipping" step. Extracted
 * from Checkout.tsx as a pure, presentational piece - it owns none of the
 * form state itself, just renders it and forwards change/submit handlers.
 */
export function CheckoutAddressFields({
  formData,
  formErrors,
  handleShippingChange,
  handlePhoneChange,
  handlePhoneBlur,
  countryOptions,
  manualLocationFields,
  structuredStateOptions,
  manualCityField,
  cityOptions,
  isAuthenticated,
  handleContinueToPayment,
  isSavingAddress,
}: CheckoutAddressFieldsProps) {
  return (
    <div className="bg-white border border-gray-200 rounded p-4 sm:p-6 md:p-8 mb-6 w-full">
      <h2 className="text-xl sm:text-2xl font-bold mb-6 sm:mb-8 text-black">
        {t("checkout.shippingAddress", "Shipping Address")}
      </h2>

      <form className="space-y-5 sm:space-y-6">
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-black mb-3">
              {t("checkout.firstName", "First Name")} *
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleShippingChange}
              placeholder="John"
              className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base ${
                formErrors.firstName
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-black focus:ring-black"
              }`}
              required
            />
            {formErrors.firstName && (
              <p className="flex items-center gap-1 text-red-600 text-xs sm:text-sm mt-1">
                <AlertCircle size={14} /> {formErrors.firstName}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-3">
              {t("checkout.lastName", "Last Name")} *
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleShippingChange}
              placeholder="Doe"
              className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base ${
                formErrors.lastName
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-black focus:ring-black"
              }`}
              required
            />
            {formErrors.lastName && (
              <p className="flex items-center gap-1 text-red-600 text-xs sm:text-sm mt-1">
                <AlertCircle size={14} /> {formErrors.lastName}
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-black mb-3">
            {t("checkout.email", "Email")} *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleShippingChange}
            placeholder="john@example.com"
            className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base ${
              formErrors.email
                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-black focus:ring-black"
            }`}
            required
          />
          {formErrors.email && (
            <p className="flex items-center gap-1 text-red-600 text-xs sm:text-sm mt-1">
              <AlertCircle size={14} /> {formErrors.email}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-black mb-3">
            {t("checkout.phoneNumber", "Phone Number")} *
          </label>
          <div className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
            <div>
              <label className="sr-only" htmlFor="phoneCountry">
                {t("checkout.phoneCountryCode", "Phone country code")}
              </label>
              <select
                id="phoneCountry"
                name="phoneCountry"
                value={formData.phoneCountry}
                onChange={handleShippingChange}
                className="w-full px-4 py-3 border border-gray-300 rounded focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-colors text-base bg-white"
                aria-label={t(
                  "checkout.selectPhoneCountryCode",
                  "Select phone country code"
                )}
              >
                {COUNTRY_PHONE_OPTIONS.map(countryOption => (
                  <option key={countryOption.value} value={countryOption.value}>
                    {getCountryPhoneLabel(countryOption.value)}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handlePhoneChange}
              onBlur={handlePhoneBlur}
              placeholder="(555)-123-4567"
              className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base ${
                formErrors.phone
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-black focus:ring-black"
              }`}
              required
            />
          </div>
          {formErrors.phone && (
            <p className="flex items-center gap-1 text-red-600 text-xs sm:text-sm mt-1">
              <AlertCircle size={14} /> {formErrors.phone}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-black mb-3">
            {t("checkout.streetAddress", "Street Address")} *
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleShippingChange}
            placeholder="123 Main St"
            className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base ${
              formErrors.address
                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-black focus:ring-black"
            }`}
            required
          />
          {formErrors.address && (
            <p className="flex items-center gap-1 text-red-600 text-xs sm:text-sm mt-1">
              <AlertCircle size={14} /> {formErrors.address}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-black mb-3">
            {t("checkout.country", "Country")} *
          </label>
          <select
            name="country"
            value={formData.country}
            onChange={handleShippingChange}
            className="w-full px-4 py-3 border border-gray-300 rounded focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition-colors text-base bg-white"
            required
          >
            <option value="">
              {t("checkout.selectCountry", "Select country")}
            </option>
            {countryOptions.map(countryOption => (
              <option key={countryOption.value} value={countryOption.value}>
                {countryOption.flag ? `${countryOption.flag} ` : ""}
                {countryOption.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-semibold text-black mb-3">
              {getStateLabel(formData.country)} *
            </label>
            {manualLocationFields ? (
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleShippingChange}
                placeholder={getStateLabel(formData.country)}
                className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base ${
                  formErrors.state
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-black focus:ring-black"
                }`}
                required
              />
            ) : (
              <select
                name="state"
                value={formData.state}
                onChange={handleShippingChange}
                className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base bg-white ${
                  formErrors.state
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-black focus:ring-black"
                }`}
                required
              >
                <option value="">
                  {t("checkout.selectState", "Select")}{" "}
                  {getStateLabel(formData.country).toLowerCase()}
                </option>
                {structuredStateOptions.map(state => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
            )}
            {formErrors.state && (
              <p className="flex items-center gap-1 text-red-600 text-xs sm:text-sm mt-1">
                <AlertCircle size={14} /> {formErrors.state}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-3">
              {t("checkout.city", "City")} *
            </label>
            {manualCityField ? (
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleShippingChange}
                placeholder={t("checkout.city", "City")}
                className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base ${
                  formErrors.city
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-black focus:ring-black"
                }`}
                required
              />
            ) : (
              <select
                name="city"
                value={formData.city}
                onChange={handleShippingChange}
                disabled={!formData.state}
                className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base bg-white disabled:bg-gray-100 disabled:text-gray-500 ${
                  formErrors.city
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-black focus:ring-black"
                }`}
                required
              >
                <option value="">
                  {t("checkout.selectCity", "Select city")}
                </option>
                {cityOptions.map(city => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            )}
            {formErrors.city && (
              <p className="flex items-center gap-1 text-red-600 text-xs sm:text-sm mt-1">
                <AlertCircle size={14} /> {formErrors.city}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-3">
              {getPostalCodeLabel(formData.country)} *
            </label>
            <input
              type="text"
              name="zip"
              value={formData.zip}
              onChange={handleShippingChange}
              placeholder={t("checkout.zipPlaceholder", "10001")}
              className={`w-full px-4 py-3 border rounded focus:outline-none focus:ring-1 transition-colors text-base ${
                formErrors.zip
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:border-black focus:ring-black"
              }`}
              required
            />
            {formErrors.zip && (
              <p className="flex items-center gap-1 text-red-600 text-xs sm:text-sm mt-1">
                <AlertCircle size={14} /> {formErrors.zip}
              </p>
            )}
          </div>
        </div>

        {isAuthenticated && (
          <div className="p-4 rounded border border-gray-200 bg-gray-50 text-sm text-gray-700">
            Shipping addresses are saved automatically for future checkout. If
            you use a different address, you will be asked whether to update
            your saved address.
          </div>
        )}

        <button
          type="button"
          onClick={handleContinueToPayment}
          disabled={isSavingAddress}
          className="w-full bg-black hover:bg-gray-900 disabled:bg-gray-400 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded transition-colors duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          {isSavingAddress ? "Saving Address..." : "Continue to Payment"}
          <ChevronRight size={20} />
        </button>
      </form>
    </div>
  );
}
