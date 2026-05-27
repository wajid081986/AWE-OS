import { Component } from 'react'

/**
 * EditorErrorBoundary
 * Wraps the standalone PDF editor. Catches runtime crashes and shows a
 * recovery UI instead of a blank screen.
 */
export default class EditorErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[AWE PDF Editor] Crash:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-gray-900 text-white gap-4 p-8">
          <span className="text-5xl">⚠️</span>
          <h1 className="text-xl font-semibold">Editor crashed</h1>
          <p className="text-sm text-gray-400 text-center max-w-sm">
            {this.state.error?.message || 'Something went wrong loading the PDF editor.'}
          </p>
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => { window.location.href = '/tools/pdf-editor' }}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
            >
              Back to Upload
            </button>
            <button
              onClick={() => window.close()}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              Close Tab
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
