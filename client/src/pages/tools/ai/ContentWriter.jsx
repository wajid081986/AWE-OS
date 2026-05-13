import { useState } from 'react'
import api from '../../../services/api.service'
import ProGate from '../../../components/ProGate'
import ToolLayout from '../../../components/tool-engine/ToolLayout'
import ToolEmptyState from '../../../components/tool-engine/ToolEmptyState'
import ToolLoadingState from '../../../components/tool-engine/ToolLoadingState'
import { Button, Select, Textarea, Input } from '../../../components/ui'
import { getToolBySlug } from '../../../data/toolRegistry'

const CONTENT_TYPES = ['Blog Post', 'Product Description', 'Social Media Post', 'Email Newsletter', 'Ad Copy', 'Press Release', 'Landing Page Copy']
const TONES        = ['Professional', 'Casual', 'Persuasive', 'Informative', 'Friendly', 'Humorous', 'Authoritative']
const LENGTHS = [
  { label: 'Short (~150 words)',  value: 'short'  },
  { label: 'Medium (~400 words)', value: 'medium' },
  { label: 'Long (~800 words)',   value: 'long'   },
]

const STEPS = [
  'Select the content type you want to generate (Blog Post, Ad Copy, Email, etc.).',
  'Enter your topic or title — be specific for better results.',
  'Optionally set your target audience, keywords, tone, and length.',
  'Click "Generate Content" and wait 10–20 seconds for the AI to write your content.',
  'Review and edit the output, then copy or download it.',
]

const FAQS = [
  {
    q: 'What content types can I generate?',
    a: 'Blog posts, product descriptions, social media posts, email newsletters, ad copy, press releases, and landing page copy — seven content types covering the most common writing tasks for marketers and content teams.',
  },
  {
    q: 'How long does generation take?',
    a: 'Typically 10–20 seconds depending on the chosen length and current server load. Longer content types like blog posts naturally take more time than short ad copy.',
  },
  {
    q: 'Can I edit the generated content?',
    a: 'Yes — the output textarea is fully editable. Click inside it to make changes before copying or downloading. The AI provides a strong first draft; editing it is usually faster than writing from scratch.',
  },
  {
    q: 'Is there a usage limit?',
    a: 'Free tier has daily usage limits. Pro users get unlimited AI content generations across all tools. Pay-per-use access is also available for one-off needs without a subscription.',
  },
  {
    q: 'How specific should my topic be?',
    a: 'The more specific the better. "Benefits of remote work" produces a generic article; "Benefits of remote work for early-stage SaaS startups in 2025" produces focused, relevant content. Add target audience and keywords to sharpen the output further.',
  },
  {
    q: 'What tone options are available?',
    a: 'Professional, Casual, Persuasive, Informative, Friendly, Humorous, and Authoritative. Tone significantly affects the writing style — Persuasive works well for ad copy; Informative suits how-to articles; Friendly is ideal for social media posts.' ,
  },
]

const ABOUT = [
  'The AI Content Writer generates ready-to-use written content for seven common content types: blog posts, product descriptions, social media posts, email newsletters, ad copy, press releases, and landing page copy. Specify your topic, set your audience and tone, choose a length, and the AI produces a complete first draft in under 30 seconds. It handles the hardest part of content creation — getting words on the page — leaving you with editing and refinement rather than a blank document.',
  'The tool is built around the practical realities of content production. Most content follows predictable structural patterns: blog posts have an introduction, body sections, and a conclusion; product descriptions lead with benefits and close with a call to action; ad copy is short, punchy, and benefit-focused. The AI applies these conventions automatically, tuned by the tone and audience you specify. Seven tone options — Professional, Casual, Persuasive, Informative, Friendly, Humorous, and Authoritative — allow the same topic to be written in radically different registers for different channels and audiences.',
  'The optional keywords field ensures that specific terms you need in the output are included, which is useful for SEO-targeted blog posts or product descriptions that must mention particular product names or features. The target audience field shifts the vocabulary, assumed knowledge level, and examples used. The three length settings — short (~150 words), medium (~400 words), and long (~800 words) — align with standard content formats: a social media caption, a product description or email, and a full blog article respectively.',
  'Generated content appears in a fully editable textarea. Editing the AI output is almost always faster than writing from scratch — the structure, key points, and tone are already established, leaving only light revisions to match your voice or add proprietary information. Copy the result to clipboard for immediate use in your CMS, email platform, or social scheduler, or download it as a text file. Usage is managed per-account; Pro and pay-per-use plans remove the daily generation limit.',
]

