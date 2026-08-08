// Manifest V3 skeleton builder for the AI Factory 'browser-extension'
// product type (SDD Phase 2 §5). Static skeleton only — no functional
// extension logic, matches the SDD's "Manifest V3 skeleton" wording.

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildBrowserExtensionBundle(config = {}) {
  const ext         = config.extension || {};
  const name        = config.name || 'Untitled Extension';
  const description = config.description || '';
  const permissions = Array.isArray(ext.permissions) ? ext.permissions : ['activeTab'];

  const manifest = {
    manifest_version: 3,
    name,
    description,
    version: '0.1.0',
    action: {
      default_title: ext.action_title || name,
      default_popup: 'popup.html',
    },
    permissions,
  };

  const popupHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(name)}</title>
  <style>
    body { font-family: sans-serif; width: 280px; padding: 16px; }
    h1 { font-size: 1rem; margin: 0 0 8px; }
    p { font-size: 0.85rem; color: #444; margin: 0; }
  </style>
</head>
<body>
  <h1>${escapeHtml(ext.popup_heading || name)}</h1>
  <p>${escapeHtml(ext.popup_body || description)}</p>
  <script src="popup.js"></script>
</body>
</html>
`;

  const popupJs = `// Skeleton popup script for "${name}" — wire up real behavior here.
document.addEventListener('DOMContentLoaded', () => {
  console.log('${name} popup loaded');
});
`;

  return {
    'manifest.json': JSON.stringify(manifest, null, 2) + '\n',
    'popup.html': popupHtml,
    'popup.js': popupJs,
  };
}

module.exports = { buildBrowserExtensionBundle };
