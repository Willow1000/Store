export type SiteLanguageCode = "de" | "en" | "it" | "fr" | "es" | "nl";
export type SiteLanguageSource = "auto" | "manual";

type GeoLike = {
  location?: {
    country_code2?: string;
    state_prov?: string;
  };
  country_metadata?: {
    languages?: string[];
  };
};

export const SUPPORTED_SITE_LANGUAGES: Array<{
  code: SiteLanguageCode;
  name: string;
  nativeName: string;
}> = [
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "en", name: "English", nativeName: "English" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands" },
];

const SITE_LANGUAGE_KEY = "site-language";
const SITE_LANGUAGE_SOURCE_KEY = "site-language-source";
export const SITE_LANGUAGE_CHANGED_EVENT = "site-language-changed";

const ENGLISH_OVERRIDE_COUNTRIES = new Set<string>([
  "US",
  "CA",
  // Africa
  "DZ",
  "AO",
  "BJ",
  "BW",
  "BF",
  "BI",
  "CV",
  "CM",
  "CF",
  "TD",
  "KM",
  "CD",
  "DJ",
  "EG",
  "GQ",
  "ER",
  "SZ",
  "ET",
  "GA",
  "GM",
  "GH",
  "GN",
  "GW",
  "CI",
  "KE",
  "LS",
  "LR",
  "LY",
  "MG",
  "MW",
  "ML",
  "MR",
  "MU",
  "MA",
  "MZ",
  "NA",
  "NE",
  "NG",
  "CG",
  "RW",
  "ST",
  "SN",
  "SC",
  "SL",
  "SO",
  "ZA",
  "SS",
  "SD",
  "TZ",
  "TG",
  "TN",
  "UG",
  "ZM",
  "ZW",
]);

