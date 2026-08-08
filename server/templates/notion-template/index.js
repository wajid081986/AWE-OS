// Structured JSON export builder for the AI Factory 'notion-template'
// product type (SDD Phase 2 §5). No code execution — just a JSON file
// shaped like a Notion/Airtable database export.

function buildNotionTemplateBundle(config = {}) {
  const template = config.template || {};

  const payload = {
    name:        config.name || '',
    description: config.description || '',
    title:       template.title || config.name || '',
    properties:  Array.isArray(template.properties) ? template.properties : [],
    sample_rows: Array.isArray(template.sample_rows) ? template.sample_rows : [],
  };

  return {
    'template.json': JSON.stringify(payload, null, 2) + '\n',
  };
}

module.exports = { buildNotionTemplateBundle };
