'use strict';

const supabase = require('../db/supabase');
const { callOpenAI } = require('../services/ai.service');
const {
  createTicket,
  generateAIResponse,
  approveAndSendResponse,
  resolveTicket,
  generateKnowledgeBaseArticle,
  calculateSupportAnalytics,
  getSupportDashboard,
} = require('../agents/support-agent');

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_TICKET_STATUSES = ['open','ai_responded','waiting_user','in_progress','resolved','closed','spam'];
const VALID_PRIORITIES      = ['critical','high','medium','low'];
const VALID_TICKET_CATS     = ['bug_report','feature_request','billing_issue','how_to_question',
                               'account_issue','performance_issue','compliment','other'];
const VALID_BUG_STATUSES    = ['new','confirmed','in_progress','fixed','wont_fix','duplicate'];
const VALID_FEAT_STATUSES   = ['submitted','under_review','planned','in_progress','completed','declined'];
const VALID_KB_CATEGORIES   = ['getting_started','how_to','troubleshooting','billing','faq','best_practices'];
const PRIORITY_RANK         = { critical: 0, high: 1, medium: 2, low: 3 };

// ── submitTicket ──────────────────────────────────────────────────────────────

async function submitTicket(req, res) {
  try {
    const { user_email, user_name, subject, description, tool_id } = req.body;

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!user_email || !emailRe.test(user_email)) {
      return res.status(400).json({ error: 'A valid user_email is required' });
    }

    const result = await createTicket({ user_email, user_name, subject, description, tool_id });
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error('[SUPPORT CTRL] submitTicket error:', err.message);
    if (err.field) return res.status(400).json({ error: err.message, field: err.field });
    return res.status(500).json({ error: err.message });
  }
}

// ── getDashboard ──────────────────────────────────────────────────────────────

