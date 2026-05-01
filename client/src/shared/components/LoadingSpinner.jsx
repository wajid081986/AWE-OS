const LoadingSpinner = ({ size = 'md', text = 'Loading...', fullScreen = false }) => {
  const sizes = { sm: 'h-6 w-6', md: 'h-10 w-10', lg: 'h-16 w-16' }

  if (fullScreen) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
        <div className={`animate-spin rounded-full border-b-2 border-indigo-500 ${sizes[size]}`} />
        <p className="text-gray-400 text-sm">{text}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <div className={`animate-spin rounded-full border-b-2 border-indigo-500 ${sizes[size]}`} />
      <p className="text-gray-400 text-sm">{text}</p>
    </div>
  )
}

export default LoadingSpinner
