import { useState } from 'react'
import api from '../../../services/api.service'

const AWE_TOOLS = [
  { slug: 'merge-pdf',          name: 'Merge PDF'            },
  { slug: 'compress-pdf',       name: 'Compress PDF'         },
  { slug: 'gst-calculator',     name: 'GST Calculator'       },
  { slug: 'sip-calculator',     name: 'SIP Calculator'       },
  { slug: 'tax-calculator',     name: 'Income Tax Calculator' },
  { slug: 'bmi-calculator',     name: 'BMI Calculator'       },
  { slug: 'invoice-generator',  name: 'Invoice Generator'    },
  { slug: 'resume-builder',     name: 'AI Resume Builder'    },
  { slug: 'qr-code-generator',  name: 'QR Code Generator'   },
]

const NICHES   = ['Finance', 'PDF Tools', 'AI', 'Health', 'Business']
const TARGETS  = [
  'Indian Homemakers',
  'Young Professionals',
  'Students',
  'Small Business Owners',
  'Freelancers',
]

const PIN_TYPE_COLORS = {
  Idea:        'bg-purple-900/40 text-purple-300 border-purple-700',
  Product:     'bg-blue-900/40 text-blue-300 border-blue-700',
  'How-To':    'bg-green-900/40 text-green-300 border-green-700',
  Infographic: 'bg-pink-900/40 text-pink-300 border-pink-700',
}

function copyText(t) { navigator.clipboard.writeText(t).catch(() => {}) }

