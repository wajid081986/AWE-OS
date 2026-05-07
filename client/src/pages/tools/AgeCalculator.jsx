import { useState } from 'react'
import ToolPageShell from './ToolPageShell'

function AgeTool() {
  const [dob, setDob] = useState('')
  const [result, setResult] = useState(null)

  const calc = () => {
    if (!dob) return
    const birth = new Date(dob)
    const now = new Date()
    if (birth > now) return

    let years = now.getFullYear() - birth.getFullYear()
    let months = now.getMonth() - birth.getMonth()
    let days = now.getDate() - birth.getDate()

    if (days < 0) {
      months--
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      days += prevMonth.getDate()
    }
    if (months < 0) { years--; months += 12 }

    const totalDays = Math.floor((now - birth) / 86400000)
    const dayName = birth.toLocaleDateString('en-US', { weekday: 'long' })

    const nextBirthday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate())
    if (nextBirthday <= now) nextBirthday.setFullYear(now.getFullYear() + 1)
    const daysUntilBday = Math.ceil((nextBirthday - now) / 86400000)

    setResult({ years, months, days, totalDays, dayName, daysUntilBday, nextBirthday })
  }

  const reset = () => { setDob(''); setResult(null) }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
        <input type="date" value={dob} onChange={e => setDob(e.target.value)} max={today}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div className="flex gap-3">
        <button onClick={calc}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
          Calculate Age
        </button>
        <button onClick={reset}
          className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-medium transition-colors">
          Reset
        </button>
      </div>

      {result && (
        <div className="space-y-3">
          {/* Main age */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-center">
            <p className="text-sm text-blue-600 font-medium mb-1">Your Age</p>
            <p className="text-3xl font-bold text-gray-900">
              {result.years} <span className="text-lg">yrs</span>{' '}
              {result.months} <span className="text-lg">mo</span>{' '}
              {result.days} <span className="text-lg">days</span>
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Days Lived', value: result.totalDays.toLocaleString(), icon: '📅' },
              { label: 'Born on a', value: result.dayName, icon: '🗓️' },
              { label: 'Days to Birthday', value: result.daysUntilBday, icon: '🎂' },
              { label: 'Next Birthday', value: result.nextBirthday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), icon: '🎉' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xl mb-1">{icon}</p>
                <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                <p className="text-sm font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const STEPS = [
  'Click the date input and select your date of birth from the calendar.',
  'Click "Calculate Age" to process your age instantly.',
  'View your exact age in years, months, and days.',
  'See additional stats: total days lived, birthday countdown, and what day you were born.',
]

const FAQS = [
  { q: 'How accurate is the age calculator?', a: 'Our calculator is fully accurate down to the exact day. It properly accounts for leap years and varying month lengths to give you a precise result.' },
  { q: 'Can I calculate age for any historical date?', a: 'Yes, you can enter any date of birth from the past. The calculator will work for any date before today.' },
  { q: 'Why does the calculator show months and days separately?', a: 'This gives you the most precise representation of your age. For example, "32 years 4 months 12 days" is more accurate than just saying "32 years old."' },
  { q: 'Does this work for future dates?', a: 'No, the calculator only works for dates in the past. If you select a future date, the result will not be shown.' },
  { q: 'How is the next birthday calculated?', a: 'The calculator finds your next birthday by setting the birth month/day to the current year. If that date has already passed, it moves to next year.' },
]

const ABOUT = [
  'The Age Calculator gives you an exact breakdown of your age in years, months, and days based on your date of birth. It correctly handles leap years, varying month lengths, and all edge cases.',
  'Beyond just your age, you can see the total number of days you have lived, what day of the week you were born on, how many days remain until your next birthday, and the exact date of your next birthday.',
  'This tool is completely free, works offline in your browser, and requires no sign-up. It is ideal for birthday planning, legal age verification checks, and satisfying your curiosity.',
]

export default function AgeCalculator() {
  return (
    <ToolPageShell
      slug="age-calculator"
      name="Age Calculator"
      description="Find your exact age in years, months and days plus birthday countdown."
      icon="🎂"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
    >
      <AgeTool />
    </ToolPageShell>
  )
}
