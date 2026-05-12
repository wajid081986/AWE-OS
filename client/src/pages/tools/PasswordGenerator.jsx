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
  'Set your desired password length using the slider. The range is 8 to 64 characters. Most security guidelines recommend a minimum of 16 characters for regular accounts and 20+ for banking and email.',
  'Toggle the character types you want included: Uppercase letters (A–Z), Lowercase letters (a–z), Numbers (0–9), and Symbols (!@#$%^&* and others). At least two types must be active to generate a password.',
  'Click "Generate Password". A cryptographically random password is created instantly using your browser\'s Web Crypto API and displayed in the dark panel.',
  'Click "Copy" to copy the password to your clipboard in one click, then paste it directly into your password manager or account registration form. The strength meter shows the security rating instantly.',
]

const FAQS = [
  { q: 'Is this password generator truly random?', a: 'Yes. The tool uses window.crypto.getRandomValues() — the browser\'s built-in cryptographically secure random number generator. This is the same API used by security libraries, password managers, and encryption tools. It produces true randomness seeded by hardware entropy, unlike Math.random() which is pseudo-random and predictable.' },
  { q: 'Are my generated passwords stored anywhere?', a: 'No. Password generation runs entirely in your browser with no network requests. The password is generated in memory, displayed locally, and cleared when you close or refresh the page. Nothing is transmitted to any server, logged, or stored in any way — not even in the browser\'s local storage.' },
  { q: 'What length should I use for a strong password?', a: 'We recommend at least 16 characters with all four character types enabled. For high-value accounts — email, banking, cloud storage, password manager master password — use 20 or more characters. Length is the single biggest factor in resistance to brute-force attacks: each additional character multiplies the number of possible combinations by the size of the character pool.' },
  { q: 'Why should I use symbols in passwords?', a: 'Symbols increase the character pool from 62 (uppercase + lowercase + numbers) to roughly 90 characters, which multiplies the total number of possible combinations by a factor of 90 for each character position. A 16-character password with symbols has approximately 1,000 times more possible combinations than the same length without symbols — a meaningful barrier against automated cracking tools.' },
  { q: 'How strong is a 16-character password with all character types?', a: 'A 16-character password drawn from a pool of ~90 characters (uppercase, lowercase, digits, symbols) has approximately 1.9 × 10³⁰ possible combinations. At a rate of one trillion guesses per second — far beyond the capability of any existing hardware — it would take over 60 trillion years to exhaustively test all possibilities. In practice it is computationally unbreakable.' },
  { q: 'Should I use a different password for every account?', a: 'Yes, always. Password reuse is the primary reason that a data breach at one site leads to account takeovers at others — attackers automatically try leaked credentials across thousands of services. The only practical way to use unique passwords for every account is to use a password manager such as Bitwarden, 1Password, or KeePass. Generate a new password here, copy it, and save it directly into your manager.' },
]

const ABOUT = [
  'Weak and reused passwords are involved in the majority of data breaches. The AWE-OS Password Generator creates cryptographically secure, fully random passwords up to 64 characters long with your choice of character types — uppercase, lowercase, numbers, and symbols. Each password is generated entirely in your browser with no server communication and no logging of any kind.',
  'The randomness source matters. Most basic password generators use JavaScript\'s Math.random() function, which is a pseudo-random algorithm seeded from a predictable state. This tool uses window.crypto.getRandomValues() — the Web Cryptography API built into every modern browser. This function draws entropy from hardware sources (mouse movement, CPU timing jitter, system interrupts) and produces randomness that is unpredictable even to the browser itself. It is the same source used by professional cryptographic libraries.',
  'Password length is the single most important factor in resistance to brute-force attacks. A 16-character password with all four character types drawn from a pool of roughly 90 characters produces approximately 1.9 × 10³⁰ possible combinations — a number so large that it would take millions of times longer than the age of the universe to exhaust with any conceivable hardware. The built-in strength meter analyses seven criteria including length thresholds and character diversity, giving you instant visual feedback on the quality of each generated password.',
  'The most effective security practice is to combine a strong password generator with a dedicated password manager. Generate a unique password for every account, save it in your manager, and never memorise or reuse credentials across services. If any one service suffers a breach, attackers who find your password cannot use it anywhere else. Bitwarden (free, open-source), 1Password, and KeePass are widely trusted options. Generate a password here, copy it in one click, and paste it directly into your manager\'s entry form.',
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
