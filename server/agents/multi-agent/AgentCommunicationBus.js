'use strict';

/**
 * AWE-OS — AgentCommunicationBus                               Phase 5C
 *
 * Event-driven inter-agent messaging layer built on top of the existing EventBus.
 * Does NOT replace EventBus — uses it as transport for agent-scoped messages.
 *
 * Features:
 *   - Direct agent-to-agent messaging (send)
 *   - Request/response with timeout (request → reply)
 *   - Broadcast to all registered agents
 *   - Dead-letter queue for undeliverable messages
 *   - Async delivery: handlers never block EventBus callbacks
 *   - Best-effort DB persistence to agent_messages table
 *   - Full observability: every message logged
 *
 * Message types: request | response | broadcast | delegate | escalate | share | consensus
 */

const { v4: uuidv4 } = require('uuid');
const { createLogger } = require('../../monitoring/logger');

const log = createLogger('agent-comm-bus');

const AGENT_EVENTS = Object.freeze({
  MESSAGE_SENT:        'agent.message.sent',
  MESSAGE_RECEIVED:    'agent.message.received',
  DELEGATED:           'agent.delegated',
  ESCALATED:           'agent.escalated',
  INTELLIGENCE_SHARED: 'agent.intelligence.shared',
  CONSENSUS_REQUESTED: 'agent.consensus.requested',
  CONSENSUS_REACHED:   'agent.consensus.reached',
  COLLAB_STARTED:      'collab.session.started',
  COLLAB_COMPLETED:    'collab.session.completed',
  COLLAB_FAILED:       'collab.session.failed',
  BOTTLENECK_DETECTED: 'optimization.bottleneck.detected',
  TUNING_APPLIED:      'optimization.tuning.applied',
  TUNING_ROLLED_BACK:  'optimization.tuning.rolledback',
  RECOMMENDATION_READY: 'optimization.recommendation.ready',
});

const MESSAGE_TYPES = Object.freeze({
  REQUEST:   'request',
  RESPONSE:  'response',
  BROADCAST: 'broadcast',
  DELEGATE:  'delegate',
  ESCALATE:  'escalate',
  SHARE:     'share',
  CONSENSUS: 'consensus',
});

const DLQ_MAX = 500;
const DEFAULT_REQUEST_TIMEOUT_MS = 8_000;

class AgentCommunicationBus {
  constructor() {
    this._bus = null;
    this._handlers = new Map();   // agentId → Set<handler>
    this._pending  = new Map();   // correlationId → { resolve, reject, timer }
    this._dlq      = [];          // dead-letter queue
    this._messageCount = 0;
    this._initialized  = false;
  }

  /**
   * Wire to the shared EventBus. Called once at startup.
   */
  init(bus) {
    if (this._initialized) return;
    this._initialized = true;
    this._bus = bus;

    bus.subscribe('agent.message.direct',    payload => this._deliverDirect(payload));
    bus.subscribe('agent.message.broadcast', payload => this._deliverBroadcast(payload));

    log.info('AgentCommunicationBus initialized');
  }

  /**
   * Register a handler for an agent's incoming messages.
   * Returns a cleanup function.
   */
  subscribe(agentId, handler) {
    if (typeof handler !== 'function') throw new TypeError('handler must be a function');
    if (!this._handlers.has(agentId)) this._handlers.set(agentId, new Set());
    this._handlers.get(agentId).add(handler);
    return () => this._handlers.get(agentId)?.delete(handler);
  }

  /**
   * Send a fire-and-forget direct message from one agent to another.
   * Returns the correlationId for tracing.
   */
  async send(fromAgentId, toAgentId, type, payload, options = {}) {
    const msg = this._buildMessage(fromAgentId, toAgentId, type, payload, options);
    await this._dispatch(msg);
    return msg.correlationId;
  }

  /**
   * Broadcast a message to all registered agents (except sender).
   */
  async broadcast(fromAgentId, type, payload, options = {}) {
    const msg = this._buildMessage(fromAgentId, '__broadcast__', type, payload, options);
    msg.isBroadcast = true;
    this._messageCount++;
    this._bus?.emit('agent.message.broadcast', msg, { source: 'agent-comm-bus', persist: false });
    setImmediate(() => this._persist(msg).catch(() => {}));
    return msg.correlationId;
  }

