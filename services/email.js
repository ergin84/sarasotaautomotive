const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Returns the shared nodemailer transporter, creating it on first call.
 * Returns null when SMTP credentials are not configured.
 */
function getTransporter() {
  if (transporter) return transporter;
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return transporter;
}

/**
 * Resolves the admin notification email address.
 * Prefers the value stored in SiteSettings, falls back to ADMIN_EMAIL env var.
 */
async function getAdminEmail() {
  try {
    const SiteSettings = require('../models/SiteSettings');
    const settings = await SiteSettings.getSettings();
    const fromSettings = typeof settings?.adminEmail === 'string' ? settings.adminEmail.trim() : '';
    return fromSettings || process.env.ADMIN_EMAIL || '';
  } catch (error) {
    console.error('Error reading site settings for admin email:', error);
    return process.env.ADMIN_EMAIL || '';
  }
}

/**
 * Sends an email using the shared transporter.
 *
 * @param {object} options - nodemailer mail options (to, subject, html, …)
 * @returns {Promise<void>} Resolves when sent; logs and resolves on error so
 *   callers can fire-and-forget without crashing the request.
 */
async function sendMail(options) {
  const mail = getTransporter();
  if (!mail) {
    console.warn('Email not sent: SMTP credentials not configured');
    return;
  }
  await mail.sendMail({
    from: process.env.NOTIFY_FROM || process.env.SMTP_USER,
    ...options
  });
}

module.exports = { getTransporter, getAdminEmail, sendMail };
