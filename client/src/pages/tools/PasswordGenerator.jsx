import { useState, useCallback } from 'react'
import ToolPageShell from './ToolPageShell'

const CHARS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
}

function strength(pwd) {
  if (!pwd) return { score: 0, label: '', color: '' }
  let score = 0
  if (pwd.length >= 8) score++
  if (pwd.length >= 12) score++
  if (pwd.length >= 16) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[a-z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500' }
  if (score <= 4) return { score, label: 'Fair', color: 'bg-yellow-500' }
  if (score <= 5) return { score, label: 'Good', color: 'bg-blue-500' }
  return { score, label: 'Strong', color: 'bg-green-500' }
}

function PasswordGeneratorTool() {
  const [length, setLength] = useState(16)
  const [opts, setOpts] = useState({ upper: true, lower: true, numbers: true, symbols: false })
  const [password, setPassword] = useState('')
  const [copied, setCopied] = useState(false)

  const generate = useCallback(() => {
    const pool = Object.entries(opts).filter(([, v]) => v).map(([k]) => CHARS[k]).join('')
    if (!pool) return
    let pwd = ''
    const arr = new Uint32Array(length)
    crypto.getRandomValues(arr)
    for (const n of arr) pwd += pool[n % pool.length]
    setPassword(pwd)
    setCopied(false)
  }, [length, opts])

  const copy = () => {
    if (!password) return
    navigator.clipboard.writeText(password).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const toggle = key => setOpts(o => ({ ...o, [key]: !o[key] }))
  const str = strength(password)

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Length slider */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-gray-700">Password Length</label>
          <span className="text-sm font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg">{length}</span>
        </div>
        <input type="range" min={8} max={64} value={length} onChange={e => { setLength(parseInt(e.target.value)); setPassword('') }}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
        <div className="flex justify-between text-xs text-gray-400 mt-1"><span>8</span><span>64</span></div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { key: 'upper', label: 'Uppercase (A-Z)' },
          { key: 'lower', label: 'Lowercase (a-z)' },
          { key: 'numbers', label: 'Numbers (0-9)' },
          { key: 'symbols', label: 'Symbols (!@#…)' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => toggle(key)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${opts[key] ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-500'}`}>
            <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-xs ${opts[key] ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}>
              {opts[key] ? '✓' : ''}
            </span>
            {label}
          </button>
        ))}
      </div>

      <button onClick={generate}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
        Generate Password
      </button>

      {password && (
        <div className="space-y-3">
          {/* Password display */}
          <div className="relative bg-gray-900 rounded-xl p-4 pr-20">
            <p className="text-green-400 font-mono text-sm break-all leading-relaxed">{password}</p>
            <button onClick={copy}
              className={`absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${copied ? 'bg-green-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Strength meter */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-gray-500">Password Strength</span>
              <span className={`text-xs font-bold ${str.score <= 2 ? 'text-red-600' : str.score <= 4 ? 'text-yellow-600' : str.score <= 5 ? 'text-blue-600' : 'text-green-600'}`}>
                {str.label}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-300 ${str.color}`}
                style={{ width: `${(str.score / 7) * 100}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const STEPS = [
  'Set the desired password length using the slider (8 to 64 characters).',
  'Toggle character types: uppercase, lowercase, numbers, and symbols.',
  'Click "Generate Password" to create a cryptographically random password.',
  'Click "Copy" to copy the password to your clipboard instantly.',
]

const FAQS = [
  { q: 'Is this password generator truly random?', a: 'Yes! We use the browser\'s built-in crypto.getRandomValues() API, which provides cryptographically secure random numbers — the same standard used by security professionals.' },
  { q: 'Are my generated passwords stored anywhere?', a: 'No. All password generation happens entirely in your browser. No passwords are transmitted to our servers or stored anywhere.' },
  { q: 'What length should I use for a strong password?', a: 'We recommend at least 16 characters with a mix of uppercase, lowercase, numbers, and symbols. For critical accounts like banking, use 20+ characters.' },
  { q: 'Why should I use symbols in passwords?', a: 'Adding symbols dramatically increases the number of possible password combinations, making brute-force attacks exponentially harder.' },
  { q: 'How strong is a generated password?', a: 'A 16-character password with all character types has over 7 quadrillion possible combinations, which would take thousands of years to crack with modern hardware.' },
]

const ABOUT = [
  'The Password Generator creates cryptographically secure random passwords using the Web Crypto API built into your browser. You control the length (8–64 characters) and which character types to include.',
  'Unlike many online password generators, no data is sent to any server. Everything runs in your browser, so your passwords are completely private and never logged, stored, or transmitted.',
  'The built-in strength meter analyses your generated password across seven criteria including length, character variety, and complexity to give you instant feedback on how secure your password is.',
]

export default function PasswordGenerator() {
  return (
    <ToolPageShell
      slug="password-generator"
      name="Password Generator"
      description="Generate cryptographically secure random passwords with custom length and character types."
      icon="🔐"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
    >
      <PasswordGeneratorTool />
    </ToolPageShell>
  )
}
