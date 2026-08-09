// Chat-bot skeleton builder for the AI Factory 'bot-kit' product type
// (SDD Phase 5 §8.3). Manifest-style config + one stub command handler
// per configured command — no functional bot logic, matches the
// "boilerplate" wording in the SDD.

function toCamelCase(str) {
  const cleaned = String(str || '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join('');
  return cleaned || 'command';
}

function toKebabCase(str) {
  const cleaned = String(str || '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .join('-')
    .toLowerCase();
  return cleaned || 'command';
}

function buildBotKitBundle(config = {}) {
  const bot = config.bot || {};
  const platform = bot.platform || 'discord';
  const botName = bot.bot_name || config.name || 'Untitled Bot';
  const commands = Array.isArray(bot.commands) ? bot.commands : [];

  const botConfig = {
    platform,
    bot_name: botName,
    description: config.description || '',
    commands: commands.map(c => ({ name: c.name || '', description: c.description || '' })),
  };

  const files = {
    'bot.config.json': JSON.stringify(botConfig, null, 2) + '\n',
  };

  const seenNames = new Set();
  for (const c of commands) {
    let kebab = toKebabCase(c.name);
    while (seenNames.has(kebab)) kebab = `${kebab}-2`;
    seenNames.add(kebab);
    const camel = toCamelCase(c.name);

    files[`commands/${kebab}.js`] = `// Stub handler for the "${c.name || kebab}" command — wire up real behavior here.
module.exports = {
  name: '${c.name || kebab}',
  description: '${(c.description || '').replace(/'/g, "\\'")}',
  execute(${platform === 'discord' ? 'interaction' : 'ctx'}) {
    // TODO: implement ${camel} command
  },
};
`;
  }

  const commandList = commands.length
    ? commands.map(c => `- \`${c.name}\` — ${c.description || ''}`).join('\n')
    : '_No commands configured._';

  files['README.md'] = `# ${botName}

${config.description || ''}

**Platform:** ${platform}

## Commands

${commandList}

## Setup

1. Copy \`bot.config.json\` and the \`commands/\` folder into your ${platform} bot project.
2. Register each command with your ${platform} bot client.
3. Implement the TODO stubs in each command handler.
`;

  return files;
}

module.exports = { buildBotKitBundle };
