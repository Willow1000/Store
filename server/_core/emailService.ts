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
}

export async function sendTicketConfirmationEmail(
  recipientEmail: string,
  data: TicketConfirmationData
): Promise<boolean> {
  try {
    const transporterInstance = getTransporter();
    const htmlContent = loadTemplate('ticket-received', {
      ...data,
      customer_name: escapeHtml(data.customer_name),
      ticket_reference: escapeHtml(data.ticket_reference),
      ticket_subject: escapeHtml(data.ticket_subject),
      ticket_priority: escapeHtml(data.ticket_priority),
      ticket_status: escapeHtml(data.ticket_status),
      ticket_created_at: escapeHtml(data.ticket_created_at),
      ticket_description: formatTextBlock(data.ticket_description),
      contact_email: escapeHtml(data.contact_email || ''),
      contact_phone: escapeHtml(data.contact_phone || ''),
      support_email: escapeHtml(data.support_email || process.env.SMTP_FROM_EMAIL || process.env.GMAIL_USER || 'support@motorvault.shop'),
      sender_name: process.env.SENDER_NAME || 'Our Store',
    });

    await sendMailWithRetry(transporterInstance, {
      from: `${process.env.SENDER_NAME || 'Our Store'} <${process.env.SMTP_FROM_EMAIL || process.env.GMAIL_USER}>`,
      to: recipientEmail,
      subject: `We received your ticket — ${data.ticket_reference}`,
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
}

export async function sendContactConfirmationEmail(
  recipientEmail: string,
  data: ContactConfirmationData
): Promise<boolean> {
  try {
    const transporterInstance = getTransporter();
    const htmlContent = loadTemplate('contact-received', {
      customer_name: escapeHtml(data.customer_name),
      contact_subject: escapeHtml(data.contact_subject || 'General support request'),
      contact_location: escapeHtml(data.contact_location || 'Not provided'),
      contact_message: formatTextBlock(data.contact_message),
      support_email: escapeHtml(data.support_email || process.env.SMTP_FROM_EMAIL || process.env.GMAIL_USER || 'support@motorvault.shop'),
      sender_name: process.env.SENDER_NAME || 'Our Store',
    });

    await sendMailWithRetry(transporterInstance, {
      from: `${process.env.SENDER_NAME || 'Our Store'} <${process.env.SMTP_FROM_EMAIL || process.env.GMAIL_USER}>`,
      to: recipientEmail,
      subject: 'We received your message',
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
