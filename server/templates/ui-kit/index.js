// Minimal React component + README builder for the AI Factory 'ui-kit'
// product type (SDD Phase 2 §5). No backend, no build step — just the
// component skeleton and its usage docs.

function toPascalCase(str) {
  const cleaned = String(str || '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  return cleaned || 'Component';
}

function buildUiKitBundle(config = {}) {
  const componentName = toPascalCase(config.component_name || config.name);
  const props         = Array.isArray(config.props) ? config.props : [];
  const propNames     = props.map(p => p.name).filter(Boolean);
  const propsArg      = propNames.length ? `{ ${propNames.join(', ')} }` : 'props';

  const jsxBody = props.length
    ? props.map(p => `      {/* ${p.name}: ${p.type || 'any'} — ${p.description || ''} */}`).join('\n')
    : '      {/* No props */}';

  const jsx = `import React from 'react';

/**
 * ${componentName}
 * ${config.component_description || config.description || ''}
 */
export default function ${componentName}(${propsArg}) {
  return (
    <div className="${componentName.toLowerCase()}">
${jsxBody}
    </div>
  );
}
`;

  const propsTable = props.length
    ? props.map(p => `| \`${p.name}\` | \`${p.type || 'any'}\` | ${p.description || ''} |`).join('\n')
    : '_No props._';

  const usageProps = propNames.map(n => `${n}={...}`).join(' ');

  const readme = `# ${componentName}

${config.description || ''}

## Props

| Name | Type | Description |
| --- | --- | --- |
${propsTable}

## Usage

\`\`\`jsx
import ${componentName} from './Component';

<${componentName}${usageProps ? ' ' + usageProps : ''} />
\`\`\`

${config.readme_notes || ''}
`;

  return {
    'Component.jsx': jsx,
    'README.md': readme,
  };
}

module.exports = { buildUiKitBundle };
