import { useState, useMemo } from 'react'
import ToolPageShell from './ToolPageShell'

function WordCounterTool() {
  const [text, setText] = useState('')

  const stats = useMemo(() => {
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length
    const chars = text.length
    const charsNoSpaces = text.replace(/\s/g, '').length
    const sentences = text.trim() === '' ? 0 : (text.match(/[.!?]+/g) || []).length
    const paragraphs = text.trim() === '' ? 0 : text.split(/\n\s*\n/).filter(p => p.trim()).length || (text.trim() ? 1 : 0)
    const readingTime = Math.ceil(words / 200)
    return { words, chars, charsNoSpaces, sentences, paragraphs, readingTime }
  }, [text])

  const clear = () => setText('')

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste or type your text here…"
          rows={10}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y leading-relaxed"
        />
      </div>

      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-400">{stats.chars} characters</p>
        <button onClick={clear} className="text-xs text-gray-500 hover:text-red-500 transition-colors">Clear text</button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Words', value: stats.words.toLocaleString(), icon: '📝', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
          { label: 'Characters', value: stats.chars.toLocaleString(), icon: '🔤', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
          { label: 'Chars (no spaces)', value: stats.charsNoSpaces.toLocaleString(), icon: '✏️', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
          { label: 'Sentences', value: stats.sentences.toLocaleString(), icon: '📖', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
          { label: 'Paragraphs', value: stats.paragraphs.toLocaleString(), icon: '¶', color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
          { label: 'Reading Time', value: `~${stats.readingTime} min`, icon: '⏱️', color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
        ].map(({ label, value, icon, color, bg }) => (
          <div key={label} className={`border rounded-xl p-4 text-center ${bg}`}>
            <p className="text-2xl mb-1">{icon}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {text.trim() && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-xs text-gray-500 space-y-1">
          <p>Average word length: <span className="font-medium text-gray-700">{stats.words > 0 ? (stats.charsNoSpaces / stats.words).toFixed(1) : 0} chars</span></p>
          <p>Reading speed based on 200 words per minute (average adult reading speed).</p>
        </div>
      )}
    </div>
  )
}

const STEPS = [
  'Paste or type your text directly into the large text area. You can paste from any source — a Word document, Google Doc, email draft, web page, or any other application.',
  'All six statistics update live as you type or paste. No button press is required — the counts recalculate automatically with every keystroke.',
  'Review the stat cards: Words, Characters (total), Characters without spaces, Sentences, Paragraphs, and estimated Reading Time at 200 words per minute.',
  'Click "Clear text" to reset the text area and all counters when you are ready to analyse a different piece of writing.',
]

const FAQS = [
  { q: 'Does word count update in real time?', a: 'Yes. All six statistics — words, characters, characters without spaces, sentences, paragraphs, and estimated reading time — recalculate instantly as you type or paste text. There is no submit button because no button is needed.' },
  { q: 'How is reading time calculated?', a: 'Reading time is estimated by dividing the word count by 200 — the widely accepted average adult reading speed in words per minute. The result is rounded up to the nearest whole minute. Skimming speed is faster (around 600 wpm) and technical reading is slower (100–150 wpm), but 200 wpm is the standard baseline used by publishers, educators, and reading-time tools across the industry.' },
  { q: 'How are sentences counted?', a: 'Sentences are counted by detecting sentence-ending punctuation marks: full stops, exclamation marks, and question marks. This method is accurate for most standard prose. Abbreviations (e.g. "Dr."), decimal numbers, and ellipses may cause slight overcounting in edge cases, but the result is a reliable approximation for the vast majority of writing.' },
  { q: 'Can I use this for academic writing with word limits?', a: 'Absolutely. Paste your essay, dissertation section, assignment, or research abstract and the word count updates instantly. The tool shows both the raw word count and characters without spaces — useful for platforms that enforce character limits rather than word limits, such as many journal abstract submission systems.' },
  { q: 'Is this useful for SEO and content writing?', a: 'Yes. SEO best practices suggest blog posts of 1,200–2,500 words for competitive topics. Meta descriptions should be under 160 characters. Email subject lines perform best under 60 characters. The tool lets you check all of these constraints instantly by pasting your draft content.' },
  { q: 'Is there a character or word limit?', a: 'There is no enforced limit. The tool handles large documents efficiently — a 10,000-word article or a full book chapter pastes and counts without issue. Performance may vary for very long texts over 100,000 words on older devices, but for typical writing tasks the tool runs without any noticeable delay.' },
]

const ABOUT = [
  'Word count is one of the most fundamental requirements in writing — essays have minimum lengths, articles have targets, meta descriptions have character caps, tweet character limits, and resumes have one-page constraints. The AWE-OS Word Counter tracks all of this in a single place, updating every statistic the instant you type or paste without requiring any button press.',
  'Six metrics are tracked simultaneously: the total word count, total characters including spaces, characters excluding spaces (for platforms that measure "characters without spaces"), sentence count, paragraph count, and an estimated reading time. This combination covers the full range of writing contexts — academic word limits typically count words, social media platforms count characters, and content planning tools use reading time to gauge whether an article is scannable or dense.',
  'Reading time is calculated at 200 words per minute, the standard adult reading speed used by publishers, Substack, Medium, and most content management platforms. It is deliberately conservative — most readers skim rather than read every word, but the 200 wpm baseline ensures you plan for thorough reading rather than speed-reading. A 1,500-word article calculates to approximately 8 minutes, which aligns with what platform analytics typically report for that length of content.',
  'The tool is built for privacy as much as convenience. All counting is performed by JavaScript running directly in your browser — no text is ever transmitted to any server, logged, stored, or analysed. You can safely paste confidential documents, client communications, legal drafts, and personal writing without any concern about data exposure. The text area accepts content from any source and resets instantly with the Clear button when you are done.',
]

export default function WordCounter() {
  return (
    <ToolPageShell
      slug="word-counter"
      name="Word Counter"
      description="Count words, characters, sentences, paragraphs and reading time in real time."
      icon="📝"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
    >
      <WordCounterTool />
    </ToolPageShell>
  )
}
