import { TOOL_REGISTRY, CATEGORY_META } from '../../../data/toolRegistry'
import { StatsStrip } from '../../../components/cards'

const ALL_TOOLS = TOOL_REGISTRY.filter(t => !t.comingSoon && t.slug !== 'test-ai-tool')

export default function Stats() {
  const totalTools = ALL_TOOLS.length
  const categoryCount = Object.keys(CATEGORY_META).length
  const pdfCount = ALL_TOOLS.filter(t => t.category === 'pdf').length
  const calculatorCount = ALL_TOOLS.filter(t => t.category === 'calculators').length

  return (
    <StatsStrip
      stats={[
        { value: String(totalTools), suffix: '+', label: `free tools across ${categoryCount} categories` },
        { value: String(pdfCount), label: 'PDF utilities — merge to sign' },
        { value: String(calculatorCount), label: 'calculators built for Indian finance' },
        { value: '0', label: 'files ever uploaded to our servers' },
      ]}
    />
  )
}
