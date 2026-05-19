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
  "Select the content type from the dropdown: Blog Post, Product Description, Social Media Post, Email Newsletter, Ad Copy, Press Release, or Landing Page Copy. Each type produces differently structured output — blog posts have an introduction and body sections; product descriptions lead with benefits; ad copy is short and direct. Choose the type that matches your intended publishing channel.",
  "Enter your topic or title in the Topic/Title field. Specificity matters significantly: 'Benefits of remote work' produces a generic article while 'Benefits of remote work for early-stage Indian SaaS startups' produces targeted, relevant content. Add your target audience in the next field — this shifts the vocabulary, assumed knowledge level, and examples the AI uses in the output.",
  "Add keywords in the Keywords field if specific terms must appear in the output — useful for SEO-targeted blog posts, product descriptions that must mention specific product names, or any content where particular phrases are required. Separate multiple keywords with commas. Select your preferred tone from seven options: Professional, Casual, Persuasive, Informative, Friendly, Humorous, or Authoritative.",
  "Choose a length: Short (~150 words for social captions and short ads), Medium (~400 words for product descriptions and emails), or Long (~800 words for full blog articles). Click 'Generate Content'. The AI completes the request in 10–20 seconds — a progress indicator shows while the content is being written.",
  "Read through the generated output in the right panel and make any changes directly in the editable textarea. Add proprietary details, adjust specific claims, or rework any section that does not quite match your voice. Then copy to clipboard or download as a .txt file. Editing a generated draft is typically 5–10x faster than writing from scratch.",
]

const FAQS = [
  {
    q: 'What content types can I generate?',
    a: "Seven types are available: Blog Post (structured articles with introduction, body sections, and conclusion), Product Description (benefit-led copy with features and a CTA), Social Media Post (short copy for LinkedIn, Instagram, or Twitter), Email Newsletter (content with natural conversational flow), Ad Copy (short, punchy persuasive text for display or search ads), Press Release (formal news format with headline and boilerplate), and Landing Page Copy (conversion-focused text with a clear value proposition). Each type automatically applies the appropriate structural conventions for that content format.",
  },
  {
    q: 'How long does generation take?',
    a: "Generation typically takes 10–20 seconds depending on selected length and current server load. Short content (~150 words) usually completes in 8–12 seconds; medium (~400 words) in 12–18 seconds; long blog posts (~800 words) may take up to 25 seconds during peak usage. If generation exceeds 30 seconds, a temporary network issue or server capacity constraint may be the cause — wait a moment and try again. Pro accounts receive prioritised queue access during high-demand periods, which reduces wait times significantly.",
  },
  {
    q: 'Can I edit the generated content?',
    a: "Yes — the output is a fully editable textarea. Click anywhere in the generated text to position your cursor and make changes: add proprietary details, adjust specific claims, insert internal links, change product names, or rework any section. Editing the AI output is almost always faster than writing from scratch because the structure, key points, tone, and natural flow are already established. Most users spend 5–10 minutes refining a 400-word draft rather than 30–60 minutes writing one from a blank page.",
  },
  {
    q: 'Is there a usage limit?',
    a: "Free accounts have a daily generation limit — typically three to five generations depending on content length. When the limit is reached, you can wait until the next day for it to reset, or upgrade to a Pro subscription for unlimited daily generations across all AI tools. Pay-per-use access is also available for one-off needs without a monthly subscription commitment. Pro plans additionally provide access to longer content options, priority generation queue, and the ability to run multiple generation requests in a single session without daily caps.",
  },
  {
    q: 'How specific should my topic be?',
    a: "As specific as possible — specificity is the single biggest factor in output quality. A vague topic like 'social media marketing' produces a broad, generic article covering well-known basics. A specific topic like 'using Instagram Reels to drive organic traffic for D2C fashion brands in India targeting 18–25-year-olds' produces targeted content with relevant examples. Adding your target audience in the dedicated field reinforces specificity further. For blog posts, writing a specific H1-style title as your topic input — rather than a broad subject — consistently produces better-structured, more useful output.",
  },
  {
    q: 'What tone options are available and when should I use each?',
    a: "Seven tones are available. Professional suits B2B content, formal proposals, and industry publications. Casual works for lifestyle blogs, community newsletters, and direct-to-consumer brands. Persuasive is ideal for ad copy, sales emails, and landing pages where you want readers to take a specific action. Informative suits how-to guides, explainer articles, and educational content. Friendly works well for social media posts and customer-facing emails. Humorous suits entertainment content and brands with a light personality. Authoritative is best for expert commentary, research summaries, and thought leadership pieces.",
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
