'use strict';

const OpenAI = require('openai');

let _client = null;

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    const err = new Error('OPENAI_API_KEY environment variable is not set');
    err.code   = 'AI_UNAVAILABLE';
    err.status = 503;
    throw err;
  }
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

module.exports = { getOpenAI };
