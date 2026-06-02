import { useState, useRef, useCallback } from 'react'

const BASE_URL  = import.meta.env.VITE_API_URL || 'https://awe-os.onrender.com'
const TOKEN_KEY = 'awe_token'

const TOOLS = [
  { name: 'Merge PDF',                 slug: 'merge-pdf',             category: 'PDF Tools'    },
  { name: 'Split PDF',                 slug: 'split-pdf',             category: 'PDF Tools'    },
  { name: 'Remove PDF Pages',          slug: 'remove-pages-pdf',      category: 'PDF Tools'    },
  { name: 'Extract PDF Pages',         slug: 'extract-pages-pdf',     category: 'PDF Tools'    },
  { name: 'Organize PDF',              slug: 'organize-pdf',          category: 'PDF Tools'    },
  { name: 'Compress PDF',              slug: 'compress-pdf',          category: 'PDF Tools'    },
  { name: 'JPG to PDF',                slug: 'jpg-to-pdf',            category: 'PDF Tools'    },
  { name: 'Word to PDF',               slug: 'word-to-pdf',           category: 'PDF Tools'    },
  { name: 'Excel to PDF',              slug: 'excel-to-pdf',          category: 'PDF Tools'    },
  { name: 'PowerPoint to PDF',         slug: 'powerpoint-to-pdf',     category: 'PDF Tools'    },
  { name: 'PDF to JPG',                slug: 'pdf-to-jpg',            category: 'PDF Tools'    },
  { name: 'PDF to Word',               slug: 'pdf-to-word',           category: 'PDF Tools'    },
  { name: 'PDF to Text',               slug: 'pdf-to-text',           category: 'PDF Tools'    },
  { name: 'PDF to PowerPoint',         slug: 'pdf-to-ppt',            category: 'PDF Tools'    },
  { name: 'PDF to Excel',              slug: 'pdf-to-excel',          category: 'PDF Tools'    },
  { name: 'Rotate PDF',                slug: 'rotate-pdf',            category: 'PDF Tools'    },
  { name: 'Add Watermark to PDF',      slug: 'watermark-pdf',         category: 'PDF Tools'    },
  { name: 'Add Page Numbers to PDF',   slug: 'page-numbers-pdf',      category: 'PDF Tools'    },
  { name: 'PDF Editor',                slug: 'pdf-editor',            category: 'PDF Tools'    },
  { name: 'Protect PDF',               slug: 'protect-pdf',           category: 'PDF Tools'    },
  { name: 'Unlock PDF',                slug: 'unlock-pdf',            category: 'PDF Tools'    },
  { name: 'FD Calculator',             slug: 'fd-calculator',         category: 'Calculators'  },
  { name: 'PPF Calculator',            slug: 'ppf-calculator',        category: 'Calculators'  },
  { name: 'SIP Calculator',            slug: 'sip-calculator',        category: 'Calculators'  },
  { name: 'ROI Calculator',            slug: 'roi-calculator',        category: 'Calculators'  },
  { name: 'Tax Calculator',            slug: 'tax-calculator',        category: 'Calculators'  },
  { name: 'Loan EMI Calculator',       slug: 'loan-calculator',       category: 'Calculators'  },
  { name: 'Percentage Calculator',     slug: 'percentage-calculator', category: 'Calculators'  },
  { name: 'GST Calculator',            slug: 'gst-calculator',        category: 'Calculators'  },
  { name: 'Tip Calculator',            slug: 'tip-calculator',        category: 'Calculators'  },
  { name: 'Discount Calculator',       slug: 'discount-calculator',   category: 'Calculators'  },
  { name: 'BMI Calculator',            slug: 'bmi-calculator',        category: 'Calculators'  },
  { name: 'Age Calculator',            slug: 'age-calculator',        category: 'Calculators'  },
  { name: 'GPA Calculator',            slug: 'gpa-calculator',        category: 'Calculators'  },
  { name: 'Unit Converter',            slug: 'unit-converter',        category: 'Converters'   },
  { name: 'Word Counter',              slug: 'word-counter',          category: 'Converters'   },
  { name: 'Password Generator',        slug: 'password-generator',    category: 'Converters'   },
  { name: 'Color Picker',              slug: 'color-picker',          category: 'Converters'   },
  { name: 'QR Code Generator',         slug: 'qr-code-generator',     category: 'Converters'   },
  { name: 'Image Compressor',          slug: 'image-compressor',      category: 'Converters'   },
  { name: 'Currency Converter',        slug: 'currency-converter',    category: 'Converters'   },
  { name: 'Number Base Converter',     slug: 'base-converter',        category: 'Converters'   },
  { name: 'JSON Formatter',            slug: 'json-formatter',        category: 'Converters'   },
  { name: 'CSV to JSON',               slug: 'csv-to-json',           category: 'Converters'   },
  { name: 'Invoice Generator',         slug: 'invoice',               category: 'Productivity' },
  { name: 'Invoice Generator (Quick)', slug: 'invoice-generator',     category: 'Productivity' },
  { name: 'Contract Generator',        slug: 'contract-generator',    category: 'Productivity' },
  { name: 'AI Resume Builder',         slug: 'resume-builder',        category: 'AI Tools'     },
  { name: 'AI Content Writer',         slug: 'ai-content-writer',     category: 'AI Tools'     },
]

