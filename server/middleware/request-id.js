'use strict';

/**
 * AWE-OS — Request ID middleware
 *
 * Attaches a unique X-Request-ID to every request/response for distributed tracing.
 * Accepts an existing ID from the client (for end-to-end tracing) or generates one.
 */

const { randomUUID } = require('crypto');

function requestId(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const id = incoming && /^[\w\-]{8,64}$/.test(incoming)
    ? incoming          // trust well-formed client-supplied IDs
    : randomUUID();

  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
}

module.exports = requestId;
