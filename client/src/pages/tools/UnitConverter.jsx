import { useState, useEffect } from 'react'
import ToolPageShell from './ToolPageShell'

const CATEGORIES = {
  Length: {
    units: ['Meter', 'Kilometer', 'Centimeter', 'Millimeter', 'Mile', 'Yard', 'Foot', 'Inch'],
    toBase: { Meter: 1, Kilometer: 1000, Centimeter: 0.01, Millimeter: 0.001, Mile: 1609.344, Yard: 0.9144, Foot: 0.3048, Inch: 0.0254 },
  },
  Weight: {
    units: ['Kilogram', 'Gram', 'Milligram', 'Pound', 'Ounce', 'Ton (metric)', 'Stone'],
    toBase: { Kilogram: 1, Gram: 0.001, Milligram: 0.000001, Pound: 0.453592, Ounce: 0.0283495, 'Ton (metric)': 1000, Stone: 6.35029 },
  },
  Temperature: {
    units: ['Celsius', 'Fahrenheit', 'Kelvin'],
    toBase: null,
  },
  Speed: {
    units: ['m/s', 'km/h', 'mph', 'Knot', 'ft/s'],
    toBase: { 'm/s': 1, 'km/h': 0.277778, 'mph': 0.44704, 'Knot': 0.514444, 'ft/s': 0.3048 },
  },
  Area: {
    units: ['m²', 'km²', 'cm²', 'ft²', 'in²', 'Acre', 'Hectare'],
    toBase: { 'm²': 1, 'km²': 1e6, 'cm²': 0.0001, 'ft²': 0.092903, 'in²': 0.00064516, 'Acre': 4046.86, 'Hectare': 10000 },
  },
}

function convertTemp(value, from, to) {
  let celsius
  if (from === 'Celsius') celsius = value
  else if (from === 'Fahrenheit') celsius = (value - 32) * 5 / 9
  else celsius = value - 273.15

  if (to === 'Celsius') return celsius
  if (to === 'Fahrenheit') return celsius * 9 / 5 + 32
  return celsius + 273.15
}

function UnitConverterTool() {
  const [category, setCategory] = useState('Length')
  const [from, setFrom] = useState('Meter')
  const [to, setTo] = useState('Foot')
  const [input, setInput] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    const cat = CATEGORIES[category]
    setFrom(cat.units[0])
    setTo(cat.units[1])
    setInput('')
    setResult(null)
  }, [category])

  useEffect(() => {
    if (input === '' || isNaN(parseFloat(input))) { setResult(null); return }
    const v = parseFloat(input)
    const cat = CATEGORIES[category]
    let res
    if (category === 'Temperature') {
      res = convertTemp(v, from, to)
    } else {
      res = (v * cat.toBase[from]) / cat.toBase[to]
    }
    setResult(isFinite(res) ? res : null)
  }, [input, from, to, category])

  const swap = () => { setFrom(to); setTo(from) }

  const fmt = n => {
    if (n === null) return ''
    if (Math.abs(n) < 0.0001 && n !== 0) return n.toExponential(4)
    return parseFloat(n.toFixed(8)).toString()
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {Object.keys(CATEGORIES).map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${category === cat ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'}`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
        {/* From */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">From</label>
          <div className="flex gap-2">
            <select value={from} onChange={e => setFrom(e.target.value)}
              className="w-40 px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {CATEGORIES[category].units.map(u => <option key={u}>{u}</option>)}
            </select>
            <input type="number" value={input} onChange={e => setInput(e.target.value)} placeholder="Enter value"
              className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        {/* Swap button */}
        <div className="flex justify-center">
          <button onClick={swap}
            className="w-10 h-10 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 flex items-center justify-center text-lg transition-colors">
            ⇅
          </button>
        </div>

        {/* To */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">To</label>
          <div className="flex gap-2">
            <select value={to} onChange={e => setTo(e.target.value)}
              className="w-40 px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {CATEGORIES[category].units.map(u => <option key={u}>{u}</option>)}
            </select>
            <div className="flex-1 px-3 py-2.5 border border-gray-200 bg-white rounded-lg text-sm text-gray-900 font-semibold min-h-[42px] flex items-center">
              {result !== null ? <span className="text-blue-700">{fmt(result)}</span> : <span className="text-gray-400">Result</span>}
            </div>
          </div>
        </div>

        {result !== null && input && (
          <p className="text-center text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{input} {from}</span>
            {' = '}
            <span className="font-bold text-blue-700">{fmt(result)} {to}</span>
          </p>
        )}
      </div>
    </div>
  )
}

const STEPS = [
  'Select the measurement category from the tabs: Length, Weight, Temperature, Speed, or Area.',
  'Choose the unit you are converting FROM using the dropdown, then enter your value.',
  'Choose the unit you are converting TO using the second dropdown.',
  'The result appears instantly. Use the ⇅ swap button to reverse the conversion.',
]

const FAQS = [
  { q: 'Which unit categories does this converter support?', a: 'The converter supports Length, Weight, Temperature, Speed, and Area conversions. Each category includes all common units used worldwide.' },
  { q: 'How do I convert temperature?', a: 'Select "Temperature" tab, choose the unit you have (e.g., Celsius), enter the value, and select the target unit (e.g., Fahrenheit). The result updates instantly.' },
  { q: 'Can I use decimal values?', a: 'Yes, you can enter any decimal number. The result is displayed with up to 8 decimal places, switching to scientific notation for very small values.' },
  { q: 'What does the swap button do?', a: 'The ⇅ button swaps the FROM and TO units instantly, reversing the direction of your conversion without having to reselect from the dropdowns.' },
  { q: 'How accurate are the conversions?', a: 'All conversion factors are based on internationally recognised standards. Temperature uses exact formulas; other units use precise conversion ratios accurate to at least 6 significant figures.' },
]

const ABOUT = [
  'The Unit Converter is a fast, browser-based conversion tool supporting five major measurement categories: Length, Weight, Temperature, Speed, and Area. All conversions happen instantly as you type — no button needed.',
  'Each category includes all commonly used units from both metric and imperial systems. The temperature converter uses exact mathematical formulas for Celsius, Fahrenheit, and Kelvin conversions.',
  'The swap button makes bidirectional conversions effortless. Whether you are converting miles to kilometres for a road trip, pounds to kilograms for a recipe, or Fahrenheit to Celsius for weather, this tool covers it all.',
]

export default function UnitConverter() {
  return (
    <ToolPageShell
      slug="unit-converter"
      name="Unit Converter"
      description="Convert between length, weight, temperature, speed and area units instantly."
      icon="📐"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
    >
      <UnitConverterTool />
    </ToolPageShell>
  )
}
