'use strict';

const supabase                          = require('../db/supabase');
const { callOpenAI, parseJSONResponse } = require('../services/ai.service');
const { sendEmail }                     = require('../services/email.service');

// ── Private helpers ───────────────────────────────────────────────────────────

function addHours(h) {
  return new Date(Date.now() + h * 3600000).toISOString();
}

function hoursBetween(start, end) {
  return parseFloat(((new Date(end) - new Date(start)) / 3600000).toFixed(2));
}

function extractKeywords(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 5);
}

function todayRange() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end   = new Date(); end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildTicketReplyHtml(ticket, approved_text) {
  const bodyHtml = escapeHtml(approved_text).replace(/\n/g, '<br>');
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;line-height:1.5;">
      <p>Hi${ticket.user_name ? ' ' + escapeHtml(ticket.user_name) : ''},</p>
      <p>${bodyHtml}</p>
      <p style="color:#888;font-size:12px;">Ticket ${escapeHtml(ticket.ticket_number)} — reply to this email if you need anything else.</p>
    </div>
  `;
}

// ── 1. createTicket ───────────────────────────────────────────────────────────

async function createTicket(data) {
  try {
    // STEP 1 — Validate
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(data.user_email)) {
      const err = new Error('Invalid email address'); err.field = 'user_email'; throw err;
    }
    if (!data.subject || data.subject.trim().length < 5) {
      const err = new Error('Subject must be at least 5 characters'); err.field = 'subject'; throw err;
    }
    if (!data.description || data.description.trim().length < 20) {
      const err = new Error('Description must be at least 20 characters'); err.field = 'description'; throw err;
    }

    // STEP 2 — Check duplicates
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600000).toISOString();
    let potentialDuplicate = null;
    try {
      const { data: recent } = await supabase
        .from('support_tickets')
        .select('id, ticket_number, subject')
        .eq('user_email', data.user_email)
        .not('status', 'in', '(resolved,closed,spam)')
        .gte('created_at', sevenDaysAgo);

      if (recent && recent.length > 0) {
        const keywords = extractKeywords(data.subject);
        potentialDuplicate = recent.find(t =>
          keywords.some(k => (t.subject || '').toLowerCase().includes(k))
        ) || null;
      }
    } catch (dupErr) {
      console.error('[SUPPORT] Duplicate check error:', dupErr.message);
    }

    // STEP 3 — Fetch user context
    let userRecord   = null;
    let eventCount   = 0;
    let paymentCount = 0;
    try {
      const { data: user } = await supabase
        .from('users')
        .select('id, isPremium, created_at')
        .eq('email', data.user_email)
        .single();
      userRecord = user;

      if (user) {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600000).toISOString();
        const [eventsRes, paymentsRes] = await Promise.all([
          supabase.from('tool_events')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', thirtyDaysAgo),
          supabase.from('revenue_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),
        ]);
        eventCount   = eventsRes.count   || 0;
        paymentCount = paymentsRes.count || 0;
      }
    } catch (userErr) {
      console.error('[SUPPORT] User context error:', userErr.message);
    }

    // STEP 4 — Fetch tool name
    let toolName = null;
    if (data.tool_id) {
      try {
        const { data: tool } = await supabase
          .from('tools')
          .select('name')
          .eq('id', data.tool_id)
          .single();
        toolName = tool?.name || null;
      } catch (toolErr) {
        console.error('[SUPPORT] Tool fetch error:', toolErr.message);
      }
    }

    const isPremium       = userRecord?.isPremium || false;
    const daysSinceCreated = userRecord?.created_at
      ? Math.floor((Date.now() - new Date(userRecord.created_at)) / 86400000)
      : 0;

    // STEP 5 — AI Classification
    const defaultCls = {
      category: 'other', priority: 'medium', sentiment: 'neutral',
      sentiment_score: 0, tags: [], is_spam: false, spam_reason: null,
      similar_issue_keywords: [],
    };
    let classification = { ...defaultCls };

    try {
      const prompt = `You are a SaaS customer support expert.
Analyze this support ticket and classify it.

User: ${data.user_email} | Premium: ${isPremium}
Subject: ${data.subject}
Description: ${data.description}
Tool: ${toolName || 'Not specified'}
Account age: ${daysSinceCreated} days
Recent events: ${eventCount}
Payment count: ${paymentCount}

Return ONLY valid JSON (no markdown):
{
  "category": "bug_report"|"feature_request"|"billing_issue"|"how_to_question"|"account_issue"|"performance_issue"|"compliment"|"other",
  "priority": "critical"|"high"|"medium"|"low",
  "sentiment": "angry"|"frustrated"|"neutral"|"happy"|"satisfied",
  "sentiment_score": number (-100 to +100),
  "tags": string[],
  "is_spam": boolean,
  "spam_reason": string|null,
  "similar_issue_keywords": string[]
}

Priority rules:
- critical: billing_issue AND isPremium=true
- high: core feature broken, data loss risk
- medium: feature not working as expected
- low: feature_request or compliment`;

      const raw    = await callOpenAI(prompt, { temperature: 0.2 });
      const parsed = parseJSONResponse(raw);
      if (parsed) classification = { ...defaultCls, ...parsed };
    } catch (aiErr) {
      console.error('[SUPPORT] AI classification failed:', aiErr.message);
    }

    // STEP 7 — Calculate SLA deadline
    const slaHours   = { critical: 2, high: 8, medium: 24, low: 72 };
    const slaDeadline = addHours(slaHours[classification.priority] || 24);

    // STEP 8 — INSERT to support_tickets
    const { data: saved, error: insertErr } = await supabase
      .from('support_tickets')
      .insert({
        user_id:         userRecord?.id   || null,
        user_email:      data.user_email,
        user_name:       data.user_name   || null,
        is_premium:      isPremium,
        subject:         data.subject,
        description:     data.description,
        tool_id:         data.tool_id     || null,
        tool_name:       toolName,
        category:        classification.category,
        priority:        classification.priority,
        sentiment:       classification.sentiment,
        sentiment_score: classification.sentiment_score || 0,
        tags:            classification.tags            || [],
        sla_deadline:    slaDeadline,
        status:          classification.is_spam ? 'spam' : 'open',
        duplicate_of:    potentialDuplicate?.id         || null,
      })
      .select()
      .single();

    if (insertErr) throw new Error('[SUPPORT] DB error: ' + insertErr.message);

    // STEP 9 — Post-save async actions
    let aiResponseDraft = null;
    if (!classification.is_spam) {
      try {
        const aiRes = await generateAIResponse(saved);
        aiResponseDraft = aiRes?.response_text || null;
      } catch (aiErr) {
        console.error('[SUPPORT] generateAIResponse failed:', aiErr.message);
      }
      if (classification.category === 'bug_report') {
        createBugReport(saved).catch(e =>
          console.error('[SUPPORT] createBugReport failed:', e.message)
        );
      }
      if (classification.category === 'feature_request') {
        createFeatureRequest(saved).catch(e =>
          console.error('[SUPPORT] createFeatureRequest failed:', e.message)
        );
      }
    }

    // STEP 10 — Log
    console.log('[SUPPORT] New ticket:', saved.ticket_number, '|', saved.category);

    // STEP 11 — Return
    const resolutionMap = {
      critical: 'within 2 hours',
      high:     'within 8 hours',
      medium:   'within 24 hours',
      low:      'within 3 days',
    };
    return {
      ticket_id:            saved.id,
      ticket_number:        saved.ticket_number,
      category:             saved.category,
      priority:             saved.priority,
      sla_deadline:         saved.sla_deadline,
      ai_response_draft:    aiResponseDraft,
      estimated_resolution: resolutionMap[saved.priority] || 'within 3 days',
    };
  } catch (err) {
    console.error('[SUPPORT] createTicket error:', err.message);
    throw err;
  }
}

// ── 2. generateAIResponse ─────────────────────────────────────────────────────

async function generateAIResponse(ticket) {
  try {
    // STEP 1 — Fetch relevant KB articles
    let kbQuery = supabase
      .from('knowledge_base')
      .select('title, content')
      .in('category', ['how_to', 'troubleshooting', 'faq'])
      .eq('status', 'published')
      .limit(3);

    if (ticket.tool_id) {
      kbQuery = kbQuery.or(`tool_id.eq.${ticket.tool_id},tool_id.is.null`);
    } else {
      kbQuery = kbQuery.is('tool_id', null);
    }

    const { data: kbArticles } = await kbQuery;
    const kb = kbArticles || [];

    // STEP 2 — Call AI
    const kbSection = kb.length > 0
      ? kb.map(a => `${a.title}: ${(a.content || '').slice(0, 200)}`).join('\n')
      : 'No relevant articles found.';

    const descLower = (ticket.description || '').toLowerCase();
    const prompt = `You are AWE-OS customer support AI.
Write a helpful, empathetic response.

Ticket: ${ticket.ticket_number}
User: ${ticket.user_email} | Premium: ${ticket.is_premium}
Category: ${ticket.category} | Priority: ${ticket.priority}
Sentiment: ${ticket.sentiment} (score: ${ticket.sentiment_score})
Subject: ${ticket.subject}
Description: ${ticket.description}
Tool: ${ticket.tool_name || 'AWE-OS'}

Relevant KB Articles:
${kbSection}

Rules:
- Friendly, professional, empathetic tone
- If sentiment=angry → acknowledge frustration first
- If is_premium=true → mention priority support
- If category=bug_report → acknowledge + give workaround if known
- If category=billing_issue → be careful, say team will review
- If category=how_to_question → give step-by-step answer
- End with next steps + offer further help
- Max 200 words
- Never promise specific fix dates
- Never share other users data

Return ONLY valid JSON:
{
  "response_text": string,
  "confidence": number (0-100),
  "needs_human_review": boolean,
  "review_reason": string|null,
  "suggested_actions": string[],
  "internal_notes": string
}

needs_human_review = true IF:
- category = "billing_issue"
- confidence < 60
- sentiment = "angry"
- description contains: "refund"|"lawyer"|"fraud"|"complaint"`;

    const raw = await callOpenAI(prompt, { temperature: 0.7 });

    // STEP 3 — Parse response
    const response = parseJSONResponse(raw) || {
      response_text:      'Thank you for contacting AWE-OS support. Our team will review your request and get back to you shortly.',
      confidence:         0,
      needs_human_review: true,
      review_reason:      'AI response generation failed',
      suggested_actions:  [],
      internal_notes:     'AI failed to generate response — needs manual reply',
    };

    // Enforce needs_human_review rules
    const forceReview = (
      ticket.category === 'billing_issue' ||
      (response.confidence || 0) < 60      ||
      ticket.sentiment === 'angry'          ||
      ['refund', 'lawyer', 'fraud', 'complaint'].some(kw => descLower.includes(kw))
    );
    if (forceReview) response.needs_human_review = true;

    // STEP 4 — INSERT to ticket_messages
    const { error: msgErr } = await supabase.from('ticket_messages').insert({
      ticket_id:    ticket.id,
      sender_type:  'ai',
      ai_generated: true,
      ai_approved:  false,
      message:      response.response_text,
    });
    if (msgErr) throw new Error('[SUPPORT] DB error: ' + msgErr.message);

    // STEP 5 — UPDATE support_tickets
    const { error: updErr } = await supabase
      .from('support_tickets')
      .update({
        ai_response:   response.response_text,
        ai_confidence: response.confidence,
      })
      .eq('id', ticket.id);
    if (updErr) throw new Error('[SUPPORT] DB error: ' + updErr.message);

    // STEP 6 — Log
    console.log('[SUPPORT] AI response confidence:', (response.confidence || 0) + '%');

    return response;
  } catch (err) {
    console.error('[SUPPORT] generateAIResponse error:', err.message);
    throw err;
  }
}

// ── 3. approveAndSendResponse ─────────────────────────────────────────────────

async function approveAndSendResponse(ticket_id, approved_text, agent_email) {
  try {
    // STEP 1 — Fetch ticket
    const { data: ticket, error: fetchErr } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticket_id)
      .single();

    if (fetchErr || !ticket) throw new Error('[SUPPORT] DB error: Ticket not found');
    if (['resolved', 'closed'].includes(ticket.status)) {
      throw new Error('Ticket is already ' + ticket.status);
    }

    // STEP 2 — INSERT approved message
    const { error: msgErr } = await supabase.from('ticket_messages').insert({
      ticket_id:    ticket_id,
      sender_type:  'ai',
      ai_generated: true,
      ai_approved:  true,
      sender_email: agent_email,
      message:      approved_text,
    });
    if (msgErr) throw new Error('[SUPPORT] DB error: ' + msgErr.message);

    // STEP 3 — Email the customer. Best-effort: a failed send must not
    // undo the approval that already happened — it's surfaced via
    // email_sent on the return value instead so the admin UI can retry.
    let email_sent = false;
    try {
      await sendEmail({
        to:      ticket.user_email,
        subject: `Re: ${ticket.subject} [${ticket.ticket_number}]`,
        html:    buildTicketReplyHtml(ticket, approved_text),
      });
      email_sent = true;
    } catch (emailErr) {
      console.error(`[SUPPORT] Reply email failed | ticket=${ticket.ticket_number}:`, emailErr.message);
    }

    // STEP 4+5 — UPDATE ticket status (combine both steps into one write)
    const newStatus = (ticket.category === 'how_to_question' && ticket.ai_confidence > 80)
      ? 'waiting_user'
      : 'ai_responded';

    const { data: updated, error: updErr } = await supabase
      .from('support_tickets')
      .update({
        status:            newStatus,
        first_response_at: new Date().toISOString(),
        ai_response_sent:  email_sent,
      })
      .eq('id', ticket_id)
      .select()
      .single();

    if (updErr) throw new Error('[SUPPORT] DB error: ' + updErr.message);
    return { ...updated, email_sent };
  } catch (err) {
    console.error('[SUPPORT] approveAndSendResponse error:', err.message);
    throw err;
  }
}

// ── 4. resolveTicket ──────────────────────────────────────────────────────────

async function resolveTicket(ticket_id, resolution_notes, resolved_by) {
  try {
    // STEP 1 — Fetch ticket
    const { data: ticket, error: fetchErr } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticket_id)
      .single();

    if (fetchErr || !ticket) throw new Error('[SUPPORT] DB error: Ticket not found');

    // STEP 2 — Calculate resolution time
    const resolutionTimeHours = hoursBetween(ticket.created_at, new Date().toISOString());

    // STEP 3 — Check SLA breach
    const slaBreached = !!(ticket.sla_deadline && new Date() > new Date(ticket.sla_deadline));
    if (slaBreached) {
      console.log('[SUPPORT] SLA breach:', ticket.ticket_number);
    }

    // STEP 4 — UPDATE ticket
    const { data: resolved, error: updErr } = await supabase
      .from('support_tickets')
      .update({
        status:                'resolved',
        resolved_at:           new Date().toISOString(),
        resolution_time_hours: resolutionTimeHours,
        resolution_notes,
        resolved_by,
        sla_breached:          slaBreached,
      })
      .eq('id', ticket_id)
      .select()
      .single();

    if (updErr) throw new Error('[SUPPORT] DB error: ' + updErr.message);

    // STEP 5 — INSERT survey (trigger for user to fill in)
    const { error: surveyErr } = await supabase.from('support_surveys').insert({
      ticket_id,
      user_email: ticket.user_email,
    });
    if (surveyErr) console.error('[SUPPORT] Survey insert error:', surveyErr.message);

    return resolved;
  } catch (err) {
    console.error('[SUPPORT] resolveTicket error:', err.message);
    throw err;
  }
}

// ── 5. createBugReport ────────────────────────────────────────────────────────

async function createBugReport(ticket) {
  try {
    const keywords = extractKeywords(ticket.subject);

    // STEP 1 — Check for similar bug
    let similar = null;
    if (keywords.length > 0) {
      try {
        let bugQuery = supabase
          .from('bug_reports')
          .select('*')
          .not('status', 'in', '(fixed,wont_fix)')
          .or(keywords.map(k => `bug_title.ilike.%${k}%`).join(','))
          .limit(1);

        if (ticket.tool_id) bugQuery = bugQuery.eq('tool_id', ticket.tool_id);

        const { data: bugs } = await bugQuery;
        similar = bugs?.[0] || null;
      } catch (simErr) {
        console.error('[SUPPORT] Similar bug check error:', simErr.message);
      }
    }

    // STEP 2 — Similar found: increment counts and return
    if (similar) {
      const { data: updated, error: updErr } = await supabase
        .from('bug_reports')
        .update({
          report_count:   similar.report_count   + 1,
          affected_users: similar.affected_users + 1,
        })
        .eq('id', similar.id)
        .select()
        .single();

      if (updErr) throw new Error('[SUPPORT] DB error: ' + updErr.message);
      return updated;
    }

    // STEP 3 — AI extraction for new bug
    const defaultBug = {
      bug_title:          ticket.subject,
      bug_description:    ticket.description,
      severity:           'minor',
      affected_feature:   null,
      steps_to_reproduce: null,
      expected_behavior:  null,
      actual_behavior:    null,
    };
    let bugDetails = { ...defaultBug };

    try {
      const prompt = `Extract bug details from this ticket.
Subject: ${ticket.subject}
Description: ${ticket.description}

Return ONLY valid JSON:
{
  "bug_title": string,
  "bug_description": string,
  "severity": "critical"|"major"|"minor"|"cosmetic",
  "affected_feature": string,
  "steps_to_reproduce": string,
  "expected_behavior": string,
  "actual_behavior": string
}`;

      const raw    = await callOpenAI(prompt, { temperature: 0.2 });
      const parsed = parseJSONResponse(raw);
      if (parsed) bugDetails = { ...defaultBug, ...parsed };
    } catch (aiErr) {
      console.error('[SUPPORT] Bug AI extraction failed:', aiErr.message);
    }

    // STEP 4 — INSERT
    const { data: saved, error: insertErr } = await supabase
      .from('bug_reports')
      .insert({
        ticket_id:          ticket.id,
        tool_id:            ticket.tool_id   || null,
        tool_name:          ticket.tool_name || null,
        bug_title:          bugDetails.bug_title,
        bug_description:    bugDetails.bug_description,
        severity:           bugDetails.severity           || 'minor',
        affected_feature:   bugDetails.affected_feature   || null,
        steps_to_reproduce: bugDetails.steps_to_reproduce || null,
        expected_behavior:  bugDetails.expected_behavior  || null,
        actual_behavior:    bugDetails.actual_behavior    || null,
      })
      .select()
      .single();

    if (insertErr) throw new Error('[SUPPORT] DB error: ' + insertErr.message);
    return saved;
  } catch (err) {
    console.error('[SUPPORT] createBugReport error:', err.message);
    throw err;
  }
}

// ── 6. createFeatureRequest ───────────────────────────────────────────────────

async function createFeatureRequest(ticket) {
  try {
    const keywords = extractKeywords(ticket.subject);

    // STEP 1 — Check for similar request
    let existing = null;
    if (keywords.length > 0) {
      try {
        let frQuery = supabase
          .from('feature_requests')
          .select('*')
          .not('status', 'in', '(completed,declined)')
          .or(keywords.map(k => `feature_title.ilike.%${k}%`).join(','))
          .limit(1);

        if (ticket.tool_id) frQuery = frQuery.eq('tool_id', ticket.tool_id);

        const { data: features } = await frQuery;
        existing = features?.[0] || null;
      } catch (simErr) {
        console.error('[SUPPORT] Similar feature check error:', simErr.message);
      }
    }

    // STEP 2 — Existing: increment vote and return
    if (existing) {
      const voterEmails = Array.isArray(existing.voter_emails) ? [...existing.voter_emails] : [];
      if (!voterEmails.includes(ticket.user_email)) {
        voterEmails.push(ticket.user_email);
      }
      const newVoteCount     = existing.vote_count + 1;
      const newPriorityScore = (newVoteCount * 2) + (existing.impact_score || 0) - (existing.feasibility_score || 0);

      const { data: updated, error: updErr } = await supabase
        .from('feature_requests')
        .update({
          vote_count:     newVoteCount,
          voter_emails:   voterEmails,
          priority_score: newPriorityScore,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updErr) throw new Error('[SUPPORT] DB error: ' + updErr.message);
      return updated;
    }

    // STEP 3 — AI scoring for new request
    const defaultFeat = {
      feature_title:       ticket.subject,
      feature_description: ticket.description,
      category:            'new_feature',
      feasibility_score:   50,
      impact_score:        50,
    };
    let featureDetails = { ...defaultFeat };

    try {
      const prompt = `Score this feature request.
Feature: ${ticket.subject}
Description: ${ticket.description}

Return ONLY valid JSON:
{
  "feature_title": string,
  "feature_description": string,
  "category": "new_feature"|"improvement"|"integration"|"performance"|"ui_ux",
  "feasibility_score": number (0-100, higher=easier),
  "impact_score": number (0-100, higher=more impact)
}`;

      const raw    = await callOpenAI(prompt, { temperature: 0.3 });
      const parsed = parseJSONResponse(raw);
      if (parsed) featureDetails = { ...defaultFeat, ...parsed };
    } catch (aiErr) {
      console.error('[SUPPORT] Feature AI scoring failed:', aiErr.message);
    }

    // STEP 4 — priority_score (vote_count = 1 for new)
    const priorityScore = (1 * 2) + (featureDetails.impact_score || 50) - (featureDetails.feasibility_score || 50);

    // STEP 5 — INSERT
    const { data: saved, error: insertErr } = await supabase
      .from('feature_requests')
      .insert({
        ticket_id:           ticket.id,
        tool_id:             ticket.tool_id   || null,
        tool_name:           ticket.tool_name || null,
        feature_title:       featureDetails.feature_title,
        feature_description: featureDetails.feature_description,
        category:            featureDetails.category        || 'new_feature',
        feasibility_score:   featureDetails.feasibility_score,
        impact_score:        featureDetails.impact_score,
        priority_score:      priorityScore,
        voter_emails:        [ticket.user_email],
        vote_count:          1,
      })
      .select()
      .single();

    if (insertErr) throw new Error('[SUPPORT] DB error: ' + insertErr.message);
    return saved;
  } catch (err) {
    console.error('[SUPPORT] createFeatureRequest error:', err.message);
    throw err;
  }
}

// ── 7. generateKnowledgeBaseArticle ──────────────────────────────────────────

async function generateKnowledgeBaseArticle(category, tool_id) {
  try {
    // STEP 1 — Fetch resolved tickets
    let query = supabase
      .from('support_tickets')
      .select('id, subject, description, resolution_notes')
      .eq('category', category)
      .eq('status', 'resolved')
      .not('resolution_notes', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (tool_id) query = query.eq('tool_id', tool_id);

    const { data: tickets } = await query;

    // STEP 2 — Not enough data
    if (!tickets || tickets.length < 3) return null;

    // Resolve tool name
    let toolName = 'AWE-OS';
    if (tool_id) {
      try {
        const { data: tool } = await supabase
          .from('tools').select('name').eq('id', tool_id).single();
        toolName = tool?.name || 'AWE-OS';
      } catch (_) {}
    }

    // STEP 3 — Call AI
    const ticketsSummary = tickets
      .map(t => `Q: ${t.subject}\nA: ${t.resolution_notes}`)
      .join('\n---\n');

    const prompt = `You are a technical writer for AWE-OS.
Write a knowledge base article based on ${tickets.length} resolved support tickets.

Tickets summary:
${ticketsSummary}

Category: ${category}
Tool: ${toolName}

Return ONLY valid JSON:
{
  "title": string,
  "slug": string (url-safe),
  "content": string (full markdown),
  "meta_description": string (max 160 chars),
  "tags": string[],
  "category": string
}`;

    const raw     = await callOpenAI(prompt, { temperature: 0.6 });
    const article = parseJSONResponse(raw);

    if (!article || !article.title) {
      console.error('[SUPPORT] KB article AI response invalid');
      return null;
    }

    // STEP 4 — INSERT
    const { data: saved, error: insertErr } = await supabase
      .from('knowledge_base')
      .insert({
        tool_id:          tool_id   || null,
        tool_name:        tool_id   ? toolName : null,
        title:            article.title,
        slug:             article.slug,
        content:          article.content,
        category:         article.category       || category,
        meta_description: article.meta_description || null,
        tags:             article.tags            || [],
        ai_generated:     true,
        based_on_tickets: tickets.map(t => t.id),
        status:           'draft',
      })
      .select()
      .single();

    if (insertErr) throw new Error('[SUPPORT] DB error: ' + insertErr.message);

    // STEP 5 — Log
    console.log('[SUPPORT] KB article generated:', article.title);

    return saved;
  } catch (err) {
    console.error('[SUPPORT] generateKnowledgeBaseArticle error:', err.message);
    throw err;
  }
}

// ── 8. calculateSupportAnalytics ─────────────────────────────────────────────

async function calculateSupportAnalytics() {
  try {
    const today          = new Date().toISOString().split('T')[0];
    const { start, end } = todayRange();

    const [
      openedRes,
      resolvedRes,
      pendingRes,
      responseTimeRes,
      resolutionTimeRes,
      csatRes,
      slaBreachRes,
      categoryRes,
      aiResolvedRes,
    ] = await Promise.all([
      // a) tickets_opened today
      supabase.from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', start).lte('created_at', end),
      // b) tickets_resolved today
      supabase.from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .gte('resolved_at', start).lte('resolved_at', end),
      // c) tickets_pending
      supabase.from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .not('status', 'in', '(resolved,closed,spam)'),
      // d) first response times today
      supabase.from('support_tickets')
        .select('first_response_at, created_at')
        .not('first_response_at', 'is', null)
        .gte('created_at', start).lte('created_at', end),
      // e) resolution_time data today
      supabase.from('support_tickets')
        .select('resolution_time_hours')
        .not('resolution_time_hours', 'is', null)
        .gte('resolved_at', start).lte('resolved_at', end),
      // f) csat scores today
      supabase.from('support_surveys')
        .select('csat_score')
        .not('csat_score', 'is', null)
        .gte('submitted_at', start).lte('submitted_at', end),
      // g) sla breaches today
      supabase.from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('sla_breached', true)
        .gte('created_at', start).lte('created_at', end),
      // h) category breakdown today
      supabase.from('support_tickets')
        .select('category')
        .gte('created_at', start).lte('created_at', end),
      // i) ai-resolved today
      supabase.from('support_tickets')
        .select('resolved_by')
        .in('resolved_by', ['ai_auto', 'ai_assisted'])
        .gte('resolved_at', start).lte('resolved_at', end),
    ]);

    const ticketsOpened   = openedRes.count   || 0;
    const ticketsResolved = resolvedRes.count  || 0;
    const ticketsPending  = pendingRes.count   || 0;
    const slaBreachCount  = slaBreachRes.count || 0;

    const responseTimeData = responseTimeRes.data || [];
    const avgFirstResponseHours = responseTimeData.length > 0
      ? parseFloat((
          responseTimeData.reduce((s, t) => s + hoursBetween(t.created_at, t.first_response_at), 0)
          / responseTimeData.length
        ).toFixed(2))
      : null;

    const resolutionTimeData = resolutionTimeRes.data || [];
    const avgResolutionHours = resolutionTimeData.length > 0
      ? parseFloat((
          resolutionTimeData.reduce((s, t) => s + parseFloat(t.resolution_time_hours || 0), 0)
          / resolutionTimeData.length
        ).toFixed(2))
      : null;

    const csatData = csatRes.data || [];
    const avgCsatScore = csatData.length > 0
      ? parseFloat((csatData.reduce((s, r) => s + r.csat_score, 0) / csatData.length).toFixed(2))
      : null;

    const byCategory = (categoryRes.data || []).reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1;
      return acc;
    }, {});

    const aiResolvedCount  = aiResolvedRes.data?.length || 0;
    const aiResolutionRate = ticketsResolved > 0
      ? parseFloat(((aiResolvedCount / ticketsResolved) * 100).toFixed(2))
      : null;

    const payload = {
      period_date:              today,
      tickets_opened:           ticketsOpened,
      tickets_resolved:         ticketsResolved,
      tickets_pending:          ticketsPending,
      avg_first_response_hours: avgFirstResponseHours,
      avg_resolution_hours:     avgResolutionHours,
      avg_csat_score:           avgCsatScore,
      sla_breach_count:         slaBreachCount,
      by_category:              byCategory,
      ai_resolution_rate:       aiResolutionRate,
    };

    const { data: saved, error: upsertErr } = await supabase
      .from('support_analytics')
      .upsert(payload, { onConflict: 'period_date' })
      .select()
      .single();

    if (upsertErr) throw new Error('[SUPPORT] DB error: ' + upsertErr.message);
    return saved;
  } catch (err) {
    console.error('[SUPPORT] calculateSupportAnalytics error:', err.message);
    throw err;
  }
}

// ── 9. getSupportDashboard ────────────────────────────────────────────────────

async function getSupportDashboard() {
  try {
    const now             = new Date();
    const slaAtRiskTime   = new Date(now.getTime() + 2 * 3600000).toISOString();
    const thirtyDaysAgo   = new Date(now.getTime() - 30 * 24 * 3600000).toISOString();
    const sevenDaysAgoStr = new Date(now.getTime() -  7 * 24 * 3600000).toISOString().split('T')[0];

    const [
      openCountRes,
      criticalCountRes,
      slaRiskRes,
      analyticsRes,
      surveysRes,
      openBugsRes,
      criticalBugsRes,
      topBugsRes,
      submittedFeatRes,
      topFeatRes,
      plannedFeatRes,
      kbTotalRes,
      kbDraftRes,
      kbHelpfulRes,
      aiConfRes,
      aiAnalyticsRes,
      recentTicketsRes,
      criticalOpenRes,
    ] = await Promise.all([
      // a) Open ticket counts
      supabase.from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .not('status', 'in', '(resolved,closed,spam)'),
      supabase.from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('priority', 'critical')
        .not('status', 'in', '(resolved,closed,spam)'),
      supabase.from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .lt('sla_deadline', slaAtRiskTime)
        .not('status', 'in', '(resolved,closed,spam)'),
      // b) Analytics last 7 days
      supabase.from('support_analytics')
        .select('avg_first_response_hours, avg_resolution_hours, avg_csat_score')
        .gte('period_date', sevenDaysAgoStr),
      // c) Surveys last 30 days
      supabase.from('support_surveys')
        .select('csat_score, nps_score')
        .gte('submitted_at', thirtyDaysAgo),
      // d) Bugs
      supabase.from('bug_reports')
        .select('*', { count: 'exact', head: true })
        .not('status', 'in', '(fixed,wont_fix,duplicate)'),
      supabase.from('bug_reports')
        .select('*', { count: 'exact', head: true })
        .eq('severity', 'critical')
        .not('status', 'in', '(fixed,wont_fix,duplicate)'),
      supabase.from('bug_reports')
        .select('id, bug_title, report_count, severity, status')
        .not('status', 'in', '(fixed,wont_fix,duplicate)')
        .order('report_count', { ascending: false })
        .limit(5),
      // e) Features
      supabase.from('feature_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted'),
      supabase.from('feature_requests')
        .select('id, feature_title, vote_count, status, category')
        .not('status', 'in', '(completed,declined)')
        .order('vote_count', { ascending: false })
        .limit(5),
      supabase.from('feature_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'planned'),
      // f) KB
      supabase.from('knowledge_base')
        .select('*', { count: 'exact', head: true }),
      supabase.from('knowledge_base')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'draft'),
      supabase.from('knowledge_base')
        .select('helpfulness_rate'),
      // g) AI performance
      supabase.from('support_tickets')
        .select('ai_confidence')
        .not('ai_confidence', 'is', null)
        .limit(100),
      supabase.from('support_analytics')
        .select('ai_resolution_rate')
        .gte('period_date', sevenDaysAgoStr)
        .not('ai_resolution_rate', 'is', null),
      // h) Recent tickets
      supabase.from('support_tickets')
        .select('id, ticket_number, subject, category, priority, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      // i) Unresolved critical
      supabase.from('support_tickets')
        .select('id, ticket_number, subject, priority, status, sla_deadline, created_at, user_email')
        .eq('priority', 'critical')
        .not('status', 'in', '(resolved,closed,spam)'),
    ]);

    // b) Avg response metrics over last 7 days
    const analyticsRows = analyticsRes.data || [];
    const avgMetrics = analyticsRows.length > 0
      ? {
          avg_first_response_hours: parseFloat((analyticsRows.reduce((s, a) => s + (a.avg_first_response_hours || 0), 0) / analyticsRows.length).toFixed(2)),
          avg_resolution_hours:     parseFloat((analyticsRows.reduce((s, a) => s + (a.avg_resolution_hours     || 0), 0) / analyticsRows.length).toFixed(2)),
          avg_csat_score:           parseFloat((analyticsRows.reduce((s, a) => s + (a.avg_csat_score           || 0), 0) / analyticsRows.length).toFixed(2)),
        }
      : { avg_first_response_hours: null, avg_resolution_hours: null, avg_csat_score: null };

    // c) CSAT + NPS
    const surveys   = surveysRes.data || [];
    const validCsat = surveys.filter(s => s.csat_score != null);
    const validNps  = surveys.filter(s => s.nps_score  != null);
    const avgCsat = validCsat.length > 0
      ? parseFloat((validCsat.reduce((s, r) => s + r.csat_score, 0) / validCsat.length).toFixed(2))
      : null;
    const avgNps = validNps.length > 0
      ? parseFloat((validNps.reduce((s, r) => s + r.nps_score, 0) / validNps.length).toFixed(2))
      : null;

    // f) KB helpfulness average
    const kbRows = kbHelpfulRes.data || [];
    const avgHelpfulness = kbRows.length > 0
      ? parseFloat((kbRows.reduce((s, k) => s + (k.helpfulness_rate || 0), 0) / kbRows.length).toFixed(2))
      : 0;

    // g) AI confidence + resolution rate
    const confData = aiConfRes.data || [];
    const avgAiConfidence = confData.length > 0
      ? parseFloat((confData.reduce((s, t) => s + (t.ai_confidence || 0), 0) / confData.length).toFixed(2))
      : null;

    const aiRateData = aiAnalyticsRes.data || [];
    const avgAiResolutionRate = aiRateData.length > 0
      ? parseFloat((aiRateData.reduce((s, a) => s + (a.ai_resolution_rate || 0), 0) / aiRateData.length).toFixed(2))
      : null;

    return {
      open_tickets: {
        total:       openCountRes.count     || 0,
        critical:    criticalCountRes.count || 0,
        sla_at_risk: slaRiskRes.count       || 0,
      },
      response_metrics: avgMetrics,
      csat: {
        avg_score:     avgCsat,
        total_surveys: surveys.length,
        avg_nps:       avgNps,
      },
      bugs: {
        open_count:     openBugsRes.count     || 0,
        critical_count: criticalBugsRes.count || 0,
        top_bugs:       topBugsRes.data       || [],
      },
      features: {
        submitted_count: submittedFeatRes.count || 0,
        top_requests:    topFeatRes.data        || [],
        planned_count:   plannedFeatRes.count   || 0,
      },
      knowledge_base: {
        total_articles:    kbTotalRes.count || 0,
        avg_helpfulness:   avgHelpfulness,
        drafts_for_review: kbDraftRes.count || 0,
      },
      ai_performance: {
        avg_confidence:  avgAiConfidence,
        resolution_rate: avgAiResolutionRate,
      },
      recent_tickets:      recentTicketsRes.data || [],
      unresolved_critical: criticalOpenRes.data  || [],
    };
  } catch (err) {
    console.error('[SUPPORT] getSupportDashboard error:', err.message);
    throw new Error('[SUPPORT] DB error: ' + err.message);
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  createTicket,
  generateAIResponse,
  approveAndSendResponse,
  resolveTicket,
  createBugReport,
  createFeatureRequest,
  generateKnowledgeBaseArticle,
  calculateSupportAnalytics,
  getSupportDashboard,
};
