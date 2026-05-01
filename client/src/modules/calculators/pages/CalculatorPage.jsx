import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import AdUnit from '../../../shared/components/AdUnit';

const API = import.meta.env.VITE_API_URL || '';

export default function CalculatorPage() {
  const { slug } = useParams();
  const [calc, setCalc]       = useState(null);
  const [inputs, setInputs]   = useState({});
  const [result, setResult]   = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/calculators/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setIsLoading(false); return; }
        setCalc(data);
        const initInputs = {};
        (data.inputs || []).forEach(inp => { initInputs[inp.name] = ''; });
        setInputs(initInputs);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [slug]);

  const calculate = () => {
    if (!calc) return;
    try {
      let formula = calc.formula;
      Object.entries(inputs).forEach(([key, val]) => {
        formula = formula.replaceAll(key, parseFloat(val) || 0);
      });
      // eslint-disable-next-line no-new-func
      const res = new Function(`return ${formula}`)();
      setResult(isNaN(res) ? null : res.toFixed(2));
    } catch {
      setResult(null);
    }
  };

  // Real-time calculation when all inputs are filled
  useEffect(() => {
    if (calc && Object.values(inputs).every(v => v !== '')) {
      calculate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs]);

  if (isLoading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
    </div>
  );

  if (!calc) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-400 text-lg mb-4">Calculator not found</p>
        <Link to="/calculators" className="text-indigo-400 hover:text-indigo-300">
          ← Back to Calculators
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <Helmet>
        <title>{calc.meta_title || calc.name}</title>
        <meta name="description" content={calc.meta_description || calc.description} />
        <meta property="og:title" content={calc.meta_title || calc.name} />
        <meta property="og:description" content={calc.meta_description || calc.description} />
      </Helmet>

      {/* Public Navbar */}
      <nav className="bg-gray-950 border-b border-gray-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <Link to="/" className="text-white font-bold text-xl">AWE-OS</Link>
        <div className="flex gap-4 items-center">
          <Link to="/calculators" className="text-gray-400 hover:text-white text-sm transition-colors">
            ← All Calculators
          </Link>
          <Link to="/login" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            Login
          </Link>
        </div>
      </nav>

      <div className="min-h-screen bg-gray-950 py-12 px-6">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <span className="text-xs bg-indigo-900 text-indigo-300 px-3 py-1 rounded-full capitalize">
              {calc.category}
            </span>
            <h1 className="text-3xl font-bold text-white mt-3 mb-2">{calc.name}</h1>
            <p className="text-gray-400">{calc.description}</p>
          </div>

          {/* AdSense TOP */}
          <AdUnit slotId={calc.adsense_slot_id} />

          {/* Calculator Card */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">

            {/* Input Fields */}
            <div className="space-y-4 mb-6">
              {(calc.inputs || []).map(field => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {field.label}
                    {field.required && <span className="text-red-400 ml-1">*</span>}
                  </label>

                  {field.type === 'select' ? (
                    <select
                      value={inputs[field.name] || ''}
                      onChange={e => setInputs(prev => ({ ...prev, [field.name]: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select...</option>
                      {(field.options || []).map(opt => (
                        <option key={opt} value={opt}>{opt}%</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      placeholder={field.placeholder || ''}
                      value={inputs[field.name] || ''}
                      onChange={e => setInputs(prev => ({ ...prev, [field.name]: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Calculate Button */}
            <button
              onClick={calculate}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold py-3 rounded-xl transition-all"
            >
              Calculate
            </button>

            {/* Result */}
            {result !== null && (
              <div className="mt-6 p-5 bg-indigo-950 border border-indigo-500 rounded-xl text-center">
                <p className="text-gray-400 text-sm mb-1">{calc.output_label}</p>
                <p className="text-4xl font-bold text-white">
                  {calc.output_prefix}
                  {Number(result).toLocaleString('en-IN')}
                  {calc.output_suffix}
                </p>
              </div>
            )}
          </div>

          {/* AdSense BOTTOM */}
          <AdUnit slotId={calc.adsense_slot_id} />

          {/* SEO Content */}
          <div className="mt-8 p-6 bg-gray-900 border border-gray-800 rounded-xl">
            <h2 className="text-white font-bold text-xl mb-3">How to use {calc.name}</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Enter the required values in the fields above and click Calculate.
              Results update automatically as you type.
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
