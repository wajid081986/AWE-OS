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
  "Start with the two pre-filled rows or clear them and build your list from scratch. For each subject, optionally type the subject name in the first column — you can leave it blank if you prefer. The name is just for your own reference and does not affect the calculation.",
  "Select the correct letter grade from the dropdown for each subject. The scale runs from A+ down to F. Both A and A+ equal 4.0 grade points, A- is 3.7, B+ is 3.3, B is 3.0, B- is 2.7, continuing down to F = 0.0. Match the grade exactly as it appears on your mark sheet or transcript.",
  "Enter the credit hours for each subject in the Credits column. Most lecture courses carry 3 credits; laboratory or tutorial components often carry 1 credit; some core courses carry 4 or 5 credits. If you are unsure, check your course registration form or syllabus — credit hours are always specified there. Half-credit values like 0.5 or 1.5 are also supported.",
  "Click '+ Add Subject' to add more rows for additional courses until you have entered every subject from the semester. Click the × button on any row to remove it. Rows with no credit hours entered are automatically skipped in the calculation, so incomplete rows do not cause errors.",
  "Click 'Calculate GPA' to see your weighted semester GPA on a 4.0 scale, along with a colour-coded standing label, a progress bar, and a full grade-to-point reference table. You can also use this as a planning tool — enter predicted grades for upcoming exams to model the GPA impact before results are finalised.",
]

const FAQS = [
  { q: 'What GPA scale does this calculator use?', a: 'The calculator uses the standard American 4.0 scale adopted by most international universities and increasingly by Indian institutions following global accreditation standards. The mapping is: A+ and A = 4.0, A- = 3.7, B+ = 3.3, B = 3.0, B- = 2.7, C+ = 2.3, C = 2.0, C- = 1.7, D+ = 1.3, D = 1.0, F = 0.0. Indian universities that grade on a 10-point CGPA scale (such as many affiliated with Anna University, VTU, or JNTU) should multiply their CGPA by 9.5 (the UGC formula) to convert to percentage, then use the AWE-OS Percentage Calculator for further analysis.' },
  { q: 'What are credit hours and why do they matter for GPA?', a: "Credit hours represent the weight of a course within your degree program. A standard 3-credit lecture course contributes three times as much to your GPA as a 1-credit lab. This is what makes GPA a weighted average rather than a simple average of grades. A B in a 4-credit core engineering course pulls your GPA down more than a B in a 1-credit elective lab — reflecting the greater academic load of that course. Always use the credit hours listed on your official course registration document rather than the class meeting hours per week, which may differ." },
  { q: 'How exactly is GPA calculated?', a: "GPA is calculated as a weighted average: for each subject, multiply the grade points by the credit hours to get 'quality points'. Sum all quality points, then divide by the total credit hours enrolled. For example: an A (4.0) in a 3-credit course plus a B+ (3.3) in a 4-credit course = (4.0 × 3) + (3.3 × 4) = 12 + 13.2 = 25.2 quality points ÷ 7 total credits = 3.60 GPA. This is the same formula used by universities to produce the official GPA on your transcript." },
  { q: 'Can I calculate my cumulative GPA across multiple semesters?', a: "Yes. To calculate cumulative GPA, add every course from all semesters you want to include as separate rows — entering the grade and credit hours for each. The calculator automatically computes the weighted average across all rows. An alternative approach: treat each semester as a single row by entering the semester GPA as a 'grade' (you'll need to convert it to the letter equivalent) or calculate manually: multiply each semester's GPA by its total credits, sum all results, and divide by the total credits across all semesters. The first approach using individual courses is more accurate." },
  { q: 'What GPA is needed for honours, scholarships, or graduate school in India?', a: "Requirements vary by institution. Most Indian universities require a minimum CGPA of 7.5 to 8.0 on a 10-point scale (equivalent to roughly 3.0–3.2 on the 4.0 scale) for gold medal or merit honours. Dean's List recognition typically requires top 5–10% of class. For scholarships like the INSPIRE Fellowship or CSIR-JRF, a first-class degree (60% or above, approximately 2.8+ on the 4.0 scale) is the baseline. For graduate school admission at premier Indian institutions like IITs and IIMs, the minimum requirement is usually 60–65% aggregate." },
  { q: 'How can I use this calculator to plan my target GPA?', a: "The calculator works as a forward-planning tool as well as a result tracker. Enter your confirmed grades for courses already completed. For courses still in progress, enter your target or predicted grade based on mid-semester performance. The resulting GPA shows what you will achieve if those predictions hold. You can then experiment: change one grade and recalculate to see the impact. A 4-credit course has much more leverage than a 1-credit one — this helps you identify which upcoming exams to prioritise for the biggest improvement in your final semester GPA." },
]

const ABOUT = [
  'The GPA Calculator computes your semester Grade Point Average on the standard 4.0 scale used by most universities and colleges. Enter any number of subjects with their letter grade and credit hours — the calculator instantly produces the weighted GPA that reflects the correct relative importance of each course in your schedule.',
  'The calculator supports every standard letter grade from A+ through F, mapping each to its corresponding grade point value: A and A+ to 4.0, A- to 3.7, B+ to 3.3, B to 3.0, and continuing down to F at 0.0. Because courses carry different credit weights, a heavier course like a 4-credit lecture naturally has more influence on your GPA than a 1-credit lab — just as it does in your institution\'s official calculation. A reference table below your result shows the full grade-to-point mapping.',
  'Results are displayed with a colour-coded progress bar and a standing label that gives immediate context: Distinction (3.5 and above), Good Standing (3.0–3.49), Satisfactory (2.0–2.99), or Needs Improvement (below 2.0). This makes it easy to understand at a glance where you stand relative to common academic thresholds like Dean\'s List eligibility, scholarship requirements, and graduate school minimum GPAs.',
  'The tool is designed for straightforward semester GPA calculations, and it works equally well as a planning tool. Enter projected grades alongside real ones to model how a stronger or weaker result in an upcoming exam would affect your final GPA. All calculations happen locally in your browser with no data sent to a server, no sign-up required, and no limit on the number of subjects you can add.',
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
      limitation={"Uses the standard grade-point scale you select — universities with custom scales or weightings may differ."}
    >
      <GPATool />
    </ToolPageShell>
  )
}