  /**
   * Send a request and await the reply within timeoutMs.
   * Throws with code AGENT_TIMEOUT if no reply arrives.
   */
  async request(fromAgentId, toAgentId, payload, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
    const correlationId = uuidv4();
    const msg = this._buildMessage(fromAgentId, toAgentId, MESSAGE_TYPES.REQUEST, payload, { correlationId });

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pending.delete(correlationId);
        const err = new Error(`Agent request timed out: ${fromAgentId} → ${toAgentId}`);
        err.code = 'AGENT_TIMEOUT';
        reject(err);
      }, timeoutMs);

      this._pending.set(correlationId, { resolve, reject, timer });

      this._dispatch(msg).catch(err => {
        clearTimeout(timer);
        this._pending.delete(correlationId);
        reject(err);
      });
    });
  }

  /**
   * Resolve a pending request with a response payload.
   * Called by the responding agent when it has a reply.
   */
  reply(correlationId, responsePayload) {
    const pending = this._pending.get(correlationId);
    if (!pending) return false;
    clearTimeout(pending.timer);
    this._pending.delete(correlationId);
    pending.resolve(responsePayload);
    return true;
  }

  getDLQ()   { return [...this._dlq]; }
  clearDLQ() { this._dlq = []; }

  getStats() {
    return {
      messageCount:     this._messageCount,
      registeredAgents: this._handlers.size,
      pendingRequests:  this._pending.size,
      dlqDepth:         this._dlq.length,
    };
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  _buildMessage(from, to, type, payload, options = {}) {
    return {
      messageId:     uuidv4(),
      correlationId: options.correlationId ?? uuidv4(),
      from,
      to,
      type,
      payload:   payload ?? {},
      timestamp: new Date().toISOString(),
      replyTo:   options.replyTo  ?? null,
      metadata:  options.metadata ?? {},
      isBroadcast: false,
    };
  }

  async _dispatch(msg) {
    try {
      this._messageCount++;
      // Use persist:false — we handle our own persistence below
      this._bus?.emit('agent.message.direct', msg, { source: 'agent-comm-bus', persist: false });
      setImmediate(() => this._persist(msg).catch(() => {}));
    } catch (err) {
      this._toDLQ(msg, err.message);
      log.warn('AgentCommunicationBus dispatch failed', { error: err.message, to: msg.to });
    }
  }

  _deliverDirect(msg) {
    setImmediate(() => {
      const handlers = this._handlers.get(msg.to);
      if (!handlers || handlers.size === 0) {
        this._toDLQ(msg, `No handlers registered for agent "${msg.to}"`);
        return;
      }
      for (const handler of handlers) {
        try { handler(msg); }
        catch (err) {
          log.warn('AgentCommunicationBus handler error', { agentId: msg.to, error: err.message });
        }
      }
    });
  }

  _deliverBroadcast(msg) {
    setImmediate(() => {
      for (const [agentId, handlers] of this._handlers) {
        if (agentId === msg.from) continue;
        for (const handler of handlers) {
          try { handler({ ...msg, to: agentId }); }
          catch (err) {
            log.warn('AgentCommunicationBus broadcast error', { agentId, error: err.message });
          }
        }
      }
    });
  }

  _toDLQ(msg, reason) {
    if (this._dlq.length >= DLQ_MAX) this._dlq.shift();
    this._dlq.push({ ...msg, dlqReason: reason, dlqAt: new Date().toISOString() });
  }

  async _persist(msg) {
    try {
      const supabase = require('../../db/supabase');
      await supabase.from('agent_messages').insert({
        message_id:     msg.messageId,
        correlation_id: msg.correlationId,
        from_agent:     msg.from,
        to_agent:       msg.to,
        message_type:   msg.type,
        payload:        msg.payload ?? {},
        is_broadcast:   msg.isBroadcast ?? false,
        is_delivered:   true,
        metadata:       msg.metadata ?? {},
        sent_at:        msg.timestamp,
        delivered_at:   new Date().toISOString(),
      });
    } catch (_) {
      // Best-effort — DB unavailability must not block messaging
    }
  }
}

const agentCommBus = new AgentCommunicationBus();

module.exports = { AgentCommunicationBus, agentCommBus, AGENT_EVENTS, MESSAGE_TYPES };