export default function PinterestGrowth() {
  const [toolSlug,      setToolSlug]      = useState('sip-calculator')
  const [niche,         setNiche]         = useState('Finance')
  const [target,        setTarget]        = useState('Young Professionals')
  const [stratLoading,  setStratLoading]  = useState(false)
  const [stratError,    setStratError]    = useState(null)
  const [boards,        setBoards]        = useState([])
  const [schedule,      setSchedule]      = useState('')

  const [selectedBoard, setSelectedBoard] = useState(null)
  const [pinsLoading,   setPinsLoading]   = useState(false)
  const [pinsError,     setPinsError]     = useState(null)
  const [pins,          setPins]          = useState([])
  const [copiedKey,     setCopiedKey]     = useState(null)

  const tool    = AWE_TOOLS.find(t => t.slug === toolSlug)
  const toolUrl = `https://awe-os.com/tools/${toolSlug}`

  async function handleBoardStrategy() {
    setStratLoading(true)
    setStratError(null)
    setBoards([])
    setSelectedBoard(null)
    setPins([])
    try {
      const res = await api.post('/api/admin/traffic/pinterest-strategy', {
        toolName: tool?.name, toolSlug, niche, targetAudience: target,
      })
      if (res.data.success) {
        setBoards(res.data.boards)
        setSchedule(res.data.pinningSchedule || '')
      } else {
        setStratError(res.data.error)
      }
    } catch (err) {
      setStratError(err.response?.data?.error || 'Strategy generation failed.')
    } finally {
      setStratLoading(false)
    }
  }

  async function handleGeneratePins(board) {
    setSelectedBoard(board)
    setPinsLoading(true)
    setPinsError(null)
    setPins([])
    try {
      const res = await api.post('/api/admin/traffic/pinterest-pins', {
        toolName: tool?.name, toolSlug, toolUrl, niche, board: board.boardName,
      })
      if (res.data.success) setPins(res.data.pins)
      else setPinsError(res.data.error)
    } catch (err) {
      setPinsError(err.response?.data?.error || 'Pin generation failed.')
    } finally {
      setPinsLoading(false)
    }
  }

  function handleCopy(key, text) {
    copyText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const bestDays = ['Sat', 'Sun', 'Fri']

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">🟡 Pinterest Board Strategy</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">AWE-OS Tool</label>
            <select value={toolSlug} onChange={e => setToolSlug(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-pink-500">
              {AWE_TOOLS.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Niche</label>
            <select value={niche} onChange={e => setNiche(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-pink-500">
              {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Target Audience</label>
            <select value={target} onChange={e => setTarget(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-pink-500">
              {TARGETS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {stratError && <p className="text-red-400 text-xs">{stratError}</p>}

        <button onClick={handleBoardStrategy} disabled={stratLoading}
          className="w-full py-2.5 bg-pink-700 hover:bg-pink-800 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors">
          {stratLoading
            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Getting Strategy...</>
            : '📋 Get Board Strategy'}
        </button>
      </div>

      {/* Boards */}
      {boards.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-white">📌 Recommended Boards</h2>
            {schedule && <p className="text-xs text-pink-300">📅 {schedule}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {boards.map((board, i) => (
              <div key={i} className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-3">
                <p className="text-white font-bold">{board.boardName}</p>
                <p className="text-xs text-gray-400">{board.description}</p>
                {board.keywords?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {board.keywords.map((k, j) => (
                      <span key={j} className="text-[10px] bg-green-900/40 text-green-300 border border-green-700/40 px-2 py-0.5 rounded-full">{k}</span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500">👥 {board.targetAudience}</p>
                <button onClick={() => handleGeneratePins(board)}
                  className="w-full py-1.5 bg-pink-700 hover:bg-pink-800 text-white text-xs font-semibold rounded-md transition-colors">
                  ✨ Generate Pins for This Board
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {pinsLoading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <span className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Generating pins for {selectedBoard?.boardName}...</p>
        </div>
      )}

      {/* Pins */}
      {pins.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-white">📍 Generated Pins — <span className="text-pink-400">{selectedBoard?.boardName}</span></h2>
          {pinsError && <p className="text-red-400 text-xs">{pinsError}</p>}
          {pins.map((pin, i) => {
            const typeColor = PIN_TYPE_COLORS[pin.pinType] || 'bg-gray-700 text-gray-300 border-gray-600'
            const titleKey  = `title-${i}`
            const allKey    = `all-${i}`
            return (
              <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${typeColor}`}>{pin.pinType}</span>
                  <span className="text-xs text-gray-500 ml-auto">⏰ {pin.bestPostingTime}</span>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1">TITLE <span className="text-gray-600">(max 100 chars)</span></label>
                  <input type="text" defaultValue={pin.title} maxLength={100}
                    className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-pink-500" />
                  <p className="text-[10px] text-gray-600 mt-0.5">{pin.title?.length || 0}/100</p>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1">DESCRIPTION <span className="text-gray-600">(max 500 chars)</span></label>
                  <textarea defaultValue={pin.description} maxLength={500} rows={4}
                    className="w-full bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-pink-500 resize-none" />
                  <p className="text-[10px] text-gray-600 mt-0.5">{pin.description?.length || 0}/500</p>
                </div>

                {pin.hashtags?.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1">HASHTAGS</label>
                    <div className="flex flex-wrap gap-1.5">
                      {pin.hashtags.map((tag, j) => (
                        <span key={j} className="text-[10px] bg-pink-900/40 text-pink-300 border border-pink-700/40 px-2 py-0.5 rounded-full">#{tag.replace(/^#/, '')}</span>
                      ))}
                    </div>
                  </div>
                )}

                {pin.searchKeywords?.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1">SEARCH KEYWORDS</label>
                    <p className="text-xs text-gray-500">{pin.searchKeywords.join(', ')}</p>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => handleCopy(titleKey, pin.title)}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition-colors">
                    {copiedKey === titleKey ? '✅ Copied' : '📋 Copy Title + Desc'}
                  </button>
                  <button onClick={() => handleCopy(allKey, [
                    pin.title,
                    '',
                    pin.description,
                    '',
                    pin.hashtags?.map(t => `#${t.replace(/^#/, '')}`).join(' ') || '',
                  ].join('\n'))}
                    className="px-3 py-1.5 bg-pink-700 hover:bg-pink-800 text-white text-xs font-semibold rounded-lg transition-colors">
                    {copiedKey === allKey ? '✅ Copied!' : '📋 Copy All'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Weekly pin calendar */}
      {boards.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-white">📅 Weekly Pin Schedule</h2>
          <p className="text-xs text-gray-500">Best times to post for Indian audiences</p>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => {
              const isBest = bestDays.includes(day)
              return (
                <div key={day} className={`rounded-lg p-2 text-center border ${isBest ? 'bg-pink-900/30 border-pink-700/50' : 'bg-gray-900 border-gray-700'}`}>
                  <p className={`text-xs font-bold ${isBest ? 'text-pink-300' : 'text-gray-400'}`}>{day}</p>
                  <p className="text-[10px] text-gray-500 mt-1">{isBest ? '8-10pm' : '7-9pm'}</p>
                  {isBest && <p className="text-[10px] text-pink-400 font-semibold mt-1">Best</p>}
                </div>
              )
            })}
          </div>
          {schedule && (
            <div className="bg-gray-900 rounded-lg p-3 mt-2">
              <p className="text-xs text-gray-300">{schedule}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
