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
        <label htmlFor="age-dob" className="block text-sm font-medium text-gray-700 mb-1.5">Date of Birth</label>
        <input id="age-dob" type="date" value={dob} onChange={e => setDob(e.target.value)} max={today}
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
  "Click the Date of Birth field and either type your birth date directly (in YYYY-MM-DD format) or use the calendar picker. The picker shows a month and year navigation to help you reach dates far in the past quickly. The calendar prevents selecting any future date automatically.",
  "Double-check the day, month, and year before calculating. The most common mistake is entering the wrong year — for example 1988 instead of 1998 — which produces a result that is off by a decade. Confirm all three components are correct before clicking Calculate.",
  "Click 'Calculate Age'. Your result appears instantly showing three components: the number of complete years, the remaining complete months, and the remaining individual days. This three-part breakdown is the most precise way to express age, used in legal documents and medical records throughout India.",
  "Read the four additional statistics shown in the cards below your age: the total number of days you have lived since birth, the day of the week you were born (Monday, Tuesday, etc.), how many days remain until your next birthday, and the calendar date of that upcoming birthday.",
  "To calculate the age of someone else — for form-filling, age-restricted eligibility checks, or genealogical research — click Reset and enter the new date. All calculations run locally in your browser with no data sent to any server, and there is no limit on how many dates you can check.",
]

const FAQS = [
  { q: 'How accurate is the age calculator?', a: 'The calculator is accurate to the exact day. It correctly handles all the calendar edge cases that a simple year-subtraction would miss: leap years where February has 29 days, months with different lengths (January has 31, June has 30, February has 28 or 29), and the day-of-month crossing boundary. The months and days components are independently calculated so the result is a precise breakdown, not an approximation based on an assumed average month length of 30 or 30.5 days.' },
  { q: 'Can I calculate age for any historical birth date?', a: 'Yes. The calculator accepts any birth date from the earliest valid calendar entry up to today. You can calculate the age of someone born in 1920, 1885, or even earlier — for very old dates the year may need to be typed manually since the calendar scroll can be slow for dates more than a few decades in the past. There is no minimum age restriction either: the age of a newborn (which will show 0 years 0 months and a small number of days) is calculated just as accurately as that of a 90-year-old.' },
  { q: 'Why does the result show years, months, and days separately?', a: 'Showing all three components gives the most precise representation of age. Simply saying "32 years old" hides whether someone just passed their 32nd birthday yesterday or is within days of turning 33 — a difference that matters for insurance cutoffs, legal age thresholds, and medical assessments. The three-part format is also how age is expressed in many legal and medical contexts in India, particularly for children under five where the months and days components are clinically significant for developmental milestones and vaccination schedules.' },
  { q: 'Does this work for calculating age as of a specific past date?', a: 'The calculator computes age as of today by default. If you need to know how old someone was on a specific past date — for example, confirming their age at the time of a document signing or on a policy inception date — that requires a date-difference tool rather than an age calculator. For the most common use cases such as current age verification, birthday countdown planning, and checking eligibility for age-restricted activities or government schemes, today as the reference date covers virtually all practical scenarios.' },
  { q: 'How are leap-year birthdays handled?', a: "People born on February 29 only have a birthday on that exact date once every four years. For all non-leap years, the calculator uses February 28 as the practical birthday date — the most widely adopted convention used by the Government of India, banks, insurance companies, and most international institutions for handling this edge case. The next birthday displayed will be February 28 in non-leap years and February 29 in leap years, matching how official systems throughout India and globally treat this situation." },
  { q: 'Can I use this for legal age verification in India?', a: "Yes. The calculator gives a precise years-months-days breakdown that clearly confirms whether someone has reached a specific age threshold. For common Indian legal purposes — 18 years for voting eligibility under the Representation of the People Act, 21 years for certain financial products and marriage laws for men, 60 years for senior citizen status under the Income Tax Act, 65 years for very senior citizens — the year count is normally sufficient. The day-accurate breakdown is useful for borderline cases where the person's birthday falls within days of an eligibility cutoff date." },
]

const ABOUT = [
  'The Age Calculator gives you an exact breakdown of your age in years, months, and days based on your date of birth. It correctly handles leap years, varying month lengths, and all calendar edge cases to produce a result that is accurate to the exact day — not an estimate rounded to the nearest year.',
  'Beyond your age in years, months, and days, the calculator shows four additional facts: the total number of days you have lived, the day of the week you were born, how many days remain until your next birthday, and the exact date of that upcoming birthday. These extra details make the tool useful for birthday planning, milestone celebrations, and anything that benefits from knowing your precise age in full.',
  'Age calculations appear in more contexts than most people realise. Filling in forms that ask for your age as of a specific date, determining legal eligibility for age-restricted activities, insurance and medical intake forms, genealogical research, and calculating retirement timelines all require an accurate age — not just the year difference. The calculator handles any date of birth from the earliest valid calendar dates up to today.',
  'Everything runs locally in your browser. No information leaves your device, and no account or sign-up is required. The tool is completely free and works in any modern browser, including on mobile devices. Simply pick a birth date, hit Calculate, and get your result in under a second.',
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
      limitation={"Calculates calendar age exactly — time zones can shift the result by a day if you were born near midnight abroad."}
    >
      <AgeTool />
    </ToolPageShell>
  )
}