const KEY_TRANSLATIONS: Record<SiteLanguageCode, Record<string, string>> = {
  de: {
    "checkout.secureCheckout": "Sicherer Checkout",
    "checkout.completeCheckoutMessage":
      "Schließen Sie Ihren Kauf sicher und schnell ab",
    "checkout.payment": "Zahlung",
    "checkout.review": "Überprüfen",
    "common.back": "Zurück",
    "checkout.loadingCart": "Warenkorb wird geladen...",
    "checkout.reviewOrder": "Bestellung prüfen",
    "checkout.reviewYourOrder": "Überprüfen Sie Ihre Bestellung",
    "checkout.shippingTo": "Versand an",
    "common.edit": "Bearbeiten",
    "checkout.paymentMethod": "Zahlungsmethode",
    "checkout.items": "Artikel",
    "checkout.processing": "Wird verarbeitet...",
    "checkout.payNow": "Jetzt bezahlen",
    "checkout.estimatedShipping": "Voraussichtliche Versandkosten",
    "checkout.shippingEstimateDisclaimer":
      "Die angezeigten Versandkosten sind eine Schätzung. Die endgültigen Kosten werden beim Checkout bestätigt.",
    "checkout.taxInclusive": "inkl. Steuern",
    "checkout.returnPolicy": "30 Tage Rückgaberecht",
    "checkout.securePayments": "Sichere verschlüsselte Zahlungen",
    "header.home": "Startseite",
    "header.language": "Sprache",
    "header.selectLanguage": "Sprache waehlen",
    "header.help": "Hilfe",
    "header.faq": "FAQ",
    "header.myOrders": "Meine Bestellungen",
    "header.tickets": "Meine Tickets",
    "language.option.de": "Deutsch",
    "language.option.en": "Englisch",
    "language.option.it": "Italienisch",
    "language.option.fr": "Franzoesisch",
    "language.option.es": "Spanisch",
    "language.option.nl": "Niederlaendisch",
    "header.products": "Produkte",
    "header.about": "Über uns",
    "header.contact": "Kontakt",
    "common.cart": "Warenkorb",
    "footer.about":
      "Ihr Ziel fuer hochwertige Auto- und Motorenteile. Schneller Versand, originale Produkte und kompetenter Support.",
    "footer.browse": "Entdecken",
    "footer.allProducts": "Alle Produkte",
    "footer.support": "Support",
    "footer.helpCenter": "Hilfecenter",
    "footer.faq": "FAQ",
    "footer.contactUs": "Kontakt",
    "footer.shippingInfo": "Versandinfos",
    "footer.returns": "Rueckgaben",
    "footer.legal": "Rechtliches",
    "footer.privacyPolicy": "Datenschutz",
    "footer.termsOfService": "Nutzungsbedingungen",
    "footer.cookiePolicy": "Cookie-Richtlinie",
    "footer.accessibility": "Barrierefreiheit",
    "footer.allRightsReserved": "Alle Rechte vorbehalten.",
    "checkout.subtotal": "Zwischensumme",
    "checkout.shipping": "Versand",
    "checkout.vat": "MwSt",
    "checkout.total": "Gesamtsumme",
    "checkout.free": "KOSTENLOS",
    "checkout.orderSummary": "Bestellübersicht",
    "checkout.proceedToCheckout": "Zur Kasse",
    "checkout.addressSaveSignInRequired":
      "Bitte melden Sie sich an, um Ihre Lieferadresse zu speichern",
    "checkout.addressSaved":
      "Lieferadresse fuer zukuenftige Bestellungen gespeichert",
    "checkout.addressUpdateConfirm":
      "Sie haben eine andere Lieferadresse als Ihre gespeicherte Adresse eingegeben. Moechten Sie Ihre gespeicherte Adresse auf diese neue Adresse aktualisieren?",
    "checkout.addressUpdated": "Gespeicherte Lieferadresse aktualisiert",
    "checkout.addressKept":
      "Neue Adresse wird fuer diese Bestellung verwendet. Ihre gespeicherte Standardadresse bleibt unveraendert.",
    "checkout.addressSaveFailed":
      "Lieferadresse konnte nicht gespeichert werden",
    "loading.selectedLanguage": "Ausgewaehlte Sprache wird geladen...",
  },
  en: {
    "checkout.secureCheckout": "Secure Checkout",
    "checkout.completeCheckoutMessage":
      "Complete your purchase safely and quickly",
    "checkout.payment": "Payment",
    "checkout.review": "Review",
    "common.back": "Back",
    "checkout.loadingCart": "Loading cart...",
    "checkout.reviewOrder": "Review Order",
    "checkout.reviewYourOrder": "Review Your Order",
    "checkout.shippingTo": "Shipping To",
    "common.edit": "Edit",
    "checkout.paymentMethod": "Payment Method",
    "checkout.items": "Items",
    "checkout.processing": "Processing...",
    "checkout.payNow": "Pay Now",
    "checkout.estimatedShipping": "Estimated shipping",
    "checkout.shippingEstimateDisclaimer":
      "Shipping shown is an estimate. Final shipping is confirmed at checkout.",
    "checkout.taxInclusive": "Tax inclusive",
    "checkout.returnPolicy": "30-day return policy",
    "checkout.securePayments": "Secure encrypted payments",
    "header.home": "Home",
    "header.language": "Language",
    "header.selectLanguage": "Select language",
    "header.help": "Help",
    "header.faq": "FAQ",
    "header.myOrders": "My Orders",
    "header.tickets": "My Tickets",
    "language.option.de": "German",
    "language.option.en": "English",
    "language.option.it": "Italian",
    "language.option.fr": "French",
    "language.option.es": "Spanish",
    "language.option.nl": "Dutch",
    "footer.about":
      "Your ultimate destination for premium automotive and motor parts. Fast shipping, authentic products, and expert support for all your vehicle needs.",
    "footer.browse": "Browse",
    "footer.allProducts": "All Products",
    "footer.support": "Support",
    "footer.helpCenter": "Help Center",
    "footer.faq": "FAQ",
    "footer.contactUs": "Contact Us",
    "footer.shippingInfo": "Shipping Info",
    "footer.returns": "Returns",
    "footer.legal": "Legal",
    "footer.privacyPolicy": "Privacy Policy",
    "footer.termsOfService": "Terms of Service",
    "footer.cookiePolicy": "Cookie Policy",
    "footer.accessibility": "Accessibility",
    "footer.allRightsReserved": "All rights reserved.",
    "checkout.addressSaveSignInRequired":
      "Please sign in to save your shipping address",
    "checkout.addressSaved": "Shipping address saved for future checkout",
    "checkout.addressUpdateConfirm":
      "You entered a different shipping address from your saved one. Update your saved address to this new address?",
    "checkout.addressUpdated": "Saved shipping address updated",
    "checkout.addressKept":
      "Using new address for this checkout. Saved default remains unchanged.",
    "checkout.addressSaveFailed": "Failed to save shipping address",
    "loading.selectedLanguage": "Loading selected language...",
  },
  it: {
    "checkout.secureCheckout": "Pagamento sicuro",
    "checkout.completeCheckoutMessage":
      "Completa il tuo acquisto in modo sicuro e veloce",
    "checkout.payment": "Pagamento",
    "checkout.review": "Riepilogo",
    "common.back": "Indietro",
    "checkout.loadingCart": "Caricamento carrello...",
    "checkout.reviewOrder": "Rivedi ordine",
    "checkout.reviewYourOrder": "Rivedi il tuo ordine",
    "checkout.shippingTo": "Spedizione a",
    "common.edit": "Modifica",
    "checkout.paymentMethod": "Metodo di pagamento",
    "checkout.items": "Articoli",
    "checkout.processing": "Elaborazione in corso...",
    "checkout.payNow": "Paga ora",
    "checkout.estimatedShipping": "Spedizione stimata",
    "checkout.shippingEstimateDisclaimer":
      "La spedizione mostrata è una stima. Il costo finale viene confermato al momento del pagamento.",
    "checkout.taxInclusive": "Tasse incluse",
    "checkout.returnPolicy": "30 giorni per il reso",
    "checkout.securePayments": "Pagamenti sicuri e crittografati",
    "header.home": "Home",
    "header.language": "Lingua",
    "header.selectLanguage": "Seleziona lingua",
    "header.help": "Aiuto",
    "header.faq": "FAQ",
    "header.myOrders": "I miei ordini",
    "header.tickets": "I miei ticket",
    "language.option.de": "Tedesco",
    "language.option.en": "Inglese",
    "language.option.it": "Italiano",
    "language.option.fr": "Francese",
    "language.option.es": "Spagnolo",
    "language.option.nl": "Olandese",
    "header.products": "Prodotti",
    "header.about": "Chi siamo",
    "header.contact": "Contatti",
    "common.cart": "Carrello",
    "footer.about":
      "La tua destinazione per ricambi auto e componenti premium. Spedizione veloce, prodotti autentici e supporto esperto.",
    "footer.browse": "Esplora",
    "footer.allProducts": "Tutti i prodotti",
    "footer.support": "Supporto",
    "footer.helpCenter": "Centro assistenza",
    "footer.faq": "FAQ",
    "footer.contactUs": "Contattaci",
    "footer.shippingInfo": "Info spedizione",
    "footer.returns": "Resi",
    "footer.legal": "Legale",
    "footer.privacyPolicy": "Informativa privacy",
    "footer.termsOfService": "Termini di servizio",
    "footer.cookiePolicy": "Cookie policy",
    "footer.accessibility": "Accessibilita",
    "footer.allRightsReserved": "Tutti i diritti riservati.",
    "checkout.subtotal": "Subtotale",
    "checkout.shipping": "Spedizione",
    "checkout.vat": "IVA",
    "checkout.total": "Totale",
    "checkout.free": "GRATIS",
    "checkout.orderSummary": "Riepilogo ordine",
    "checkout.proceedToCheckout": "Vai al pagamento",
    "checkout.addressSaveSignInRequired":
      "Accedi per salvare il tuo indirizzo di spedizione",
    "checkout.addressSaved":
      "Indirizzo di spedizione salvato per i prossimi acquisti",
    "checkout.addressUpdateConfirm":
      "Hai inserito un indirizzo di spedizione diverso da quello salvato. Vuoi aggiornare l indirizzo salvato con questo nuovo indirizzo?",
    "checkout.addressUpdated": "Indirizzo di spedizione salvato aggiornato",
    "checkout.addressKept":
      "Il nuovo indirizzo verra usato per questo checkout. L indirizzo predefinito salvato rimane invariato.",
    "checkout.addressSaveFailed":
      "Impossibile salvare l indirizzo di spedizione",
    "loading.selectedLanguage": "Caricamento della lingua selezionata...",
  },
  fr: {
    "checkout.secureCheckout": "Paiement sécurisé",
    "checkout.completeCheckoutMessage":
      "Finalisez votre achat en toute sécurité et rapidement",
    "checkout.payment": "Paiement",
    "checkout.review": "Vérification",
    "common.back": "Retour",
    "checkout.loadingCart": "Chargement du panier...",
    "checkout.reviewOrder": "Vérifier la commande",
    "checkout.reviewYourOrder": "Vérifiez votre commande",
    "checkout.shippingTo": "Livraison à",
    "common.edit": "Modifier",
    "checkout.paymentMethod": "Moyen de paiement",
    "checkout.items": "Articles",
    "checkout.processing": "Traitement en cours...",
    "checkout.payNow": "Payer maintenant",
    "checkout.estimatedShipping": "Livraison estimée",
    "checkout.shippingEstimateDisclaimer":
      "Les frais de livraison affichés sont une estimation. Le montant final est confirmé au paiement.",
    "checkout.taxInclusive": "Taxes comprises",
    "checkout.returnPolicy": "30 jours pour retourner",
    "checkout.securePayments": "Paiements sécurisés et chiffrés",
    "header.home": "Accueil",
    "header.language": "Langue",
    "header.selectLanguage": "Choisir la langue",
    "header.help": "Aide",
    "header.faq": "FAQ",
    "header.myOrders": "Mes commandes",
    "header.tickets": "Mes tickets",
    "language.option.de": "Allemand",
    "language.option.en": "Anglais",
    "language.option.it": "Italien",
    "language.option.fr": "Francais",
    "language.option.es": "Espagnol",
    "language.option.nl": "Neerlandais",
    "header.products": "Produits",
    "header.about": "À propos",
    "header.contact": "Contact",
    "common.cart": "Panier",
    "footer.about":
      "Votre destination pour des pieces automobiles premium. Livraison rapide, produits authentiques et support expert.",
    "footer.browse": "Parcourir",
    "footer.allProducts": "Tous les produits",
    "footer.support": "Support",
    "footer.helpCenter": "Centre d aide",
    "footer.faq": "FAQ",
    "footer.contactUs": "Nous contacter",
    "footer.shippingInfo": "Infos livraison",
    "footer.returns": "Retours",
    "footer.legal": "Mentions legales",
    "footer.privacyPolicy": "Politique de confidentialite",
    "footer.termsOfService": "Conditions d utilisation",
    "footer.cookiePolicy": "Politique des cookies",
    "footer.accessibility": "Accessibilite",
    "footer.allRightsReserved": "Tous droits reserves.",
    "checkout.subtotal": "Sous-total",
    "checkout.shipping": "Livraison",
    "checkout.vat": "TVA",
    "checkout.total": "Total",
    "checkout.free": "GRATUIT",
    "checkout.orderSummary": "Récapitulatif",
    "checkout.proceedToCheckout": "Passer au paiement",
    "checkout.addressSaveSignInRequired":
      "Veuillez vous connecter pour enregistrer votre adresse de livraison",
    "checkout.addressSaved":
      "Adresse de livraison enregistree pour vos prochains achats",
    "checkout.addressUpdateConfirm":
      "Vous avez saisi une adresse de livraison differente de celle enregistree. Voulez-vous mettre a jour votre adresse enregistree avec cette nouvelle adresse ?",
    "checkout.addressUpdated": "Adresse de livraison enregistree mise a jour",
    "checkout.addressKept":
      "La nouvelle adresse sera utilisee pour cette commande. Votre adresse par defaut enregistree reste inchangee.",
    "checkout.addressSaveFailed":
      "Impossible d enregistrer l adresse de livraison",
    "loading.selectedLanguage": "Chargement de la langue selectionnee...",
  },
  es: {
    "checkout.secureCheckout": "Pago seguro",
    "checkout.completeCheckoutMessage":
      "Completa tu compra de forma segura y rápida",
    "checkout.payment": "Pago",
    "checkout.review": "Revisar",
    "common.back": "Atrás",
    "checkout.loadingCart": "Cargando carrito...",
    "checkout.reviewOrder": "Revisar pedido",
    "checkout.reviewYourOrder": "Revisa tu pedido",
    "checkout.shippingTo": "Enviar a",
    "common.edit": "Editar",
    "checkout.paymentMethod": "Método de pago",
    "checkout.items": "Artículos",
    "checkout.processing": "Procesando...",
    "checkout.payNow": "Pagar ahora",
    "checkout.estimatedShipping": "Envío estimado",
    "checkout.shippingEstimateDisclaimer":
      "El envío mostrado es una estimación. El coste final se confirma al finalizar la compra.",
    "checkout.taxInclusive": "Impuestos incluidos",
    "checkout.returnPolicy": "30 días para devoluciones",
    "checkout.securePayments": "Pagos seguros y cifrados",
    "header.home": "Inicio",
    "header.language": "Idioma",
    "header.selectLanguage": "Seleccionar idioma",
    "header.help": "Ayuda",
    "header.faq": "FAQ",
    "header.myOrders": "Mis pedidos",
    "header.tickets": "Mis tickets",
    "language.option.de": "Aleman",
    "language.option.en": "Ingles",
    "language.option.it": "Italiano",
    "language.option.fr": "Frances",
    "language.option.es": "Espanol",
    "language.option.nl": "Neerlandes",
    "header.products": "Productos",
    "header.about": "Acerca de",
    "header.contact": "Contacto",
    "common.cart": "Carrito",
    "footer.about":
      "Tu destino para repuestos automotrices premium. Envio rapido, productos autenticos y soporte experto.",
    "footer.browse": "Explorar",
    "footer.allProducts": "Todos los productos",
    "footer.support": "Soporte",
    "footer.helpCenter": "Centro de ayuda",
    "footer.faq": "FAQ",
    "footer.contactUs": "Contactanos",
    "footer.shippingInfo": "Informacion de envio",
    "footer.returns": "Devoluciones",
    "footer.legal": "Legal",
    "footer.privacyPolicy": "Politica de privacidad",
    "footer.termsOfService": "Terminos del servicio",
    "footer.cookiePolicy": "Politica de cookies",
    "footer.accessibility": "Accesibilidad",
    "footer.allRightsReserved": "Todos los derechos reservados.",
    "checkout.subtotal": "Subtotal",
    "checkout.shipping": "Envío",
    "checkout.vat": "IVA",
    "checkout.total": "Total",
    "checkout.free": "GRATIS",
    "checkout.orderSummary": "Resumen del pedido",
    "checkout.proceedToCheckout": "Ir al pago",
    "checkout.addressSaveSignInRequired":
      "Inicia sesion para guardar tu direccion de envio",
    "checkout.addressSaved": "Direccion de envio guardada para futuras compras",
    "checkout.addressUpdateConfirm":
      "Has introducido una direccion de envio diferente de la guardada. Quieres actualizar tu direccion guardada con esta nueva direccion?",
    "checkout.addressUpdated": "Direccion de envio guardada actualizada",
    "checkout.addressKept":
      "Se usara la nueva direccion para esta compra. La direccion predeterminada guardada no cambia.",
    "checkout.addressSaveFailed": "No se pudo guardar la direccion de envio",
    "loading.selectedLanguage": "Cargando el idioma seleccionado...",
  },
  nl: {
    "checkout.secureCheckout": "Veilig afrekenen",
    "checkout.completeCheckoutMessage": "Rond uw aankoop veilig en snel af",
    "checkout.payment": "Betaling",
    "checkout.review": "Controleren",
    "common.back": "Terug",
    "checkout.loadingCart": "Winkelwagen laden...",
    "checkout.reviewOrder": "Bestelling controleren",
    "checkout.reviewYourOrder": "Controleer uw bestelling",
    "checkout.shippingTo": "Verzenden naar",
    "common.edit": "Bewerken",
    "checkout.paymentMethod": "Betaalmethode",
    "checkout.items": "Artikelen",
    "checkout.processing": "Verwerken...",
    "checkout.payNow": "Nu betalen",
    "checkout.estimatedShipping": "Geschatte verzendkosten",
    "checkout.shippingEstimateDisclaimer":
      "De getoonde verzendkosten zijn een schatting. De definitieve kosten worden bij het afrekenen bevestigd.",
    "checkout.taxInclusive": "Inclusief belasting",
    "checkout.returnPolicy": "30 dagen retourrecht",
    "checkout.securePayments": "Veilige versleutelde betalingen",
    "header.home": "Home",
    "header.language": "Taal",
    "header.selectLanguage": "Selecteer taal",
    "header.help": "Help",
    "header.faq": "FAQ",
    "header.myOrders": "Mijn bestellingen",
    "header.tickets": "Mijn tickets",
    "language.option.de": "Duits",
    "language.option.en": "Engels",
    "language.option.it": "Italiaans",
    "language.option.fr": "Frans",
    "language.option.es": "Spaans",
    "language.option.nl": "Nederlands",
    "header.products": "Producten",
    "header.about": "Over ons",
    "header.contact": "Contact",
    "common.cart": "Winkelwagen",
    "footer.about":
      "Jouw bestemming voor premium auto- en motoronderdelen. Snelle levering, authentieke producten en deskundige support.",
    "footer.browse": "Verkennen",
    "footer.allProducts": "Alle producten",
    "footer.support": "Support",
    "footer.helpCenter": "Helpcentrum",
    "footer.faq": "FAQ",
    "footer.contactUs": "Contact",
    "footer.shippingInfo": "Verzendinfo",
    "footer.returns": "Retouren",
    "footer.legal": "Juridisch",
    "footer.privacyPolicy": "Privacybeleid",
    "footer.termsOfService": "Servicevoorwaarden",
    "footer.cookiePolicy": "Cookiebeleid",
    "footer.accessibility": "Toegankelijkheid",
    "footer.allRightsReserved": "Alle rechten voorbehouden.",
    "checkout.subtotal": "Subtotaal",
    "checkout.shipping": "Verzending",
    "checkout.vat": "BTW",
    "checkout.total": "Totaal",
    "checkout.free": "GRATIS",
    "checkout.orderSummary": "Besteloverzicht",
    "checkout.proceedToCheckout": "Afrekenen",
    "checkout.addressSaveSignInRequired":
      "Log in om je verzendadres op te slaan",
    "checkout.addressSaved":
      "Verzendadres opgeslagen voor toekomstige bestellingen",
    "checkout.addressUpdateConfirm":
      "Je hebt een ander verzendadres ingevoerd dan je opgeslagen adres. Wil je je opgeslagen adres bijwerken naar dit nieuwe adres?",
    "checkout.addressUpdated": "Opgeslagen verzendadres bijgewerkt",
    "checkout.addressKept":
      "Het nieuwe adres wordt gebruikt voor deze checkout. Je opgeslagen standaardadres blijft ongewijzigd.",
    "checkout.addressSaveFailed": "Verzendadres opslaan is mislukt",
    "loading.selectedLanguage": "Geselecteerde taal wordt geladen...",
  },
};

