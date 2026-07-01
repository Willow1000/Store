import { getSiteLanguage, type SiteLanguageCode } from '@/lib/language';

type EnquiryCopy = {
  productSubject: string;
  outOfStockSubject: string;
  productEnquiryLine: (title: string) => string;
  outOfStockLine: (title: string) => string;
  productLabel: string;
  partNumberLabel: string;
  brandLabel: string;
  modelLabel: string;
  categoryLabel: string;
  priceLabel: string;
  productLinkLabel: string;
  productOutOfStockAsk: string;
  productGeneralAsk: string;
  searchSubject: string;
  searchItemLabel: string;
  searchSpecLabel: string;
  listPartSubject: string;
  listPartMessage: string;
  quickViewOutOfStockSubject: string;
  quickViewOutOfStockMessage: (title: string) => string;
};

const COPY: Record<SiteLanguageCode, EnquiryCopy> = {
  en: {
    productSubject: 'Product Enquiry',
    outOfStockSubject: 'Out of Stock Inquiry',
    productEnquiryLine: (title) => `I would like to enquire about this product: "${title}".`,
    outOfStockLine: (title) => `I am interested in the product "${title}" which is currently out of stock.`,
    productLabel: 'Product',
    partNumberLabel: 'Part Number',
    brandLabel: 'Brand',
    modelLabel: 'Model',
    categoryLabel: 'Category',
    priceLabel: 'Price',
    productLinkLabel: 'Product Link',
    productOutOfStockAsk: 'Please let me know when this item becomes available again.',
    productGeneralAsk: 'Please share availability, compatibility details, and next steps to order.',
    searchSubject: 'Product inquiry',
    searchItemLabel: 'item',
    searchSpecLabel: 'item specification',
    listPartSubject: 'Request to list a specific part',
    listPartMessage:
      'Hello MotorVault team,\n\nI would like to request that a specific part be listed on your platform.\n\nPart details:\n- Part name:\n- Vehicle make/model/year:\n- OEM or aftermarket preference:\n- Any part numbers or photos:\n\nThank you.',
    quickViewOutOfStockSubject: 'Out of Stock Inquiry',
    quickViewOutOfStockMessage: (title) => `I am interested in the product "${title}" which is currently out of stock. Please let me know when it will be available again.`,
  },
  de: {
    productSubject: 'Produktanfrage',
    outOfStockSubject: 'Nicht auf Lager Anfrage',
    productEnquiryLine: (title) => `Ich moechte eine Anfrage zu diesem Produkt stellen: "${title}".`,
    outOfStockLine: (title) => `Ich interessiere mich fuer das Produkt "${title}", das derzeit nicht auf Lager ist.`,
    productLabel: 'Produkt',
    partNumberLabel: 'Teilenummer',
    brandLabel: 'Marke',
    modelLabel: 'Modell',
    categoryLabel: 'Kategorie',
    priceLabel: 'Preis',
    productLinkLabel: 'Produktlink',
    productOutOfStockAsk: 'Bitte informieren Sie mich, sobald dieser Artikel wieder verfuegbar ist.',
    productGeneralAsk: 'Bitte teilen Sie Verfuegbarkeit, Kompatibilitaet und die naechsten Bestellschritte mit.',
    searchSubject: 'Produktanfrage',
    searchItemLabel: 'artikel',
    searchSpecLabel: 'artikelspezifikation',
    listPartSubject: 'Anfrage zur Aufnahme eines bestimmten Teils',
    listPartMessage:
      'Hallo MotorVault Team,\n\nIch moechte anfragen, ob ein bestimmtes Teil auf Ihrer Plattform gelistet werden kann.\n\nTeildetails:\n- Teilname:\n- Fahrzeug Marke/Modell/Jahr:\n- OEM oder Aftermarket:\n- Teilenummern oder Fotos:\n\nVielen Dank.',
    quickViewOutOfStockSubject: 'Nicht auf Lager Anfrage',
    quickViewOutOfStockMessage: (title) => `Ich interessiere mich fuer das Produkt "${title}", das derzeit nicht auf Lager ist. Bitte informieren Sie mich, wenn es wieder verfuegbar ist.`,
  },
  it: {
    productSubject: 'Richiesta prodotto',
    outOfStockSubject: 'Richiesta prodotto non disponibile',
    productEnquiryLine: (title) => `Vorrei richiedere informazioni su questo prodotto: "${title}".`,
    outOfStockLine: (title) => `Sono interessato al prodotto "${title}", attualmente non disponibile.`,
    productLabel: 'Prodotto',
    partNumberLabel: 'Codice parte',
    brandLabel: 'Marca',
    modelLabel: 'Modello',
    categoryLabel: 'Categoria',
    priceLabel: 'Prezzo',
    productLinkLabel: 'Link prodotto',
    productOutOfStockAsk: 'Per favore avvisami quando questo articolo tornera disponibile.',
    productGeneralAsk: 'Condividi disponibilita, compatibilita e prossimi passi per ordinare.',
    searchSubject: 'Richiesta prodotto',
    searchItemLabel: 'articolo',
    searchSpecLabel: 'specifiche articolo',
    listPartSubject: 'Richiesta di pubblicazione di un ricambio specifico',
    listPartMessage:
      'Ciao team MotorVault,\n\nVorrei richiedere la pubblicazione di un ricambio specifico sulla vostra piattaforma.\n\nDettagli ricambio:\n- Nome ricambio:\n- Veicolo marca/modello/anno:\n- Preferenza OEM o aftermarket:\n- Codici ricambio o foto:\n\nGrazie.',
    quickViewOutOfStockSubject: 'Richiesta prodotto non disponibile',
    quickViewOutOfStockMessage: (title) => `Sono interessato al prodotto "${title}", attualmente non disponibile. Fammi sapere quando sara nuovamente disponibile.`,
  },
  fr: {
    productSubject: 'Demande produit',
    outOfStockSubject: 'Demande produit en rupture',
    productEnquiryLine: (title) => `Je souhaite demander des informations sur ce produit : "${title}".`,
    outOfStockLine: (title) => `Je suis interesse par le produit "${title}", actuellement en rupture de stock.`,
    productLabel: 'Produit',
    partNumberLabel: 'Reference',
    brandLabel: 'Marque',
    modelLabel: 'Modele',
    categoryLabel: 'Categorie',
    priceLabel: 'Prix',
    productLinkLabel: 'Lien produit',
    productOutOfStockAsk: 'Merci de me prevenir lorsque cet article sera de nouveau disponible.',
    productGeneralAsk: 'Merci de partager la disponibilite, la compatibilite et les prochaines etapes de commande.',
    searchSubject: 'Demande produit',
    searchItemLabel: 'article',
    searchSpecLabel: 'specifications article',
    listPartSubject: 'Demande de mise en ligne d une piece specifique',
    listPartMessage:
      'Bonjour equipe MotorVault,\n\nJe souhaite demander la mise en ligne d une piece specifique sur votre plateforme.\n\nDetails de la piece :\n- Nom de la piece :\n- Vehicule marque/modele/annee :\n- Preference OEM ou aftermarket :\n- References ou photos :\n\nMerci.',
    quickViewOutOfStockSubject: 'Demande produit en rupture',
    quickViewOutOfStockMessage: (title) => `Je suis interesse par le produit "${title}", actuellement en rupture de stock. Merci de me prevenir lorsqu il sera disponible.`,
  },
  es: {
    productSubject: 'Consulta de producto',
    outOfStockSubject: 'Consulta de producto sin stock',
    productEnquiryLine: (title) => `Quiero consultar sobre este producto: "${title}".`,
    outOfStockLine: (title) => `Estoy interesado en el producto "${title}", que actualmente esta sin stock.`,
    productLabel: 'Producto',
    partNumberLabel: 'Numero de pieza',
    brandLabel: 'Marca',
    modelLabel: 'Modelo',
    categoryLabel: 'Categoria',
    priceLabel: 'Precio',
    productLinkLabel: 'Enlace del producto',
    productOutOfStockAsk: 'Por favor avisame cuando este articulo vuelva a estar disponible.',
    productGeneralAsk: 'Comparte disponibilidad, compatibilidad y los siguientes pasos para comprar.',
    searchSubject: 'Consulta de producto',
    searchItemLabel: 'articulo',
    searchSpecLabel: 'especificaciones del articulo',
    listPartSubject: 'Solicitud para publicar una pieza especifica',
    listPartMessage:
      'Hola equipo de MotorVault,\n\nQuiero solicitar que se publique una pieza especifica en su plataforma.\n\nDetalles de la pieza:\n- Nombre de la pieza:\n- Vehiculo marca/modelo/anio:\n- Preferencia OEM o aftermarket:\n- Numeros de pieza o fotos:\n\nGracias.',
    quickViewOutOfStockSubject: 'Consulta de producto sin stock',
    quickViewOutOfStockMessage: (title) => `Estoy interesado en el producto "${title}", que actualmente esta sin stock. Avisame cuando vuelva a estar disponible.`,
  },
  nl: {
    productSubject: 'Productaanvraag',
    outOfStockSubject: 'Niet op voorraad aanvraag',
    productEnquiryLine: (title) => `Ik wil informatie over dit product: "${title}".`,
    outOfStockLine: (title) => `Ik ben geinteresseerd in het product "${title}", dat momenteel niet op voorraad is.`,
    productLabel: 'Product',
    partNumberLabel: 'Onderdeelnummer',
    brandLabel: 'Merk',
    modelLabel: 'Model',
    categoryLabel: 'Categorie',
    priceLabel: 'Prijs',
    productLinkLabel: 'Productlink',
    productOutOfStockAsk: 'Laat me weten wanneer dit artikel weer beschikbaar is.',
    productGeneralAsk: 'Deel beschikbaarheid, compatibiliteit en de volgende bestelstappen.',
    searchSubject: 'Productaanvraag',
    searchItemLabel: 'artikel',
    searchSpecLabel: 'artikelspecificatie',
    listPartSubject: 'Verzoek om een specifiek onderdeel te plaatsen',
    listPartMessage:
      'Hallo MotorVault team,\n\nIk wil graag verzoeken om een specifiek onderdeel op jullie platform te plaatsen.\n\nOnderdeeldetails:\n- Onderdeelnaam:\n- Voertuig merk/model/jaar:\n- OEM of aftermarket voorkeur:\n- Onderdeelnummers of foto s:\n\nDank je wel.',
    quickViewOutOfStockSubject: 'Niet op voorraad aanvraag',
    quickViewOutOfStockMessage: (title) => `Ik ben geinteresseerd in het product "${title}", dat momenteel niet op voorraad is. Laat me weten wanneer het weer beschikbaar is.`,
  },
};

export function getEnquiryCopy(language: SiteLanguageCode = getSiteLanguage()): EnquiryCopy {
  return COPY[language] || COPY.en;
}

export function buildContactHref(params: URLSearchParams): string {
  return `/contact?${params.toString()}`;
}
