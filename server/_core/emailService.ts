/**
 * Send admin notification for contact/lead
 */
export async function sendContactAdminNotification(
  adminEmail: string,
  data: { name: string; email: string; location: string; subject: string; message: string; }
): Promise<boolean> {
  try {
    const transporterInstance = getTransporter();
    const htmlContent = `
      <h2>New Contact/Inquiry Received</h2>
      <p>An inquiry or lead was submitted via the Contact Us form. Please review the details below:</p>
      <ul>
        <li><strong>Name:</strong> ${escapeHtml(data.name)}</li>
        <li><strong>Email:</strong> ${escapeHtml(data.email)}</li>
        <li><strong>Location:</strong> ${escapeHtml(data.location)}</li>
        <li><strong>Subject:</strong> ${escapeHtml(data.subject)}</li>
        <li><strong>Message:</strong><br/>${formatTextBlock(data.message)}</li>
      </ul>
      <p>Log in to the admin dashboard or check your CRM to follow up.</p>
    `;
    await sendMailWithRetry(transporterInstance, {
      from: `${process.env.SENDER_NAME || 'Our Store'} <${process.env.SMTP_FROM_EMAIL || process.env.GMAIL_USER}>`,
      to: adminEmail,
      subject: 'New Contact/Inquiry Submitted — Action Required',
      html: htmlContent,
    }, `admin contact notification to ${adminEmail}`);
    console.log(`[Email] Admin notification sent to ${adminEmail}`);
    return true;
  } catch (error) {
    logEmailError(`[Email] Failed to send admin notification to ${adminEmail}`, error);
    return false;
  }
}
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
let transporter: nodemailer.Transporter | null = null;
const errorLogPath = path.join(process.cwd(), 'server', 'logs', 'nodemailer-errors.log');

// Use __filename for module directory resolution; server is bundled to CJS.
const moduleDir = (typeof __filename !== 'undefined') ? path.dirname(__filename) : process.cwd();

