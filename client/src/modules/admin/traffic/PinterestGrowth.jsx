import { useState } from 'react'
import api from '../../../services/api.service'

// ── All 49 AWE-OS tools ───────────────────────────────────────────────────────
const AWE_TOOLS = [
  { slug: 'merge-pdf',            name: 'Merge PDF'              },
  { slug: 'split-pdf',            name: 'Split PDF'              },
  { slug: 'compress-pdf',         name: 'Compress PDF'           },
  { slug: 'remove-pages-pdf',     name: 'Remove PDF Pages'       },
  { slug: 'extract-pages-pdf',    name: 'Extract PDF Pages'      },
  { slug: 'organize-pdf',         name: 'Organize PDF'           },
  { slug: 'rotate-pdf',           name: 'Rotate PDF'             },
  { slug: 'watermark-pdf',        name: 'Add Watermark to PDF'   },
  { slug: 'page-numbers-pdf',     name: 'Add Page Numbers to PDF'},
  { slug: 'pdf-editor',           name: 'PDF Editor'             },
  { slug: 'protect-pdf',          name: 'Protect PDF'            },
  { slug: 'unlock-pdf',           name: 'Unlock PDF'             },
  { slug: 'jpg-to-pdf',           name: 'JPG to PDF'             },
  { slug: 'word-to-pdf',          name: 'Word to PDF'            },
  { slug: 'excel-to-pdf',         name: 'Excel to PDF'           },
  { slug: 'powerpoint-to-pdf',    name: 'PowerPoint to PDF'      },
  { slug: 'pdf-to-jpg',           name: 'PDF to JPG'             },
  { slug: 'pdf-to-word',          name: 'PDF to Word'            },
  { slug: 'pdf-to-text',          name: 'PDF to Text'            },
  { slug: 'pdf-to-ppt',           name: 'PDF to PowerPoint'      },
  { slug: 'pdf-to-excel',         name: 'PDF to Excel'           },
  { slug: 'sip-calculator',       name: 'SIP Calculator'         },
  { slug: 'fd-calculator',        name: 'FD Calculator'          },
  { slug: 'ppf-calculator',       name: 'PPF Calculator'         },
  { slug: 'roi-calculator',       name: 'ROI Calculator'         },
  { slug: 'tax-calculator',       name: 'Income Tax Calculator'  },
  { slug: 'gst-calculator',       name: 'GST Calculator'         },
  { slug: 'loan-calculator',      name: 'Loan EMI Calculator'    },
  { slug: 'percentage-calculator',name: 'Percentage Calculator'  },
  { slug: 'discount-calculator',  name: 'Discount Calculator'    },
  { slug: 'tip-calculator',       name: 'Tip Calculator'         },
  { slug: 'bmi-calculator',       name: 'BMI Calculator'         },
  { slug: 'age-calculator',       name: 'Age Calculator'         },
  { slug: 'gpa-calculator',       name: 'GPA Calculator'         },
  { slug: 'unit-converter',       name: 'Unit Converter'         },
  { slug: 'currency-converter',   name: 'Currency Converter'     },
  { slug: 'base-converter',       name: 'Number Base Converter'  },
  { slug: 'csv-to-json',          name: 'CSV to JSON'            },
  { slug: 'json-formatter',       name: 'JSON Formatter'         },
  { slug: 'word-counter',         name: 'Word Counter'           },
  { slug: 'password-generator',   name: 'Password Generator'     },
  { slug: 'color-picker',         name: 'Color Picker'           },
  { slug: 'qr-code-generator',    name: 'QR Code Generator'      },
  { slug: 'image-compressor',     name: 'Image Compressor'       },
  { slug: 'invoice-generator',    name: 'Invoice Generator'      },
  { slug: 'contract-generator',   name: 'Contract Generator'     },
  { slug: 'resume-builder',       name: 'AI Resume Builder'      },
  { slug: 'ai-content-writer',    name: 'AI Content Writer'      },
]

// ── 5 Pinterest boards ────────────────────────────────────────────────────────
const BOARDS = [
  { name: 'Free PDF Tools',            color: 'pink'   },
  { name: 'Finance Calculators India', color: 'green'  },
  { name: 'Productivity Tools',        color: 'blue'   },
  { name: 'AI Tools Free',             color: 'purple' },
  { name: 'Online Calculators',        color: 'yellow' },
]