function isSupportedLanguage(value: string): value is SiteLanguageCode {
  return SUPPORTED_SITE_LANGUAGES.some(lang => lang.code === value);
}

function normalizeLanguageCode(
  value: string | null | undefined
): SiteLanguageCode | null {
  if (!value) return null;
  const short = value.toLowerCase().split("-")[0];
  return isSupportedLanguage(short) ? short : null;
}

function detectFromRegion(
  countryCode: string,
  stateProvince: string
): SiteLanguageCode {
  const country = countryCode.toUpperCase();
  const state = stateProvince.toLowerCase();

  if (ENGLISH_OVERRIDE_COUNTRIES.has(country)) return "en";

  if (country === "DE" || country === "AT") return "de";
  if (
    country === "GB" ||
    country === "IE" ||
    country === "SE" ||
    country === "NO" ||
    country === "DK" ||
    country === "FI" ||
    country === "MT"
  )
    return "en";
  if (country === "IT" || country === "SI" || country === "HR") return "it";
  if (country === "FR") return "fr";
  if (country === "ES" || country === "AD") return "es";
  if (country === "NL") return "nl";

  if (country === "BE") {
    if (
      state.includes("flanders") ||
      state.includes("vlaanderen") ||
      state.includes("antwerp") ||
      state.includes("ghent") ||
      state.includes("bruges")
    ) {
      return "nl";
    }
    if (
      state.includes("wallonia") ||
      state.includes("wallon") ||
      state.includes("liege") ||
      state.includes("charleroi") ||
      state.includes("namur")
    ) {
      return "fr";
    }
    return "de";
  }

  if (country === "CH") {
    if (
      state.includes("ticino") ||
      state.includes("lugano") ||
      state.includes("locarno")
    )
      return "it";
    if (
      state.includes("geneva") ||
      state.includes("vaud") ||
      state.includes("lausanne") ||
      state.includes("neuchatel") ||
      state.includes("jura")
    )
      return "fr";
    return "de";
  }

  if (country === "LU") {
    return "de";
  }

  return "en";
}

