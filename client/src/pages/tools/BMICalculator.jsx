import { useState } from 'react'
import ToolPageShell from './ToolPageShell'

function BMITool() {
  const [unit, setUnit] = useState('metric')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [heightFt, setHeightFt] = useState('')
  const [heightIn, setHeightIn] = useState('')
  const [bmi, setBmi] = useState(null)

  const calc = () => {
    let h, w
    if (unit === 'metric') {
      h = parseFloat(height) / 100
      w = parseFloat(weight)
    } else {
      const totalIn = parseFloat(heightFt) * 12 + parseFloat(heightIn || 0)
      h = totalIn * 0.0254
      w = parseFloat(weight) * 0.453592
    }
    if (!h || !w || h <= 0 || w <= 0) return
    setBmi((w / (h * h)).toFixed(1))
  }

  const reset = () => { setHeight(''); setWeight(''); setHeightFt(''); setHeightIn(''); setBmi(null) }

  const category = bmi
    ? bmi < 18.5 ? { label: 'Underweight', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' }
    : bmi < 25   ? { label: 'Normal weight', color: 'text-green-600', bg: 'bg-green-50 border-green-200' }
    : bmi < 30   ? { label: 'Overweight', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' }
                 : { label: 'Obese', color: 'text-red-600', bg: 'bg-red-50 border-red-200' }
    : null

  const barPct = bmi ? Math.min(100, Math.max(0, ((parseFloat(bmi) - 10) / 30) * 100)) : 0

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Unit toggle */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {['metric', 'imperial'].map(u => (
          <button key={u} onClick={() => { setUnit(u); setBmi(null) }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${unit === u ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            {u === 'metric' ? 'Metric (cm, kg)' : 'Imperial (ft, lb)'}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-4">
        {unit === 'metric' ? (
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Height (cm)</label>
            <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="175"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Height (ft)</label>
              <input type="number" value={heightFt} onChange={e => setHeightFt(e.target.value)} placeholder="5"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Height (in)</label>
              <input type="number" value={heightIn} onChange={e => setHeightIn(e.target.value)} placeholder="9"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </>
        )}
        <div className={unit === 'metric' ? 'col-span-2 sm:col-span-1' : 'col-span-2'}>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Weight ({unit === 'metric' ? 'kg' : 'lb'})</label>
          <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder={unit === 'metric' ? '70' : '154'}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={calc}
          className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors">
          Calculate BMI
        </button>
        <button onClick={reset}
          className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-medium transition-colors">
          Reset
        </button>
      </div>

      {bmi && category && (
        <div className={`border rounded-xl p-5 ${category.bg}`}>
          <div className="text-center mb-4">
            <p className="text-4xl font-bold text-gray-900">{bmi}</p>
            <p className={`text-lg font-semibold mt-1 ${category.color}`}>{category.label}</p>
          </div>

          {/* Scale bar */}
          <div className="mb-4">
            <div className="h-3 rounded-full overflow-hidden flex">
              <div className="flex-1 bg-blue-400" />
              <div className="flex-1 bg-green-400" />
              <div className="flex-1 bg-yellow-400" />
              <div className="flex-1 bg-red-400" />
            </div>
            <div className="relative mt-1" style={{ paddingLeft: `${barPct}%` }}>
              <span className="text-xs text-gray-700 font-bold">▲</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>10</span><span>18.5</span><span>25</span><span>30</span><span>40</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            {[['Underweight', '< 18.5', 'text-blue-600'], ['Normal', '18.5 – 24.9', 'text-green-600'],
              ['Overweight', '25 – 29.9', 'text-yellow-600'], ['Obese', '≥ 30', 'text-red-600']].map(([label, range, cls]) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={`font-semibold ${cls}`}>{label}:</span>
                <span>{range}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const STEPS = [
  'Select your preferred unit system — Metric (centimetres and kilograms) or Imperial (feet, inches, and pounds) — using the toggle at the top of the calculator.',
  'Enter your height in the appropriate field. For Imperial, enter feet and inches separately. Enter your weight in kilograms or pounds depending on your selected unit.',
  'Click "Calculate BMI". Your Body Mass Index is computed instantly and displayed prominently alongside your weight category.',
  'Review your BMI value, category label (Underweight, Normal, Overweight, or Obese), and your position on the visual colour-coded scale that shows all four ranges at once.',
]

const FAQS = [
  { q: 'What is BMI?', a: 'Body Mass Index (BMI) is a numerical value derived from your height and weight using the formula: weight (kg) ÷ height² (m²). It was developed in the 19th century as a population-level screening tool and is still used by healthcare organisations worldwide as a first-pass indicator of weight status.' },
  { q: 'What is a healthy BMI range?', a: 'For adults, a BMI of 18.5 to 24.9 is classified as Normal weight. Below 18.5 is Underweight, 25.0 to 29.9 is Overweight, and 30.0 or above is classified as Obese. These thresholds are defined by the World Health Organization and used universally by GPs and clinicians.' },
  { q: 'Is BMI accurate for everyone?', a: 'BMI is a screening measure, not a clinical diagnosis. It does not distinguish between fat mass and lean muscle mass, and does not account for age, sex, ethnicity, or fat distribution. Highly muscular individuals and athletes often have a high BMI without elevated body fat. Always consult a healthcare professional for a comprehensive health assessment.' },
  { q: 'How often should I check my BMI?', a: 'Monthly or quarterly checks are sufficient for most adults. BMI changes slowly in response to diet and exercise, so daily monitoring adds little useful information. Tracking it over several months gives a more meaningful picture of long-term progress than single measurements.' },
  { q: 'Can children use this BMI calculator?', a: 'This calculator is designed for adults aged 18 and over. For children and teenagers, BMI is interpreted using age- and sex-specific percentile charts rather than fixed thresholds, because body composition changes significantly during growth. Use a dedicated paediatric BMI tool for anyone under 18.' },
  { q: 'What is the difference between BMI and body fat percentage?', a: 'BMI estimates weight status relative to height but cannot measure body composition. Body fat percentage directly measures how much of your weight is fat versus lean tissue. Two people with identical BMIs can have very different body fat levels. BMI is a convenient initial screen; body fat percentage from a DEXA scan or bioelectrical impedance test is more precise.' },
]

const ABOUT = [
  'Body Mass Index is the starting point for millions of health conversations every day — between patients and GPs, in public health surveys, and in personal fitness tracking. The AWE-OS BMI Calculator lets you check your BMI instantly using either metric (cm/kg) or imperial (ft/in/lb) measurements, with no sign-up, no app download, and no data sent anywhere.',
  'The calculation follows the standard WHO formula: weight in kilograms divided by height in metres squared. For imperial inputs, your feet and pounds are converted internally before the formula runs — the result is mathematically identical to a metric calculation. Your BMI is then mapped to one of four WHO-defined categories: Underweight (below 18.5), Normal weight (18.5–24.9), Overweight (25–29.9), and Obese (30 and above). A colour-coded visual scale shows exactly where your value sits across all four ranges simultaneously.',
  'It is important to use BMI as a starting point rather than a verdict. The metric has well-documented limitations: it does not differentiate between fat mass and muscle mass, it does not account for where fat is distributed on the body, and it applies the same thresholds to all ethnic groups despite research showing that metabolic risks appear at lower BMI values in some populations. Athletes and strength trainers routinely fall into the "Overweight" category despite having excellent cardiovascular fitness and low body fat. For these reasons, BMI results are most useful in context alongside other indicators such as waist circumference, blood pressure, and physical activity level.',
  'Despite these limitations, BMI remains the most accessible and reproducible screening tool available — it requires only two measurements, no specialist equipment, and no lab work. Healthcare professionals use it as an entry point to guide more detailed assessments when values fall outside the normal range. For most adults tracking general weight trends over time, BMI provides a consistent, comparable snapshot. All calculations in this tool happen entirely in your browser; no data is collected or stored.',
]

export default function BMICalculator() {
  return (
    <ToolPageShell
      slug="bmi-calculator"
      name="BMI Calculator"
      description="Calculate your Body Mass Index instantly with metric or imperial measurements."
      icon="⚖️"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
    >
      <BMITool />
    </ToolPageShell>
  )
}
