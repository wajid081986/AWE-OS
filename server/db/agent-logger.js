'use strict';
const supabase = require('./supabase');

async function logToAgentLogs(agentName, level, message, metadata = {}) {
  try {
    await supabase.from('agent_logs').insert({ agent_name: agentName, level, message, metadata });
  } catch (err) {
    console.error(`[AGENT LOGGER] Write failed: ${err.message}`);
  }
}

module.exports = { logToAgentLogs };