export function detectLanguageFromGeo(
  geo: GeoLike | null | undefined
): SiteLanguageCode {
  const country = geo?.location?.country_code2 || "";
  const state = geo?.location?.state_prov || "";
  if (country) {
    return detectFromRegion(country, state);
  }

  const hintedLanguage = normalizeLanguageCode(
    geo?.country_metadata?.languages?.[0]
  );
  if (hintedLanguage) return hintedLanguage;

  if (typeof navigator !== "undefined") {
    const localeHint = normalizeLanguageCode(
      navigator.language ||
        (Array.isArray(navigator.languages) ? navigator.languages[0] : "")
    );
    if (localeHint) return localeHint;
  }

  return "en";
}

export function getSiteLanguage(): SiteLanguageCode {
  try {
    const stored = localStorage.getItem(SITE_LANGUAGE_KEY);
    const normalized = normalizeLanguageCode(stored);
    if (normalized) return normalized;
  } catch {
    // Ignore storage issues.
  }
  return "en";
}

export function getSiteLanguageSource(): SiteLanguageSource {
  try {
    const raw = localStorage.getItem(SITE_LANGUAGE_SOURCE_KEY);
    return raw === "manual" ? "manual" : "auto";
  } catch {
    return "auto";
  }
}

export function getSiteLanguageDebugInfo(geo: GeoLike | null | undefined): {
  country: string;
  detectedLanguage: SiteLanguageCode;
  currentLanguage: SiteLanguageCode;
  source: SiteLanguageSource;
} {
  const country = (geo?.location?.country_code2 || "").toUpperCase();
  const detectedLanguage = detectLanguageFromGeo(geo);
  const currentLanguage = getSiteLanguage();
  const source = getSiteLanguageSource();

  return {
    country,
    detectedLanguage,
    currentLanguage,
    source,
  };
}

