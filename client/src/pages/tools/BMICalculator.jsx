import { useState } from 'react'
import ToolPageShell from './ToolPageShell'
import { TOOL_ABOUT } from '../../data/toolPageContent'

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
            <label htmlFor="bmi-height-cm" className="block text-sm font-medium text-gray-700 mb-1.5">Height (cm)</label>
            <input id="bmi-height-cm" type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="175"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="bmi-height-ft" className="block text-sm font-medium text-gray-700 mb-1.5">Height (ft)</label>
              <input id="bmi-height-ft" type="number" value={heightFt} onChange={e => setHeightFt(e.target.value)} placeholder="5"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label htmlFor="bmi-height-in" className="block text-sm font-medium text-gray-700 mb-1.5">Height (in)</label>
              <input id="bmi-height-in" type="number" value={heightIn} onChange={e => setHeightIn(e.target.value)} placeholder="9"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </>
        )}
        <div className={unit === 'metric' ? 'col-span-2 sm:col-span-1' : 'col-span-2'}>
          <label htmlFor="bmi-weight" className="block text-sm font-medium text-gray-700 mb-1.5">Weight ({unit === 'metric' ? 'kg' : 'lb'})</label>
          <input id="bmi-weight" type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder={unit === 'metric' ? '70' : '154'}
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
  "Select your unit system at the top of the calculator. Choose Metric (centimetres and kilograms) if you know your measurements in the standard international format, or Imperial (feet, inches, and pounds) if you are more comfortable with the US system. Both give identical BMI results.",
  "Enter your height. In metric mode, enter centimetres (e.g. 170 cm). In imperial mode, enter feet and inches separately (e.g. 5 ft 7 in). Make sure you are entering your actual measured height, not an estimate — even a 2 cm difference changes your BMI category.",
  "Enter your current body weight in kilograms (metric) or pounds (imperial). Use your most recent measurement taken in the morning before eating for the most accurate result. The BMI value and category update instantly as you type.",
  "Read your BMI score and category label. AWE-OS shows both the standard WHO thresholds and the Asian/Indian-specific thresholds recommended by the Indian Council of Medical Research (ICMR), which classify a BMI above 23 as overweight — lower than the WHO cutoff of 25.",
]

const FAQS = [
  {
    q: "What is BMI and how is it calculated?",
    a: "BMI stands for Body Mass Index. It is calculated by dividing your weight in kilograms by the square of your height in metres: BMI = kg ÷ m². For example, a person who weighs 70 kg and is 1.75 m tall has a BMI of 70 ÷ (1.75 × 1.75) = 22.9. It was developed by Belgian mathematician Adolphe Quetelet in the 1830s and is used by the WHO as a population-level screening tool for weight-related health risks.",
  },
  {
    q: "What is a healthy BMI range for Indian adults?",
    a: "For the general population, WHO defines 18.5–24.9 as the healthy BMI range. However, research shows that South Asian and Indian populations have higher body fat percentages at the same BMI as Western populations, and face increased metabolic risks at lower BMI values. The Indian Council of Medical Research (ICMR) and Asia-Pacific guidelines recommend: Underweight below 18.5, Normal 18.5–22.9, Overweight 23–24.9, Obese 25 and above. AWE-OS displays both thresholds so you can compare.",
  },
  {
    q: "Is BMI an accurate measure of health?",
    a: "BMI is a useful screening indicator but has well-documented limitations. It does not distinguish between muscle mass and fat mass — a bodybuilder may show as obese despite very low body fat. It also does not account for fat distribution (abdominal fat is more dangerous than peripheral fat), age-related changes in body composition, or ethnic differences in body structure. Medical professionals always use BMI alongside other measurements such as waist circumference, blood pressure, and lipid profiles for a complete health assessment.",
  },
  {
    q: "How often should I check my BMI?",
    a: "For most adults, checking BMI every 3 to 6 months is sufficient to track significant weight changes over time. Daily or weekly BMI checking is generally not useful because normal body weight fluctuates by 1–2 kg depending on hydration, food intake, and time of day. If you are actively working on weight management with a dietitian or doctor, they will advise the appropriate monitoring frequency for your situation.",
  },
  {
    q: "Can children use this BMI calculator?",
    a: "This calculator uses adult BMI formulas and is designed for people aged 18 and above. Children and teenagers have different healthy BMI ranges that vary by age and sex — paediatric BMI is assessed using age-and-sex-specific growth charts, not fixed thresholds. For children under 18, please use a dedicated paediatric BMI calculator or consult a paediatrician for an accurate assessment.",
  },
  {
    q: "What is the difference between BMI and body fat percentage?",
    a: "BMI is an indirect proxy for body fat calculated from height and weight — it is fast and free to measure but imprecise. Body fat percentage directly measures the proportion of your body that is fat tissue, typically using DEXA scans, bioelectrical impedance scales, or skinfold callipers. Body fat percentage is a more accurate health indicator, especially for athletes, older adults, and people with high muscle mass. A healthy body fat range is approximately 10–20% for men and 18–28% for women, regardless of BMI.",
  },
]

// about.howToUse/about.faqs dropped — STEPS/FAQS above are the single rendered source for those sections
const { howToUse: _aboutHowToUse, faqs: _aboutFaqs, ...ABOUT } = TOOL_ABOUT['bmi-calculator']

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
      limitation={"BMI does not distinguish muscle from fat — athletes and elderly users may get misleading categories; consult a doctor for health decisions."}
    >
      <BMITool />
    </ToolPageShell>
  )
}
