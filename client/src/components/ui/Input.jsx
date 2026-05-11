export default function Input({
  label,
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

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5" aria-hidden>*</span>}
        </label>
      )}
      <input
        id={inputId}
        aria-describedby={
          error   ? `${inputId}-error`  :
          helper  ? `${inputId}-helper` : undefined
        }
        aria-invalid={!!error}
        className={`w-full px-3 py-2 border ${borderClass} rounded-xl text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 transition-colors ${className}`}
        {...props}
      />
      {error  && (
        <p id={`${inputId}-error`} role="alert" className="text-red-500 text-xs mt-1">{error}</p>
      )}
      {helper && !error && (
        <p id={`${inputId}-helper`} className="text-gray-400 text-xs mt-1">{helper}</p>
      )}
    </div>
  )
}