function ContentWriterTool() {
  const [form, setForm] = useState({
    type: 'Blog Post', topic: '', tone: 'Professional', length: 'medium', keywords: '', audience: '',
  })
  const [result, setResult] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError]   = useState('')
  const [copied, setCopied] = useState(false)

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const generate = async () => {
    if (!form.topic.trim()) { setError('Please enter a topic.'); return }
    setStatus('generating'); setError(''); setResult('')
    try {
      const res = await api.post('/api/tools/generate', { tool: 'content-writer', data: form })
      setResult(res.data.content || res.data.result || '')
      setStatus('done')
    } catch {
      setError('Content generation failed. Please try again.')
      setStatus('idle')
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(result)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const download = () => {
    const blob = new Blob([result], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${form.type.toLowerCase().replace(/\s+/g, '_')}.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  const wordCount = result.trim() ? result.trim().split(/\s+/).length : 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

      {/* ── Controls ───────────────────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-bold text-gray-900">Configure Content</h3>

          <Select
            label="Content Type"
            options={CONTENT_TYPES}
            value={form.type}
            onChange={e => set('type', e.target.value)}
          />

          <Textarea
            label="Topic / Title"
            required
            value={form.topic}
            onChange={e => set('topic', e.target.value)}
            placeholder="e.g. Benefits of remote work for startups"
            rows={3}
          />

          <Input
            label="Target Audience"
            value={form.audience}
            onChange={e => set('audience', e.target.value)}
            placeholder="e.g. Small business owners, students…"
          />

          <Input
            label="Keywords (optional)"
            value={form.keywords}
            onChange={e => set('keywords', e.target.value)}
            placeholder="remote work, productivity, team…"
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Tone"
              options={TONES}
              value={form.tone}
              onChange={e => set('tone', e.target.value)}
            />
            <Select
              label="Length"
              options={LENGTHS}
              value={form.length}
              onChange={e => set('length', e.target.value)}
            />
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={status === 'generating'}
            disabled={!form.topic.trim()}
            onClick={generate}
          >
            {status === 'generating' ? 'Generating…' : '✨ Generate Content'}
          </Button>

          {error && <p className="text-red-500 text-xs">{error}</p>}
        </div>
      </div>

      {/* ── Output ─────────────────────────────────────────────────── */}
      <div className="lg:col-span-3">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 h-full flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Generated Content</h3>
            {result && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{wordCount} words</span>
                <Button variant="secondary" size="sm" onClick={copy}>
                  {copied ? '✅ Copied' : 'Copy'}
                </Button>
                <Button variant="primary" size="sm" onClick={download}>
                  Download
                </Button>
              </div>
            )}
          </div>

          {status === 'generating' ? (
            <ToolLoadingState
              title={`AI is writing your ${form.type.toLowerCase()}…`}
              description="This may take 10–20 seconds"
            />
          ) : result ? (
            <textarea
              value={result}
              onChange={e => setResult(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[400px]"
            />
          ) : (
            <ToolEmptyState icon="✍️" title="Your generated content will appear here" description="Fill in the form and click Generate" />
          )}
        </div>
      </div>

    </div>
  )
}

export default function ContentWriter() {
  const toolMeta = getToolBySlug('ai-content-writer')

  return (
    <ToolLayout tool={toolMeta} steps={STEPS} faqs={FAQS} about={ABOUT}>
      <ProGate
        toolName="AI Content Writer"
        toolSlug="ai-content-writer"
        payPerUsePlan="content_writer"
        payPerUsePrice="0.99"
      >
        <ContentWriterTool />
      </ProGate>
    </ToolLayout>
  )
}
