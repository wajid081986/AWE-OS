'use strict';

/**
 * Newsletter sending — admin-triggered only, never called from a cron.
 * Reuses the shared Resend client in email.service.js (no second client).
 */

const jwt      = require('jsonwebtoken');
const supabase = require('../db/supabase');
const { sendEmail } = require('./email.service');

const BATCH_SIZE      = 50;
const BATCH_DELAY_MS  = 1500;
const UNSUBSCRIBE_PURPOSE = 'newsletter_unsubscribe';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function apiBaseUrl() {
  return process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
}

// Long-lived, purpose-scoped token — an unsubscribe link must keep working
// for as long as the email sits in someone's inbox, so it deliberately has
// no expiresIn (unlike the 7-day session tokens signToken() issues in auth.js).
function buildUnsubscribeUrl(userId) {
  const token = jwt.sign({ uid: userId, purpose: UNSUBSCRIBE_PURPOSE }, process.env.JWT_SECRET);
  return `${apiBaseUrl()}/api/marketing/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
}

function renderNewsletterHtml(newsletter, unsubscribeUrl) {
  const sections = Array.isArray(newsletter.sections) ? newsletter.sections : [];
  const sectionsHtml = sections.map(s => `
    <tr><td style="padding:16px 0;">
      <h2 style="margin:0 0 8px;font-size:18px;color:#111;">${s.title || ''}</h2>
      <p style="margin:0 0 8px;color:#333;line-height:1.5;">${s.body || ''}</p>
      ${s.cta_text && s.cta_url ? `<a href="${s.cta_url}" style="color:#4f46e5;">${s.cta_text}</a>` : ''}
    </td></tr>`).join('');

  return `<!DOCTYPE html>
<html>
  <body style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111;">
    <h1 style="font-size:22px;">${newsletter.hero_headline || newsletter.subject_line}</h1>
    <p style="line-height:1.5;">${newsletter.hero_body || ''}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${sectionsHtml}</table>
    <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;" />
    <p style="font-size:12px;color:#888;">
      You're receiving this because you have an AWE-OS account.
      <a href="${unsubscribeUrl}" style="color:#888;">Unsubscribe</a>
    </p>
  </body>
</html>`;
}

/**
 * @param {string} id - newsletters.id
 * @param {object} [opts]
 * @param {string} [opts.testEmail] - if set, sends one copy to this address only
 *                                    and does NOT touch the newsletter's status.
 * @returns {Promise<object>}
 */
async function sendNewsletter(id, { testEmail } = {}) {
  const { data: newsletter, error: fetchErr } = await supabase
    .from('newsletters')
    .select('*')
    .eq('id', id)
    .single();
  if (fetchErr || !newsletter) throw new Error('Newsletter not found');

  if (testEmail) {
    const html = renderNewsletterHtml(newsletter, buildUnsubscribeUrl('test-preview'));
    await sendEmail({ to: testEmail, subject: `[TEST] ${newsletter.subject_line}`, html });
    return { test: true, sent_to: testEmail };
  }

  if (newsletter.status === 'sent') {
    throw new Error('Newsletter has already been sent');
  }

  const { data: recipients, error: usersErr } = await supabase
    .from('users')
    .select('id, email')
    .not('email', 'is', null)
    .eq('email_opt_out', false);
  if (usersErr) throw new Error('Failed to fetch recipients: ' + usersErr.message);

  let sentCount = 0, failedCount = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map((user) => {
      const html = renderNewsletterHtml(newsletter, buildUnsubscribeUrl(user.id));
      return sendEmail({ to: user.email, subject: newsletter.subject_line, html });
    }));
    for (const r of results) {
      if (r.status === 'fulfilled') sentCount++; else failedCount++;
    }
    if (i + BATCH_SIZE < recipients.length) await sleep(BATCH_DELAY_MS);
  }

  const { data: updated, error: updateErr } = await supabase
    .from('newsletters')
    .update({
      status:          'sent',
      sent_at:         new Date().toISOString(),
      recipient_count: sentCount,
      failed_count:    failedCount,
    })
    .eq('id', id)
    .select()
    .single();
  if (updateErr) throw new Error('Failed to update newsletter after send: ' + updateErr.message);

  return { test: false, recipient_count: sentCount, failed_count: failedCount, newsletter: updated };
}

module.exports = { sendNewsletter, buildUnsubscribeUrl, renderNewsletterHtml, UNSUBSCRIBE_PURPOSE };
