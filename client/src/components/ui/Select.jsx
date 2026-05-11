export default function Select({
  label,
  options = [],
  error,
  helper,
  required,
  id,
  className = '',
  containerClassName = '',
  ...props
}) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  const borderClass = error
    ? 'border-red-400 focus:ring-red-400'
    : 'border-gray-300 focus:ring-blue-500'

  // Accept string[] or { value, label }[]
  const normalized = options.map(o =>
    typeof o === 'string' ? { value: o, label: o } : o
  )

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5" aria-hidden>*</span>}
        </label>
      )}
      <select
        id={inputId}
        aria-invalid={!!error}
        className={`w-full px-3 py-2 border ${borderClass} rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 transition-colors ${className}`}
        {...props}
      >
        {normalized.map(({ value, label: optLabel }) => (
          <option key={value} value={value}>{optLabel}</option>
        ))}
      </select>
      {error  && <p role="alert" className="text-red-500 text-xs mt-1">{error}</p>}
      {helper && !error && <p className="text-gray-400 text-xs mt-1">{helper}</p>}
    </div>
  )
}
