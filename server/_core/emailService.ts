import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

let transporter: nodemailer.Transporter | null = null;
const errorLogPath = path.join(process.cwd(), 'server', 'logs', 'nodemailer-errors.log');

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
 * Initialize nodemailer transporter once
 * Uses Gmail SMTP configuration from environment variables
 */
function getTransporter(): nodemailer.Transporter {
  if (transporter) {
    return transporter;
  }

  const smtpConfig: nodemailer.TransportOptions = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  };

  transporter = nodemailer.createTransport(smtpConfig);
  return transporter;
}

/**
 * Load email template with simple variable substitution
 */
function loadTemplate(templateName: string, data: Record<string, any>): string {
  try {
    const templatePath = path.join(__dirname, '../email_templates/motorvault', `${templateName}.html`);
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
      sender_name: process.env.SENDER_NAME || 'Our Store',
    });

    await transporterInstance.sendMail({
      from: `${process.env.SENDER_NAME || 'Our Store'} <${process.env.SMTP_FROM_EMAIL || process.env.GMAIL_USER}>`,
      to: recipientEmail,
      subject: `Order Confirmed — #${data.order_number}`,
      html: htmlContent,
    });

    console.log(`[Email] Order confirmation sent to ${recipientEmail}`);
    return true;
  } catch (error) {
    logEmailError(`[Email] Failed to send order confirmation to ${recipientEmail}`, error);
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
