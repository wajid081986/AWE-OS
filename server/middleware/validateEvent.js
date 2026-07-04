const { z }               = require('zod');
const { VALID_EVENT_TYPES } = require('../services/event.service');

// UUID v4 regex — used instead of importing a uuid library
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TrackEventSchema = z.object({
  // Optional — 'blog_viewed' events identify the post via metadata.blog_post_id
  // instead of tool_id (see the .refine() below).
  tool_id:    z.string().regex(UUID_REGEX, 'tool_id must be a valid UUID v4').nullish(),
  user_id:    z.string().regex(UUID_REGEX, 'user_id must be a valid UUID v4').nullish(),
  event_type: z.enum([...VALID_EVENT_TYPES], {
    errorMap: () => ({ message: `event_type must be one of: ${[...VALID_EVENT_TYPES].join(', ')}` }),
  }),
  // metadata: accept only plain objects, strip unknown nested types that could
  // carry prototype-pollution payloads (__proto__, constructor, etc.)
  metadata: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional()
    .default({})
    .transform((obj) => {
      const safe = {};
      for (const [k, v] of Object.entries(obj)) {
        if (!['__proto__', 'constructor', 'prototype'].includes(k)) {
          safe[k] = v;
        }
      }
      return safe;
    }),
}).refine(
  (data) => data.event_type === 'blog_viewed' ? !!data.metadata?.blog_post_id : !!data.tool_id,
  { message: 'tool_id is required (or metadata.blog_post_id for blog_viewed events)' }
);

const LogRevenueSchema = z.object({
  tool_id:  z.string().regex(UUID_REGEX, 'tool_id must be a valid UUID v4'),
  user_id:  z.string().regex(UUID_REGEX, 'user_id must be a valid UUID v4'),
  amount:   z.number({ invalid_type_error: 'amount must be a number' }).positive('amount must be > 0'),
  order_id: z.string().min(1, 'order_id is required'),
  metadata: z.record(z.unknown()).optional().default({}),
});

/**
 * Middleware: validate POST /api/events/track body.
 * Replaces req.body with the sanitized+coerced Zod output.
 */
function validateEvent(req, res, next) {
  const result = TrackEventSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error:   result.error.errors[0].message,
    });
  }
  req.body = result.data;
  next();
}

/**
 * Middleware: validate POST /api/revenue/log body.
 */
function validateRevenue(req, res, next) {
  const result = LogRevenueSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error:   result.error.errors[0].message,
    });
  }
  req.body = result.data;
  next();
}

/**
 * Middleware: validate :tool_id route param is a valid UUID.
 * Attach to any route that has /:tool_id.
 */
function validateToolId(req, res, next) {
  if (!UUID_REGEX.test(req.params.tool_id)) {
    return res.status(400).json({ success: false, error: 'tool_id must be a valid UUID v4' });
  }
  next();
}

module.exports = { validateEvent, validateRevenue, validateToolId };
