import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../../services/api.service'

const CATEGORIES = [
  'productivity', 'marketing', 'finance', 'writing',
  'education', 'health', 'legal', 'ecommerce', 'other',
]

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   dot: 'bg-yellow-400', text: 'text-yellow-400', pulse: false },
  running:   { label: 'Running',   dot: 'bg-blue-400 animate-pulse', text: 'text-blue-400', pulse: true },
  completed: { label: 'Completed', dot: 'bg-green-400', text: 'text-green-400', pulse: false },
  failed:    { label: 'Failed',    dot: 'bg-red-400',   text: 'text-red-400',   pulse: false },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.text}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function GeneratingSteps({ step }) {
  const steps = [
    'Analyzing category...',
    'Generating tool config...',
    'Saving to database...',
  ]
  return (
    <div className="space-y-3 py-2">
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
  const fields = tool.input_fields || []
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
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            tool.is_free ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
          }`}>
            {tool.is_free ? 'Free' : `₹${tool.price}`}
          </span>
        </div>
        <p className="text-gray-300 text-sm">{tool.description}</p>
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full capitalize">
            {tool.category}
          </span>
          <span className="text-xs text-gray-500">{fields.length} input fields</span>
        </div>
        {fields.length > 0 && (
          <div className="pt-1">
            <p className="text-xs text-gray-500 mb-1">Fields:</p>
            <div className="flex flex-wrap gap-1">
              {fields.map((f, i) => (
                <span key={i} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded font-mono">
                  {f.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={onPublish}
          disabled={publishing || tool.is_published}
          className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
        >
          {publishing ? 'Publishing...' : tool.is_published ? 'Already Published' : 'Publish Tool →'}
        </button>
        <button
          onClick={onEdit}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
        >
          Edit in Builder
        </button>
        <button
          onClick={onReset}
          className="w-full text-gray-400 hover:text-white text-sm py-1.5 transition-colors"
        >
          Generate Another Tool
        </button>
      </div>
    </div>
  )
}

export default function AIFactoryPage() {
  const navigate = useNavigate()

  // Generate form
  const [category, setCategory]       = useState('marketing')
  const [idea, setIdea]               = useState('')
  const [mode, setMode]               = useState('tool') // 'tool' | 'ideas'

  // Generation state
  const [isGenerating, setIsGenerating]   = useState(false)
  const [generatingStep, setGeneratingStep] = useState(0)
  const [generatedTool, setGeneratedTool]   = useState(null)
  const [currentJobId, setCurrentJobId]     = useState(null)
  const [genError, setGenError]             = useState(null)

  // Publish
  const [publishing, setPublishing]   = useState(false)

  // Ideas mode
  const [ideas, setIdeas]             = useState([])
  const [ideaLoading, setIdeaLoading] = useState(false)
  const [buildingIdeaId, setBuildingIdeaId] = useState(null)

  // Jobs history
  const [jobs, setJobs]               = useState([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [errorDetail, setErrorDetail] = useState(null)

  const pollRef = useRef(null)

  const loadJobs = () => {
    api.get('/api/factory/jobs')
      .then(r => setJobs(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setJobsLoading(false))
  }

  useEffect(() => {
    loadJobs()
  }, [])

  // Auto-refresh jobs every 5s if any job is running
  useEffect(() => {
    const hasRunning = jobs.some(j => j.status === 'pending' || j.status === 'running')
    if (!hasRunning) return
    const timer = setInterval(loadJobs, 5000)
    return () => clearInterval(timer)
  }, [jobs])

  const stopPoll = () => {
    if (pollRef.current) { clearTimeout(pollRef.current); pollRef.current = null }
  }

  const pollJobStatus = (jobId) => {
    let step = 0
    const poll = async () => {
      try {
        const res = await api.get(`/api/factory/jobs/${jobId}`)
        const job = res.data

        // Advance step animation
        if (job.status === 'running' && step < 2) step++
        setGeneratingStep(step)

        if (job.status === 'completed') {
          setGeneratedTool(job.saas_tools)
          setIsGenerating(false)
          stopPoll()
          loadJobs()
          return
        }
        if (job.status === 'failed') {
          setGenError(job.error_message || 'Generation failed')
          setIsGenerating(false)
          stopPoll()
          loadJobs()
          return
        }
        // Still running
        pollRef.current = setTimeout(poll, 2000)
      } catch {
        setGenError('Failed to poll job status')
        setIsGenerating(false)
        stopPoll()
      }
    }
    poll()
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setGeneratingStep(0)
    setGeneratedTool(null)
    setGenError(null)
    stopPoll()

    try {
      const res = await api.post('/api/factory/generate', { category, idea })
      setCurrentJobId(res.data.jobId)
      pollJobStatus(res.data.jobId)
    } catch (err) {
      setGenError(err.response?.data?.error || 'Failed to start generation')
      setIsGenerating(false)
    }
  }

  const handleGenerateIdeas = async () => {
    setIdeaLoading(true)
    setIdeas([])
    try {
      const res = await api.post('/api/factory/ideas', { category, count: 5 })
      setIdeas(res.data.ideas || [])
    } catch (err) {
      setGenError(err.response?.data?.error || 'Failed to generate ideas')
    } finally {
      setIdeaLoading(false)
    }
  }

  const handleBuildIdea = async (ideaId) => {
    setBuildingIdeaId(ideaId)
    setGeneratedTool(null)
    setGenError(null)
    try {
      const res = await api.post(`/api/factory/ideas/${ideaId}/build`)
      setCurrentJobId(res.data.jobId)
      setIsGenerating(true)
      setGeneratingStep(0)
      setMode('tool')
      pollJobStatus(res.data.jobId)
    } catch (err) {
      setGenError(err.response?.data?.error || 'Build failed')
    } finally {
      setBuildingIdeaId(null)
    }
  }

  const handlePublish = async () => {
    if (!generatedTool) return
    setPublishing(true)
    try {
      await api.put(`/api/tools/${generatedTool.id}`, { is_published: true })
      setGeneratedTool(t => ({ ...t, is_published: true }))
      loadJobs()
    } catch {
      setGenError('Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  const handleJobPublish = async (toolId) => {
    try {
      await api.put(`/api/tools/${toolId}`, { is_published: true })
      loadJobs()
    } catch {}
  }

  const handleReset = () => {
    setGeneratedTool(null)
    setGenError(null)
    setCurrentJobId(null)
    setIsGenerating(false)
    setIdeas([])
    stopPoll()
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            🤖 AI Factory
            <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-full font-medium">⚡ LIVE</span>
          </h1>
          <p className="text-gray-400 mt-1">Generate complete AI tools automatically — one click to marketplace</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* ── LEFT: Generate Panel (3/5) ── */}
          <div className="lg:col-span-3 space-y-4">

            {/* Mode Toggle */}
            <div className="flex gap-1 bg-gray-800 p-1 rounded-xl border border-gray-700 w-fit">
              {[
                { id: 'tool',  label: '⚡ Generate Tool' },
                { id: 'ideas', label: '💡 Generate Ideas' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => { setMode(id); handleReset() }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    mode === id
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Form Card */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="space-y-4">

                {/* Category */}
                <div>
                  <label className="block text-sm text-gray-300 mb-2 font-medium">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    disabled={isGenerating}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 capitalize disabled:opacity-50"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c} className="capitalize">{c}</option>
                    ))}
                  </select>
                </div>

                {/* Custom Idea */}
                <div>
                  <label className="block text-sm text-gray-300 mb-2 font-medium">
                    Custom Idea
                    <span className="text-gray-500 font-normal ml-2">optional</span>
                  </label>
                  <textarea
                    value={idea}
                    onChange={e => setIdea(e.target.value)}
                    disabled={isGenerating}
                    rows={3}
                    placeholder={"Describe the tool you want to build...\ne.g. A tool that writes LinkedIn posts from bullet points"}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500 resize-none disabled:opacity-50"
                  />
                </div>

                {/* Action Button */}
                {mode === 'tool' ? (
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all text-base"
                  >
                    {isGenerating ? '🤖 AI is building your tool...' : '⚡ Generate Tool'}
                  </button>
                ) : (
                  <button
                    onClick={handleGenerateIdeas}
                    disabled={ideaLoading}
                    className="w-full border border-indigo-500 hover:bg-indigo-600/10 disabled:opacity-60 text-indigo-400 font-semibold py-3.5 rounded-xl transition-all text-base"
                  >
                    {ideaLoading ? 'Generating ideas...' : '💡 Generate 5 Ideas'}
                  </button>
                )}
              </div>

              {/* Generating animation */}
              {isGenerating && (
                <div className="mt-6 border-t border-gray-700 pt-5">
                  <p className="text-sm text-gray-400 mb-3">Estimated time: ~15–20 seconds</p>
                  <GeneratingSteps step={generatingStep} />
                </div>
              )}

              {/* Error */}
              {genError && !isGenerating && (
                <div className="mt-4 p-4 bg-red-950/40 border border-red-500/40 rounded-lg">
                  <p className="text-red-400 text-sm font-medium">Generation failed</p>
                  <p className="text-red-300 text-xs mt-1">{genError}</p>
                  <button onClick={handleReset} className="mt-2 text-xs text-red-400 hover:text-red-300 underline">
                    Try again
                  </button>
                </div>
              )}

              {/* Success: Tool Preview */}
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

            {/* Ideas Panel */}
            {mode === 'ideas' && ideas.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-400 font-medium">
                  {ideas.length} ideas generated for <span className="text-white capitalize">{category}</span>
                </p>
                {ideas.map((idea, i) => (
                  <div key={idea.id || i} className="bg-gray-800 border border-gray-700 hover:border-indigo-500/60 rounded-xl p-5 transition-colors">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h3 className="text-white font-bold">{idea.name}</h3>
                        <p className="text-gray-400 text-sm mt-0.5">{idea.description}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                        !idea.estimated_price
                          ? 'bg-green-900 text-green-300'
                          : 'bg-yellow-900 text-yellow-300'
                      }`}>
                        {idea.estimated_price ? `₹${idea.estimated_price}` : 'Free'}
                      </span>
                    </div>
                    {idea.target_audience && (
                      <p className="text-xs text-gray-500 mb-0.5">
                        <span className="text-gray-400">Target:</span> {idea.target_audience}
                      </p>
                    )}
                    {idea.problem_solved && (
                      <p className="text-xs text-gray-500 mb-3">
                        <span className="text-gray-400">Solves:</span> {idea.problem_solved}
                      </p>
                    )}
                    <button
                      onClick={() => idea.id && handleBuildIdea(idea.id)}
                      disabled={!idea.id || buildingIdeaId === idea.id}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                    >
                      {buildingIdeaId === idea.id ? 'Building...' : 'Build This Tool →'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Jobs History (2/5) ── */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                <h2 className="text-sm font-semibold text-white">Factory Jobs</h2>
                <button
                  onClick={loadJobs}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Refresh
                </button>
              </div>

              {jobsLoading ? (
                <div className="p-6 space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-14 bg-gray-700 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : jobs.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500 text-sm">No jobs yet</p>
                  <p className="text-gray-600 text-xs mt-1">Generated tools will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700 max-h-[600px] overflow-y-auto">
                  {jobs.map(job => (
                    <div key={job.id} className="px-4 py-3 hover:bg-gray-700/40 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium capitalize truncate">
                            {job.saas_tools?.name || job.category}
                          </p>
                          <p className="text-gray-500 text-xs capitalize">{job.category}</p>
                        </div>
                        <StatusBadge status={job.status} />
                      </div>

                      <p className="text-gray-500 text-xs mb-2">
                        {new Date(job.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>

                      {/* Actions */}
                      <div className="flex gap-3">
                        {job.status === 'completed' && job.saas_tools && (
                          <>
                            <a
                              href={`/dashboard/tools/${job.saas_tools.slug}`}
                              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                              View
                            </a>
                            {!job.saas_tools.is_published && (
                              <button
                                onClick={() => handleJobPublish(job.saas_tools.id)}
                                className="text-xs text-green-400 hover:text-green-300 transition-colors"
                              >
                                Publish
                              </button>
                            )}
                            {job.saas_tools.is_published && (
                              <span className="text-xs text-green-500">Live</span>
                            )}
                          </>
                        )}
                        {job.status === 'failed' && (
                          <button
                            onClick={() => setErrorDetail(job.error_message)}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                          >
                            Error details
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Detail Modal */}
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
