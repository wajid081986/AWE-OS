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

const HISTORY_KEY = 'awe_quora_history'

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
}
function saveHistory(items) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 20))) } catch {}
}

function copyText(t) { navigator.clipboard.writeText(t).catch(() => {}) }

function OpportunityBadge({ level }) {
  const cls =
    level === 'High'   ? 'bg-green-900/40 text-green-300 border-green-700' :
    level === 'Medium' ? 'bg-yellow-900/40 text-yellow-300 border-yellow-700' :
                         'bg-gray-700 text-gray-400 border-gray-600'
  return <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${cls}`}>{level}</span>
}

export default function QuoraGrowth() {
  const [topic,          setTopic]          = useState('')
  const [toolSlug,       setToolSlug]       = useState('sip-calculator')
  const [qLoading,       setQLoading]       = useState(false)
  const [qError,         setQError]         = useState(null)
  const [questions,      setQuestions]      = useState([])

  const [selectedQ,      setSelectedQ]      = useState(null)
  const [answerLoading,  setAnswerLoading]  = useState(false)
  const [answerError,    setAnswerError]    = useState(null)
  const [answer,         setAnswer]         = useState(null)
  const [answerText,     setAnswerText]     = useState('')
  const [copiedKey,      setCopiedKey]      = useState(null)

  const [history, setHistory] = useState(loadHistory)

  const tool    = AWE_TOOLS.find(t => t.slug === toolSlug)
  const toolUrl = `https://awe-os.com/tools/${toolSlug}`

  async function handleFindQuestions() {
    if (!topic.trim()) { setQError('Enter a topic first.'); return }
    setQLoading(true)
    setQError(null)
    setQuestions([])
    setSelectedQ(null)
    setAnswer(null)
    try {
      const res = await api.post('/api/admin/traffic/quora-questions', {
        topic, toolName: tool?.name, niche: 'Finance',
      })
      if (res.data.success) setQuestions(res.data.questions)
      else setQError(res.data.error)
    } catch (err) {
      setQError(err.response?.data?.error || 'Failed to find questions.')
    } finally {
      setQLoading(false)
    }
  }

  async function handleWriteAnswer(q) {
    setSelectedQ(q)
    setAnswerLoading(true)
    setAnswerError(null)
    setAnswer(null)
    setAnswerText('')
    try {
      const res = await api.post('/api/admin/traffic/quora-answer', {
        question: q.question, toolName: tool?.name, toolSlug, toolUrl, niche: 'Finance',
      })
      if (res.data.success && res.data.answer) {
        setAnswer(res.data.answer)
        setAnswerText(res.data.answer.content || '')
      } else {
        setAnswerError(res.data.error || 'Answer generation failed.')
      }
    } catch (err) {
      setAnswerError(err.response?.data?.error || 'Answer generation failed.')
    } finally {
      setAnswerLoading(false)
    }
  }

  function handleCopy(key, text) {
    copyText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  function handleSave() {
    if (!selectedQ || !answerText) return
    const entry = {
      id: Date.now(),
      date: new Date().toLocaleDateString('en-IN'),
      question: selectedQ.question,
      views: selectedQ.estimatedViews,
      answer: answerText,
    }
    const updated = [entry, ...history]
    setHistory(updated)
    saveHistory(updated)
  }

  function handleDeleteHistory(id) {
    const updated = history.filter(h => h.id !== id)
    setHistory(updated)
    saveHistory(updated)
  }

  const wcText = answerText ? answerText.split(/\s+/).filter(Boolean).length : 0

  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">🔵 Quora Question Finder</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Topic</label>
            <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFindQuestions()}
              placeholder="GST calculation for freelancers India"
              className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-red-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">AWE-OS Tool</label>
            <select value={toolSlug} onChange={e => setToolSlug(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-red-500">
              {AWE_TOOLS.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
            </select>
          </div>
        </div>

        {qError && <p className="text-red-400 text-xs">{qError}</p>}

        <button onClick={handleFindQuestions} disabled={qLoading}
          className="w-full py-2.5 bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors">
          {qLoading
            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Finding Questions...</>
            : '🔍 Find Quora Questions'}
        </button>
      </div>

      {/* Questions */}
      {questions.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-white">❓ High-Opportunity Questions</h2>
          <div className="space-y-3">
            {questions.map((q, i) => (
              <div key={i} className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <p className="text-white text-sm font-semibold flex-1">{q.question}</p>
                  <OpportunityBadge level={q.opportunity} />
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-gray-400 text-xs">👁 {q.estimatedViews}</span>
                  <span className="text-gray-500 text-xs italic">{q.reason}</span>
                </div>
                <button onClick={() => handleWriteAnswer(q)}
                  className="w-full py-1.5 bg-red-700 hover:bg-red-800 text-white text-xs font-semibold rounded-md transition-colors">
                  ✍️ Write Expert Answer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected question + generate */}
      {selectedQ && !answer && !answerLoading && (
        <div className="bg-gray-800 border border-red-700/50 rounded-xl p-5 space-y-4">
          <p className="text-xs text-gray-400 font-semibold">SELECTED QUESTION</p>
          <p className="text-white font-semibold">{selectedQ.question}</p>
          {answerError && <p className="text-red-400 text-xs">{answerError}</p>}
          <button onClick={() => handleWriteAnswer(selectedQ)}
            className="w-full py-2.5 bg-red-700 hover:bg-red-800 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors">
            ⚡ Generate Expert Answer
          </button>
        </div>
      )}

      {answerLoading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <span className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Writing expert Quora answer...</p>
        </div>
      )}

      {/* Answer preview */}
      {answer && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-white">✍️ Expert Answer</h2>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span>📝 {wcText} words</span>
              {answer.estimatedViews && <span>👁 Est. {answer.estimatedViews}</span>}
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-3 border-l-2 border-red-600">
            <p className="text-[10px] text-red-400 font-semibold mb-1">OPENING CREDENTIALS</p>
            <p className="text-xs text-gray-300">{answer.credentials}</p>
          </div>

          <textarea value={answerText} onChange={e => setAnswerText(e.target.value)} rows={16}
            className="w-full bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-red-500 resize-none" />

          {answer.aweosMention && (
            <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-lg p-3">
              <p className="text-[10px] text-yellow-400 font-semibold mb-1">AWE-OS MENTION (highlighted)</p>
              <p className="text-xs text-yellow-300">{answer.aweosMention}</p>
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            <button onClick={() => handleCopy('full', answerText)}
              className="flex-1 py-2 bg-red-700 hover:bg-red-800 text-white text-sm font-semibold rounded-lg transition-colors">
              {copiedKey === 'full' ? '✅ Copied!' : '📋 Copy Full Answer'}
            </button>
            <button onClick={() => {
              const withoutCta = answerText.replace(answer.callToAction || '', '').trim()
              handleCopy('nocta', withoutCta)
            }}
              className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors">
              {copiedKey === 'nocta' ? '✅ Copied!' : '📋 Copy Without CTA'}
            </button>
            <button onClick={handleSave}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors">
              💾 Save
            </button>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-white">📚 Answer History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700">
                  {['Date', 'Question', 'Views', '', ''].map((h, i) => (
                    <th key={i} className="text-left py-2 px-2 text-gray-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id} className="border-b border-gray-700/40">
                    <td className="py-2 px-2 text-gray-400 whitespace-nowrap">{h.date}</td>
                    <td className="py-2 px-2 text-gray-300 max-w-[240px] truncate">{h.question}</td>
                    <td className="py-2 px-2 text-red-400 whitespace-nowrap">{h.views}</td>
                    <td className="py-2 px-2">
                      <button onClick={() => handleCopy(`hist-${h.id}`, h.answer)}
                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors">
                        {copiedKey === `hist-${h.id}` ? '✅' : '📋'}
                      </button>
                    </td>
                    <td className="py-2 px-2">
                      <button onClick={() => handleDeleteHistory(h.id)}
                        className="px-2 py-1 bg-red-900/40 hover:bg-red-900/70 text-red-400 rounded transition-colors">
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