const AUDIENCES = ['Indian Professionals', 'Indian Students', 'Freelancers', 'General']
const CATEGORIES = ['PDF Tools', 'Calculators', 'Converters', 'Productivity', 'AI Tools']

const STEP_LABELS = {
  1: 'Generating Reddit post...',
  2: 'Generating Quora answer...',
  3: 'Generating blog article...',
  4: 'Publishing blog to AWE-OS...',
  5: 'Posting to Twitter/X...',
  6: 'Creating Pinterest pin...',
}

function Spinner() {
  return (
    <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin shrink-0" />
  )
}

export default function AutoCampaignPage() {
  const [selectedTool, setSelectedTool] = useState(TOOLS.find(t => t.slug === 'sip-calculator') || TOOLS[0])
  const [audience,     setAudience]     = useState('Indian Professionals')
  const [phase,        setPhase]        = useState('idle')  // idle | running | done | error
  const [steps,        setSteps]        = useState([])
  const [results,      setResults]      = useState(null)
  const [copyFeedback, setCopyFeedback] = useState(null)
  const [errorMsg,     setErrorMsg]     = useState(null)
  const abortRef = useRef(null)

  const updateStep = useCallback((stepNum, patch) => {
    setSteps(prev => {
      const exists = prev.find(s => s.step === stepNum)
      if (exists) return prev.map(s => s.step === stepNum ? { ...s, ...patch } : s)
      return [...prev, { step: stepNum, ...patch }]
    })
  }, [])

  const launch = async () => {
    setPhase('running')
    setSteps([])
    setResults(null)
    setErrorMsg(null)

    const token      = localStorage.getItem(TOKEN_KEY)
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const res = await fetch(`${BASE_URL}/api/auto-campaign/run`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          toolSlug:     selectedTool.slug,
          toolName:     selectedTool.name,
          toolCategory: selectedTool.category,
          audience,
        }),
      })

      if (!res.ok) {
        const body = await res.text()
        let msg = `Server error ${res.status}`
        try { msg = JSON.parse(body).error || msg } catch {}
        throw new Error(msg)
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''
      let completed = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop()  // keep incomplete event chunk

        for (const evt of events) {
          const dataLine = evt.split('\n').find(l => l.startsWith('data: '))
          if (!dataLine) continue
          let event
          try { event = JSON.parse(dataLine.slice(6)) } catch { continue }

          if (event.step === 'complete') {
            setResults(event.results)
            setPhase('done')
            completed = true
          } else if (event.step === 'error') {
            setErrorMsg(event.error || 'Campaign failed')
            setPhase('error')
            completed = true
          } else if (typeof event.step === 'number') {
            updateStep(event.step, event)
          }
        }
      }

      if (!completed) setPhase('error')
    } catch (err) {
      if (err.name === 'AbortError') return
      console.error('[auto-campaign]', err)
      setErrorMsg(err.message || 'Something went wrong')
      setPhase('error')
    }
  }

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopyFeedback(key)
    setTimeout(() => setCopyFeedback(null), 2000)
  }

  const reset = () => {
    abortRef.current?.abort()
    setPhase('idle')
    setSteps([])
    setResults(null)
    setErrorMsg(null)
  }

  const getStep = (n) => steps.find(s => s.step === n)
  const getStatus = (n) => getStep(n)?.status || 'waiting'

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">🚀 Auto Campaign</h1>
        <p className="text-gray-400 text-sm">
          One click — blog published, tweet posted, Pinterest pin created, Reddit &amp; Quora drafted.
        </p>
      </div>

      {/* ── Setup card (idle only) ── */}
      {phase === 'idle' && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-5">

          {/* Tool selector */}
          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1.5">Select Tool</label>
            <select
              value={selectedTool.slug}
              onChange={e => {
                const t = TOOLS.find(x => x.slug === e.target.value)
                if (t) setSelectedTool(t)
              }}
              className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              {CATEGORIES.map(cat => (
                <optgroup key={cat} label={`── ${cat}`}>
                  {TOOLS.filter(t => t.category === cat).map(t => (
                    <option key={t.slug} value={t.slug}>{t.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Audience selector */}
          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1.5">Target Audience</label>
            <select
              value={audience}
              onChange={e => setAudience(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* Launch button */}
          <button
            onClick={launch}
            className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-lg py-4 rounded-xl transition-colors shadow-lg shadow-orange-500/20"
          >
            🚀 Launch Auto Campaign
          </button>

          {/* What happens */}
          <div className="bg-gray-700/40 rounded-lg p-4">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2.5">What happens automatically</p>
            <div className="space-y-1.5">
              {[
                { icon: '📝', text: 'Blog article written & published to AWE-OS' },
                { icon: '🐦', text: 'Tweet posted live with link' },
                { icon: '📌', text: 'Pinterest pin created on your board' },
                { icon: '🔴', text: 'Reddit post drafted (you paste it manually)' },
                { icon: '🟤', text: 'Quora answer drafted (you paste it manually)' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm">{item.icon}</span>
                  <p className="text-gray-400 text-xs">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Live progress log ── */}
      {(phase === 'running' || phase === 'done' || phase === 'error') && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">

          {/* Log header */}
          <div className="px-5 py-3.5 border-b border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-white font-semibold text-sm">Live Progress</h2>
              <span className="text-gray-500 text-xs">— {selectedTool.name}</span>
            </div>
            {phase === 'running' && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <span className="text-orange-400 text-xs font-medium">Running...</span>
              </div>
            )}
            {phase === 'done'  && <span className="text-green-400  text-xs font-medium">✅ Complete</span>}
            {phase === 'error' && <span className="text-red-400    text-xs font-medium">❌ Failed</span>}
          </div>

          {/* Step rows */}
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5, 6].map(n => {
              const step   = getStep(n)
              const status = getStatus(n)
              return (
                <div
                  key={n}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-colors ${
                    status === 'done'    ? 'bg-green-900/20 border border-green-800/40' :
                    status === 'running' ? 'bg-orange-900/20 border border-orange-800/40' :
                    status === 'failed'  ? 'bg-red-900/20 border border-red-800/40' :
                                          'bg-gray-700/30 border border-transparent'
                  }`}
                >
                  {/* Step number */}
                  <span className="text-gray-600 font-mono text-[11px] w-12 shrink-0">
                    {n}/{6}
                  </span>

                  {/* Status icon */}
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    {status === 'done'    && <span className="text-green-400 font-bold text-base leading-none">✅</span>}
                    {status === 'failed'  && <span className="text-red-400   font-bold text-base leading-none">❌</span>}
                    {status === 'waiting' && <span className="text-gray-600  text-sm leading-none">○</span>}
                    {status === 'running' && <Spinner />}
                  </div>

                  {/* Label */}
                  <span className={`flex-1 text-sm ${
                    status === 'done'    ? 'text-green-300'  :
                    status === 'running' ? 'text-orange-300' :
                    status === 'failed'  ? 'text-red-300'    : 'text-gray-500'
                  }`}>
                    {step?.label || STEP_LABELS[n]}
                  </span>

                  {/* URL link for done steps */}
                  {step?.url && (
                    <a
                      href={step.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-400 hover:text-indigo-300 underline shrink-0 font-medium"
                    >
                      View →
                    </a>
                  )}

                  {/* Error message */}
                  {status === 'failed' && step?.error && (
                    <span className="text-red-400 text-[11px] shrink-0 max-w-[180px] truncate" title={step.error}>
                      {step.error}
                    </span>
                  )}
                </div>
              )
            })}

            {/* Error state */}
            {phase === 'error' && (
              <div className="mt-2 bg-red-900/20 border border-red-800/40 rounded-lg px-4 py-3">
                <p className="text-red-300 text-sm font-medium">Campaign failed</p>
                {errorMsg && <p className="text-red-400 text-xs mt-0.5">{errorMsg}</p>}
                <button
                  onClick={reset}
                  className="mt-3 text-sm text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
                >
                  ↩ Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Final summary card ── */}
      {phase === 'done' && results && (
        <div className="bg-gray-800 border border-green-700/40 rounded-xl p-6">

          {/* Heading */}
          <div className="flex items-center gap-3 mb-5">
            <span className="text-3xl">🎉</span>
            <div>
              <h2 className="text-white font-bold text-lg">Campaign Complete!</h2>
              <p className="text-gray-400 text-xs mt-0.5">{selectedTool.name} · {audience}</p>
            </div>
          </div>

          {/* Live links */}
          <div className="space-y-2 mb-5">
            {[
              { icon: '📝', label: 'Blog',      key: 'blog',      data: results.blog },
              { icon: '🐦', label: 'Tweet',     key: 'twitter',   data: results.twitter },
              { icon: '📌', label: 'Pinterest', key: 'pinterest', data: results.pinterest },
            ].map(({ icon, label, key, data }) => (
              <div key={key} className="flex items-center gap-3 bg-gray-700/40 rounded-lg px-3.5 py-2.5">
                <span className="text-base w-5">{icon}</span>
                <span className="text-gray-400 text-xs w-16 shrink-0">{label}</span>
                {data?.success ? (
                  <a
                    href={data.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 text-xs hover:text-green-300 underline flex-1 truncate"
                  >
                    {data.url}
                  </a>
                ) : (
                  <span className="text-gray-600 text-xs italic">Not published</span>
                )}
              </div>
            ))}
          </div>

          {/* Manual posting */}
          <div className="border-t border-gray-700 pt-4 space-y-3">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Copy &amp; paste manually</p>

            {/* Reddit */}
            {results.reddit && (
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <span className="text-orange-400 text-xs font-semibold">🔴 Reddit</span>
                    <span className="text-gray-500 text-xs ml-2">r/{results.reddit.subreddit}</span>
                  </div>
                  <button
                    onClick={() => copyText(`**${results.reddit.title}**\n\n${results.reddit.body}`, 'reddit')}
                    className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 px-3 py-1 rounded font-medium transition-colors shrink-0"
                  >
                    {copyFeedback === 'reddit' ? '✓ Copied!' : '📋 Copy Post'}
                  </button>
                </div>
                <p className="text-gray-300 text-xs font-medium mb-1">{results.reddit.title}</p>
                <p className="text-gray-500 text-xs line-clamp-3 leading-relaxed">{results.reddit.body}</p>
              </div>
            )}

            {/* Quora */}
            {results.quora && (
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-indigo-400 text-xs font-semibold">🟤 Quora Answer</span>
                  <button
                    onClick={() => copyText(results.quora.answer, 'quora')}
                    className="text-xs bg-gray-600 hover:bg-gray-500 text-gray-200 px-3 py-1 rounded font-medium transition-colors shrink-0"
                  >
                    {copyFeedback === 'quora' ? '✓ Copied!' : '📋 Copy Answer'}
                  </button>
                </div>
                <p className="text-gray-300 text-xs font-medium mb-1 italic">Q: {results.quora.question}</p>
                <p className="text-gray-500 text-xs line-clamp-3 leading-relaxed">{results.quora.answer}</p>
              </div>
            )}
          </div>

          {/* Run another */}
          <button
            onClick={reset}
            className="mt-5 w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-xl transition-colors text-sm"
          >
            🔄 Run Another Campaign
          </button>
        </div>
      )}

    </div>
  )
}
