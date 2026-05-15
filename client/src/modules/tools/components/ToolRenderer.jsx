import { useState } from 'react'
import { usePermissions } from '../../../shared/hooks/usePermissions'
import api from '../../../services/api.service'

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function ToolRenderer({ tool, onUnlock }) {
  const { canAccessTool } = usePermissions()
  const [inputs, setInputs]     = useState({})
  const [result, setResult]     = useState('')
  const [isLoading, setLoading] = useState(false)
  const [error, setError]       = useState(null)
  const [copied, setCopied]     = useState(false)

  // Supabase returns snake_case: input_fields / is_free
  const inputFields = tool.input_fields ?? tool.inputFields ?? []
  const isFree      = tool.is_free ?? tool.isFree ?? false
  const locked      = !isFree && !canAccessTool(tool.slug)

  const handleChange = (name, value) => setInputs(prev => ({ ...prev, [name]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()

    const missing = inputFields.filter(f => f.required && !String(inputs[f.name] ?? '').trim())
    if (missing.length > 0) {
      setError(`Required: ${missing.map(f => f.label).join(', ')}`)
      return
    }

    setLoading(true)
    setError(null)
    setResult('')

    try {
      const res = await api.post(`/api/tools/${tool.slug}/run`, inputs)
      setResult(res.data.result)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (locked) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white mb-1">{tool.name}</h3>
        <span className="inline-block text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full mb-3">{tool.category}</span>
        <p className="text-gray-300 mb-6 max-w-sm mx-auto">{tool.description}</p>
        <button
          onClick={() => onUnlock(tool)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Unlock ₹{tool.price}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
        {inputFields.map((field) => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </label>

            {field.type === 'textarea' ? (
              <textarea
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y min-h-[100px]"
                placeholder={`Enter ${field.label.toLowerCase()}`}
                value={inputs[field.name] ?? ''}
                onChange={e => handleChange(field.name, e.target.value)}
              />
            ) : field.type === 'select' ? (
              <select
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={inputs[field.name] ?? ''}
                onChange={e => handleChange(field.name, e.target.value)}
              >
                <option value="">Select {field.label}</option>
                {(field.options ?? []).map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                type={field.type}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={`Enter ${field.label.toLowerCase()}`}
                value={inputs[field.name] ?? ''}
                onChange={e => handleChange(field.name, e.target.value)}
              />
            )}
          </div>
        ))}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isLoading ? <><Spinner /> Generating...</> : 'Generate'}
        </button>
      </form>

      {result && (
        <div className="bg-gray-50 border-l-4 border-indigo-500 rounded-xl p-6">
          <div className="flex items-start justify-between gap-4">
            <p className="text-gray-800 whitespace-pre-wrap flex-1 text-sm leading-relaxed">{result}</p>
            <button
              onClick={handleCopy}
              className="shrink-0 text-sm bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
