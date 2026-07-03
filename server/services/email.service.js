'use strict';

/**
 * Shared transactional email service (Resend).
 * Agents call sendEmail() directly — failures throw so callers can decide
 * whether to log-and-continue (e.g. batch upsell sends) or surface the error.
 */

let _client = null;

function getClient() {
  if (!process.env.RESEND_API_KEY) {
    const err = new Error('RESEND_API_KEY environment variable is not set');
    err.code   = 'EMAIL_UNAVAILABLE';
    err.status = 503;
    throw err;
  }
  if (!_client) {
    const { Resend } = require('resend');
    _client = new Resend(process.env.RESEND_API_KEY);
  }
  return _client;
}

/**
 * @param {object} opts
 * @param {string} opts.to      - Recipient email address
 * @param {string} opts.subject
 * @param {string} opts.html
 * @param {string} [opts.from]  - Defaults to EMAIL_FROM env var, then a fallback address
 * @returns {Promise<{id: string}>}
 */
async function sendEmail({ to, subject, html, from }) {
  if (!to || !subject || !html) {
    const err = new Error('sendEmail requires to, subject, and html');
    err.code = 'INVALID_EMAIL_PAYLOAD';
    throw err;
  }

  const client = getClient();
  const { data, error } = await client.emails.send({
    from: from || process.env.EMAIL_FROM || 'noreply@awe-os.com',
    to,
    subject,
    html,
  });

  if (error) {
    const err = new Error(error.message || 'Email send failed');
    err.code = 'EMAIL_SEND_FAILED';
    throw err;
  }

  return data;
}

module.exports = { sendEmail };
