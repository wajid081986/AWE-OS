const NotFoundPage = () => (
  <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
    <div className="text-center">
      <p className="text-8xl font-bold text-gray-800 mb-4 select-none">404</p>
      <h2 className="text-2xl font-bold text-white mb-3">Page Not Found</h2>
      <p className="text-gray-400 mb-8">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <div className="flex gap-4 justify-center">
        <a
          href="/"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Go Home
        </a>
        <a
          href="/dashboard"
          className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Dashboard
        </a>
      </div>
    </div>
  </div>
)

export default NotFoundPage
