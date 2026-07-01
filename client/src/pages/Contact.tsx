'use client';

import { useState, useEffect } from 'react';
import currencyClient from '@/lib/currencyClient';
import { toast } from 'sonner';
import { useSearch } from 'wouter';
import { RecaptchaCheckbox } from '@/components/RecaptchaCheckbox';
import { SEOHead } from '@/components/SEOHead';
import { GoogleMapsLocator } from '@/components/GoogleMapsLocator';
import { useAuth } from '@/_core/hooks/useAuth';
import { getSiteLanguage, type SiteLanguageCode } from '@/lib/language';
import { getEnquiryCopy } from '@/lib/enquiry';
import { sanitizeEmail, sanitizeLocation, sanitizeMultilineText, sanitizeMultilineTextInput, sanitizeName, sanitizeNameInput, sanitizeText, sanitizeTextInput } from '@shared/sanitize';
import { Country } from 'country-state-city';

// Input length constraints
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 255;
const MAX_MESSAGE_LENGTH = 5000;
const SUPPORT_EMAIL = 'support@motorvault.shop';
const WHATSAPP_NUMBER_E164 = '31687659021';
const WHATSAPP_DEFAULT_MESSAGE = "Hello, I'm from your website, can I get more information.";
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER_E164}?text=${encodeURIComponent(WHATSAPP_DEFAULT_MESSAGE)}`;
const LOCATION_OPTIONS = Country.getAllCountries()
  .map((country) => country.name)
  .filter((name, index, all) => name && all.indexOf(name) === index)
  .sort((a, b) => a.localeCompare(b));

// Validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= MAX_EMAIL_LENGTH;
}

// For select, store/display the value as shown in the dropdown (no normalization)
function normalizeLocation(value: string): string {
  return value.trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getLocalizedEnquirySections(language: SiteLanguageCode) {
  switch (language) {
    case 'de':
      return {
        item: 'Artikel',
        specification: 'Artikelspezifikation',
        none: 'Keine',
        location: 'Standort',
        detectedGeolocation: 'Erkannte Geolokalisierung',
        countryCode: 'Laendercode',
        country: 'Land',
        city: 'Stadt',
        coordinates: 'Koordinaten',
        additionalDetails: 'Zusaetzliche Details',
      };
    case 'it':
      return {
        item: 'Articolo',
        specification: 'Specifiche articolo',
        none: 'Nessuno',
        location: 'Posizione',
        detectedGeolocation: 'Geolocalizzazione rilevata',
        countryCode: 'Codice paese',
        country: 'Paese',
        city: 'Citta',
        coordinates: 'Coordinate',
        additionalDetails: 'Dettagli aggiuntivi',
      };
    case 'fr':
      return {
        item: 'Article',
        specification: 'Specifications article',
        none: 'Aucun',
        location: 'Localisation',
        detectedGeolocation: 'Geolocalisation detectee',
        countryCode: 'Code pays',
        country: 'Pays',
        city: 'Ville',
        coordinates: 'Coordonnees',
        additionalDetails: 'Details supplementaires',
      };
    case 'es':
      return {
        item: 'Articulo',
        specification: 'Especificaciones del articulo',
        none: 'Ninguno',
        location: 'Ubicacion',
        detectedGeolocation: 'Geolocalizacion detectada',
        countryCode: 'Codigo de pais',
        country: 'Pais',
        city: 'Ciudad',
        coordinates: 'Coordenadas',
        additionalDetails: 'Detalles adicionales',
      };
    case 'nl':
      return {
        item: 'Artikel',
        specification: 'Artikelspecificatie',
        none: 'Geen',
        location: 'Locatie',
        detectedGeolocation: 'Gedetecteerde geolocatie',
        countryCode: 'Landcode',
        country: 'Land',
        city: 'Stad',
        coordinates: 'Coordinaten',
        additionalDetails: 'Aanvullende details',
      };
    default:
      return {
        item: 'Item',
        specification: 'Item specification',
        none: 'None',
        location: 'Location',
        detectedGeolocation: 'Detected geolocation',
        countryCode: 'Country Code',
        country: 'Country',
        city: 'City',
        coordinates: 'Coordinates',
        additionalDetails: 'Additional details',
      };
  }
}

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  location: string;
  message: string;
  website: string;
  geo?: any | null;
}

export default function Contact() {
  const searchParams = useSearch();
  const { user } = useAuth();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    subject: '',
    location: '',
    message: '',
    website: '',
    geo: null,
  });

  // Pre-fill form with query parameters
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const queryName = params.get('name') || '';
    const queryEmail = params.get('email') || '';
    // Prefer explicit location param, then user profile, then geo lookup
    const paramLocation = params.get('location') || '';
    const geoCountryCode = currencyClient.getCountryCode() || '';
    // Always use display value for select
    const displayLocation =
      paramLocation ||
      (typeof (user as any)?.location === 'string' ? (user as any).location : '') ||
      (typeof (user as any)?.country === 'string' ? (user as any).country : '') ||
      geoCountryCode || '';
    const querySubject = params.get('subject') || '';
    const queryMessage = params.get('message') || '';
    const isEnquiry = params.get('enquiry') === '1';
    const includeGeoInMessage = params.get('includeGeo') !== '0';
    const productName = params.get('product') || '';

    const userName = typeof user?.name === 'string' ? user.name : '';
    const userEmail = typeof user?.email === 'string' ? user.email : '';
    const userLocation = normalizeLocation(
      typeof (user as any)?.location === 'string'
        ? (user as any).location
        : typeof (user as any)?.country === 'string'
          ? (user as any).country
          : ''
    );

    const hasPrefillData =
      Boolean(queryName || queryEmail || displayLocation || querySubject || queryMessage || productName) ||
      Boolean(userName || userEmail || userLocation);

    if (hasPrefillData) {
      // Format message nicely if it contains item/spec info or if productName present
      const formatMessage = (raw: string, geoObj?: any, includeGeo: boolean = true) => {
        const language = getSiteLanguage();
        const copy = getEnquiryCopy(language);
        const sections = getLocalizedEnquirySections(language);
        const rawLower = (raw || '').toLowerCase();
        let item = '';
        let specs: string[] = [];

        // Parse both English and localized item/spec labels.
        const itemLabels = ['item', 'item name', copy.searchItemLabel]
          .filter(Boolean)
          .map((label) => escapeRegExp(label));
        const specLabels = ['item specification', 'items specification', copy.searchSpecLabel]
          .filter(Boolean)
          .map((label) => escapeRegExp(label));

        const itemMatch = raw.match(new RegExp(`(?:${itemLabels.join('|')})\\s*:\\s*([^\\n\\r]+)`, 'i'));
        if (itemMatch && itemMatch[1]) item = itemMatch[1].trim();

        const specMatch = raw.match(new RegExp(`(?:${specLabels.join('|')})\\s*:\\s*([^\\n\\r]+)`, 'i'));
        if (specMatch && specMatch[1]) {
          specs = specMatch[1].split(/;|,|\|/).map(s => s.trim()).filter(Boolean);
        }

        // If nothing parsed but raw contains semicolon-separated filters, use them
        if (!item && raw && raw.includes('\n')) {
          const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          if (lines.length === 1) item = lines[0];
        }

        // Fallbacks
        if (!item && productName) item = productName;
        if (!item && !raw) item = '';

        // Build nice template
        let out = '';
        if (item) out += `${sections.item}: ${item}\n\n`;
        out += `${sections.specification}:\n`;
        if (specs.length) {
          out += specs.map(s => `- ${s}`).join('\n') + '\n\n';
        } else if (raw && raw.trim()) {
          out += raw.trim() + '\n\n';
        } else {
          out += `${sections.none}\n\n`;
        }

        // Add detected country if available
        const detectedCountry = displayLocation || userLocation || '';
        if (includeGeo && detectedCountry) out += `${sections.location}: ${detectedCountry}\n\n`;

        // If geo object available, append compact geo details
        if (includeGeo && geoObj) {
          try {
            const g = geoObj;
            const ip = (g && g.ip) ? g.ip : '';
            const cc2 = (g.location && g.location.country_code2) || '';
            const country = (g.location && (g.location.country_name || g.location.country)) || '';
            const city = (g.location && g.location.city) || '';
            const lat = (g.location && g.location.latitude) || '';
            const lon = (g.location && g.location.longitude) || '';

            out += `${sections.detectedGeolocation}:\n`;
            if (ip) out += `- IP: ${ip}\n`;
            if (cc2) out += `- ${sections.countryCode}: ${cc2}\n`;
            if (country) out += `- ${sections.country}: ${country}\n`;
            if (city) out += `- ${sections.city}: ${city}\n`;
            if (lat || lon) out += `- ${sections.coordinates}: ${lat}, ${lon}\n`;
            out += '\n';
          } catch (e) {}
        }

        out += `${sections.additionalDetails}:\n`;

        return out.trim();
      };

      // Attach cached geo when available
      const cachedGeo = currencyClient.getGeoData() || null;
      const finalMessage = isEnquiry
        ? formatMessage(queryMessage, cachedGeo, includeGeoInMessage)
        : (queryMessage || '');

      setFormData((prev) => {
        // Only set location if it matches a supported option
        let loc = sanitizeLocation(displayLocation);
        if (!LOCATION_OPTIONS.includes(loc)) loc = '';
        return {
          ...prev,
          name: prev.name || sanitizeName(queryName || userName, MAX_NAME_LENGTH),
          email: prev.email || sanitizeEmail(queryEmail || userEmail, MAX_EMAIL_LENGTH),
          location: prev.location || loc,
          subject: prev.subject || sanitizeText(querySubject, 200),
          message: prev.message || sanitizeMultilineText(finalMessage, MAX_MESSAGE_LENGTH),
          geo: prev.geo || cachedGeo,
        };
      });
    }
  }, [searchParams, user]);

  // Always autofill location from cached geo-location data (display value)
  useEffect(() => {
    const geo = currencyClient.getGeoData();
    if (geo && geo.location) {
      const cc = geo.location.country_name || geo.location.country_code2 || '';
      let loc = sanitizeLocation(cc);
      if (!LOCATION_OPTIONS.includes(loc)) loc = '';
      setFormData(prev => ({ ...prev, location: loc, geo: prev.geo || geo }));
    }
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    field: keyof ContactFormData
  ) => {
    let value = e.target.value;

    // Apply length limits and sanitization
    if (field === 'name') {
      value = sanitizeNameInput(value, MAX_NAME_LENGTH);
    } else if (field === 'email') {
      value = sanitizeEmail(value, MAX_EMAIL_LENGTH);
    } else if (field === 'subject') {
      value = sanitizeTextInput(value, 200);
    } else if (field === 'location') {
      // Do not sanitize location; use exact dropdown value
    } else if (field === 'message') {
      value = sanitizeMultilineTextInput(value, MAX_MESSAGE_LENGTH);
    } else if (field === 'website') {
      value = sanitizeTextInput(value, 120);
    }

    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      // Validation checks
      if (!formData.name.trim()) {
        toast.error('Name is required');
        setIsLoading(false);
        return;
      }

      if (!formData.email.trim()) {
        toast.error('Email is required');
        setIsLoading(false);
        return;
      }

      if (!isValidEmail(formData.email)) {
        toast.error('Please enter a valid email address');
        setIsLoading(false);
        return;
      }

      if (!formData.subject.trim()) {
        toast.error('Subject is required');
        setIsLoading(false);
        return;
      }

      if (!formData.message.trim()) {
        toast.error('Message is required');
        setIsLoading(false);
        return;
      }

      if (formData.message.length < 10) {
        toast.error('Message must be at least 10 characters');
        setIsLoading(false);
        return;
      }

      if (!captchaToken) {
        toast.error('Please complete the reCAPTCHA before sending your message.');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/contact-us', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: sanitizeName(formData.name, MAX_NAME_LENGTH),
          email: sanitizeEmail(formData.email, MAX_EMAIL_LENGTH),
          location: sanitizeLocation(formData.location),
          subject: sanitizeText(formData.subject, 200),
          message: sanitizeMultilineText(formData.message, MAX_MESSAGE_LENGTH),
          website: sanitizeText(formData.website, 120),
          recaptchaToken: captchaToken,
          geo: formData.geo || null,
          language: getSiteLanguage(),
        }),
      });

      const responseBody = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(responseBody?.error || 'We were unable to send your message. Please try again.');
        console.error('Contact form error:', responseBody);
        setIsLoading(false);
        return;
      }

      // Success
      toast.success('Thank you! Your message has been sent successfully.');
      setFormData({
        name: '',
        email: '',
        subject: '',
        location: '',
        message: '',
        website: '',
        geo: null,
      });
      setCaptchaToken(null);
    } catch (error) {
      toast.error('We were unable to send your message. Please try again.');
      console.error('Contact form submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEOHead
        title="Contact MotorVault - Customer Support"
        description="Need help? Contact MotorVault customer support. Available via email, phone, or form. Operating in USA, Switzerland, Poland, Finland, UAE."
        keywords={['contact us', 'customer service', 'support', 'get in touch', 'motor vault help']}
        canonical="https://motorvault.shop/contact"
      />
      <div className="min-h-screen bg-background pt-6">
      <div className="max-w-screen-lg mx-auto px-3 sm:px-4 lg:px-6 py-12">
        <h1 className="text-4xl font-bold mb-8">Contact Us</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-semibold mb-6">Get in Touch</h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Email</h3>
                <p className="text-gray-600">
                  <a href="mailto:support.motorvault@gmail.com" className="text-blue-600 hover:underline">
                    {SUPPORT_EMAIL}
                  </a>
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Phone</h3>
                <p className="text-gray-600">1-800-MOTORVAULT</p>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Hours</h3>
                <p className="text-gray-600">
                  Monday - Friday: 9 AM - 6 PM<br />
                  Saturday: 10 AM - 4 PM<br />
                  Sunday: Closed
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">WhatsApp</h3>
                 <a
                   href={WHATSAPP_LINK}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors mt-2"
                   title="Chat with us on WhatsApp"
                 >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.52 3.48A11.94 11.94 0 0012 0C5.37 0 0 5.37 0 12c0 2.12.55 4.19 1.6 6.01L0 24l6.18-1.62A11.94 11.94 0 0012 24c6.63 0 12-5.37 12-12 0-3.19-1.24-6.19-3.48-8.52zM12 22c-1.85 0-3.67-.5-5.24-1.44l-.37-.22-3.67.96.98-3.58-.24-.37A9.97 9.97 0 012 12C2 6.48 6.48 2 12 2c2.39 0 4.63.84 6.44 2.36A9.97 9.97 0 0122 12c0 5.52-4.48 10-10 10zm5.13-7.47c-.28-.14-1.65-.81-1.9-.9-.25-.09-.43-.14-.61.14-.18.28-.7.9-.86 1.08-.16.18-.32.2-.6.07-.28-.14-1.18-.44-2.25-1.41-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.34.42-.51.14-.17.18-.29.28-.48.09-.19.05-.36-.02-.5-.07-.14-.61-1.47-.84-2.01-.22-.53-.45-.46-.62-.47-.16-.01-.36-.01-.56-.01-.19 0-.5.07-.76.34-.26.27-1 1-.98 2.43.02 1.43 1.03 2.81 1.18 3 .15.19 2.03 3.1 4.93 4.23.69.3 1.23.48 1.65.61.69.22 1.32.19 1.81.12.55-.08 1.65-.67 1.88-1.32.23-.65.23-1.2.16-1.32-.07-.12-.25-.19-.53-.33z" />
                  </svg>
                  Chat with us on WhatsApp
                </a>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Facebook</h3>
                <a
                  href="https://www.facebook.com/profile.php?id=61590090897198"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors mt-2"
                  title="Visit our Facebook page"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5 mr-2">
                    <path d="M22.675 0h-21.35C.595 0 0 .592 0 1.326v21.348C0 23.406.595 24 1.325 24h11.495v-9.294H9.691v-3.622h3.129V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.406 24 24 23.406 24 22.674V1.326C24 .592 23.406 0 22.675 0" />
                  </svg>
                  Visit us on Facebook
                </a>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Find Us on Google Maps</h3>
                <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                  <div className="h-[260px] sm:h-[320px] lg:h-[360px]">
                    <GoogleMapsLocator />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-6">Contact Form</h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium mb-2">Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange(e, 'name')}
                  placeholder="Your full name"
                  maxLength={MAX_NAME_LENGTH}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
                <p className="text-xs text-gray-500 mt-1">{formData.name.length}/{MAX_NAME_LENGTH}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange(e, 'email')}
                  placeholder="your@email.com"
                  maxLength={MAX_EMAIL_LENGTH}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
                <p className="text-xs text-gray-500 mt-1">{formData.email.length}/{MAX_EMAIL_LENGTH}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Subject <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => handleInputChange(e, 'subject')}
                  placeholder="What is this about?"
                  maxLength={200}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
                <p className="text-xs text-gray-500 mt-1">{formData.subject.length}/200</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <select
                  value={formData.location}
                  onChange={(e) => handleInputChange(e, 'location')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="">Select your location</option>
                  {LOCATION_OPTIONS.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Message <span className="text-red-500">*</span></label>
                <textarea
                  rows={5}
                  value={formData.message}
                  onChange={(e) => handleInputChange(e, 'message')}
                  placeholder="Your message here..."
                  maxLength={MAX_MESSAGE_LENGTH}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-gray-500">{formData.message.length}/{MAX_MESSAGE_LENGTH}</p>
                  {formData.message.length < 10 && formData.message.length > 0 && (
                    <p className="text-xs text-red-500">Message must be at least 10 characters</p>
                  )}
                </div>
              </div>

              <div className="hidden" aria-hidden="true">
                <label htmlFor="contact-website">Website</label>
                <input
                  id="contact-website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={formData.website}
                  onChange={(e) => handleInputChange(e, 'website')}
                />
              </div>

              <RecaptchaCheckbox
                onChange={setCaptchaToken}
                className="rounded-lg sm:rounded-xl border border-gray-200 bg-gray-50 px-3 sm:px-4 py-3 sm:py-4 mt-4 sm:mt-6"
                helperText={!captchaToken ? 'Please complete this security check before sending your message' : ''}
              />
              
              <button
                type="submit"
                disabled={isLoading || !captchaToken}
                className="w-full bg-black text-white py-2 rounded-lg font-medium hover:bg-gray-900 disabled:bg-gray-400 transition-colors"
                title={!captchaToken ? 'Please complete the security check first' : ''}
              >
                {isLoading ? 'Sending...' : !captchaToken ? 'Complete security check to send' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
