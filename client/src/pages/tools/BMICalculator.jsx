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
  'Select your preferred unit system — metric (cm/kg) or imperial (ft/lb).',
  'Enter your height and weight in the input fields.',
  'Click "Calculate BMI" to see your result instantly.',
  'Review your BMI score, category, and position on the visual scale.',
]

const FAQS = [
  { q: 'What is BMI?', a: 'Body Mass Index (BMI) is a simple measure calculated from your height and weight. It provides a quick estimate of whether your weight is in a healthy range for your height.' },
  { q: 'What is a healthy BMI range?', a: 'A BMI between 18.5 and 24.9 is considered normal/healthy. Below 18.5 is underweight, 25–29.9 is overweight, and 30 or above is classified as obese.' },
  { q: 'Is BMI accurate for everyone?', a: 'BMI is a screening tool, not a diagnostic measure. It does not account for muscle mass, bone density, or fat distribution. Athletes may have a high BMI despite low body fat.' },
  { q: 'How often should I check my BMI?', a: 'Checking BMI monthly or quarterly is sufficient for most people. Frequent daily measurements are unnecessary as BMI changes slowly with lifestyle habits.' },
  { q: 'Can children use this BMI calculator?', a: 'This calculator is designed for adults (18+). For children and teenagers, BMI is interpreted differently using age- and sex-specific percentile charts.' },
]

const ABOUT = [
  'The BMI Calculator helps you instantly determine your Body Mass Index using either metric or imperial measurements. BMI is the most widely used screening tool by healthcare professionals worldwide.',
  'Our calculator supports both metric (centimetres and kilograms) and imperial (feet, inches, and pounds) units, making it accessible to users everywhere. The visual scale bar shows exactly where your BMI falls across all four categories.',
  'Remember that BMI is just one indicator of health. For a complete health assessment, consult a healthcare professional who can consider additional factors like waist circumference, diet, and physical activity levels.',
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
