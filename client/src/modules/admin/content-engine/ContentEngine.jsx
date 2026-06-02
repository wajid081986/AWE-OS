import { useState } from 'react'
import BlogWriterPanel      from './BlogWriterPanel'
import LandingPageGenerator from './LandingPageGenerator'
import SocialBlast          from './SocialBlast'

const TABS = [
  {
    id:   'blog',
    label: '✏️  Blog Writer',
    desc:  'SEO keyword gap finder → AI article generator',
  },
  {
    id:   'landing',
    label: '🏗️  Landing Pages',
    desc:  'Programmatic SEO landing page generator with preview, HTML export, and SEO checklist',
  },
  {
    id:   'social',
    label: '📡  Social Blast',
    desc:  'One click → adapt any article to Reddit, Quora, Pinterest, WhatsApp, LinkedIn, Twitter',
  },
]

export default function ContentEngine() {
  const [tab, setTab] = useState('blog')
  const active = TABS.find(t => t.id === tab)

  return (
    <div className="flex flex-col h-full bg-gray-900 min-h-0">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 pt-5 pb-0 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-base font-bold text-white">Content Engine</h1>
            <p className="text-xs text-gray-500 mt-0.5">{active?.desc}</p>
          </div>
          <span className="text-[10px] text-gray-600 bg-gray-900 border border-gray-700 px-2.5 py-1 rounded-full font-mono">
            claude-sonnet-4-20250514
          </span>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0.5">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
                tab === t.id
                  ? 'text-orange-400 border-orange-500 bg-gray-900'
                  : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-gray-700/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-5">
        {tab === 'blog'    && <BlogWriterPanel />}
        {tab === 'landing' && <LandingPageGenerator />}
        {tab === 'social'  && <SocialBlast />}
      </div>
    </div>
  )
}