function resolveTemplatePath(templateName: string): string {
  const fileName = `${templateName}.html`;
  const candidates = [
    path.resolve(process.cwd(), 'server', 'email_templates', 'motorvault', fileName),
    path.resolve(process.cwd(), 'email_templates', 'motorvault', fileName),
    path.resolve(moduleDir, '../email_templates/motorvault', fileName),
    path.resolve(moduleDir, '../../server/email_templates/motorvault', fileName),
    path.resolve(moduleDir, '../../email_templates/motorvault', fileName),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Email template not found for ${templateName}. Tried: ${candidates.join(', ')}`);
}

function resolveLogoPath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'client', 'public', 'images', 'motorvault_profile.png'),
    path.resolve(moduleDir, '../../client/public/images/motorvault_profile.png'),
    path.resolve(moduleDir, '../public/images/motorvault_profile.png'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function resolveLogoUrl(): string {
  const base = (
    process.env.VITE_SITE_URL ||
    process.env.SITE_URL ||
    process.env.VITE_APP_URL ||
    process.env.APP_URL ||
    'https://motorvault.shop'
  ).replace(/\/$/, '');

  return `${base}/images/motorvault_profile.png`;
}

async function sendMailWithRetry(
  transporterInstance: nodemailer.Transporter,
  mailOptions: nodemailer.SendMailOptions,
  context: string,
): Promise<void> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await transporterInstance.sendMail(mailOptions);
      return;
    } catch (error) {
      lastError = error;
      logEmailError(`[Email] Attempt ${attempt} failed: ${context}`, error);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function ensureErrorLogDir(): void {
  fs.mkdirSync(path.dirname(errorLogPath), { recursive: true });
}

function logEmailError(message: string, error: unknown): void {
  ensureErrorLogDir();

  const timestamp = new Date().toISOString();
  const details = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error);
  const entry = `[${timestamp}] ${message}\n${details}\n\n`;

  fs.appendFileSync(errorLogPath, entry, 'utf8');
}

/**
 * Initialize nodemailer transporter once.
 * Supports Private Email SMTP via mail.privateemail.com.
 */
function getTransporter(): nodemailer.Transporter {
  if (transporter) {
    return transporter;
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    throw new Error('SMTP_USER or SMTP_PASSWORD is not configured');
  }

  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === 'true'
    : port === 465;
  const smtpConfig = {
    host: process.env.SMTP_HOST || 'mail.privateemail.com',
    port,
    secure,
    requireTLS: port === 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  } as nodemailer.TransportOptions;

  transporter = nodemailer.createTransport(smtpConfig);
  return transporter;
}

/**
 * Load email template with simple variable substitution
 */
function loadTemplate(templateName: string, data: Record<string, any>): string {
  try {
    const templatePath = resolveTemplatePath(templateName);
    let templateContent = fs.readFileSync(templatePath, 'utf-8');

    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      templateContent = templateContent.replace(regex, String(value ?? ''));
    });

    return templateContent;
  } catch (error) {
    logEmailError(`[Email] Failed to load template ${templateName}`, error);
    throw error;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildItemsHtml(items?: Array<{
  name: string;
  quantity: number;
  price: string;
  sku?: string;
  description?: string;
  unit_price?: string;
  line_total?: string;
}>): string {
  if (!items || items.length === 0) {
    return '';
  }

  return items.map((item) => {
    const quantity = item.quantity ?? 1;
    const unitPrice = item.unit_price ?? item.price ?? '0.00';
    const lineTotal = item.line_total ?? item.price ?? '0.00';
    const name = escapeHtml(item.name || 'Item');
    const sku = item.sku ? `<div class="item-meta">SKU: ${escapeHtml(item.sku)}</div>` : '';
    const description = item.description ? `<div class="item-meta">${escapeHtml(item.description)}</div>` : '';

    // Grid format for new professional template
    return `<div class="item-row"><div><div class="item-name">${name}</div><div class="item-meta">${sku}${description}</div></div><div class="item-qty">${quantity}</div><div class="item-price">${unitPrice}</div><div class="item-total">${lineTotal}</div></div>`;
  }).join('');
}

function formatTextBlock(value: string | undefined | null): string {
  return escapeHtml(String(value ?? '').trim()).replace(/\n/g, '<br />');
}

function buildLogoMailContext() {
  const logoPath = resolveLogoPath();
  const logoCid = 'motorvault-logo@cid';
  const logoSrc = logoPath ? `cid:${logoCid}` : resolveLogoUrl();
  const attachments = logoPath
    ? [{ filename: 'motorvault_profile.png', path: logoPath, cid: logoCid }]
    : [];

  return { logoSrc, attachments };
}

type MailLanguage = 'en' | 'es' | 'fr' | 'de' | 'it' | 'nl';

function resolveMailLanguage(value: unknown): MailLanguage {
  const raw = String(value || '').trim().toLowerCase();
  if (raw.startsWith('es')) return 'es';
  if (raw.startsWith('fr')) return 'fr';
  if (raw.startsWith('de')) return 'de';
  if (raw.startsWith('it')) return 'it';
  if (raw.startsWith('nl')) return 'nl';
  return 'en';
}

function getTicketEmailCopy(language: MailLanguage): {
  subject: string;
  pageTitle: string;
  heading: string;
  intro: string;
  labels: {
    reference: string;
    issue: string;
    priority: string;
    status: string;
    createdAt: string;
    message: string;
    details: string;
    contactEmail: string;
    contactPhone: string;
    support: string;
  };
  followUp: string;
  helpText: string;
  notProvided: string;
  footer: string;
} {
  const copy: Record<MailLanguage, ReturnType<typeof getTicketEmailCopy>> = {
    en: {
      subject: 'We received your ticket',
      pageTitle: 'Your Ticket Was Received',
      heading: 'Ticket Received',
      intro: 'Thanks for contacting us. We have received your support ticket.',
      labels: {
        reference: 'Reference',
        issue: 'Issue',
        priority: 'Priority',
        status: 'Status',
        createdAt: 'Created At',
        message: 'Message',
        details: 'Ticket Details',
        contactEmail: 'Contact Email',
        contactPhone: 'Contact Phone',
        support: 'Support Email',
      },
      followUp: 'Please keep this email for your records. Reply with your reference code if you would like to share more details.',
      helpText: 'Need help? Contact',
      notProvided: 'Not provided',
      footer: 'Our team will follow up with you as soon as possible.',
    },
    es: {
      subject: 'Recibimos tu ticket',
      pageTitle: 'Hemos recibido tu ticket',
      heading: 'Ticket Recibido',
      intro: 'Gracias por contactarnos. Hemos recibido tu ticket de soporte.',
      labels: {
        reference: 'Referencia',
        issue: 'Problema',
        priority: 'Prioridad',
        status: 'Estado',
        createdAt: 'Creado',
        message: 'Mensaje',
        details: 'Detalles del Ticket',
        contactEmail: 'Correo de Contacto',
        contactPhone: 'Telefono de Contacto',
        support: 'Correo de Soporte',
      },
      followUp: 'Guarda este correo para tus registros. Responde con tu codigo de referencia si deseas compartir mas detalles.',
      helpText: 'Necesitas ayuda? Contacta a',
      notProvided: 'No proporcionado',
      footer: 'Nuestro equipo te respondera lo antes posible.',
    },
    fr: {
      subject: 'Nous avons recu votre ticket',
      pageTitle: 'Votre ticket a ete recu',
      heading: 'Ticket Recu',
      intro: 'Merci de nous avoir contactes. Nous avons bien recu votre ticket.',
      labels: {
        reference: 'Reference',
        issue: 'Probleme',
        priority: 'Priorite',
        status: 'Statut',
        createdAt: 'Cree le',
        message: 'Message',
        details: 'Details du Ticket',
        contactEmail: 'Email de Contact',
        contactPhone: 'Telephone de Contact',
        support: 'Email Support',
      },
      followUp: 'Conservez cet email pour vos dossiers. Repondez avec votre reference si vous souhaitez ajouter des details.',
      helpText: 'Besoin d aide? Contactez',
      notProvided: 'Non renseigne',
      footer: 'Notre equipe vous repondra dans les plus brefs delais.',
    },
    de: {
      subject: 'Wir haben Ihr Ticket erhalten',
      pageTitle: 'Ihr Ticket wurde empfangen',
      heading: 'Ticket Erhalten',
      intro: 'Danke fur Ihre Nachricht. Wir haben Ihr Support-Ticket erhalten.',
      labels: {
        reference: 'Referenz',
        issue: 'Anliegen',
        priority: 'Prioritat',
        status: 'Status',
        createdAt: 'Erstellt am',
        message: 'Nachricht',
        details: 'Ticketdetails',
        contactEmail: 'Kontakt E-Mail',
        contactPhone: 'Kontakt Telefon',
        support: 'Support E-Mail',
      },
      followUp: 'Bitte bewahren Sie diese E-Mail fur Ihre Unterlagen auf. Antworten Sie mit Ihrer Referenznummer, wenn Sie weitere Details teilen mochten.',
      helpText: 'Brauchen Sie Hilfe? Kontaktieren Sie',
      notProvided: 'Nicht angegeben',
      footer: 'Unser Team meldet sich so schnell wie moglich bei Ihnen.',
    },
    it: {
      subject: 'Abbiamo ricevuto il tuo ticket',
      pageTitle: 'Il tuo ticket e stato ricevuto',
      heading: 'Ticket Ricevuto',
      intro: 'Grazie per averci contattato. Abbiamo ricevuto il tuo ticket di supporto.',
      labels: {
        reference: 'Riferimento',
        issue: 'Problema',
        priority: 'Priorita',
        status: 'Stato',
        createdAt: 'Creato il',
        message: 'Messaggio',
        details: 'Dettagli Ticket',
        contactEmail: 'Email di Contatto',
        contactPhone: 'Telefono di Contatto',
        support: 'Email Supporto',
      },
      followUp: 'Conserva questa email per i tuoi archivi. Rispondi con il tuo codice di riferimento se vuoi aggiungere dettagli.',
      helpText: 'Serve aiuto? Contatta',
      notProvided: 'Non fornito',
      footer: 'Il nostro team ti rispondera il prima possibile.',
    },
    nl: {
      subject: 'Wij hebben uw ticket ontvangen',
      pageTitle: 'Uw ticket is ontvangen',
      heading: 'Ticket Ontvangen',
      intro: 'Bedankt voor uw bericht. Wij hebben uw supportticket ontvangen.',
      labels: {
        reference: 'Referentie',
        issue: 'Probleem',
        priority: 'Prioriteit',
        status: 'Status',
        createdAt: 'Aangemaakt op',
        message: 'Bericht',
        details: 'Ticketgegevens',
        contactEmail: 'Contact e-mail',
        contactPhone: 'Contact telefoon',
        support: 'Support e-mail',
      },
      followUp: 'Bewaar deze e-mail voor uw administratie. Beantwoord met uw referentiecode als u extra details wilt delen.',
      helpText: 'Hulp nodig? Neem contact op met',
      notProvided: 'Niet opgegeven',
      footer: 'Ons team neemt zo snel mogelijk contact met u op.',
    },
  };

  return copy[language] || copy.en;
}

function getContactEmailCopy(language: MailLanguage): {
  subject: string;
  pageTitle: string;
  heading: string;
  intro: string;
  labels: {
    status: string;
    nextStep: string;
  };
  values: {
    status: string;
    nextStep: string;
  };
  helpText: string;
  footer: string;
} {
  const copy: Record<MailLanguage, ReturnType<typeof getContactEmailCopy>> = {
    en: {
      subject: 'Thank you for contacting us',
      pageTitle: 'Thank You for Contacting Us',
      heading: 'Thank You for Contacting Us',
      intro: 'Your message has been received. One of our staff members will reach out to you using this email address shortly.',
      labels: {
        status: 'Status',
        nextStep: 'Next step',
      },
      values: {
        status: 'Received',
        nextStep: 'A staff member will contact you via this email address',
      },
      helpText: 'Need more help? Email',
      footer: 'We appreciate your patience and will follow up as soon as possible.',
    },
    es: {
      subject: 'Gracias por contactarnos',
      pageTitle: 'Gracias por contactarnos',
      heading: 'Gracias por contactarnos',
      intro: 'Hemos recibido tu mensaje. Uno de nuestros colaboradores se pondra en contacto contigo usando este correo en breve.',
      labels: {
        status: 'Estado',
        nextStep: 'Siguiente paso',
      },
      values: {
        status: 'Recibido',
        nextStep: 'Un miembro del equipo te contactara por este correo',
      },
      helpText: 'Necesitas mas ayuda? Escribe a',
      footer: 'Agradecemos tu paciencia y te responderemos lo antes posible.',
    },
    fr: {
      subject: 'Merci de nous avoir contactes',
      pageTitle: 'Merci de nous avoir contactes',
      heading: 'Merci de nous avoir contactes',
      intro: 'Votre message a bien ete recu. Un membre de notre equipe vous contactera bientot via cette adresse email.',
      labels: {
        status: 'Statut',
        nextStep: 'Prochaine etape',
      },
      values: {
        status: 'Recu',
        nextStep: 'Un membre de l equipe vous contactera via cet email',
      },
      helpText: 'Besoin d aide supplementaire? Ecrivez a',
      footer: 'Merci pour votre patience, nous reviendrons vers vous rapidement.',
    },
    de: {
      subject: 'Vielen Dank fur Ihre Nachricht',
      pageTitle: 'Vielen Dank fur Ihre Nachricht',
      heading: 'Vielen Dank fur Ihre Nachricht',
      intro: 'Ihre Nachricht wurde empfangen. Ein Mitglied unseres Teams meldet sich in Kurze uber diese E-Mail-Adresse bei Ihnen.',
      labels: {
        status: 'Status',
        nextStep: 'Nachster Schritt',
      },
      values: {
        status: 'Empfangen',
        nextStep: 'Ein Teammitglied kontaktiert Sie uber diese E-Mail-Adresse',
      },
      helpText: 'Brauchen Sie weitere Hilfe? Schreiben Sie an',
      footer: 'Vielen Dank fur Ihre Geduld. Wir melden uns so schnell wie moglich.',
    },
    it: {
      subject: 'Grazie per averci contattato',
      pageTitle: 'Grazie per averci contattato',
      heading: 'Grazie per averci contattato',
      intro: 'Il tuo messaggio e stato ricevuto. Un membro del nostro staff ti contattera a breve tramite questo indirizzo email.',
      labels: {
        status: 'Stato',
        nextStep: 'Prossimo passo',
      },
      values: {
        status: 'Ricevuto',
        nextStep: 'Un membro del team ti contattera tramite questo indirizzo email',
      },
      helpText: 'Hai bisogno di altro aiuto? Scrivi a',
      footer: 'Grazie per la pazienza, ti risponderemo al piu presto.',
    },
    nl: {
      subject: 'Bedankt dat u contact met ons opnam',
      pageTitle: 'Bedankt voor uw bericht',
      heading: 'Bedankt voor uw bericht',
      intro: 'Uw bericht is ontvangen. Een medewerker neemt binnenkort contact met u op via dit e-mailadres.',
      labels: {
        status: 'Status',
        nextStep: 'Volgende stap',
      },
      values: {
        status: 'Ontvangen',
        nextStep: 'Een medewerker neemt via dit e-mailadres contact met u op',
      },
      helpText: 'Meer hulp nodig? E-mail',
      footer: 'Wij waarderen uw geduld en nemen zo snel mogelijk contact met u op.',
    },
  };

  return copy[language] || copy.en;
}

function getOrderEmailCopy(language: MailLanguage): {
  heading: string;
  subheading: string;
  intro: string;
  orderNumber: string;
  orderDate: string;
  items: string;
  totalAmount: string;
  customerInfo: string;
  orderStatus: string;
  statusConfirmed: string;
  product: string;
  qty: string;
  price: string;
  subtotal: string;
  shipping: string;
  tax: string;
  discount: string;
  total: string;
  viewDetails: string;
  receiptNote: string;
  questions: string;
  supportContact: string;
  tracking: string;
  trackingLink: string;
  copyright: string;
  autoReply: string;
} {
  const copy: Record<MailLanguage, ReturnType<typeof getOrderEmailCopy>> = {
    en: {
      heading: 'Order Confirmation',
      subheading: 'Thank you for your purchase',
      intro: 'we\'ve received your order',
      orderNumber: 'Order Number',
      orderDate: 'Order Date',
      items: 'Items',
      totalAmount: 'Total Amount',
      customerInfo: 'Customer Information',
      orderStatus: 'Order Status',
      statusConfirmed: 'Confirmed',
      product: 'Product',
      qty: 'Qty',
      price: 'Price',
      subtotal: 'Subtotal',
      shipping: 'Shipping',
      tax: 'Tax',
      discount: 'Discount',
      total: 'Order Total',
      viewDetails: 'View Full Order Details',
      receiptNote: 'A professional receipt with QR code has been attached. Keep it for your records.',
      questions: 'Questions? We\'re here to help.',
      supportContact: 'Contact us',
      tracking: 'We\'ll send you a tracking number as soon as your package ships.',
      trackingLink: 'Track your shipment',
      copyright: 'All rights reserved',
      autoReply: 'This is an automated receipt. For support, contact',
    },
    es: {
      heading: 'Confirmación de Pedido',
      subheading: 'Gracias por tu compra',
      intro: 'hemos recibido tu pedido',
      orderNumber: 'Número de Pedido',
      orderDate: 'Fecha del Pedido',
      items: 'Artículos',
      totalAmount: 'Monto Total',
      customerInfo: 'Información del Cliente',
      orderStatus: 'Estado del Pedido',
      statusConfirmed: 'Confirmado',
      product: 'Producto',
      qty: 'Cantidad',
      price: 'Precio',
      subtotal: 'Subtotal',
      shipping: 'Envío',
      tax: 'Impuesto',
      discount: 'Descuento',
      total: 'Total del Pedido',
      viewDetails: 'Ver Detalles del Pedido',
      receiptNote: 'Se ha adjuntado un recibo profesional con código QR. Guárdalo en tus registros.',
      questions: '¿Preguntas? Estamos aquí para ayudarte.',
      supportContact: 'Contáctanos',
      tracking: 'Te enviaremos un número de seguimiento tan pronto como tu paquete se envíe.',
      trackingLink: 'Seguimiento de envío',
      copyright: 'Todos los derechos reservados',
      autoReply: 'Este es un recibo automatizado. Para soporte, contacta a',
    },
    fr: {
      heading: 'Confirmation de Commande',
      subheading: 'Merci pour votre achat',
      intro: 'nous avons reçu votre commande',
      orderNumber: 'Numéro de Commande',
      orderDate: 'Date de la Commande',
      items: 'Articles',
      totalAmount: 'Montant Total',
      customerInfo: 'Informations Client',
      orderStatus: 'Statut de la Commande',
      statusConfirmed: 'Confirmé',
      product: 'Produit',
      qty: 'Qté',
      price: 'Prix',
      subtotal: 'Sous-total',
      shipping: 'Livraison',
      tax: 'Taxe',
      discount: 'Réduction',
      total: 'Total de la Commande',
      viewDetails: 'Voir les Détails de la Commande',
      receiptNote: 'Un reçu professionnel avec code QR a été joint. Conservez-le pour vos dossiers.',
      questions: 'Des questions ? Nous sommes là pour vous aider.',
      supportContact: 'Nous contacter',
      tracking: 'Nous vous enverrons un numéro de suivi dès que votre colis sera expédié.',
      trackingLink: 'Suivre votre commande',
      copyright: 'Tous les droits réservés',
      autoReply: 'Ceci est un reçu automatisé. Pour le support, contactez',
    },
    de: {
      heading: 'Bestellbestätigung',
      subheading: 'Vielen Dank für Ihren Kauf',
      intro: 'wir haben Ihre Bestellung erhalten',
      orderNumber: 'Bestellnummer',
      orderDate: 'Bestelldatum',
      items: 'Artikel',
      totalAmount: 'Gesamtbetrag',
      customerInfo: 'Kundeninformationen',
      orderStatus: 'Bestellstatus',
      statusConfirmed: 'Bestätigt',
      product: 'Produkt',
      qty: 'Menge',
      price: 'Preis',
      subtotal: 'Zwischensumme',
      shipping: 'Versand',
      tax: 'Steuern',
      discount: 'Rabatt',
      total: 'Gesamtbestellung',
      viewDetails: 'Bestelldetails Anzeigen',
      receiptNote: 'Eine professionelle Quittung mit QR-Code wurde beigefügt. Bewahren Sie sie für Ihre Unterlagen auf.',
      questions: 'Haben Sie Fragen? Wir sind hier, um zu helfen.',
      supportContact: 'Kontaktieren Sie uns',
      tracking: 'Wir senden Ihnen eine Sendungsverfolgungsnummer, sobald Ihr Paket versandt wird.',
      trackingLink: 'Sendung verfolgen',
      copyright: 'Alle Rechte vorbehalten',
      autoReply: 'Dies ist eine automatisierte Quittung. Für Support kontaktieren Sie',
    },
    it: {
      heading: 'Conferma dell\'Ordine',
      subheading: 'Grazie per il tuo acquisto',
      intro: 'abbiamo ricevuto il tuo ordine',
      orderNumber: 'Numero d\'Ordine',
      orderDate: 'Data dell\'Ordine',
      items: 'Articoli',
      totalAmount: 'Importo Totale',
      customerInfo: 'Informazioni del Cliente',
      orderStatus: 'Stato dell\'Ordine',
      statusConfirmed: 'Confermato',
      product: 'Prodotto',
      qty: 'Qtà',
      price: 'Prezzo',
      subtotal: 'Subtotale',
      shipping: 'Spedizione',
      tax: 'Tassa',
      discount: 'Sconto',
      total: 'Totale Ordine',
      viewDetails: 'Visualizza Dettagli Ordine',
      receiptNote: 'È stata allegata una ricevuta professionale con codice QR. Conservala per i tuoi registri.',
      questions: 'Hai domande? Siamo qui per aiutarti.',
      supportContact: 'Contattaci',
      tracking: 'Ti invieremo un numero di tracciamento non appena il tuo pacco sarà spedito.',
      trackingLink: 'Traccia il tuo ordine',
      copyright: 'Tutti i diritti riservati',
      autoReply: 'Questa è una ricevuta automatizzata. Per il supporto, contatta',
    },
    nl: {
      heading: 'Bestellingsbevestiging',
      subheading: 'Bedankt voor uw aankoop',
      intro: 'wij hebben uw bestelling ontvangen',
      orderNumber: 'Bestelnummer',
      orderDate: 'Besteldatum',
      items: 'Artikelen',
      totalAmount: 'Totaalbedrag',
      customerInfo: 'Klantinformatie',
      orderStatus: 'Bestelstatus',
      statusConfirmed: 'Bevestigd',
      product: 'Product',
      qty: 'Aantal',
      price: 'Prijs',
      subtotal: 'Subtotaal',
      shipping: 'Verzending',
      tax: 'Belasting',
      discount: 'Korting',
      total: 'Ordertotaal',
      viewDetails: 'Bekijk volledige bestellingsgegevens',
      receiptNote: 'Er is een professionele ontvangstbevestiging met QR-code bijgevoegd. Bewaar deze voor uw administratie.',
      questions: 'Vragen? Wij helpen u graag.',
      supportContact: 'Neem contact met ons op',
      tracking: 'Wij sturen u een trackingnummer zodra uw pakket wordt verzonden.',
      trackingLink: 'Volg uw zending',
      copyright: 'Alle rechten voorbehouden',
      autoReply: 'Dit is een automatisch gegenereerde ontvangstbevestiging. Voor support, neem contact op',
    },
  };

  return copy[language] || copy.en;
}

export interface OrderConfirmationData {
  customer_name: string;
  customer_email?: string;
  order_number: string;
  order_date: string;
  order_total: string;
  currency?: string;
  subtotal?: string;
  shipping_cost?: string;
  tax?: string;
  discount_amount?: string;
  receipt_filename?: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: string;
    unit_price?: string;
    line_total?: string;
    sku?: string;
    description?: string;
  }>;
  order_url: string;
  tracking_url?: string;
  support_email?: string;
  language?: string;
}

function formatMoney(value: string | number | undefined, currency = 'USD'): string {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return `${currency} 0.00`;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

function getReceiptPdfCopy(language: MailLanguage): {
  title: string;
  billedTo: string;
  receiptNumber: string;
  date: string;
  itemHeader: string;
  qtyHeader: string;
  unitPriceHeader: string;
  lineTotalHeader: string;
  subtotal: string;
  shipping: string;
  tax: string;
  discount: string;
  total: string;
  thankYou: string;
  keepRecords: string;
  copyright: string;
  autoReply: string;
  pageOf: string;
} {
  const copy: Record<MailLanguage, ReturnType<typeof getReceiptPdfCopy>> = {
    en: {
      title: 'PAYMENT RECEIPT',
      billedTo: 'Billed to',
      receiptNumber: 'Receipt #',
      date: 'Date',
      itemHeader: 'Item',
      qtyHeader: 'Qty',
      unitPriceHeader: 'Unit Price',
      lineTotalHeader: 'Line Total',
      subtotal: 'Subtotal',
      shipping: 'Shipping',
      tax: 'Tax',
      discount: 'Discount',
      total: 'TOTAL',
      thankYou: 'Thank you for your purchase! This receipt is valid for returns and warranties.',
      keepRecords: 'Keep this document for your records and product warranty information.',
      copyright: '© {{year}} {{company}}. All rights reserved.',
      autoReply: 'This is an automated receipt. For support, contact: support@motorvault.shop',
      pageOf: 'Page {{current}} of {{total}}',
    },
    es: {
      title: 'RECIBO DE PAGO',
      billedTo: 'Facturado a',
      receiptNumber: 'Recibo #',
      date: 'Fecha',
      itemHeader: 'Artículo',
      qtyHeader: 'Cant',
      unitPriceHeader: 'Precio Unitario',
      lineTotalHeader: 'Total Línea',
      subtotal: 'Subtotal',
      shipping: 'Envío',
      tax: 'Impuesto',
      discount: 'Descuento',
      total: 'TOTAL',
      thankYou: '¡Gracias por tu compra! Este recibo es válido para devoluciones y garantías.',
      keepRecords: 'Conserva este documento para tus registros e información de garantía del producto.',
      copyright: '© {{year}} {{company}}. Todos los derechos reservados.',
      autoReply: 'Este es un recibo automatizado. Para soporte, contacta a: support@motorvault.shop',
      pageOf: 'Página {{current}} de {{total}}',
    },
    fr: {
      title: 'REÇU DE PAIEMENT',
      billedTo: 'Facturé à',
      receiptNumber: 'Reçu #',
      date: 'Date',
      itemHeader: 'Article',
      qtyHeader: 'Qté',
      unitPriceHeader: 'Prix Unitaire',
      lineTotalHeader: 'Total Ligne',
      subtotal: 'Sous-total',
      shipping: 'Livraison',
      tax: 'Taxe',
      discount: 'Réduction',
      total: 'TOTAL',
      thankYou: 'Merci pour votre achat! Ce reçu est valide pour les retours et les garanties.',
      keepRecords: 'Conservez ce document pour vos dossiers et les informations de garantie du produit.',
      copyright: '© {{year}} {{company}}. Tous les droits réservés.',
      autoReply: 'Ceci est un reçu automatisé. Pour le support, contactez: support@motorvault.shop',
      pageOf: 'Page {{current}} sur {{total}}',
    },
    de: {
      title: 'ZAHLUNGSQUITTUNG',
      billedTo: 'Rechnungsadresse',
      receiptNumber: 'Quittung #',
      date: 'Datum',
      itemHeader: 'Artikel',
      qtyHeader: 'Menge',
      unitPriceHeader: 'Einzelpreis',
      lineTotalHeader: 'Zeilensumme',
      subtotal: 'Zwischensumme',
      shipping: 'Versand',
      tax: 'Steuern',
      discount: 'Rabatt',
      total: 'GESAMT',
      thankYou: 'Vielen Dank für Ihren Kauf! Diese Quittung ist für Rückgaben und Garantien gültig.',
      keepRecords: 'Bewahren Sie dieses Dokument für Ihre Unterlagen und Produktgarantieinformationen auf.',
      copyright: '© {{year}} {{company}}. Alle Rechte vorbehalten.',
      autoReply: 'Dies ist eine automatisierte Quittung. Für Support kontaktieren Sie: support@motorvault.shop',
      pageOf: 'Seite {{current}} von {{total}}',
    },
    it: {
      title: 'RICEVUTA DI PAGAMENTO',
      billedTo: 'Fatturato a',
      receiptNumber: 'Ricevuta #',
      date: 'Data',
      itemHeader: 'Articolo',
      qtyHeader: 'Qtà',
      unitPriceHeader: 'Prezzo Unitario',
      lineTotalHeader: 'Totale Riga',
      subtotal: 'Subtotale',
      shipping: 'Spedizione',
      tax: 'Imposta',
      discount: 'Sconto',
      total: 'TOTALE',
      thankYou: 'Grazie per il tuo acquisto! Questa ricevuta è valida per rese e garanzie.',
      keepRecords: 'Conserva questo documento per i tuoi registri e le informazioni sulla garanzia del prodotto.',
      copyright: '© {{year}} {{company}}. Tutti i diritti riservati.',
      autoReply: 'Questa è una ricevuta automatizzata. Per il supporto, contatta: support@motorvault.shop',
      pageOf: 'Pagina {{current}} di {{total}}',
    },
    nl: {
      title: 'BETALINGSBEWIJS',
      billedTo: 'Gefactureerd aan',
      receiptNumber: 'Bon #',
      date: 'Datum',
      itemHeader: 'Artikel',
      qtyHeader: 'Aantal',
      unitPriceHeader: 'Stukprijs',
      lineTotalHeader: 'Regeltotaal',
      subtotal: 'Subtotaal',
      shipping: 'Verzending',
      tax: 'Belasting',
      discount: 'Korting',
      total: 'TOTAAL',
      thankYou: 'Bedankt voor uw aankoop! Dit bewijs is geldig voor retouren en garanties.',
      keepRecords: 'Bewaar dit document voor uw administratie en productgarantie-informatie.',
      copyright: '© {{year}} {{company}}. Alle rechten voorbehouden.',
      autoReply: 'Dit is een automatisch gegenereerd bewijs. Voor support, neem contact op: support@motorvault.shop',
      pageOf: 'Pagina {{current}} van {{total}}',
    },
  };

  return copy[language] || copy.en;
}

function buildReceiptRows(items?: OrderConfirmationData['items']): string {
  if (!items || items.length === 0) {
    return '<tr><td colspan="5" style="padding:12px;border-bottom:1px solid #e5e7eb;color:#6b7280">No line items were available for this order.</td></tr>';
  }

  return items
    .map((item) => {
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.unit_price ?? item.price ?? 0);
      const lineTotal = Number(item.line_total ?? unitPrice * quantity);
      const description = item.description ? `<div style="color:#6b7280;font-size:12px;margin-top:4px">${escapeHtml(item.description)}</div>` : '';
      const sku = item.sku ? `<div style="color:#6b7280;font-size:12px;margin-top:2px">SKU: ${escapeHtml(item.sku)}</div>` : '';

      return `<tr>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;vertical-align:top">
          <div style="font-weight:600;color:#111827">${escapeHtml(item.name || 'Item')}</div>
          ${sku}
          ${description}
        </td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center">${quantity}</td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right">${unitPrice.toFixed(2)}</td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right">${lineTotal.toFixed(2)}</td>
      </tr>`;
    })
    .join('');
}

function buildReceiptHtml(data: OrderConfirmationData): string {
  const currency = data.currency || 'USD';
  const subtotal = Number(data.subtotal ?? data.order_total ?? 0);
  const shipping = Number(data.shipping_cost ?? 0);
  const tax = Number(data.tax ?? 0);
  const discount = Number(data.discount_amount ?? 0);
  const total = Number(data.order_total ?? 0);
  const discountRow = discount > 0
    ? `<tr><td style="padding:6px 0;color:#374151">Discount</td><td style="padding:6px 0;text-align:right;color:#16a34a">-${formatMoney(discount, currency)}</td></tr>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Receipt ${escapeHtml(data.order_number)}</title>
</head>
<body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827">
  <div style="max-width:820px;margin:24px auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
    <div style="background:#0f172a;color:#ffffff;padding:24px 28px;border-bottom:4px solid #dc2626">
      <img src="/images/motorvault_profile.png" alt="MotorVault logo" style="height:36px;display:block;margin:0 0 8px" />
      <h1 style="margin:8px 0 0;font-size:24px;line-height:1.2">Payment Receipt</h1>
    </div>
    <div style="padding:24px 28px">
      <div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap">
        <div>
          <div style="font-size:13px;color:#6b7280">Billed to</div>
          <div style="font-weight:700;margin-top:4px">${escapeHtml(data.customer_name || 'Customer')}</div>
        </div>
        <div>
          <div style="font-size:13px;color:#6b7280">Receipt number</div>
          <div style="font-weight:700;margin-top:4px">${escapeHtml(data.order_number)}</div>
          <div style="font-size:13px;color:#6b7280;margin-top:4px">${escapeHtml(data.order_date)}</div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-top:24px;font-size:14px">
        <thead>
          <tr style="background:#f9fafb;color:#374151;text-align:left">
            <th style="padding:12px;border-bottom:1px solid #e5e7eb">Item</th>
            <th style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center">Qty</th>
            <th style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right">Unit Price</th>
            <th style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right">Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${buildReceiptRows(data.items)}
        </tbody>
      </table>

      <table style="margin-top:24px;margin-left:auto;min-width:280px;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#374151">Subtotal</td><td style="padding:6px 0;text-align:right">${formatMoney(subtotal, currency)}</td></tr>
        <tr><td style="padding:6px 0;color:#374151">Shipping</td><td style="padding:6px 0;text-align:right">${formatMoney(shipping, currency)}</td></tr>
        <tr><td style="padding:6px 0;color:#374151">Tax</td><td style="padding:6px 0;text-align:right">${formatMoney(tax, currency)}</td></tr>
        ${discountRow}
        <tr><td style="padding:10px 0 0;border-top:1px solid #d1d5db;font-weight:700">Total</td><td style="padding:10px 0 0;border-top:1px solid #d1d5db;text-align:right;font-weight:700">${formatMoney(total, currency)}</td></tr>
      </table>

      <p style="margin-top:24px;color:#374151;font-size:13px;line-height:1.5">
        Keep this receipt for your records. You can print this file as PDF from your browser for accounting or warranty documentation.
      </p>
    </div>
  </div>
</body>
</html>`;
}

async function buildReceiptPdf(data: OrderConfirmationData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const language = resolveMailLanguage(data.language);
    const copy = getReceiptPdfCopy(language);
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const currency = data.currency || 'USD';
    const subtotal = Number(data.subtotal ?? data.order_total ?? 0);
    const shipping = Number(data.shipping_cost ?? 0);
    const tax = Number(data.tax ?? 0);
    const discount = Number(data.discount_amount ?? 0);
    const total = Number(data.order_total ?? 0);
    const currentYear = new Date().getFullYear();

    // ===== HEADER SECTION =====
    const logoPath = resolveLogoPath();
    if (logoPath) {
      try {
        doc.image(logoPath, 40, 40, { fit: [60, 60] });
      } catch {
        // Continue if logo fails
      }
    }

    // Title and company info
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#0f172a').text(copy.title, 120, 50);
    doc.fontSize(10).font('Helvetica').fillColor('#6b7280');
    doc.text(`${process.env.SENDER_NAME || 'MotorVault Shop'}`, 120, 80);
    doc.fontSize(9).text('www.motorvault.shop', 120, 94);

    // Red divider line
    doc.strokeColor('#dc2626').lineWidth(2).moveTo(40, 115).lineTo(555, 115).stroke();

    // ===== RECEIPT META SECTION =====
    let y = 135;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827');
    doc.text(copy.receiptNumber, 40, y);
    doc.fontSize(10).font('Helvetica').fillColor('#0f172a');
    doc.text(data.order_number, 120, y);
    y += 16;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text(copy.date + ':', 40, y);
    doc.fontSize(10).font('Helvetica').fillColor('#6b7280');
    doc.text(data.order_date, 120, y);
    y += 20;

    // ===== CUSTOMER & QR CODE SECTION =====
    const billToY = y;
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#6b7280').text(copy.billedTo.toUpperCase() + ':', 40, billToY);
    doc.fontSize(11).font('Helvetica').fillColor('#111827');
    doc.text(data.customer_name || 'Customer', 40, billToY + 14);
    if (data.customer_email) {
      doc.fontSize(9).fillColor('#6b7280').text(data.customer_email, 40, billToY + 30);
    }

    // QR Code - generates order URL encoded
    const qrCodeUrl = data.order_url || `${process.env.VITE_SITE_URL || 'https://motorvault.shop'}/order/${data.order_number}`;
    QRCode.toDataURL(qrCodeUrl, { width: 100, errorCorrectionLevel: 'H', margin: 1 }, (err, qrImage) => {
      if (!err && qrImage) {
        try {
          const buffer = Buffer.from(qrImage.split(',')[1], 'base64');
          doc.image(buffer, 450, billToY, { width: 95 });
        } catch {
          // Continue if QR code fails
        }
      }

      // Continue after QR code attempt
      resumeReceiptGeneration();
    });

    let itemStartY = 0;
    function resumeReceiptGeneration() {
      y = Math.max(billToY + 100, y + 45);

      // ===== ITEMS SECTION =====
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#fff').fillAndStroke('#374151');
      doc.rect(40, y, 515, 16).fill();
      doc.fillColor('#fff').text('Item Description', 45, y + 3);
      doc.text('Qty', 310, y + 3, { width: 40, align: 'center' });
      doc.text('Unit Price', 360, y + 3, { width: 55, align: 'right' });
      doc.text('Line Total', 440, y + 3, { width: 115, align: 'right' });
      itemStartY = y + 20;
      let itemY = itemStartY;

      const items = data.items && data.items.length > 0
        ? data.items
        : [{ name: 'Order item', quantity: 1, price: String(data.order_total ?? '0.00'), unit_price: String(data.order_total ?? '0.00') }];

      doc.fontSize(9).font('Helvetica').fillColor('#111827');
      for (const item of items) {
        const itemName = item.name || 'Item';
        const quantity = Number(item.quantity || 1);
        const unitPrice = Number(item.unit_price ?? item.price ?? 0);
        const lineTotal = Number(item.line_total ?? unitPrice * quantity);

        // Page break if necessary
        if (itemY > 700) {
          doc.addPage();
          itemY = 50;
          // Repeat header on new page
          doc.fontSize(9).font('Helvetica-Bold').fillColor('#fff').fillAndStroke('#374151');
          doc.rect(40, itemY, 515, 16).fill();
          doc.fillColor('#fff').text('Item Description', 45, itemY + 3);
          doc.text('Qty', 310, itemY + 3, { width: 40, align: 'center' });
          doc.text('Unit Price', 360, itemY + 3, { width: 55, align: 'right' });
          doc.text('Line Total', 440, itemY + 3, { width: 115, align: 'right' });
          itemY += 20;
          doc.fontSize(9).font('Helvetica').fillColor('#111827');
        }

        // Draw item row with alternating background
        if (Math.floor((itemY - itemStartY) / 16) % 2 === 1) {
          doc.fillColor('#f9fafb').rect(40, itemY, 515, 14).fill();
        }
        doc.fillColor('#111827');
        doc.text(itemName, 45, itemY + 1, { width: 250 });
        doc.text(String(quantity), 310, itemY + 1, { width: 40, align: 'center' });
        doc.text(unitPrice.toFixed(2), 360, itemY + 1, { width: 55, align: 'right' });
        doc.text(lineTotal.toFixed(2), 440, itemY + 1, { width: 115, align: 'right' });

        // SKU and description if available
        if (item.sku || item.description) {
          doc.fontSize(8).fillColor('#6b7280');
          if (item.sku) {
            doc.text(`SKU: ${item.sku}`, 50, itemY + 12, { width: 240 });
          }
          if (item.description) {
            const descY = item.sku ? itemY + 24 : itemY + 12;
            doc.text(item.description, 50, descY, { width: 250 });
          }
          itemY += 30;
        } else {
          itemY += 16;
        }

        doc.fontSize(9).font('Helvetica');
      }

      // ===== TOTALS SECTION =====
      let totalY = itemY + 15;
      doc.strokeColor('#d1d5db').lineWidth(1).moveTo(320, totalY).lineTo(555, totalY).stroke();
      totalY += 10;

      doc.fontSize(10).font('Helvetica').fillColor('#374151');
      doc.text(copy.subtotal + ':', 360, totalY, { width: 55 });
      doc.text(formatMoney(subtotal, currency), 440, totalY, { width: 115, align: 'right' });
      totalY += 14;

      doc.text(copy.shipping + ':', 360, totalY, { width: 55 });
      doc.text(formatMoney(shipping, currency), 440, totalY, { width: 115, align: 'right' });
      totalY += 14;

      doc.text(copy.tax + ':', 360, totalY, { width: 55 });
      doc.text(formatMoney(tax, currency), 440, totalY, { width: 115, align: 'right' });
      totalY += 14;

      if (discount > 0) {
        doc.fillColor('#16a34a');
        doc.text(copy.discount + ':', 360, totalY, { width: 55 });
        doc.text(`-${formatMoney(discount, currency)}`, 440, totalY, { width: 115, align: 'right' });
        totalY += 14;
        doc.fillColor('#374151');
      }

      // Total box
      totalY += 6;
      doc.strokeColor('#111827').lineWidth(1.5).moveTo(320, totalY).lineTo(555, totalY).stroke();
      totalY += 10;
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a');
      doc.text(copy.total + ':', 360, totalY, { width: 55 });
      doc.text(formatMoney(total, currency), 440, totalY, { width: 115, align: 'right' });
      totalY += 20;

      // ===== FOOTER SECTION =====
      doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(40, totalY).lineTo(555, totalY).stroke();
      totalY += 10;

      doc.fontSize(9).font('Helvetica').fillColor('#6b7280');
      doc.text(copy.thankYou, 40, totalY, { width: 515, align: 'center' });
      totalY += 12;
      doc.text(copy.keepRecords, 40, totalY, { width: 515, align: 'center' });
      totalY +=  16;

      // Copyright and company info
      doc.fontSize(8).fillColor('#9ca3af').font('Helvetica');
      const copyrightText = copy.copyright.replace('{{year}}', currentYear.toString()).replace('{{company}}', process.env.SENDER_NAME || 'MotorVault Shop');
      doc.text(copyrightText, 40, totalY, { width: 515, align: 'center' });
      totalY += 10;
      doc.text(copy.autoReply, 40, totalY, { width: 515, align: 'center' });

      // Page numbers
      const pages = doc.bufferedPageRange().count;
      for (let i = 0; i < pages; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor('#bfdbfe');
        const pageText = copy.pageOf.replace('{{current}}', String(i + 1)).replace('{{total}}', String(pages));
        doc.text(pageText, 40, 780, { align: 'right' });
      }

      doc.end();
    }
  });
}

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmationEmail(
  recipientEmail: string,
  data: OrderConfirmationData
): Promise<boolean> {
  try {
    const transporterInstance = getTransporter();
    const language = resolveMailLanguage(data.language);
    const copy = getOrderEmailCopy(language);
    const itemsHtml = buildItemsHtml(data.items as any);
    const itemCount = data.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) ?? 0;
    const logoMail = buildLogoMailContext();
    const currentYear = new Date().getFullYear();
    
    // Format discount row if applicable
    const discount = Number(data.discount_amount ?? 0);
    const discountRow = discount > 0 
      ? `<div class="total-row discount"><div class="total-label">${copy.discount}:</div><div class="total-amount">-${formatMoney(discount, data.currency)}</div></div>`
      : '';
    
    const trackingNote = data.tracking_url 
      ? `${copy.tracking} <a href="${escapeHtml(data.tracking_url)}" style="color: #2563eb; text-decoration: none;">${copy.trackingLink}</a>`
      : copy.tracking;

    const htmlContent = loadTemplate('order-confirmed', {
      ...data,
      item_count: itemCount,
      logo_src: logoMail.logoSrc,
      receipt_filename: data.receipt_filename || `motorvault-receipt-${String(data.order_number || '').replace(/[^a-zA-Z0-9-_]/g, '')}.pdf`,
      items_html: itemsHtml,
      support_email: escapeHtml(data.support_email || process.env.SMTP_FROM_EMAIL || process.env.GMAIL_USER || 'support@motorvault.shop'),
      sender_name: process.env.SENDER_NAME || 'Our Store',
      current_year: currentYear,
      customer_email: escapeHtml(data.customer_email || recipientEmail),
      subtotal: formatMoney(data.subtotal ?? data.order_total ?? '0.00', data.currency),
      shipping_cost: formatMoney(data.shipping_cost ?? '0.00', data.currency),
      tax: formatMoney(data.tax ?? '0.00', data.currency),
      discount_row: discountRow,
      order_total: formatMoney(data.order_total ?? '0.00', data.currency),
      tracking_note: trackingNote,
      // Language-specific strings
      heading: copy.heading,
      subheading: copy.subheading,
      intro: copy.intro,
      order_number_label: copy.orderNumber,
      order_date_label: copy.orderDate,
      items_label: copy.items,
      total_amount_label: copy.totalAmount,
      customer_info_label: copy.customerInfo,
      order_status_label: copy.orderStatus,
      status_confirmed: copy.statusConfirmed,
      product_label: copy.product,
      qty_label: copy.qty,
      price_label: copy.price,
      subtotal_label: copy.subtotal,
      shipping_label: copy.shipping,
      tax_label: copy.tax,
      total_label: copy.total,
      view_details_btn: copy.viewDetails,
      receipt_note: copy.receiptNote,
      questions: copy.questions,
      support_contact_label: copy.supportContact,
      copyright: copy.copyright,
      auto_reply: copy.autoReply,
    });

    const safeOrderNumber = String(data.order_number || 'receipt').replace(/[^a-zA-Z0-9-_]/g, '');
    const receiptFilename = `motorvault-receipt-${safeOrderNumber}.pdf`;
    const receiptPdf = await buildReceiptPdf(data);

    // Localized subject line
    const subjectMap: Record<MailLanguage, string> = {
      en: `Order Confirmed — #${data.order_number}`,
      es: `Pedido Confirmado — #${data.order_number}`,
      fr: `Commande Confirmée — #${data.order_number}`,
      de: `Bestellung Bestätigt — #${data.order_number}`,
      it: `Ordine Confermato — #${data.order_number}`,
      nl: `Bestelling Bevestigd — #${data.order_number}`,
    };

    await sendMailWithRetry(transporterInstance, {
      from: `${process.env.SENDER_NAME || 'Our Store'} <${process.env.SMTP_FROM_EMAIL || process.env.GMAIL_USER}>`,
      to: recipientEmail,
      subject: subjectMap[language],
      html: htmlContent,
      attachments: [
        ...logoMail.attachments,
        {
          filename: receiptFilename,
          content: receiptPdf,
          contentType: 'application/pdf',
        },
      ],
    }, `order confirmation to ${recipientEmail}`);

    console.log(`[Email] Order confirmation sent to ${recipientEmail}`);
    return true;
  } catch (error) {
    logEmailError(`[Email] Failed to send order confirmation to ${recipientEmail}`, error);
    return false;
  }
}

