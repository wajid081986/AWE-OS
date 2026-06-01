import { useState } from 'react'
import api from '../../../services/api.service'

// ── All 49 AWE-OS tools ───────────────────────────────────────────────────────
const AWE_TOOLS = [
  // PDF Tools
  { slug: 'merge-pdf',            name: 'Merge PDF',                  niche: 'Document Management' },
  { slug: 'split-pdf',            name: 'Split PDF',                  niche: 'Document Management' },
  { slug: 'compress-pdf',         name: 'Compress PDF',               niche: 'Document Management' },
  { slug: 'remove-pages-pdf',     name: 'Remove PDF Pages',           niche: 'Document Management' },
  { slug: 'extract-pages-pdf',    name: 'Extract PDF Pages',          niche: 'Document Management' },
  { slug: 'organize-pdf',         name: 'Organize PDF',               niche: 'Document Management' },
  { slug: 'rotate-pdf',           name: 'Rotate PDF',                 niche: 'Document Management' },
  { slug: 'watermark-pdf',        name: 'Add Watermark to PDF',       niche: 'Document Management' },
  { slug: 'page-numbers-pdf',     name: 'Add Page Numbers to PDF',    niche: 'Document Management' },
  { slug: 'pdf-editor',           name: 'PDF Editor',                 niche: 'Document Management' },
  { slug: 'protect-pdf',          name: 'Protect PDF',                niche: 'Document Management' },
  { slug: 'unlock-pdf',           name: 'Unlock PDF',                 niche: 'Document Management' },
  // PDF Conversions
  { slug: 'jpg-to-pdf',           name: 'JPG to PDF',                 niche: 'File Conversion' },
  { slug: 'word-to-pdf',          name: 'Word to PDF',                niche: 'File Conversion' },
  { slug: 'excel-to-pdf',         name: 'Excel to PDF',               niche: 'File Conversion' },
  { slug: 'powerpoint-to-pdf',    name: 'PowerPoint to PDF',          niche: 'File Conversion' },
  { slug: 'pdf-to-jpg',           name: 'PDF to JPG',                 niche: 'File Conversion' },
  { slug: 'pdf-to-word',          name: 'PDF to Word',                niche: 'File Conversion' },
  { slug: 'pdf-to-text',          name: 'PDF to Text',                niche: 'File Conversion' },
  { slug: 'pdf-to-ppt',           name: 'PDF to PowerPoint',          niche: 'File Conversion' },
  { slug: 'pdf-to-excel',         name: 'PDF to Excel',               niche: 'File Conversion' },
  // Finance Calculators
  { slug: 'sip-calculator',       name: 'SIP Calculator',             niche: 'Personal Finance' },
  { slug: 'fd-calculator',        name: 'FD Calculator',              niche: 'Personal Finance' },
  { slug: 'ppf-calculator',       name: 'PPF Calculator',             niche: 'Personal Finance' },
  { slug: 'roi-calculator',       name: 'ROI Calculator',             niche: 'Business Finance' },
  { slug: 'tax-calculator',       name: 'Income Tax Calculator',      niche: 'Tax & Finance' },
  { slug: 'gst-calculator',       name: 'GST Calculator',             niche: 'Tax & Finance' },
  { slug: 'loan-calculator',      name: 'Loan EMI Calculator',        niche: 'Personal Finance' },
  { slug: 'percentage-calculator',name: 'Percentage Calculator',      niche: 'General Maths' },
  { slug: 'discount-calculator',  name: 'Discount Calculator',        niche: 'Shopping & Finance' },
  { slug: 'tip-calculator',       name: 'Tip Calculator',             niche: 'General Maths' },
  // Health & Education Calculators
  { slug: 'bmi-calculator',       name: 'BMI Calculator',             niche: 'Health & Fitness' },
  { slug: 'age-calculator',       name: 'Age Calculator',             niche: 'General Utilities' },
  { slug: 'gpa-calculator',       name: 'GPA Calculator',             niche: 'Education' },
  // Converters & Generators
  { slug: 'unit-converter',       name: 'Unit Converter',             niche: 'Science & Engineering' },
  { slug: 'currency-converter',   name: 'Currency Converter',         niche: 'Travel & Finance' },
  { slug: 'base-converter',       name: 'Number Base Converter',      niche: 'Programming' },
  { slug: 'csv-to-json',          name: 'CSV to JSON',                niche: 'Programming' },
  { slug: 'json-formatter',       name: 'JSON Formatter',             niche: 'Programming' },
  { slug: 'word-counter',         name: 'Word Counter',               niche: 'Writing & Content' },
  { slug: 'password-generator',   name: 'Password Generator',         niche: 'Cybersecurity' },
  { slug: 'color-picker',         name: 'Color Picker',               niche: 'Design' },
  { slug: 'qr-code-generator',    name: 'QR Code Generator',          niche: 'Marketing & Business' },
  { slug: 'image-compressor',     name: 'Image Compressor',           niche: 'Web & Design' },
  // Productivity & AI
  { slug: 'invoice-generator',    name: 'Invoice Generator',          niche: 'Small Business' },
  { slug: 'contract-generator',   name: 'Contract Generator',         niche: 'Freelancing & Legal' },
  { slug: 'resume-builder',       name: 'AI Resume Builder',          niche: 'Career & Jobs' },
  { slug: 'ai-content-writer',    name: 'AI Content Writer',          niche: 'Writing & Marketing' },
]