const BOARD_STYLE = {
  pink:   { pill: 'bg-pink-900/50 text-pink-300 border-pink-700',    card: 'border-pink-600/60 bg-pink-950/20',   dot: 'bg-pink-500'   },
  green:  { pill: 'bg-green-900/50 text-green-300 border-green-700', card: 'border-green-600/60 bg-green-950/20', dot: 'bg-green-500'  },
  blue:   { pill: 'bg-blue-900/50 text-blue-300 border-blue-700',    card: 'border-blue-600/60 bg-blue-950/20',   dot: 'bg-blue-500'   },
  purple: { pill: 'bg-purple-900/50 text-purple-300 border-purple-700', card: 'border-purple-600/60 bg-purple-950/20', dot: 'bg-purple-500' },
  yellow: { pill: 'bg-yellow-900/50 text-yellow-300 border-yellow-700', card: 'border-yellow-600/60 bg-yellow-950/20', dot: 'bg-yellow-500' },
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const BEST_DAYS = new Set(['Sat', 'Sun', 'Fri'])

// ── localStorage ──────────────────────────────────────────────────────────────
const SCHED_KEY = 'awe_pinterest_schedule'

function loadSchedule() {
  try {
    const raw = JSON.parse(localStorage.getItem(SCHED_KEY) || 'null')
    if (raw && typeof raw === 'object') return raw
  } catch {}
  return Object.fromEntries(DAYS.map(d => [d, []]))
}
function saveSchedule(s) {
  try { localStorage.setItem(SCHED_KEY, JSON.stringify(s)) } catch {}
}

function copyText(t) { navigator.clipboard.writeText(t).catch(() => {}) }

// ── Component ─────────────────────────────────────────────────────────────────
export default function PinterestGrowth() {
  const [toolSlug,      setToolSlug]      = useState('sip-calculator')
  const [board,         setBoard]         = useState('Finance Calculators India')
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState(null)

  // Generated content
  const [titles,        setTitles]        = useState([])      // string[]
  const [description,   setDescription]   = useState('')
  const [hashtags,      setHashtags]      = useState([])      // string[]

  // User selections
  const [selectedTitle, setSelectedTitle] = useState(0)       // index
  const [copiedKey,     setCopiedKey]     = useState(null)

  // Day-picker
  const [showDayPicker, setShowDayPicker] = useState(false)

  // Schedule
  const [schedule, setSchedule] = useState(loadSchedule)

  const tool     = AWE_TOOLS.find(t => t.slug === toolSlug)
  const toolUrl  = `https://www.awe-os.com/tools/${toolSlug}`
  const boardClr = BOARD_STYLE[BOARDS.find(b => b.name === board)?.color || 'pink']

  // ── Generate ────────────────────────────────────────────────────────────────
  async function handleGenerate() {
    setLoading(true)
    setError(null)
    setTitles([])
    setDescription('')
    setHashtags([])
    setSelectedTitle(0)
    setShowDayPicker(false)
    try {
      const res = await api.post('/api/admin/traffic/pinterest-pin-claude', {
        toolName: tool?.name,
        toolSlug,
        toolUrl,
        board,
        keywords: `${tool?.name} India free online`,
      })
      if (res.data.success) {
        setTitles(res.data.titles || [])
        setDescription(res.data.description || '')
        setHashtags(res.data.hashtags || [])
      } else {
        setError(res.data.error)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Generation failed.')
    } finally {
      setLoading(false)
    }
  }

  // ── Copy helper ─────────────────────────────────────────────────────────────
  function handleCopy(key, text) {
    copyText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // ── Add pin to a calendar day ───────────────────────────────────────────────
  function handleAddToDay(day) {
    if (!titles.length) return
    const pin = {
      id:        Date.now(),
      title:     titles[selectedTitle] || titles[0],
      tool:      tool?.name || toolSlug,
      toolSlug,
      board,
      color:     BOARDS.find(b => b.name === board)?.color || 'pink',
    }
    setSchedule(prev => {
      const updated = { ...prev, [day]: [...(prev[day] || []).slice(0, 1), pin] }
      saveSchedule(updated)
      return updated
    })
    setShowDayPicker(false)
  }

  function handleRemovePin(day, id) {
    setSchedule(prev => {
      const updated = { ...prev, [day]: prev[day].filter(p => p.id !== id) }
      saveSchedule(updated)
      return updated
    })
  }

  function handleClearSchedule() {
    const empty = Object.fromEntries(DAYS.map(d => [d, []]))
    setSchedule(empty)
    saveSchedule(empty)
  }

  // ── Export schedule as text ─────────────────────────────────────────────────
  function handleExport() {
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    const lines = [
      `AWE-OS Pinterest Schedule — Week of ${today}`,
      '='.repeat(50),
      '',
    ]
    DAYS.forEach(day => {
      const pins = schedule[day] || []
      if (pins.length === 0) {
        lines.push(`${day.padEnd(3)}: —`)
      } else {
        pins.forEach((p, i) => {
          lines.push(`${i === 0 ? day.padEnd(3) : '   '}: "${p.title}"`)
          lines.push(`       Board: ${p.board}  |  Tool: ${p.tool}`)
          lines.push(`       URL: https://www.awe-os.com/tools/${p.toolSlug}`)
          if (i < pins.length - 1) lines.push('')
        })
      }
      lines.push('')
    })
    lines.push('Generated by AWE-OS Admin Panel')
    handleCopy('export', lines.join('\n'))
  }

  const totalPins = DAYS.reduce((n, d) => n + (schedule[d]?.length || 0), 0)
  const descWords = description.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="space-y-6">

      {/* ── Controls ──────────────────────────────────────────────────────────── */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-white">📌 Pinterest Pin Generator</h2>
          <span className="text-[10px] text-gray-500">{AWE_TOOLS.length} tools · 5 boards</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">AWE-OS Tool</label>
            <select
              value={toolSlug}
              onChange={e => { setToolSlug(e.target.value); setTitles([]); setDescription(''); setHashtags([]) }}
              className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500"
            >
              {AWE_TOOLS.map(t => (
                <option key={t.slug} value={t.slug}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Pinterest Board</label>
            <select
              value={board}
              onChange={e => { setBoard(e.target.value); setTitles([]); setDescription(''); setHashtags([]) }}
              className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500"
            >
              {BOARDS.map(b => (
                <option key={b.name} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Board + tool preview */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${boardClr.pill}`}>
            📌 {board}
          </span>
          <span className="text-[11px] text-gray-500">→</span>
          <span className="text-[11px] text-orange-400 font-mono">{toolUrl}</span>
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          {loading
            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating Pin Content...</>
            : '✨ Generate Pin Content'}
        </button>
      </div>

      {/* ── Generated Pin Content ─────────────────────────────────────────────── */}
      {titles.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-5">
          <h2 className="text-sm font-semibold text-white">📍 Pin Content — <span className={`${BOARD_STYLE[BOARDS.find(b=>b.name===board)?.color||'pink'].pill.split(' ')[1]}`}>{board}</span></h2>

          {/* Title options */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">
              PIN TITLE OPTIONS <span className="text-gray-600 font-normal">(click to select)</span>
            </label>
            <div className="space-y-2">
              {titles.map((t, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedTitle(i)}
                  className={`
                    relative cursor-pointer rounded-lg px-4 py-3 border transition-all
                    ${selectedTitle === i
                      ? 'border-orange-500 bg-orange-950/30'
                      : 'border-gray-700 bg-gray-900 hover:border-gray-500 hover:bg-gray-800/80'
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Selection indicator */}
                    <div className={`w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                      selectedTitle === i ? 'border-orange-500 bg-orange-500' : 'border-gray-600'
                    }`}>
                      {selectedTitle === i && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${selectedTitle === i ? 'text-white' : 'text-gray-300'}`}>{t}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">{t.length}/100 chars</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleCopy(`title-${i}`, t) }}
                      className="shrink-0 text-[10px] px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                    >
                      {copiedKey === `title-${i}` ? '✅' : '📋'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-gray-400">PIN DESCRIPTION</label>
              <span className={`text-[10px] font-medium ${descWords >= 150 && descWords <= 200 ? 'text-green-400' : 'text-yellow-400'}`}>
                {descWords} words {descWords < 150 ? '(too short)' : descWords > 200 ? '(too long)' : '✓'}
              </span>
            </div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={7}
              className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 resize-none leading-relaxed"
            />
          </div>

          {/* Hashtags */}
          {hashtags.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-gray-400">HASHTAGS ({hashtags.length})</label>
                <button
                  onClick={() => handleCopy('hashtags', hashtags.map(h => `#${h.replace(/^#/, '')}`).join(' '))}
                  className="text-[10px] px-2.5 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                >
                  {copiedKey === 'hashtags' ? '✅ All Copied' : '📋 Copy All'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {hashtags.map((tag, i) => {
                  const clean = tag.replace(/^#/, '')
                  return (
                    <button
                      key={i}
                      onClick={() => handleCopy(`tag-${i}`, `#${clean}`)}
                      title="Click to copy"
                      className="text-[11px] px-2.5 py-1 bg-pink-950/40 hover:bg-pink-900/50 text-pink-300 border border-pink-800/50 rounded-full transition-colors cursor-pointer"
                    >
                      {copiedKey === `tag-${i}` ? '✅' : `#${clean}`}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Action row */}
          <div className="flex gap-2 flex-wrap pt-1">
            <button
              onClick={() => handleCopy('full', `${titles[selectedTitle]}\n\n${description}\n\n${hashtags.map(h=>`#${h.replace(/^#/,'')}`).join(' ')}`)}
              className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {copiedKey === 'full' ? '✅ Copied!' : '📋 Copy Full Pin'}
            </button>
            <button
              onClick={() => setShowDayPicker(v => !v)}
              disabled={!titles.length}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
            >
              📅 Add to Schedule {showDayPicker ? '▲' : '▼'}
            </button>
          </div>

          {/* Day picker */}
          {showDayPicker && (
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
              <p className="text-[10px] text-gray-400 mb-2 font-medium">CHOOSE DAY (max 2 pins per day)</p>
              <div className="flex gap-2 flex-wrap">
                {DAYS.map(day => {
                  const count = (schedule[day] || []).length
                  const full  = count >= 2
                  return (
                    <button
                      key={day}
                      onClick={() => !full && handleAddToDay(day)}
                      disabled={full}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        full
                          ? 'bg-gray-700/50 text-gray-600 cursor-not-allowed'
                          : BEST_DAYS.has(day)
                          ? 'bg-orange-600 hover:bg-orange-700 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      {day} {full ? '(full)' : count === 1 ? '(1)' : ''}
                    </button>
                  )
                })}
              </div>
              <p className="text-[10px] text-gray-600 mt-2">Orange = best engagement days (Fri–Sun)</p>
            </div>
          )}
        </div>
      )}

      {/* ── Weekly Calendar ───────────────────────────────────────────────────── */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-white">📅 Weekly Pin Schedule</h2>
            {totalPins > 0 && (
              <span className="text-[10px] bg-orange-900/40 text-orange-300 border border-orange-700/50 px-2 py-0.5 rounded-full">
                {totalPins} pin{totalPins !== 1 ? 's' : ''} scheduled
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {totalPins > 0 && (
              <>
                <button
                  onClick={handleExport}
                  className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  {copiedKey === 'export' ? '✅ Exported!' : '📤 Export Schedule'}
                </button>
                <button
                  onClick={handleClearSchedule}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition-colors"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>

        {/* Board color legend */}
        <div className="flex flex-wrap gap-2">
          {BOARDS.map(b => (
            <span key={b.name} className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${BOARD_STYLE[b.color].pill}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${BOARD_STYLE[b.color].dot}`} />
              {b.name}
            </span>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map(day => {
            const pins    = schedule[day] || []
            const isBest  = BEST_DAYS.has(day)
            return (
              <div
                key={day}
                className={`rounded-lg border min-h-[120px] flex flex-col ${
                  isBest ? 'bg-orange-950/20 border-orange-700/40' : 'bg-gray-900 border-gray-700/60'
                }`}
              >
                {/* Day header */}
                <div className={`px-2 py-1.5 border-b ${isBest ? 'border-orange-700/30' : 'border-gray-700/50'}`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-bold ${isBest ? 'text-orange-300' : 'text-gray-400'}`}>{day}</p>
                    {isBest && <span className="text-[8px] text-orange-400 font-semibold">BEST</span>}
                  </div>
                  <p className="text-[9px] text-gray-600 mt-0.5">{isBest ? '8–10 pm IST' : '7–9 pm IST'}</p>
                </div>

                {/* Pin slots */}
                <div className="flex-1 p-1.5 space-y-1">
                  {pins.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-[10px] text-gray-700">empty</p>
                    </div>
                  ) : (
                    pins.map(pin => {
                      const style = BOARD_STYLE[pin.color] || BOARD_STYLE.pink
                      return (
                        <div
                          key={pin.id}
                          className={`relative rounded p-1.5 border text-[9px] leading-tight ${style.card}`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${style.dot} mb-1`} />
                          <p className="text-gray-300 font-medium line-clamp-2">{pin.title}</p>
                          <p className="text-gray-600 mt-0.5 truncate">{pin.tool}</p>
                          <button
                            onClick={() => handleRemovePin(day, pin.id)}
                            className="absolute top-1 right-1 text-gray-600 hover:text-red-400 transition-colors text-[10px]"
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      )
                    })
                  )}

                  {/* Add slot indicator */}
                  {pins.length < 2 && pins.length > 0 && (
                    <div className="text-center">
                      <p className="text-[9px] text-gray-700">+ 1 more slot</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {totalPins === 0 && (
          <p className="text-xs text-gray-600 text-center py-2">
            Generate pin content above, then click "Add to Schedule" to plan your week
          </p>
        )}
      </div>

    </div>
  )
}