export interface TicketConfirmationData {
  customer_name: string;
  ticket_reference: string;
  ticket_subject: string;
  ticket_priority: string;
  ticket_status: string;
  ticket_created_at: string;
  ticket_description: string;
  contact_email?: string;
  contact_phone?: string;
  support_email?: string;
  language?: string;
}

export async function sendTicketConfirmationEmail(
  recipientEmail: string,
  data: TicketConfirmationData
): Promise<boolean> {
  try {
    const transporterInstance = getTransporter();
    const language = resolveMailLanguage(data.language);
    const copy = getTicketEmailCopy(language);
    const supportEmail = escapeHtml(data.support_email || process.env.SMTP_FROM_EMAIL || process.env.GMAIL_USER || 'support@motorvault.shop');
    const logoMail = buildLogoMailContext();
    const htmlContent = loadTemplate('ticket-received', {
      logo_src: logoMail.logoSrc,
      page_title: copy.pageTitle,
      heading: copy.heading,
      intro: copy.intro,
      customer_name: escapeHtml(data.customer_name),
      label_reference: copy.labels.reference,
      ticket_reference: escapeHtml(data.ticket_reference),
      label_subject: copy.labels.issue,
      ticket_subject: escapeHtml(data.ticket_subject),
      label_priority: copy.labels.priority,
      ticket_priority: escapeHtml(data.ticket_priority),
      label_status: copy.labels.status,
      ticket_status: escapeHtml(data.ticket_status),
      label_created_at: copy.labels.createdAt,
      ticket_created_at: escapeHtml(data.ticket_created_at),
      label_contact_email: copy.labels.contactEmail,
      contact_email: escapeHtml(data.contact_email || copy.notProvided),
      label_contact_phone: copy.labels.contactPhone,
      contact_phone: escapeHtml(data.contact_phone || copy.notProvided),
      label_details: copy.labels.details,
      ticket_description: formatTextBlock(data.ticket_description),
      follow_up: copy.followUp,
      help_text: copy.helpText,
      footer: copy.footer,
      support_email: supportEmail,
      sender_name: process.env.SENDER_NAME || 'Our Store',
    });

    await sendMailWithRetry(transporterInstance, {
      from: `${process.env.SENDER_NAME || 'Our Store'} <${process.env.SMTP_FROM_EMAIL || process.env.GMAIL_USER}>`,
      to: recipientEmail,
      subject: `${copy.subject} - ${data.ticket_reference}`,
      html: htmlContent,
      attachments: logoMail.attachments,
    }, `ticket confirmation to ${recipientEmail}`);

    console.log(`[Email] Ticket confirmation sent to ${recipientEmail}`);
    return true;
  } catch (error) {
    logEmailError(`[Email] Failed to send ticket confirmation to ${recipientEmail}`, error);
    return false;
  }
}