// ── localStorage ──────────────────────────────────────────────────────────────
const QUEUE_KEY = 'awe_quora_queue'

function loadQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') } catch { return [] }
}
function saveQueue(items) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(0, 50))) } catch {}
}

function copyText(t) { navigator.clipboard.writeText(t).catch(() => {}) }

// ── Small UI helpers ──────────────────────────────────────────────────────────
function OpportunityBadge({ level }) {
  const cls =
    level === 'High'   ? 'bg-green-900/40 text-green-300 border-green-700' :
    level === 'Medium' ? 'bg-yellow-900/40 text-yellow-300 border-yellow-700' :
                         'bg-gray-700 text-gray-400 border-gray-600'
  return <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${cls}`}>{level}</span>
}

function StatusBadge({ status }) {
  const cls = status === 'Posted'
    ? 'bg-green-900/40 text-green-300 border-green-700'
    : 'bg-yellow-900/30 text-yellow-300 border-yellow-700/60'
  return <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${cls}`}>{status}</span>
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function QuoraGrowth() {
  const [toolSlug,      setToolSlug]      = useState('sip-calculator')
  const [qLoading,      setQLoading]      = useState(false)
  const [qError,        setQError]        = useState(null)
  const [questions,     setQuestions]     = useState([])

  const [selectedQ,     setSelectedQ]     = useState(null)
  const [answerLoading, setAnswerLoading] = useState(false)
  const [answerError,   setAnswerError]   = useState(null)
  const [answerMeta,    setAnswerMeta]    = useState(null)   // { aweosMention, callToAction }
  const [answerText,    setAnswerText]    = useState('')
  const [copiedKey,     setCopiedKey]     = useState(null)

  const [queue, setQueue] = useState(loadQueue)

  const tool    = AWE_TOOLS.find(t => t.slug === toolSlug)
  const toolUrl = `https://www.awe-os.com/tools/${toolSlug}`

  // ── Find questions ──────────────────────────────────────────────────────────
  async function handleFindQuestions() {
    setQLoading(true)
    setQError(null)
    setQuestions([])
    setSelectedQ(null)
    setAnswerText('')
    setAnswerMeta(null)
    try {
      const res = await api.post('/api/admin/traffic/quora-questions-claude', {
        toolName: tool?.name,
        toolSlug,
        niche: tool?.niche,
      })
      if (res.data.success) setQuestions(res.data.questions)
      else setQError(res.data.error)
    } catch (err) {
      setQError(err.response?.data?.error || 'Failed to find questions.')
    } finally {
      setQLoading(false)
    }
  }

  // ── Select a question card ──────────────────────────────────────────────────
  function handleSelectQuestion(q) {
    if (selectedQ?.question === q.question) {
      setSelectedQ(null)
    } else {
      setSelectedQ(q)
      setAnswerText('')
      setAnswerMeta(null)
      setAnswerError(null)
    }
  }

  // ── Write answer ────────────────────────────────────────────────────────────
  async function handleWriteAnswer() {
    if (!selectedQ) return
    setAnswerLoading(true)
    setAnswerError(null)
    setAnswerText('')
    setAnswerMeta(null)
    try {
      const res = await api.post('/api/admin/traffic/quora-answer-claude', {
        question: selectedQ.question,
        toolName: tool?.name,
        toolSlug,
        toolUrl,
        niche: tool?.niche,
      })
      if (res.data.success && res.data.answer) {
        setAnswerText(res.data.answer.content || '')
        setAnswerMeta({ aweosMention: res.data.answer.aweosMention, callToAction: res.data.answer.callToAction })
      } else {
        setAnswerError(res.data.error || 'Answer generation failed.')
      }
    } catch (err) {
      setAnswerError(err.response?.data?.error || 'Answer generation failed.')
    } finally {
      setAnswerLoading(false)
    }
  }

  // ── Copy helper ─────────────────────────────────────────────────────────────
  function handleCopy(key, text) {
    copyText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  // ── Schedule to queue ───────────────────────────────────────────────────────
  function handleSchedule() {
    if (!selectedQ || !answerText) return
    const entry = {
      id:       Date.now(),
      date:     new Date().toLocaleDateString('en-IN'),
      question: selectedQ.question,
      tool:     tool?.name || toolSlug,
      toolSlug,
      answer:   answerText,
      status:   'Pending',
    }
    const updated = [entry, ...queue]
    setQueue(updated)
    saveQueue(updated)
  }

  function handleToggleStatus(id) {
    const updated = queue.map(e =>
      e.id === id ? { ...e, status: e.status === 'Pending' ? 'Posted' : 'Pending' } : e
    )
    setQueue(updated)
    saveQueue(updated)
  }

  function handleDeleteQueue(id) {
    const updated = queue.filter(e => e.id !== id)
    setQueue(updated)
    saveQueue(updated)
  }

  const wcText  = answerText ? answerText.trim().split(/\s+/).length : 0
  const pending = queue.filter(e => e.status === 'Pending').length
  const posted  = queue.filter(e => e.status === 'Posted').length

  return (
    <div className="space-y-6">

      {/* ── Tool Selector ───────────────────────────────────────────────────── */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-white">🔵 Quora Answer Generator</h2>
          <span className="text-[10px] text-gray-500">{AWE_TOOLS.length} tools available</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">AWE-OS Tool</label>
            <select
              value={toolSlug}
              onChange={e => { setToolSlug(e.target.value); setQuestions([]); setSelectedQ(null); setAnswerText('') }}
              className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500"
            >
              {AWE_TOOLS.map(t => (
                <option key={t.slug} value={t.slug}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col justify-end">
            <div className="bg-gray-900 rounded-lg px-3 py-2 border border-gray-700/50">
              <p className="text-[10px] text-gray-500 mb-0.5">Tool URL</p>
              <p className="text-xs text-orange-400 font-mono truncate">{toolUrl}</p>
            </div>
          </div>
        </div>

        {qError && <p className="text-red-400 text-xs">{qError}</p>}

        <button
          onClick={handleFindQuestions}
          disabled={qLoading}
          className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          {qLoading
            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Finding Questions...</>
            : '🔍 Find Quora Questions'}
        </button>
      </div>

      {/* ── Question Cards ──────────────────────────────────────────────────── */}
      {questions.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">❓ High-Opportunity Questions</h2>
            <span className="text-xs text-gray-500">Click a question to select it</span>
          </div>

          <div className="space-y-2">
            {questions.map((q, i) => {
              const isSelected = selectedQ?.question === q.question
              return (
                <div
                  key={i}
                  onClick={() => handleSelectQuestion(q)}
                  className={`
                    relative cursor-pointer rounded-lg p-4 border-l-4 border transition-all
                    ${isSelected
                      ? 'bg-orange-950/30 border-l-orange-500 border-orange-700/50'
                      : 'bg-gray-900 border-l-orange-600/40 border-gray-700 hover:bg-gray-800/80 hover:border-l-orange-500 hover:border-gray-600'
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <p className={`text-sm font-medium flex-1 ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                      {q.question}
                    </p>
                    <OpportunityBadge level={q.opportunity} />
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-gray-400 text-xs">👁 {q.estimatedViews}</span>
                    <span className="text-gray-500 text-xs italic">{q.reason}</span>
                  </div>
                  {isSelected && (
                    <div className="mt-1.5">
                      <span className="text-[10px] text-orange-400 font-semibold">✓ Selected — scroll down to write answer</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Write Answer section ────────────────────────────────────────────── */}
      {selectedQ && (
        <div className="bg-gray-800 border border-orange-600/30 rounded-xl p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-1 self-stretch bg-orange-600 rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-orange-400 font-semibold mb-1">SELECTED QUESTION</p>
              <p className="text-white text-sm font-medium">{selectedQ.question}</p>
            </div>
          </div>

          {answerError && <p className="text-red-400 text-xs">{answerError}</p>}

          {!answerText && !answerLoading && (
            <button
              onClick={handleWriteAnswer}
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              ✍️ Write Answer with Claude
            </button>
          )}

          {answerLoading && (
            <div className="flex items-center justify-center gap-3 py-8">
              <span className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Claude is writing your Quora answer...</p>
            </div>
          )}

          {/* Generated answer */}
          {answerText && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-semibold text-white">✍️ Generated Answer</h3>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className={`font-medium ${wcText >= 200 && wcText <= 300 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {wcText} words {wcText < 200 ? '(too short)' : wcText > 300 ? '(too long)' : '✓'}
                  </span>
                </div>
              </div>

              <textarea
                value={answerText}
                onChange={e => setAnswerText(e.target.value)}
                rows={12}
                className="w-full bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-orange-500 resize-none leading-relaxed"
              />

              {answerMeta?.aweosMention && (
                <div className="bg-orange-950/30 border border-orange-700/40 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-orange-400 font-semibold mb-0.5">AWE-OS MENTION</p>
                  <p className="text-xs text-orange-200">{answerMeta.aweosMention}</p>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleCopy('full', answerText)}
                  className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {copiedKey === 'full' ? '✅ Copied!' : '📋 Copy Answer'}
                </button>
                <button
                  onClick={handleWriteAnswer}
                  disabled={answerLoading}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                >
                  🔄 Regenerate
                </button>
                <button
                  onClick={handleSchedule}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                >
                  📅 Schedule
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Schedule Queue ──────────────────────────────────────────────────── */}
      {queue.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-sm font-semibold text-white">📅 Answer Queue</h2>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-yellow-300">{pending} pending</span>
              <span className="text-green-400">{posted} posted</span>
              <span className="text-gray-500">{queue.length} total</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-2 text-gray-400 font-medium">Question</th>
                  <th className="text-left py-2 px-2 text-gray-400 font-medium">Tool</th>
                  <th className="text-left py-2 px-2 text-gray-400 font-medium">Status</th>
                  <th className="text-left py-2 px-2 text-gray-400 font-medium">Date</th>
                  <th className="text-left py-2 px-2 text-gray-400 font-medium"></th>
                  <th className="text-left py-2 px-2 text-gray-400 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {queue.map(entry => (
                  <tr key={entry.id} className="border-b border-gray-700/40 hover:bg-gray-750">
                    <td className="py-2 px-2 text-gray-300 max-w-[220px]">
                      <p className="truncate" title={entry.question}>{entry.question}</p>
                    </td>
                    <td className="py-2 px-2 text-orange-400 whitespace-nowrap">{entry.tool}</td>
                    <td className="py-2 px-2">
                      <button
                        onClick={() => handleToggleStatus(entry.id)}
                        title="Click to toggle status"
                        className="cursor-pointer"
                      >
                        <StatusBadge status={entry.status} />
                      </button>
                    </td>
                    <td className="py-2 px-2 text-gray-400 whitespace-nowrap">{entry.date}</td>
                    <td className="py-2 px-2">
                      <button
                        onClick={() => handleCopy(`queue-${entry.id}`, entry.answer)}
                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                      >
                        {copiedKey === `queue-${entry.id}` ? '✅' : '📋'}
                      </button>
                    </td>
                    <td className="py-2 px-2">
                      <button
                        onClick={() => handleDeleteQueue(entry.id)}
                        className="px-2 py-1 bg-red-900/40 hover:bg-red-900/70 text-red-400 rounded transition-colors"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-600">Click any Status badge to toggle Pending ↔ Posted</p>
        </div>
      )}

    </div>
  )
}
