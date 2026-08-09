// Generic no-code automation workflow builder for the AI Factory
// 'automation-template' product type (SDD Phase 5 §8.3/§8.4).
//
// Zapier, Make, and n8n each have their own native importable JSON
// schema. Matching any one of them exactly is out of scope for this
// first pass, so this template produces a generic, clearly-labeled
// trigger/steps description plus a README explaining how a buyer
// manually recreates it in their platform of choice — it does NOT
// imply one-click import compatibility with any of the three.

function buildAutomationTemplateBundle(config = {}) {
  const automation = config.automation || {};
  const trigger = automation.trigger || {};
  const steps = Array.isArray(automation.steps) ? automation.steps : [];

  const workflow = {
    format: 'generic-workflow-v1',
    note: 'Generic workflow description — not a native Zapier/Make/n8n import file. See README.md to recreate this manually in your platform of choice.',
    name: config.name || 'Untitled Automation',
    description: config.description || '',
    trigger: {
      app: trigger.app || '',
      event: trigger.event || '',
      description: trigger.description || '',
    },
    steps: steps.map((s, i) => ({
      order: i + 1,
      app: s.app || '',
      action: s.action || '',
      description: s.description || '',
    })),
  };

  const stepsTable = steps.length
    ? steps.map((s, i) => `| ${i + 1} | ${s.app || ''} | ${s.action || ''} | ${s.description || ''} |`).join('\n')
    : '| _No steps configured._ | | | |';

  const readme = `# ${config.name || 'Untitled Automation'}

${config.description || ''}

## Compatibility note

This is a **generic workflow description**, not a native import file for
Zapier, Make, or n8n. Each of those platforms has its own proprietary
export/import JSON schema, and this bundle does not target any one of
them specifically. Use \`workflow.json\` and the tables below as a
blueprint, then rebuild the trigger and each step manually inside your
platform of choice.

## Trigger

- **App:** ${trigger.app || '_unset_'}
- **Event:** ${trigger.event || '_unset_'}
- **Description:** ${trigger.description || '_none_'}

## Steps

| # | App | Action | Description |
| --- | --- | --- | --- |
${stepsTable}

## Manually recreating this workflow

**Zapier:** Create a new Zap. Set the trigger app/event to match the
Trigger section above. Add one Action step per row in the Steps table,
in order, choosing the matching app and action for each.

**Make (formerly Integromat):** Create a new Scenario. Add a trigger
module matching the Trigger section, then chain one module per Steps
row, connecting them in the listed order.

**n8n:** Create a new Workflow. Add a trigger node matching the Trigger
section, then add one node per Steps row, connecting them in sequence.

In all three cases, field-level mapping (which output goes into which
input) is platform-specific and must be configured by hand — this
bundle only describes the shape of the automation, not the exact
platform-native import.
`;

  return {
    'workflow.json': JSON.stringify(workflow, null, 2) + '\n',
    'README.md': readme,
  };
}

module.exports = { buildAutomationTemplateBundle };