export interface ContactConfirmationData {
  customer_name: string;
  contact_subject: string;
  contact_location: string;
  contact_message: string;
  support_email?: string;
  language?: string;
}

export async function sendContactConfirmationEmail(
  recipientEmail: string,
  data: ContactConfirmationData
): Promise<boolean> {
  try {
    const transporterInstance = getTransporter();
    const language = resolveMailLanguage(data.language);
    const copy = getContactEmailCopy(language);
    const supportEmail = escapeHtml(data.support_email || process.env.SMTP_FROM_EMAIL || process.env.GMAIL_USER || 'support@motorvault.shop');
    const logoMail = buildLogoMailContext();
    const htmlContent = loadTemplate('contact-received', {
      logo_src: logoMail.logoSrc,
      page_title: copy.pageTitle,
      heading: copy.heading,
      intro: copy.intro,
      customer_name: escapeHtml(data.customer_name),
      label_status: copy.labels.status,
      status_value: copy.values.status,
      label_next_step: copy.labels.nextStep,
      next_step_value: copy.values.nextStep,
      help_text: copy.helpText,
      support_email: supportEmail,
      footer: copy.footer,
      sender_name: process.env.SENDER_NAME || 'Our Store',
    });

    await sendMailWithRetry(transporterInstance, {
      from: `${process.env.SENDER_NAME || 'Our Store'} <${process.env.SMTP_FROM_EMAIL || process.env.GMAIL_USER}>`,
      to: recipientEmail,
      subject: copy.subject,
      html: htmlContent,
      attachments: logoMail.attachments,
    }, `contact confirmation to ${recipientEmail}`);

    console.log(`[Email] Contact confirmation sent to ${recipientEmail}`);
    return true;
  } catch (error) {
    logEmailError(`[Email] Failed to send contact confirmation to ${recipientEmail}`, error);
    return false;
  }
}

