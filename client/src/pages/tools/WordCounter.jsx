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
  'Paste or type your text into the large text area above.',
  'Statistics update live as you type — no button needed.',
  'View words, characters, characters without spaces, sentences, paragraphs, and estimated reading time.',
  'Click "Clear text" to start fresh with new content.',
]

const FAQS = [
  { q: 'Does word count update in real time?', a: 'Yes! All six statistics — words, characters, characters without spaces, sentences, paragraphs, and reading time — update instantly as you type or paste text.' },
  { q: 'How is reading time calculated?', a: 'Reading time is calculated based on an average adult reading speed of 200 words per minute. It is rounded up to the nearest minute.' },
  { q: 'How are sentences counted?', a: 'Sentences are counted by the number of sentence-ending punctuation marks (., !, ?) in your text. This is a close approximation for most texts.' },
  { q: 'Can I use this for academic writing?', a: 'Yes, this tool is perfect for academic papers, essays, and assignments with word count limits. Paste your text to instantly verify you are within the required word count.' },
  { q: 'Is there a character or word limit?', a: 'There is no enforced limit. The tool will handle large documents but performance may vary for extremely long texts (100,000+ words) depending on your device.' },
]

const ABOUT = [
  'The Word Counter provides instant, real-time statistics about any text you enter. It counts words, characters, characters without spaces, sentences, paragraphs, and estimated reading time — all updating as you type.',
  'This tool is indispensable for writers, students, bloggers, and content creators who need to meet specific word count targets or understand the length and complexity of their writing.',
  'The reading time estimate uses the standard 200 words-per-minute average adult reading speed. All processing happens locally in your browser, so your text never leaves your device.',
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
