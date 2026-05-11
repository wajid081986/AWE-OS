export function generateHowToSchema(toolName, steps) {
  if (!steps?.length) return null
  return {
    '@context': 'https://schema.org',
    '@type':    'HowTo',
    name:       `How to Use ${toolName}`,
    step: steps.map((text, i) => ({
      '@type':   'HowToStep',
      position:  i + 1,
      name:      `Step ${i + 1}`,
      text,
    })),
  }
}