export function setSiteLanguage(
  language: SiteLanguageCode,
  source: SiteLanguageSource = "manual"
): void {
  try {
    localStorage.setItem(SITE_LANGUAGE_KEY, language);
    localStorage.setItem(SITE_LANGUAGE_SOURCE_KEY, source);
    window.dispatchEvent(
      new CustomEvent(SITE_LANGUAGE_CHANGED_EVENT, { detail: language })
    );
  } catch {
    // Ignore storage issues.
  }
}

/**
 * Drop a manual language choice and return to region detection.
 *
 * setSiteLanguage() defaults to source "manual", and initializeSiteLanguage()
 * skips detection entirely while that flag is set. Without a way to clear it,
 * a visitor who ever touched the language selector had auto-detection disabled
 * permanently on that browser with no route back - which reads as region
 * detection being broken.
 *
 * Returns the language detected for the supplied geo so the caller can apply it
 * immediately rather than waiting for the next page load.
 */
export function clearSiteLanguageOverride(
  geo: GeoLike | null | undefined
): SiteLanguageCode {
  try {
    localStorage.removeItem(SITE_LANGUAGE_SOURCE_KEY);
  } catch {
    // Ignore storage issues.
  }
  const detected = detectLanguageFromGeo(geo);
  setSiteLanguage(detected, "auto");
  return detected;
}

