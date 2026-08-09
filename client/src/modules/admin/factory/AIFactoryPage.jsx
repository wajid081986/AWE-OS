import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../../services/api.service'
import { useToolIntelligence } from '../../../hooks/useToolIntelligence'
import { useIdeaTracker }      from '../../../hooks/useIdeaTracker'
import IntelligencePanel from './IntelligencePanel'
import BlueprintViewer   from './BlueprintViewer'
import IdeaTracker       from './IdeaTracker'
import CompareMode       from './CompareMode'

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'productivity', 'marketing', 'finance', 'writing',
  'education', 'health', 'legal', 'ecommerce',
  'pdf', 'calculators', 'converters', 'other',
]

const JOB_STATUS = {
  pending:   { label: 'Pending',   dot: 'bg-yellow-400',             text: 'text-yellow-400' },
  running:   { label: 'Running',   dot: 'bg-blue-400 animate-pulse', text: 'text-blue-400'   },
  completed: { label: 'Completed', dot: 'bg-green-400',              text: 'text-green-400'  },
  failed:    { label: 'Failed',    dot: 'bg-red-400',                text: 'text-red-400'    },
}

const TABS = [
  { id: 'tool',    label: '⚡ Generate Tool' },
  { id: 'ideas',   label: '💡 AI Ideas'      },
  { id: 'tracker', label: '📋 My Ideas'      },
  { id: 'compare', label: '⚖️ Compare'       },
]

// ── Small components ─────────────────────────────────────────────────────────

function JobStatusBadge({ status }) {
  const cfg = JOB_STATUS[status] || JOB_STATUS.pending
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.text}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function AnalyzingSteps({ active }) {
  const steps = ['Sending to Claude AI…', 'Scoring SEO & monetization…', 'Mapping intelligence data…']
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!active) { setStep(0); return }
    const t1 = setTimeout(() => setStep(1), 1200)
    const t2 = setTimeout(() => setStep(2), 2800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [active])

  if (!active) return null
  return (
    <div className="mt-4 border-t border-gray-700 pt-4 space-y-2">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-3 text-xs">
          {i < step ? (
            <span className="text-green-400 text-sm shrink-0">✓</span>
          ) : i === step ? (
            <span className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin inline-block shrink-0" />
          ) : (
            <span className="w-3.5 h-3.5 rounded-full border border-gray-600 inline-block shrink-0" />
          )}
          <span className={i < step ? 'text-gray-500 line-through' : i === step ? 'text-white' : 'text-gray-600'}>
            {s}
          </span>
        </div>
      ))}
    </div>
  )
}

function GeneratingSteps({ step }) {
  const steps = ['Analyzing category & idea…', 'Generating tool configuration…', 'Processing response…']
  return (
    <div className="mt-6 border-t border-gray-700 pt-5 space-y-3">
      <p className="text-xs text-gray-500">Estimated time: ~15–20 seconds</p>
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-3 text-sm">
          {i < step ? (
            <span className="text-green-400">✓</span>
          ) : i === step ? (
            <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin inline-block" />
          ) : (
            <span className="w-4 h-4 rounded-full border border-gray-600 inline-block" />
          )}
          <span className={i < step ? 'text-gray-400 line-through' : i === step ? 'text-white' : 'text-gray-600'}>
            {s}
          </span>
        </div>
      ))}
    </div>
  )
}

function ToolPreviewCard({ tool, onPublish, onEdit, onReset, publishing }) {
  if (!tool) return null
  return (
    <div className="bg-green-950/40 border border-green-500/40 rounded-xl p-5 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">✅</span>
        <div>
          <p className="text-green-400 font-semibold text-sm">Tool Generated!</p>
          <p className="text-gray-400 text-xs">Review before publishing</p>
        </div>
      </div>
      <div className="bg-gray-800 rounded-lg p-4 mb-4 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-white font-bold text-lg">{tool.name}</p>
            <p className="text-gray-400 text-xs font-mono">{tool.slug}</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tool.is_free ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
            {tool.is_free ? 'Free' : `₹${tool.price}`}
          </span>
        </div>
        <p className="text-gray-300 text-sm">{tool.description}</p>
        <span className="text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full capitalize">
          {tool.category}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <button
          onClick={onPublish}
          disabled={publishing || tool.approved}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
        >
          {publishing ? 'Publishing…' : tool.approved ? 'Approved ✓' : 'Publish Tool →'}
        </button>
        <button onClick={onEdit} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 rounded-lg transition-colors text-sm">
          Edit in Builder
        </button>
        <button onClick={onReset} className="w-full text-gray-400 hover:text-white text-sm py-1.5 transition-colors">
          Generate Another Tool
        </button>
      </div>
    </div>
  )
}

