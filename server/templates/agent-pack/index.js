// Structured JSON export builder for the AI Factory 'agent-pack'
// product type (SDD Phase 5 §8.3). No code execution — just a JSON
// file describing an agent definition and its prompt chain.

function buildAgentPackBundle(config = {}) {
  const pack = config.agent_pack || {};

  const payload = {
    name:          config.name || '',
    description:   config.description || '',
    agent_name:    pack.agent_name || config.name || '',
    system_prompt: pack.system_prompt || '',
    prompt_chain:  Array.isArray(pack.prompt_chain) ? pack.prompt_chain : [],
    tools:         Array.isArray(pack.tools) ? pack.tools : [],
  };

  return {
    'agent-pack.json': JSON.stringify(payload, null, 2) + '\n',
  };
}

module.exports = { buildAgentPackBundle };
