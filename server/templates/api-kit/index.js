// Backend-only route/controller skeleton builder for the AI Factory
// 'api-kit' product type (SDD Phase 5 §8.3). No frontend — just an
// Express router, a matching controller stub, and a config file.

function toCamelCase(str) {
  const cleaned = String(str || '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join('');
  return cleaned || 'resource';
}

function toKebabCase(str) {
  const cleaned = String(str || '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .join('-')
    .toLowerCase();
  return cleaned || 'resource';
}

function handlerNameFor(method, path) {
  const parts = String(path || '/')
    .split('/')
    .filter(Boolean)
    .filter(p => !p.startsWith(':'));
  const words = [String(method || 'get').toLowerCase(), ...(parts.length ? parts : ['index'])];
  return toCamelCase(words.join(' '));
}

function buildApiKitBundle(config = {}) {
  const resourceCamel = toCamelCase(config.resource_name || config.name);
  const resourceKebab = toKebabCase(config.resource_name || config.name);
  const endpoints = Array.isArray(config.endpoints) ? config.endpoints : [];

  const seenHandlers = new Set();
  const routeEntries = endpoints.map(e => {
    const method = String(e.method || 'GET').toLowerCase();
    const path = e.path || '/';
    let handler = handlerNameFor(method, path);
    while (seenHandlers.has(handler)) handler = `${handler}2`;
    seenHandlers.add(handler);
    return { method, path, handler, description: e.description || '' };
  });

  const routerLines = routeEntries.length
    ? routeEntries.map(r => `router.${r.method}('${r.path}', controller.${r.handler}); // ${r.description}`).join('\n')
    : '// No endpoints configured';

  const routesFile = `const express = require('express');
const router = express.Router();
const controller = require('../controllers/${resourceKebab}.controller');

${routerLines}

module.exports = router;
`;

  const controllerHandlers = routeEntries.length
    ? routeEntries.map(r => `exports.${r.handler} = async (req, res) => {
  // TODO: implement — ${r.method.toUpperCase()} ${r.path}
  res.status(501).json({ error: 'Not implemented' });
};`).join('\n\n')
    : `exports.index = async (req, res) => {
  // TODO: implement
  res.status(501).json({ error: 'Not implemented' });
};`;

  const controllerFile = `// Controller stubs for the "${config.name || resourceCamel}" API kit.
${controllerHandlers}
`;

  const configJson = {
    name: config.name || '',
    description: config.description || '',
    resource_name: resourceCamel,
    endpoints: routeEntries.map(r => ({ method: r.method.toUpperCase(), path: r.path, description: r.description })),
    config_notes: config.config_notes || '',
  };

  const readme = `# ${config.name || 'API Kit'}

${config.description || ''}

## Endpoints

${routeEntries.length
    ? routeEntries.map(r => `- \`${r.method.toUpperCase()} ${r.path}\` — ${r.description}`).join('\n')
    : '_No endpoints configured._'}

## Setup

1. Copy \`routes/${resourceKebab}.routes.js\` and \`controllers/${resourceKebab}.controller.js\` into your Express app.
2. Mount the router: \`app.use('/api/${resourceKebab}', require('./routes/${resourceKebab}.routes'));\`
3. Implement the TODO stubs in the controller.

${config.config_notes || ''}
`;

  return {
    [`routes/${resourceKebab}.routes.js`]: routesFile,
    [`controllers/${resourceKebab}.controller.js`]: controllerFile,
    'config.json': JSON.stringify(configJson, null, 2) + '\n',
    'README.md': readme,
  };
}

module.exports = { buildApiKitBundle };
