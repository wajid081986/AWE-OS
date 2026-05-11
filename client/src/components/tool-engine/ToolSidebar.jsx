import { useState } from 'react'
import { Link } from 'react-router-dom'
import AdContainer from './AdContainer'
import ToolCTA    from './ToolCTA'
import ToolGrid   from './ToolGrid'

function ShareButtons({ url, title }) {
  const [copied, setCopied] = useState(false)
  const enc = encodeURIComponent

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-700" id="share-label">Share this tool</p>
      <div className="flex gap-2" role="group" aria-labelledby="share-label">
        <a
          href={`https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`}
          target="_blank" rel="noopener noreferrer"
          aria-label={`Share on Twitter: ${title}`}
          className="flex-1 text-center text-xs bg-sky-500 hover:bg-sky-600 text-white py-2 rounded-lg font-medium transition-colors"
        >Twitter</a>
        <a
          href={`https://wa.me/?text=${enc(title + ' ' + url)}`}
          target="_blank" rel="noopener noreferrer"
          aria-label={`Share on WhatsApp: ${title}`}
          className="flex-1 text-center text-xs bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-medium transition-colors"
        >WhatsApp</a>
        <button
          onClick={copy}
          aria-label={copied ? 'Link copied!' : 'Copy link to clipboard'}
          className={`flex-1 text-center text-xs py-2 rounded-lg font-medium transition-colors ${
            copied
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          {copied ? '✓ Copied' : 'Copy Link'}
        </button>
      </div>
    </div>
  )
}

export default function ToolSidebar({
  tool,
  catMeta,
  relatedTools = [],
  pageUrl,
  showAd    = true,
  showShare = true,
  showCTA   = true,
  children,
}) {
  const shareTitle = tool ? `Free ${tool.name} — use it on AWE-OS` : ''

  return (
    <aside className="lg:w-72 shrink-0" aria-label="Sidebar">
      <div className="sticky top-20 space-y-4">

        {showAd && <AdContainer slot="sidebar" />}

        {showShare && pageUrl && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <ShareButtons url={pageUrl} title={shareTitle} />
          </div>
        )}

        {relatedTools.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Related Tools</h3>
            <ToolGrid tools={relatedTools} compact />
            {catMeta && (
              <Link
                to={`/tools/${catMeta.slug}`}
                className="mt-3 flex items-center justify-center w-full text-xs text-blue-600 hover:text-blue-700 font-medium border border-blue-200 rounded-lg py-1.5 hover:bg-blue-50 transition-colors"
              >
                All {catMeta.name} →
              </Link>
            )}
          </div>
        )}

        {showCTA && <ToolCTA />}

        {/* Caller-injected extra content (future: premium upsell, tips, etc.) */}
        {children}

      </div>
    </aside>
  )
}
