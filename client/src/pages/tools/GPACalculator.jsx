import { useState } from 'react'
import ToolPageShell from './ToolPageShell'

const GRADE_MAP = { 'A+': 4.0, 'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7, 'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'F': 0.0 }

function GPATool() {
  const [subjects, setSubjects] = useState([
    { name: '', grade: 'A', credits: '' },
    { name: '', grade: 'B', credits: '' },
  ])
  const [gpa, setGpa] = useState(null)

  const update = (i, field, value) => {
    setSubjects(s => s.map((row, idx) => idx === i ? { ...row, [field]: value } : row))
    setGpa(null)
  }

  const addRow = () => setSubjects(s => [...s, { name: '', grade: 'A', credits: '' }])
  const removeRow = i => { if (subjects.length > 1) setSubjects(s => s.filter((_, idx) => idx !== i)) }

  const calc = () => {
    let totalPoints = 0, totalCredits = 0
    for (const { grade, credits } of subjects) {
      const c = parseFloat(credits)
      if (!c || c <= 0) continue
      totalPoints += GRADE_MAP[grade] * c
      totalCredits += c
    }
    if (totalCredits === 0) return
    setGpa((totalPoints / totalCredits).toFixed(2))
  }

  const gpaColor = gpa
    ? gpa >= 3.5 ? 'text-green-600' : gpa >= 3.0 ? 'text-blue-600' : gpa >= 2.0 ? 'text-yellow-600' : 'text-red-600'
    : ''
  const gpaLabel = gpa
    ? gpa >= 3.5 ? 'Distinction' : gpa >= 3.0 ? 'Good Standing' : gpa >= 2.0 ? 'Satisfactory' : 'Needs Improvement'
    : ''

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-0 bg-gray-50 border-b border-gray-200 px-3 py-2 text-xs font-medium text-gray-500">
          <div className="col-span-5">Subject (optional)</div>
          <div className="col-span-3">Grade</div>
          <div className="col-span-3">Credits</div>
          <div className="col-span-1" />
        </div>
        <div className="divide-y divide-gray-100">
          {subjects.map((row, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 items-center">
              <input className="col-span-5 px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={`Subject ${i + 1}`} value={row.name} onChange={e => update(i, 'name', e.target.value)} />
              <select className="col-span-3 px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={row.grade} onChange={e => update(i, 'grade', e.target.value)}>
                {Object.keys(GRADE_MAP).map(g => <option key={g}>{g}</option>)}
              </select>
              <input type="number" className="col-span-3 px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="3" min="0.5" step="0.5" value={row.credits} onChange={e => update(i, 'credits', e.target.value)} />
              <button onClick={() => removeRow(i)} className="col-span-1 text-gray-400 hover:text-red-500 text-lg leading-none text-center transition-colors">×</button>
            </div>
          ))}
        </div>
      </div>

      <button onClick={addRow}
        className="w-full py-2 border-2 border-dashed border-gray-300 hover:border-blue-400 text-gray-500 hover:text-blue-600 rounded-lg text-sm transition-colors">
        + Add Subject
      </button>

      <button onClick={calc}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
        Calculate GPA
      </button>

      {gpa && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="text-center mb-4">
            <p className="text-5xl font-bold text-gray-900">{gpa}</p>
            <p className={`text-base font-semibold mt-1 ${gpaColor}`}>{gpaLabel}</p>
            <p className="text-xs text-gray-400 mt-0.5">out of 4.0</p>
          </div>
          {/* GPA bar */}
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-1">
            <div className={`h-full rounded-full transition-all ${gpa >= 3.5 ? 'bg-green-500' : gpa >= 3.0 ? 'bg-blue-500' : gpa >= 2.0 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${(parseFloat(gpa) / 4) * 100}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>0.0</span><span>1.0</span><span>2.0</span><span>3.0</span><span>4.0</span>
          </div>

          {/* Grade reference */}
          <div className="mt-4 grid grid-cols-4 gap-1 text-xs text-gray-500">
            {Object.entries(GRADE_MAP).map(([g, p]) => (
              <div key={g} className="flex justify-between bg-gray-50 rounded px-2 py-1">
                <span className="font-medium text-gray-700">{g}</span>
                <span>{p.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const STEPS = [
  'Enter the name of each subject (optional) and select the letter grade you received.',
  'Enter the number of credit hours for each subject.',
  'Click "+ Add Subject" to add more rows as needed.',
  'Click "Calculate GPA" to see your semester GPA on a 4.0 scale.',
]

const FAQS = [
  { q: 'What GPA scale does this calculator use?', a: 'This calculator uses the standard 4.0 GPA scale: A/A+ = 4.0, A- = 3.7, B+ = 3.3, B = 3.0, and so on down to F = 0.0.' },
  { q: 'What are credit hours?', a: 'Credit hours represent the weight of a course. Typically, a full semester course is 3 credits and lab courses may carry 1 credit. Check your course syllabus for the exact credit hours.' },
  { q: 'How is GPA calculated?', a: 'GPA = (Sum of Grade Points × Credits) / Total Credits. Each grade is converted to points, multiplied by the course credits, summed up, and divided by total credits.' },
  { q: 'Can I calculate cumulative GPA?', a: 'For cumulative GPA across multiple semesters, treat each semester\'s courses as rows in this calculator. The weighted average will give you your cumulative GPA.' },
  { q: 'What GPA is required for honours?', a: 'Requirements vary by institution. Most universities require a 3.5 GPA or higher for Dean\'s List or honours recognition. Check your school\'s academic handbook for specifics.' },
]

const ABOUT = [
  'The GPA Calculator helps students quickly compute their semester Grade Point Average using the standard 4.0 scale. Add any number of subjects with their respective grades and credit hours for an instant, weighted GPA calculation.',
  'The calculator supports all standard letter grades from A+ through F and properly weights each course by its credit hours. This ensures that heavier courses have a proportionally larger impact on your overall GPA — just like real academic calculations.',
  'A built-in grade reference table shows the point value for every letter grade so you always know exactly how your marks translate into GPA points.',
]

export default function GPACalculator() {
  return (
    <ToolPageShell
      slug="gpa-calculator"
      name="GPA Calculator"
      description="Calculate your semester GPA by entering grades and credit hours for each subject."
      icon="🎓"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
    >
      <GPATool />
    </ToolPageShell>
  )
}