async function getDashboard(req, res) {
  try {
    const result = await getSupportDashboard();
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[SUPPORT CTRL] getDashboard error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ── getTickets ────────────────────────────────────────────────────────────────

async function getTickets(req, res) {
  try {
    const limit    = Math.min(parseInt(req.query.limit) || 20, 100);
    const page     = Math.max(parseInt(req.query.page)  || 1, 1);
    const offset   = (page - 1) * limit;
    const { status, priority, category } = req.query;

    let query = supabase
      .from('support_tickets')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status   && VALID_TICKET_STATUSES.includes(status))   query = query.eq('status',   status);
    if (priority && VALID_PRIORITIES.includes(priority))       query = query.eq('priority', priority);
    if (category && VALID_TICKET_CATS.includes(category))      query = query.eq('category', category);

    const { data: tickets, error, count } = await query;
    if (error) throw new Error('[SUPPORT] DB error: ' + error.message);

    // Sort fetched page by priority rank, then created_at DESC
    const sorted = (tickets || []).sort((a, b) => {
      const pa = PRIORITY_RANK[a.priority] ?? 4;
      const pb = PRIORITY_RANK[b.priority] ?? 4;
      if (pa !== pb) return pa - pb;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return res.json({ success: true, data: sorted, count: count || 0, page, limit });
  } catch (err) {
    console.error('[SUPPORT CTRL] getTickets error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ── getTicket ─────────────────────────────────────────────────────────────────

async function getTicket(req, res) {
  try {
    const { id } = req.params;

    const [ticketRes, messagesRes, bugsRes, featuresRes] = await Promise.all([
      supabase.from('support_tickets').select('*').eq('id', id).single(),
      supabase.from('ticket_messages').select('*').eq('ticket_id', id).order('created_at', { ascending: true }),
      supabase.from('bug_reports').select('*').eq('ticket_id', id).limit(1).maybeSingle(),
      supabase.from('feature_requests').select('*').eq('ticket_id', id).limit(1).maybeSingle(),
    ]);

    if (ticketRes.error || !ticketRes.data) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    return res.json({
      success: true,
      data: {
        ticket:   ticketRes.data,
        messages: messagesRes.data || [],
        bug:      bugsRes.data     || null,
        feature:  featuresRes.data || null,
      },
    });
  } catch (err) {
    console.error('[SUPPORT CTRL] getTicket error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ── replyTicket ───────────────────────────────────────────────────────────────

async function replyTicket(req, res) {
  try {
    const { id } = req.params;
    const { message, is_internal = false, approve_ai = false } = req.body;

    if (!message || message.trim().length < 5) {
      return res.status(400).json({ error: 'Message must be at least 5 characters' });
    }

    if (approve_ai) {
      const result = await approveAndSendResponse(id, message.trim(), req.user?.email);
      return res.json({ success: true, data: result, action: 'ai_approved' });
    }

    // Fetch ticket to verify it exists and check first_response_at
    const { data: ticket, error: fetchErr } = await supabase
      .from('support_tickets')
      .select('id, first_response_at')
      .eq('id', id)
      .single();

    if (fetchErr || !ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // INSERT message
    const { data: savedMsg, error: msgErr } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id:    id,
        sender_type:  'human_agent',
        sender_email: req.user?.email || null,
        message:      message.trim(),
        is_internal:  !!is_internal,
      })
      .select()
      .single();

    if (msgErr) throw new Error('[SUPPORT] DB error: ' + msgErr.message);

    // UPDATE ticket
    const updatePayload = { updated_at: new Date().toISOString() };
    if (!is_internal) updatePayload.status = 'in_progress';
    if (!ticket.first_response_at) updatePayload.first_response_at = new Date().toISOString();

    const { error: updErr } = await supabase
      .from('support_tickets')
      .update(updatePayload)
      .eq('id', id);

    if (updErr) console.error('[SUPPORT CTRL] ticket update error:', updErr.message);

    return res.json({ success: true, data: savedMsg });
  } catch (err) {
    console.error('[SUPPORT CTRL] replyTicket error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ── resolveTicketCtrl ─────────────────────────────────────────────────────────

async function resolveTicketCtrl(req, res) {
  try {
    const { id } = req.params;
    const { resolution_notes } = req.body;

    if (!resolution_notes || resolution_notes.trim().length < 10) {
      return res.status(400).json({ error: 'resolution_notes must be at least 10 characters' });
    }

    const result = await resolveTicket(id, resolution_notes.trim(), req.user?.email || 'human');
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[SUPPORT CTRL] resolveTicketCtrl error:', err.message);
    if (err.message.includes('not found')) return res.status(404).json({ error: err.message });
    return res.status(500).json({ error: err.message });
  }
}

// ── getBugs ───────────────────────────────────────────────────────────────────

async function getBugs(req, res) {
  try {
    const { status, severity, tool_id } = req.query;

    let query = supabase
      .from('bug_reports')
      .select('*')
      .order('report_count', { ascending: false })
      .order('created_at',   { ascending: false })
      .limit(50);

    if (status   && VALID_BUG_STATUSES.includes(status))     query = query.eq('status',   status);
    if (severity && ['critical','major','minor','cosmetic'].includes(severity))
                                                              query = query.eq('severity', severity);
    if (tool_id)                                              query = query.eq('tool_id',  tool_id);

    const { data: bugs, error } = await query;
    if (error) throw new Error('[SUPPORT] DB error: ' + error.message);

    return res.json({ success: true, data: bugs || [] });
  } catch (err) {
    console.error('[SUPPORT CTRL] getBugs error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ── updateBug ─────────────────────────────────────────────────────────────────

async function updateBug(req, res) {
  try {
    const { id } = req.params;
    const { status, fixed_in_version } = req.body;

    if (status && !VALID_BUG_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `status must be one of: ${VALID_BUG_STATUSES.join(', ')}`,
      });
    }

    const updatePayload = { updated_at: new Date().toISOString() };
    if (status)            updatePayload.status           = status;
    if (fixed_in_version)  updatePayload.fixed_in_version = fixed_in_version;

    const { data: updated, error } = await supabase
      .from('bug_reports')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error('[SUPPORT] DB error: ' + error.message);
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[SUPPORT CTRL] updateBug error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ── getFeatures ───────────────────────────────────────────────────────────────

async function getFeatures(req, res) {
  try {
    const { status, sort, tool_id } = req.query;

    let query = supabase
      .from('feature_requests')
      .select('*')
      .limit(50);

    if (status  && VALID_FEAT_STATUSES.includes(status)) query = query.eq('status',  status);
    if (tool_id)                                          query = query.eq('tool_id', tool_id);

    if (sort === 'votes') {
      query = query.order('vote_count',     { ascending: false });
    } else if (sort === 'priority') {
      query = query.order('priority_score', { ascending: false });
    } else {
      query = query.order('created_at',     { ascending: false });
    }

    const { data: features, error } = await query;
    if (error) throw new Error('[SUPPORT] DB error: ' + error.message);

    return res.json({ success: true, data: features || [] });
  } catch (err) {
    console.error('[SUPPORT CTRL] getFeatures error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ── updateFeature ─────────────────────────────────────────────────────────────

async function updateFeature(req, res) {
  try {
    const { id } = req.params;
    const { status, planned_for } = req.body;

    if (status && !VALID_FEAT_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `status must be one of: ${VALID_FEAT_STATUSES.join(', ')}`,
      });
    }

    const updatePayload = {};
    if (status)       updatePayload.status      = status;
    if (planned_for)  updatePayload.planned_for = planned_for;

    const { data: updated, error } = await supabase
      .from('feature_requests')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error('[SUPPORT] DB error: ' + error.message);
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('[SUPPORT CTRL] updateFeature error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ── getKnowledgeBase ──────────────────────────────────────────────────────────

async function getKnowledgeBase(req, res) {
  try {
    const { category, tool_id } = req.query;

    let query = supabase
      .from('knowledge_base')
      .select('*')
      .eq('status', 'published')
      .order('view_count', { ascending: false });

    if (category && VALID_KB_CATEGORIES.includes(category)) query = query.eq('category', category);
    if (tool_id)                                             query = query.eq('tool_id',  tool_id);

    const { data: articles, error } = await query;
    if (error) throw new Error('[SUPPORT] DB error: ' + error.message);

    return res.json({ success: true, data: articles || [] });
  } catch (err) {
    console.error('[SUPPORT CTRL] getKnowledgeBase error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ── getKBArticle ──────────────────────────────────────────────────────────────

async function getKBArticle(req, res) {
  try {
    const { slug } = req.params;

    const { data: article, error } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('slug',   slug)
      .eq('status', 'published')
      .single();

    if (error || !article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Increment view count (fire-and-forget)
    supabase
      .from('knowledge_base')
      .update({ view_count: article.view_count + 1 })
      .eq('id', article.id)
      .then(({ error: updErr }) => {
        if (updErr) console.error('[SUPPORT CTRL] view_count update error:', updErr.message);
      });

    return res.json({ success: true, data: article });
  } catch (err) {
    console.error('[SUPPORT CTRL] getKBArticle error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ── generateKB ────────────────────────────────────────────────────────────────

async function generateKB(req, res) {
  try {
    const { category, tool_id } = req.body;

    if (!category || !VALID_KB_CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: `category must be one of: ${VALID_KB_CATEGORIES.join(', ')}`,
      });
    }

    const article = await generateKnowledgeBaseArticle(category, tool_id || null);

    if (!article) {
      return res.json({ success: false, message: 'Not enough resolved tickets to generate article' });
    }

    return res.json({ success: true, data: article });
  } catch (err) {
    console.error('[SUPPORT CTRL] generateKB error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ── kbHelpful ─────────────────────────────────────────────────────────────────

async function kbHelpful(req, res) {
  try {
    const { id }      = req.params;
    const { helpful } = req.body;

    if (typeof helpful !== 'boolean') {
      return res.status(400).json({ error: 'helpful must be true or false' });
    }

    const { data: article, error: fetchErr } = await supabase
      .from('knowledge_base')
      .select('helpful_count, not_helpful_count')
      .eq('id', id)
      .single();

    if (fetchErr || !article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const helpfulCount    = (article.helpful_count     || 0) + (helpful  ? 1 : 0);
    const notHelpfulCount = (article.not_helpful_count || 0) + (!helpful ? 1 : 0);
    const total           = helpfulCount + notHelpfulCount;
    const helpfulnessRate = total > 0
      ? parseFloat(((helpfulCount / total) * 100).toFixed(2))
      : 0;

    const { error: updErr } = await supabase
      .from('knowledge_base')
      .update({
        helpful_count:     helpfulCount,
        not_helpful_count: notHelpfulCount,
        helpfulness_rate:  helpfulnessRate,
        updated_at:        new Date().toISOString(),
      })
      .eq('id', id);

    if (updErr) throw new Error('[SUPPORT] DB error: ' + updErr.message);

    return res.json({ success: true });
  } catch (err) {
    console.error('[SUPPORT CTRL] kbHelpful error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ── submitSurvey ──────────────────────────────────────────────────────────────

async function submitSurvey(req, res) {
  try {
    const { ticket_id, csat_score, nps_score, feedback_text } = req.body;

    if (!csat_score || !Number.isInteger(csat_score) || csat_score < 1 || csat_score > 5) {
      return res.status(400).json({ error: 'csat_score must be an integer between 1 and 5' });
    }

    // Check survey not already submitted for this ticket
    const { data: existing } = await supabase
      .from('support_surveys')
      .select('id')
      .eq('ticket_id', ticket_id)
      .not('csat_score', 'is', null)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Survey already submitted for this ticket' });
    }

    // AI sentiment on feedback text
    let feedbackSentiment = null;
    if (feedback_text && feedback_text.trim().length > 0) {
      try {
        const raw = await callOpenAI(
          `Classify sentiment of: "${feedback_text.trim()}". Return ONLY: positive/neutral/negative`,
          { temperature: 0, max_tokens: 10 }
        );
        const normalized = (raw || '').trim().toLowerCase().replace(/[^a-z]/g, '');
        if (['positive','neutral','negative'].includes(normalized)) {
          feedbackSentiment = normalized;
        }
      } catch (aiErr) {
        console.error('[SUPPORT CTRL] Sentiment analysis failed:', aiErr.message);
      }
    }

    const { error: insertErr } = await supabase.from('support_surveys').insert({
      ticket_id,
      csat_score,
      nps_score:          nps_score    || null,
      feedback_text:      feedback_text || null,
      feedback_sentiment: feedbackSentiment,
    });

    if (insertErr) throw new Error('[SUPPORT] DB error: ' + insertErr.message);

    return res.json({ success: true, message: 'Thank you for your feedback!' });
  } catch (err) {
    console.error('[SUPPORT CTRL] submitSurvey error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = {
  submitTicket,
  getDashboard,
  getTickets,
  getTicket,
  replyTicket,
  resolveTicketCtrl,
  getBugs,
  updateBug,
  getFeatures,
  updateFeature,
  getKnowledgeBase,
  getKBArticle,
  generateKB,
  kbHelpful,
  submitSurvey,
};
