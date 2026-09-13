import type { SiteLanguageCode } from "@/lib/language";

/**
 * Build-time translations for site chrome - the strings that appear on every
 * page (header, footer, filters, product actions).
 *
 * Why this exists: language switching used to translate the entire DOM through
 * a network call per unique string. Even batched, the chrome could not paint in
 * the target language until a round trip finished, so every page visibly
 * flipped from English. These strings are known at build time, so they should
 * never cost a request.
 *
 * How it is used: `seedStaticTranslations()` primes the runtime translation
 * cache, so chrome resolves as a cache hit and renders immediately. Runtime
 * translation still handles everything dynamic (product titles, descriptions,
 * blog copy).
 *
 * Keys MUST match the rendered text exactly, including punctuation and case -
 * the cache is keyed on the source string.
 */
export type TranslatableLanguage = Exclude<SiteLanguageCode, "en">;

export const UI_STRINGS: Record<
  string,
  Record<TranslatableLanguage, string>
> = {
  // -- Header / navigation --------------------------------------------------
  Products: {
    de: "Produkte",
    it: "Prodotti",
    fr: "Produits",
    es: "Productos",
    nl: "Producten",
  },
  Blog: { de: "Blog", it: "Blog", fr: "Blog", es: "Blog", nl: "Blog" },
  About: {
    de: "Über uns",
    it: "Chi siamo",
    fr: "À propos",
    es: "Acerca de",
    nl: "Over ons",
  },
  Contact: {
    de: "Kontakt",
    it: "Contatti",
    fr: "Contact",
    es: "Contacto",
    nl: "Contact",
  },
  Cart: {
    de: "Warenkorb",
    it: "Carrello",
    fr: "Panier",
    es: "Carrito",
    nl: "Winkelwagen",
  },
  Language: {
    de: "Sprache",
    it: "Lingua",
    fr: "Langue",
    es: "Idioma",
    nl: "Taal",
  },
  Search: {
    de: "Suche",
    it: "Cerca",
    fr: "Rechercher",
    es: "Buscar",
    nl: "Zoeken",
  },

  // -- Language names -------------------------------------------------------
  English: {
    de: "Englisch",
    it: "Inglese",
    fr: "Anglais",
    es: "Inglés",
    nl: "Engels",
  },
  German: {
    de: "Deutsch",
    it: "Tedesco",
    fr: "Allemand",
    es: "Alemán",
    nl: "Duits",
  },
  Italian: {
    de: "Italienisch",
    it: "Italiano",
    fr: "Italien",
    es: "Italiano",
    nl: "Italiaans",
  },
  French: {
    de: "Französisch",
    it: "Francese",
    fr: "Français",
    es: "Francés",
    nl: "Frans",
  },
  Spanish: {
    de: "Spanisch",
    it: "Spagnolo",
    fr: "Espagnol",
    es: "Español",
    nl: "Spaans",
  },
  Dutch: {
    de: "Niederländisch",
    it: "Olandese",
    fr: "Néerlandais",
    es: "Neerlandés",
    nl: "Nederlands",
  },

  // -- Footer ---------------------------------------------------------------
  Browse: {
    de: "Durchsuchen",
    it: "Esplora",
    fr: "Parcourir",
    es: "Explorar",
    nl: "Bladeren",
  },
  "VIN Decoder": {
    de: "VIN-Decoder",
    it: "Decodificatore VIN",
    fr: "Décodeur VIN",
    es: "Decodificador VIN",
    nl: "VIN-decoder",
  },
  "HTML Sitemap": {
    de: "HTML-Sitemap",
    it: "Mappa del sito HTML",
    fr: "Plan du site HTML",
    es: "Mapa del sitio HTML",
    nl: "HTML-sitemap",
  },
  Support: {
    de: "Support",
    it: "Assistenza",
    fr: "Assistance",
    es: "Soporte",
    nl: "Ondersteuning",
  },
  "Help Center": {
    de: "Hilfecenter",
    it: "Centro assistenza",
    fr: "Centre d'aide",
    es: "Centro de ayuda",
    nl: "Helpcentrum",
  },
  FAQ: {
    de: "FAQ",
    it: "FAQ",
    fr: "FAQ",
    es: "Preguntas frecuentes",
    nl: "Veelgestelde vragen",
  },
  "Contact Us": {
    de: "Kontaktieren Sie uns",
    it: "Contattaci",
    fr: "Nous contacter",
    es: "Contáctanos",
    nl: "Neem contact op",
  },
  "Shipping Info": {
    de: "Versandinformationen",
    it: "Informazioni di spedizione",
    fr: "Informations de livraison",
    es: "Información de envío",
    nl: "Verzendinformatie",
  },
  Returns: {
    de: "Rücksendungen",
    it: "Resi",
    fr: "Retours",
    es: "Devoluciones",
    nl: "Retouren",
  },
  Legal: {
    de: "Rechtliches",
    it: "Note legali",
    fr: "Mentions légales",
    es: "Legal",
    nl: "Juridisch",
  },
  "Privacy Policy": {
    de: "Datenschutzerklärung",
    it: "Informativa sulla privacy",
    fr: "Politique de confidentialité",
    es: "Política de privacidad",
    nl: "Privacybeleid",
  },
  "Terms of Service": {
    de: "Nutzungsbedingungen",
    it: "Termini di servizio",
    fr: "Conditions d'utilisation",
    es: "Términos del servicio",
    nl: "Servicevoorwaarden",
  },
  "Cookie Policy": {
    de: "Cookie-Richtlinie",
    it: "Informativa sui cookie",
    fr: "Politique relative aux cookies",
    es: "Política de cookies",
    nl: "Cookiebeleid",
  },
  Accessibility: {
    de: "Barrierefreiheit",
    it: "Accessibilità",
    fr: "Accessibilité",
    es: "Accesibilidad",
    nl: "Toegankelijkheid",
  },
  "All rights reserved.": {
    de: "Alle Rechte vorbehalten.",
    it: "Tutti i diritti riservati.",
    fr: "Tous droits réservés.",
    es: "Todos los derechos reservados.",
    nl: "Alle rechten voorbehouden.",
  },

  // -- Product listing / filters -------------------------------------------
  "All Products": {
    de: "Alle Produkte",
    it: "Tutti i prodotti",
    fr: "Tous les produits",
    es: "Todos los productos",
    nl: "Alle producten",
  },
  Filters: {
    de: "Filter",
    it: "Filtri",
    fr: "Filtres",
    es: "Filtros",
    nl: "Filters",
  },
  Category: {
    de: "Kategorie",
    it: "Categoria",
    fr: "Catégorie",
    es: "Categoría",
    nl: "Categorie",
  },
  "All Categories": {
    de: "Alle Kategorien",
    it: "Tutte le categorie",
    fr: "Toutes les catégories",
    es: "Todas las categorías",
    nl: "Alle categorieën",
  },
  Model: {
    de: "Modell",
    it: "Modello",
    fr: "Modèle",
    es: "Modelo",
    nl: "Model",
  },
  Condition: {
    de: "Zustand",
    it: "Condizione",
    fr: "État",
    es: "Estado",
    nl: "Staat",
  },
  Availability: {
    de: "Verfügbarkeit",
    it: "Disponibilità",
    fr: "Disponibilité",
    es: "Disponibilidad",
    nl: "Beschikbaarheid",
  },
  "In Stock Only": {
    de: "Nur auf Lager",
    it: "Solo disponibili",
    fr: "En stock uniquement",
    es: "Solo en stock",
    nl: "Alleen op voorraad",
  },
  "Price Range": {
    de: "Preisspanne",
    it: "Fascia di prezzo",
    fr: "Fourchette de prix",
    es: "Rango de precios",
    nl: "Prijsklasse",
  },
  "Special Offers": {
    de: "Sonderangebote",
    it: "Offerte speciali",
    fr: "Offres spéciales",
    es: "Ofertas especiales",
    nl: "Speciale aanbiedingen",
  },
  "Deals Only": {
    de: "Nur Angebote",
    it: "Solo offerte",
    fr: "Promotions uniquement",
    es: "Solo ofertas",
    nl: "Alleen aanbiedingen",
  },
  "Sort By": {
    de: "Sortieren nach",
    it: "Ordina per",
    fr: "Trier par",
    es: "Ordenar por",
    nl: "Sorteren op",
  },
  Recommended: {
    de: "Empfohlen",
    it: "Consigliati",
    fr: "Recommandé",
    es: "Recomendado",
    nl: "Aanbevolen",
  },
  Newest: {
    de: "Neueste",
    it: "Più recenti",
    fr: "Plus récents",
    es: "Más recientes",
    nl: "Nieuwste",
  },
  "Price: Low to High": {
    de: "Preis: aufsteigend",
    it: "Prezzo: crescente",
    fr: "Prix : croissant",
    es: "Precio: de menor a mayor",
    nl: "Prijs: laag naar hoog",
  },
  "Price: High to Low": {
    de: "Preis: absteigend",
    it: "Prezzo: decrescente",
    fr: "Prix : décroissant",
    es: "Precio: de mayor a menor",
    nl: "Prijs: hoog naar laag",
  },
  Popular: {
    de: "Beliebt",
    it: "Popolari",
    fr: "Populaire",
    es: "Popular",
    nl: "Populair",
  },
  "No models available": {
    de: "Keine Modelle verfügbar",
    it: "Nessun modello disponibile",
    fr: "Aucun modèle disponible",
    es: "No hay modelos disponibles",
    nl: "Geen modellen beschikbaar",
  },
  "No conditions available": {
    de: "Keine Zustände verfügbar",
    it: "Nessuna condizione disponibile",
    fr: "Aucun état disponible",
    es: "No hay estados disponibles",
    nl: "Geen staat beschikbaar",
  },

  // -- Product detail / actions --------------------------------------------
  "Add to Cart": {
    de: "In den Warenkorb",
    it: "Aggiungi al carrello",
    fr: "Ajouter au panier",
    es: "Añadir al carrito",
    nl: "In winkelwagen",
  },
  "Buy Now": {
    de: "Jetzt kaufen",
    it: "Acquista ora",
    fr: "Acheter maintenant",
    es: "Comprar ahora",
    nl: "Nu kopen",
  },
  "Out of Stock": {
    de: "Nicht vorrätig",
    it: "Esaurito",
    fr: "Rupture de stock",
    es: "Agotado",
    nl: "Niet op voorraad",
  },
  "In Stock": {
    de: "Auf Lager",
    it: "Disponibile",
    fr: "En stock",
    es: "En stock",
    nl: "Op voorraad",
  },
  Description: {
    de: "Beschreibung",
    it: "Descrizione",
    fr: "Description",
    es: "Descripción",
    nl: "Beschrijving",
  },
  Specifications: {
    de: "Spezifikationen",
    it: "Specifiche",
    fr: "Caractéristiques",
    es: "Especificaciones",
    nl: "Specificaties",
  },
  Reviews: {
    de: "Bewertungen",
    it: "Recensioni",
    fr: "Avis",
    es: "Opiniones",
    nl: "Beoordelingen",
  },
  "Related Products": {
    de: "Ähnliche Produkte",
    it: "Prodotti correlati",
    fr: "Produits similaires",
    es: "Productos relacionados",
    nl: "Gerelateerde producten",
  },
  Quantity: {
    de: "Menge",
    it: "Quantità",
    fr: "Quantité",
    es: "Cantidad",
    nl: "Aantal",
  },
  "Free shipping": {
    de: "Kostenloser Versand",
    it: "Spedizione gratuita",
    fr: "Livraison gratuite",
    es: "Envío gratuito",
    nl: "Gratis verzending",
  },

  // -- Blog -----------------------------------------------------------------
  "Read article": {
    de: "Artikel lesen",
    it: "Leggi l'articolo",
    fr: "Lire l'article",
    es: "Leer artículo",
    nl: "Lees artikel",
  },
};

/** English source text -> localised text for `language`. */
export function getUiStringPairs(
  language: TranslatableLanguage
): Array<[string, string]> {
  return Object.entries(UI_STRINGS)
    .map(
      ([source, byLanguage]) =>
        [source, byLanguage[language]] as [string, string]
    )
    .filter(
      ([source, translated]) => Boolean(translated) && translated !== source
    );
}

/** Every localised value this dictionary can render for `language`. */
export function getUiStringValues(language: TranslatableLanguage): string[] {
  return Object.values(UI_STRINGS)
    .map(byLanguage => byLanguage[language])
    .filter(Boolean);
}