export interface ContactReplyData {
  customer_name: string;
  customer_email: string;
  original_subject: string;
  original_message: string;
  customer_location: string;
  reply_message: string;
  support_email?: string;
}

/**
 * Send contact us reply email
 */
export async function sendContactReplyEmail(
  recipientEmail: string,
  data: ContactReplyData
): Promise<boolean> {
  try {
    const transporterInstance = getTransporter();
    const logoMail = buildLogoMailContext();
    const htmlContent = loadTemplate('contact-reply', {
      logo_src: logoMail.logoSrc,
      customer_name: escapeHtml(data.customer_name),
      original_subject: escapeHtml(data.original_subject || 'Your message'),
      original_message: formatTextBlock(data.original_message),
      customer_location: escapeHtml(data.customer_location || 'Not provided'),
      reply_message: formatTextBlock(data.reply_message),
      support_email: escapeHtml(data.support_email || process.env.SMTP_FROM_EMAIL || process.env.GMAIL_USER || 'support@motorvault.shop'),
      sender_name: process.env.SENDER_NAME || 'Our Store',
    });

    await sendMailWithRetry(transporterInstance, {
      from: `${process.env.SENDER_NAME || 'Our Store'} <${process.env.SMTP_FROM_EMAIL || process.env.GMAIL_USER}>`,
      to: recipientEmail,
      subject: `Re: ${data.original_subject}`,
      html: htmlContent,
      attachments: logoMail.attachments,
    }, `contact reply to ${recipientEmail}`);

    console.log(`[Email] Contact reply sent to ${recipientEmail}`);
    return true;
  } catch (error) {
    logEmailError(`[Email] Failed to send contact reply to ${recipientEmail}`, error);
    return false;
  }
}

/**
 * Verify email transporter connection
 */
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    const transporterInstance = getTransporter();
    await transporterInstance.verify();
    console.log('[Email] SMTP connection verified');
    return true;
  } catch (error) {
    logEmailError('[Email] SMTP connection failed', error);
    return false;
  }
}
