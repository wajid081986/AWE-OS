import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TOOL_REGISTRY, CATEGORY_META } from '../../../data/toolRegistry'
import { ToolCard } from '../../../components/cards'
import { Container, Section, Button } from '../../../components/primitives'

const ALL_TOOLS = TOOL_REGISTRY.filter(t => !t.comingSoon && t.slug !== 'test-ai-tool')
const CATEGORY_ORDER = Object.keys(CATEGORY_META)

const TABS = [
  { key: 'popular', label: 'Popular' },
  ...CATEGORY_ORDER.map(key => ({ key, label: CATEGORY_META[key].name })),
]

function tagFor(category) {
  if (category === 'calculators') return { label: 'India-ready', variant: 'india-ready' }
  if (category === 'ai') return { label: 'AI-assisted', variant: 'ai-assisted' }
  return { label: 'No upload', variant: 'no-upload' }
}

// Round-robin one isFeatured tool per category (CATEGORY_META order) until
// 8 are filled — derived from the registry, not a hardcoded slug list.
function getPopularTools() {
  const featuredByCategory = CATEGORY_ORDER.map(cat => ALL_TOOLS.filter(t => t.category === cat && t.isFeatured))
  const picked = []
  for (let round = 0; picked.length < 8; round++) {
    const before = picked.length
    for (const bucket of featuredByCategory) {
      if (picked.length >= 8) break
      if (bucket[round]) picked.push(bucket[round])
    }
    if (picked.length === before) break
  }
  return picked
}

function getCategoryTools(category) {
  const inCategory = ALL_TOOLS.filter(t => t.category === category)
  const featured = inCategory.filter(t => t.isFeatured)
  const rest = inCategory.filter(t => !t.isFeatured)
  return [...featured, ...rest].slice(0, 8)
}

export default function PopularTools() {
  // Always starts on "Popular" — the SSG-rendered state. Reading
  // window.location.hash on mount used to swap the grid post-hydration,
  // which shifted layout for anyone landing via a /#category link
  // (Batch 5.5 CLS fix — see docs/batches/batch-5.5-plan.md M1).
  const [activeTab, setActiveTab] = useState('popular')

  function selectTab(key) {
    setActiveTab(key)
    const url = key === 'popular' ? window.location.pathname + window.location.search : `${window.location.pathname}${window.location.search}#${key}`
    window.history.replaceState(null, '', url)
  }

  const tools = activeTab === 'popular' ? getPopularTools() : getCategoryTools(activeTab)

  return (
    <Section>
      <Container>
        <div className="max-w-[length:var(--section-head-max-width)] mb-10">
          <span className="ds-mono-eyebrow inline-flex items-center gap-2 text-[length:var(--text-eyebrow)] font-bold text-cobalt mb-3.5">
            <span className="w-[length:var(--eyebrow-dash-width)] h-0.5 bg-marigold" aria-hidden="true" />
            Most used this month
          </span>
          <h2 className="ds-h2 text-ink mb-3">Start with the tools people rely on daily</h2>
          <p className="text-[length:var(--text-body)] text-ink-soft">
            Every tool is free to use, opens instantly, and runs entirely in your browser. No account needed for most, no watermarks, no artificial limits.
          </p>
        </div>

        <div role="tablist" aria-label="Tool categories" className="flex flex-wrap gap-2.5 mb-7">
          {TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => selectTab(tab.key)}
              className={`font-semibold text-[length:var(--text-tab)] rounded-full border-[1.5px] transition-colors duration-micro ease-ds-ease py-[length:var(--btn-padding-y-compact)] px-[length:var(--btn-padding-x-compact)] ${
                activeTab === tab.key
                  ? 'bg-ink text-card border-ink'
                  : 'bg-card text-ink-soft border-line hover:border-cobalt'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {tools.map(tool => (
            <ToolCard
              key={tool.slug}
              icon={tool.icon}
              name={tool.name}
              description={tool.description}
              to={tool.path || `/tools/${tool.slug}`}
              tag={tagFor(tool.category)}
            />
          ))}
        </div>

        <div className="text-center mt-[length:var(--tools-cta-margin-top)]">
          <Button variant="ghost" as={Link} to="/tools">Browse all {ALL_TOOLS.length} tools →</Button>
        </div>
      </Container>
    </Section>
  )
}
