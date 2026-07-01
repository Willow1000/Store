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

    return `<li><div class="item-name">${name}</div><div class="item-meta">Quantity: ${quantity} | Unit price: ${unitPrice} | Line total: ${lineTotal}</div>${sku}${description}</li>`;
  }).join('');
}

function formatTextBlock(value: string | undefined | null): string {
  return escapeHtml(String(value ?? '').trim()).replace(/\n/g, '<br />');
}

type MailLanguage = 'en' | 'es' | 'fr' | 'de' | 'it';

function resolveMailLanguage(value: unknown): MailLanguage {
  const raw = String(value || '').trim().toLowerCase();
  if (raw.startsWith('es')) return 'es';
  if (raw.startsWith('fr')) return 'fr';
  if (raw.startsWith('de')) return 'de';
  if (raw.startsWith('it')) return 'it';
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
      pageTitle: 'Your Ticket Was Received - MotorVault',
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
      pageTitle: 'Hemos recibido tu ticket - MotorVault',
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
      pageTitle: 'Votre ticket a ete recu - MotorVault',
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
      pageTitle: 'Ihr Ticket wurde empfangen - MotorVault',
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
      pageTitle: 'Il tuo ticket e stato ricevuto - MotorVault',
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
      subject: 'Thank you for contacting MotorVault',
      pageTitle: 'Thank You for Contacting MotorVault',
      heading: 'Thank You for Contacting MotorVault',
      intro: 'Your message has been received. One of our staff members will reach out to you using this email address shortly.',
      labels: {
        status: 'Status',
        nextStep: 'Next step',
      },
      values: {
        status: 'Received',
        nextStep: 'A MotorVault staff member will contact you via this email address',
      },
      helpText: 'Need more help? Email',
      footer: 'We appreciate your patience and will follow up as soon as possible.',
    },
    es: {
      subject: 'Gracias por contactar a MotorVault',
      pageTitle: 'Gracias por contactar a MotorVault',
      heading: 'Gracias por contactar a MotorVault',
      intro: 'Hemos recibido tu mensaje. Uno de nuestros colaboradores se pondra en contacto contigo usando este correo en breve.',
      labels: {
        status: 'Estado',
        nextStep: 'Siguiente paso',
      },
      values: {
        status: 'Recibido',
        nextStep: 'Un miembro del equipo de MotorVault te contactara por este correo',
      },
      helpText: 'Necesitas mas ayuda? Escribe a',
      footer: 'Agradecemos tu paciencia y te responderemos lo antes posible.',
    },
    fr: {
      subject: 'Merci d avoir contacte MotorVault',
      pageTitle: 'Merci d avoir contacte MotorVault',
      heading: 'Merci d avoir contacte MotorVault',
      intro: 'Votre message a bien ete recu. Un membre de notre equipe vous contactera bientot via cette adresse email.',
      labels: {
        status: 'Statut',
        nextStep: 'Prochaine etape',
      },
      values: {
        status: 'Recu',
        nextStep: 'Un membre de l equipe MotorVault vous contactera via cet email',
      },
      helpText: 'Besoin d aide supplementaire? Ecrivez a',
      footer: 'Merci pour votre patience, nous reviendrons vers vous rapidement.',
    },
    de: {
      subject: 'Vielen Dank fur Ihre Nachricht an MotorVault',
      pageTitle: 'Vielen Dank fur Ihre Nachricht an MotorVault',
      heading: 'Vielen Dank fur Ihre Nachricht an MotorVault',
      intro: 'Ihre Nachricht wurde empfangen. Ein Mitglied unseres Teams meldet sich in Kurze uber diese E-Mail-Adresse bei Ihnen.',
      labels: {
        status: 'Status',
        nextStep: 'Nachster Schritt',
      },
      values: {
        status: 'Empfangen',
        nextStep: 'Ein MotorVault Teammitglied kontaktiert Sie uber diese E-Mail-Adresse',
      },
      helpText: 'Brauchen Sie weitere Hilfe? Schreiben Sie an',
      footer: 'Vielen Dank fur Ihre Geduld. Wir melden uns so schnell wie moglich.',
    },
    it: {
      subject: 'Grazie per aver contattato MotorVault',
      pageTitle: 'Grazie per aver contattato MotorVault',
      heading: 'Grazie per aver contattato MotorVault',
      intro: 'Il tuo messaggio e stato ricevuto. Un membro del nostro staff ti contattera a breve tramite questo indirizzo email.',
      labels: {
        status: 'Stato',
        nextStep: 'Prossimo passo',
      },
      values: {
        status: 'Ricevuto',
        nextStep: 'Un membro del team MotorVault ti contattera tramite questo indirizzo email',
      },
      helpText: 'Hai bisogno di altro aiuto? Scrivi a',
      footer: 'Grazie per la pazienza, ti risponderemo al piu presto.',
    },
  };

  return copy[language] || copy.en;
}

export interface OrderConfirmationData {
  customer_name: string;
  order_number: string;
  order_date: string;
  order_total: string;
  currency?: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: string;
  }>;
  order_url: string;
  tracking_url?: string;
  support_email?: string;
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
    const itemsHtml = buildItemsHtml(data.items as any);
    const itemCount = data.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) ?? 0;

    const htmlContent = loadTemplate('order-confirmed', {
      ...data,
      item_count: itemCount,
      items_html: itemsHtml,
      support_email: escapeHtml(data.support_email || process.env.SMTP_FROM_EMAIL || process.env.GMAIL_USER || 'support@motorvault.shop'),
      sender_name: process.env.SENDER_NAME || 'Our Store',
    });

    await sendMailWithRetry(transporterInstance, {
      from: `${process.env.SENDER_NAME || 'Our Store'} <${process.env.SMTP_FROM_EMAIL || process.env.GMAIL_USER}>`,
      to: recipientEmail,
      subject: `Order Confirmed — #${data.order_number}`,
      html: htmlContent,
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
    const htmlContent = loadTemplate('ticket-received', {
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
    const htmlContent = loadTemplate('contact-received', {
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
    const htmlContent = loadTemplate('contact-reply', {
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