export function initializeSiteLanguage(
  geo: GeoLike | null | undefined
): SiteLanguageCode {
  const existing = getSiteLanguage();
  const source = getSiteLanguageSource();
  if (source === "manual") return existing;

  const detected = detectLanguageFromGeo(geo);
  if (existing !== detected || source !== "auto") {
    setSiteLanguage(detected, "auto");
  }
  return detected;
}

export function translateText(
  language: SiteLanguageCode,
  key: string,
  fallback: string
): string {
  return KEY_TRANSLATIONS[language]?.[key] || fallback;
}

/**
 * Every string this dictionary can already put on screen for `language`.
 * The runtime DOM translator uses it to recognise text that components have
 * ALREADY localised via translateText(), so it does not ship those strings to
 * the translation endpoint just to get them back unchanged.
 */
export function getStaticallyTranslatedValues(
  language: SiteLanguageCode
): string[] {
  return Object.values(KEY_TRANSLATIONS[language] || {});
}

/**
 * English source text -> localised text, for the keys where both exist.
 * Used to seed the runtime translation cache so chrome that is NOT rendered
 * through translateText() still resolves without a network round trip.
 */
export function getStaticSourcePairs(
  language: SiteLanguageCode
): Array<[string, string]> {
  const english = KEY_TRANSLATIONS.en || {};
  const target = KEY_TRANSLATIONS[language] || {};
  const pairs: Array<[string, string]> = [];
  Object.entries(english).forEach(([key, sourceText]) => {
    const translated = target[key];
    if (translated && sourceText && translated !== sourceText) {
      pairs.push([sourceText, translated]);
    }
  });
  return pairs;
}
