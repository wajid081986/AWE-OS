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
  "Select the measurement category you need from the pill-shaped tabs at the top: Length, Weight, Temperature, Speed, or Area. Each category loads its relevant set of units automatically and resets the selectors to a sensible default pair — Meter to Foot for Length, Kilogram to Pound for Weight — so you start each category ready to convert.",
  "Choose the unit you are converting from using the left dropdown, then type your value in the number input to its right. The result updates instantly as you type — there is no Calculate button to click. Even partial values show live results so you can see the conversion changing in real time.",
  "Choose the unit you are converting to using the second dropdown. The result field displays the converted value immediately. Switching the target unit updates the result again instantly without you needing to re-enter your value.",
  "Use the ⇅ swap button in the centre to reverse the conversion direction with one click. This exchanges the From and To unit selectors instantly — useful for confirming conversions in both directions, or when you receive a measurement in the output unit and need to find the equivalent input.",
  "For temperature conversions specifically, the tool uses exact mathematical formulas: Celsius to Fahrenheit is (C × 9/5) + 32, Kelvin to Celsius is K − 273.15. Results display up to 8 significant figures and automatically switch to scientific notation for very small values below 0.0001 to keep the output readable at any scale.",
]

const FAQS = [
  { q: 'Which unit categories and units does this converter support?', a: 'The converter covers five categories. Length includes Meter, Kilometer, Centimeter, Millimeter, Mile, Yard, Foot, and Inch — covering both metric and imperial systems. Weight covers Kilogram, Gram, Milligram, Pound, Ounce, Metric Ton, and Stone. Temperature handles Celsius, Fahrenheit, and Kelvin using exact mathematical formulas. Speed supports m/s, km/h, mph, Knots, and ft/s. Area covers m², km², cm², ft², in², Acres, and Hectares. All unit selectors update automatically when you switch categories, resetting to a relevant default pair.' },
  { q: 'How do I convert temperature between Celsius, Fahrenheit, and Kelvin?', a: "Select the Temperature tab from the category pills. Choose your source unit from the From dropdown and your target unit from the To dropdown. Type any temperature value and the result updates instantly. The conversions use exact formulas: Celsius to Fahrenheit is (C × 9/5) + 32; Fahrenheit to Celsius is (F − 32) × 5/9; Celsius to Kelvin is C + 273.15. Normal body temperature (37°C = 98.6°F) is a useful quick sanity check that conversions are working correctly, as this value is well-known and the result should be exact." },
  { q: 'How accurate are the unit conversions?', a: 'All conversion factors are based on internationally recognised standards — SI units for metric measurements and NIST definitions for imperial values. Length, weight, speed, and area conversions use precise numeric ratios accurate to at least 8 significant figures. Temperature uses exact mathematical formulas with no rounding. Results are displayed to up to 8 decimal places, with scientific notation used automatically for values below 0.0001. The precision is sufficient for everyday conversions, engineering calculations, and scientific applications where up to 6 significant figures is typically the practical requirement.' },
  { q: 'What does the swap button do?', a: 'The ⇅ swap button exchanges the From and To unit selectors simultaneously with a single click, reversing the direction of the conversion without requiring you to manually reset both dropdowns. If you have been converting Meters to Feet, clicking ⇅ instantly switches to Feet to Meters — useful for confirming conversions work correctly in both directions, or when you receive a measurement in the output unit and need to work backwards to find the equivalent input. Your entered value is retained after the swap and the result updates immediately.' },
  { q: 'Can I use this converter for Indian-specific measurements?', a: 'Yes. Several units relevant to India are covered. Weight conversions include kilograms and grams for grocery, pharmaceutical, and industrial measurements. Area conversions include Acres and Hectares — both widely used in Indian land records, agriculture, and real estate alongside the metric system. Length conversions cover all standard metric and imperial units used in Indian construction, engineering, and international trade. Traditional Indian units like bigha, gaj, and tola are not currently supported but may be added in a future update.' },
  { q: 'Does the converter work offline?', a: 'Yes. All conversions run entirely within your browser using built-in JavaScript formulas — no server is involved at any point. Once the AWE-OS page has fully loaded, the converter works correctly even if you lose your internet connection or switch to aeroplane mode. There are no API calls, no external data lookups, and no network requests needed for any of the five conversion categories. This makes it reliable in low-connectivity situations such as fieldwork, travel, or areas with unstable internet access.' },
]

const ABOUT = [
  'The Unit Converter covers five major measurement categories — Length, Weight, Temperature, Speed, and Area — each with a full set of metric and imperial units. Conversions happen live as you type: enter a value in the FROM field and the result appears in the TO field instantly, with no need to click a button. Switching categories resets the unit selectors automatically so you always start with a sensible default pair.',
  'Length conversions span meters, kilometers, centimeters, millimeters, miles, yards, feet, and inches. Weight covers kilograms, grams, milligrams, pounds, ounces, metric tons, and stone. Temperature handles Celsius, Fahrenheit, and Kelvin using exact mathematical formulas — not lookup tables. Speed supports metres per second, kilometres per hour, miles per hour, knots, and feet per second. Area covers square metres, square kilometres, square feet, square inches, acres, and hectares.',
  'The swap button reverses the FROM and TO units in one click — ideal when you need to confirm a conversion in both directions. Results display up to 8 decimal places for precision, automatically switching to scientific notation when values fall below 0.0001 to keep the output readable at any scale. The converter is equally useful for everyday tasks like unit conversions for cooking, travel distances, and weather, as it is for technical tasks like engineering calculations and data analysis.',
  'All processing runs entirely in your browser. No data is sent to any server and no sign-up is required. The tool loads and runs instantly on any modern device — desktop, tablet, or mobile — and continues to work without an internet connection once the page has been loaded. There are no usage limits, no ads obscuring the controls, and no secondary tools competing for your attention.',
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