function IdeaCard({ idea, onAnalyze }) {
  const complexColor = {
    low:    'bg-green-900/40 text-green-400 border-green-700/30',
    medium: 'bg-yellow-900/40 text-yellow-400 border-yellow-700/30',
    high:   'bg-red-900/40 text-red-400 border-red-700/30',
  }[idea.complexity] || 'bg-gray-700 text-gray-400 border-gray-600'

  return (
    <div className="bg-gray-800 border border-gray-700 hover:border-indigo-500/50 rounded-xl p-4 transition-colors flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <span className="text-2xl shrink-0 mt-0.5">{idea.icon || '🔧'}</span>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-snug">{idea.name}</p>
            <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{idea.description}</p>
          </div>
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 capitalize ${complexColor}`}>
          {idea.complexity}
        </span>
      </div>

      {(idea.targetAudience || idea.estimatedMonthlySearches) && (
        <div className="space-y-0.5 text-[10px] text-gray-500">
          {idea.targetAudience && (
            <p><span className="text-gray-400">Target:</span> {idea.targetAudience}</p>
          )}
          {idea.estimatedMonthlySearches && (
            <p><span className="text-gray-400">Est. searches:</span> {idea.estimatedMonthlySearches}/mo</p>
          )}
        </div>
      )}

      {idea.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {idea.tags.slice(0, 4).map((tag, i) => (
            <span key={i} className="text-[10px] bg-gray-700/70 text-gray-400 px-1.5 py-0.5 rounded font-mono">
              {tag}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={() => onAnalyze(idea)}
        className="w-full mt-auto py-2 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-300 text-xs font-semibold rounded-lg transition-colors"
      >
        Analyze This →
      </button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AIFactoryPage() {
  const navigate = useNavigate()

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState('tool')

  // ── Form state (shared across tabs) ──
  const [category, setCategory] = useState('marketing')
  const [idea, setIdea]         = useState('')

  // ── Backend generation state ──
  const [isGenerating, setIsGenerating]     = useState(false)
  const [generatingStep, setGeneratingStep] = useState(0)
  const [generatedTool, setGeneratedTool]   = useState(null)
  const [genError, setGenError]             = useState(null)
  const [publishing, setPublishing]         = useState(false)

  // ── Jobs history ──
  const [jobs, setJobs]               = useState([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [errorDetail, setErrorDetail] = useState(null)

  // ── Intelligence hook ──
  const {
    intelligence, blueprint, generatedPrompt, generatedIdeas,
    loading: intelLoading, blueprintLoading, promptLoading, ideasLoading,
    error: intelError,
    analyze, fetchBlueprint, fetchPrompt, fetchIdeas,
    reset: resetIntelligence, resetBlueprint,
  } = useToolIntelligence()

  // ── Idea tracker hook ──
  const { ideas: trackedIdeas, stats, saveIdea, updateIdeaStatus, deleteIdea } = useIdeaTracker()

  // Track which saved entry belongs to current analysis
  const trackedIdRef = useRef(null)

  const addToJobs = useCallback((tool) => {
    setJobs(prev => [{ id: tool.id, category: tool.category, status: 'completed', created_at: tool.generatedAt, tool }, ...prev].slice(0, 20))
  }, [])

  // Load real factory_jobs history from DB on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await api.get('/api/factory/jobs')
        const rows = Array.isArray(response.data)
          ? response.data
          : (response.data?.jobs || [])
        setJobs(rows.slice(0, 20).map(j => ({
          id:         j.id,
          category:   j.category,
          status:     j.status,
          created_at: j.created_at,
          tool:       j.tools ? { name: j.tools.name, slug: j.tools.slug } : null,
        })))
      } catch {
        // silent fail — history is non-critical, no console noise
      }
    }
    loadHistory()
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true); setGeneratingStep(0); setGeneratedTool(null); setGenError(null)
    try {
      setGeneratingStep(0)
      const response = await api.post('/api/factory/generate', { category, idea })
      setGeneratingStep(1)
      const responseData = response.data
      console.log('[GENERATE] Raw response:', responseData)

      // Handle both { tool: {...} } and direct object shapes
      const tool = responseData.tool || responseData
      console.log('[GENERATE] Tool object:', tool)

      if (!tool || !tool.name) {
        setGenError('Generation failed — invalid response from server')
        return
      }
      setGeneratingStep(2)
      setGeneratedTool(tool)
      console.log('[GENERATE] generatedTool state set:', tool.name)
      addToJobs(tool)
    } catch (err) {
      setGenError(err?.response?.data?.error || err.message || 'Tool generation failed')
    } finally {
      setIsGenerating(false)
    }
  }, [category, idea, addToJobs])

  const handleAnalyze = useCallback(async () => {
    if (!idea.trim()) return
    const result = await analyze(idea, category)
    if (result) {
      const entry = saveIdea({
        toolIdea:   idea,
        category,
        score:      result.score?.overallScore || 0,
        grade:      result.score?.grade        || '',
        gradeLabel: result.score?.gradeLabel   || '',
      })
      trackedIdRef.current = entry?.id || null
    }
  }, [idea, category, analyze, saveIdea])

  const handleGenerateBlueprint = useCallback(async () => {
    const bp = await fetchBlueprint(idea, category, intelligence?.analysis || null)
    if (bp && trackedIdRef.current) {
      updateIdeaStatus(trackedIdRef.current, 'blueprint')
    }
  }, [idea, category, intelligence, fetchBlueprint, updateIdeaStatus])

  const handleGeneratePrompt = useCallback(async () => {
    const p = await fetchPrompt(blueprint, intelligence?.analysis || null, idea)
    if (p && trackedIdRef.current) {
      updateIdeaStatus(trackedIdRef.current, 'prompted')
    }
  }, [blueprint, intelligence, idea, fetchPrompt, updateIdeaStatus])

  const handleGetIdeas = useCallback(async () => {
    await fetchIdeas(category, 5)
  }, [category, fetchIdeas])

  // Clicking "Analyze This →" on an idea card: fill form + switch to tab 1 + analyze
  const handleAnalyzeIdeaCard = useCallback(async (ideaItem) => {
    const fullIdea = `${ideaItem.name}: ${ideaItem.description}`
    setIdea(fullIdea)
    resetIntelligence()
    setActiveTab('tool')
    // Small delay so the tab switch + state settle before analyze fires
    await new Promise(r => setTimeout(r, 50))
    const result = await analyze(fullIdea, category)
    if (result) {
      const entry = saveIdea({
        toolIdea:   fullIdea,
        category,
        score:      result.score?.overallScore || 0,
        grade:      result.score?.grade        || '',
        gradeLabel: result.score?.gradeLabel   || '',
      })
      trackedIdRef.current = entry?.id || null
    }
  }, [category, analyze, saveIdea, resetIntelligence])

  const handlePublish = useCallback(async () => {
    if (!generatedTool?.id) {
      setGenError('No tool to publish. Please generate first.')
      return
    }
    try {
      setPublishing(true)
      setGenError(null)

      // POST /api/factory/generate already inserted this row (approved: false) —
      // "Publish" approves the existing row, it does not create a new one.
      await api.put(`/api/tools/${generatedTool.id}`, { approved: true })

      setGeneratedTool(t => ({ ...t, approved: true }))
      // Reflect the approval on the matching Session History entry, don't add a new one
      setJobs(prev => prev.map(j =>
        j.tool?.id === generatedTool.id ? { ...j, tool: { ...j.tool, approved: true } } : j
      ))
    } catch (err) {
      setGenError(err?.response?.data?.error || err?.message || 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }, [generatedTool])

  const handleReset = useCallback(() => {
    setGeneratedTool(null)
    setGenError(null)
    setIsGenerating(false)
    resetIntelligence()
    trackedIdRef.current = null
  }, [resetIntelligence])

  const switchTab = useCallback((id) => {
    setActiveTab(id)
    if (id === 'tool') return
    // Clear generation error when navigating away
    setGenError(null)
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            🤖 AI Factory
            <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-full font-medium">⚡ LIVE</span>
            <span className="text-xs bg-purple-700 text-purple-200 px-2 py-1 rounded-full font-medium">🧠 v2</span>
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            Intelligence scoring · blueprints · Claude Code prompts · idea tracking
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-gray-800 p-1 rounded-xl border border-gray-700 mb-6 w-fit">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => switchTab(id)}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {label}
              {id === 'tracker' && trackedIdeas.length > 0 && (
                <span className="ml-1.5 text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded-full">
                  {trackedIdeas.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════
            TAB 1: Generate Tool
        ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'tool' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* Left: form + intelligence */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <div className="space-y-4">

                  {/* Category */}
                  <div>
                    <label className="block text-sm text-gray-300 mb-2 font-medium">Category</label>
                    <select
                      value={category}
                      onChange={e => { setCategory(e.target.value); if (intelligence) resetIntelligence() }}
                      disabled={isGenerating}
                      className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize disabled:opacity-50"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c} value={c} className="capitalize">{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Idea */}
                  <div>
                    <label className="block text-sm text-gray-300 mb-2 font-medium">
                      Tool Idea
                      <span className="text-gray-500 font-normal ml-2">optional for Generate</span>
                    </label>
                    <textarea
                      value={idea}
                      onChange={e => { setIdea(e.target.value); if (intelligence) resetIntelligence() }}
                      disabled={isGenerating}
                      rows={3}
                      placeholder={"Describe the tool you want to build…\ne.g. A compound interest calculator for Indian investors"}
                      className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500 resize-none disabled:opacity-50"
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleAnalyze}
                      disabled={isGenerating || intelLoading || !idea.trim()}
                      className="py-3 bg-purple-600/20 hover:bg-purple-600/30 disabled:opacity-50 border border-purple-500/40 text-purple-300 font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2"
                    >
                      {intelLoading ? (
                        <><span className="w-4 h-4 border border-purple-400 border-t-transparent rounded-full animate-spin" />Analyzing…</>
                      ) : '🧠 Analyze Idea'}
                    </button>
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating || intelLoading}
                      className="py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-all text-sm"
                    >
                      {isGenerating ? '🤖 Building…' : '⚡ Generate Tool'}
                    </button>
                  </div>
                </div>

                {/* Analyzing animation */}
                <AnalyzingSteps active={intelLoading} />

                {/* Generating animation */}
                {isGenerating && <GeneratingSteps step={generatingStep} />}

                {/* Error */}
                {(genError || intelError) && !isGenerating && !intelLoading && (
                  <div className="mt-4 p-4 bg-red-950/40 border border-red-500/40 rounded-lg">
                    <p className="text-red-400 text-sm font-medium">Error</p>
                    <p className="text-red-300 text-xs mt-1">{genError || intelError}</p>
                    <button onClick={handleReset} className="mt-2 text-xs text-red-400 hover:text-red-300 underline">
                      Reset
                    </button>
                  </div>
                )}

                {/* Tool preview (backend generation result) */}
                {generatedTool && !isGenerating && (
                  <ToolPreviewCard
                    tool={generatedTool}
                    onPublish={handlePublish}
                    onEdit={() => navigate(`/admin/tools/builder?id=${generatedTool.id}`)}
                    onReset={handleReset}
                    publishing={publishing}
                  />
                )}
              </div>

              {/* Intelligence panel — shows skeleton while loading, panel when done */}
              {!isGenerating && (
                <IntelligencePanel
                  data={intelligence}
                  loading={intelLoading}
                  blueprint={blueprint}
                  blueprintLoading={blueprintLoading}
                  onGenerateBlueprint={handleGenerateBlueprint}
                  generatedPrompt={generatedPrompt}
                  promptLoading={promptLoading}
                  onGeneratePrompt={handleGeneratePrompt}
                />
              )}

              {/* Blueprint detailed view */}
              {blueprint && (
                <BlueprintViewer
                  blueprint={blueprint}
                  onClose={resetBlueprint}
                />
              )}
            </div>

            {/* Right: session history */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden sticky top-6">
                <div className="px-4 py-3 border-b border-gray-700">
                  <h2 className="text-sm font-semibold text-white">Session History</h2>
                </div>

                {jobs.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-gray-500 text-sm">No tools generated yet</p>
                    <p className="text-gray-600 text-xs mt-1">Generated tools appear here</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-700 max-h-[600px] overflow-y-auto">
                    {jobs.map(job => (
                      <div key={job.id} className="px-4 py-3 hover:bg-gray-700/40 transition-colors">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium capitalize truncate">
                              {job.tool?.name || job.category}
                            </p>
                            <p className="text-gray-500 text-xs capitalize">{job.category}</p>
                          </div>
                          <JobStatusBadge status={job.status} />
                        </div>
                        <p className="text-gray-500 text-xs">
                          {new Date(job.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB 2: Generate Ideas
        ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'ideas' && (
          <div className="space-y-5">

            {/* Controls */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                <div className="flex-1">
                  <label className="block text-sm text-gray-300 mb-2 font-medium">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c} className="capitalize">{c}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleGetIdeas}
                  disabled={ideasLoading}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-all text-sm flex items-center gap-2 shrink-0"
                >
                  {ideasLoading ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating…</>
                  ) : '💡 Get AI Ideas'}
                </button>
              </div>
              {intelError && (
                <p className="mt-3 text-sm text-red-400 bg-red-950/30 border border-red-800/30 rounded-lg px-3 py-2">
                  {intelError}
                </p>
              )}
            </div>

            {/* Ideas grid */}
            {generatedIdeas.length > 0 && (
              <>
                <p className="text-sm text-gray-400">
                  {generatedIdeas.length} ideas for <span className="text-white font-medium capitalize">{category}</span>
                  <span className="text-gray-600 ml-2">— click "Analyze This →" to score and track</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {generatedIdeas.map((item, i) => (
                    <IdeaCard key={i} idea={item} onAnalyze={handleAnalyzeIdeaCard} />
                  ))}
                </div>
              </>
            )}

            {/* Empty state */}
            {!ideasLoading && generatedIdeas.length === 0 && (
              <div className="text-center py-16 bg-gray-800 border border-gray-700 rounded-xl">
                <p className="text-5xl mb-4">💡</p>
                <p className="text-gray-400 text-sm font-medium">Select a category and click "Get AI Ideas"</p>
                <p className="text-gray-600 text-xs mt-1">Claude will suggest 5 high-potential tool ideas</p>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB 3: My Ideas
        ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'tracker' && (
          <IdeaTracker
            ideas={trackedIdeas}
            stats={stats}
            updateIdeaStatus={updateIdeaStatus}
            deleteIdea={deleteIdea}
          />
        )}

        {/* ═══════════════════════════════════════════════════════════
            TAB 4: Compare
        ═══════════════════════════════════════════════════════════ */}
        {activeTab === 'compare' && (
          <CompareMode />
        )}

      </div>

      {/* Error detail modal */}
      {errorDetail && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setErrorDetail(null)}
        >
          <div
            className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-md w-full"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-white font-semibold mb-3">Error Details</h3>
            <p className="text-red-300 text-sm font-mono bg-red-950/40 border border-red-800/40 rounded-lg p-3 break-all">
              {errorDetail}
            </p>
            <button
              onClick={() => setErrorDetail(null)}
              className="mt-4 w-full bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
