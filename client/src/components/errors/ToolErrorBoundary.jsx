import React from 'react'
import { reportError } from '../../monitoring/errorReporter'

/**
 * Tool-level error boundary.
 * Wraps a single tool's UI — if it throws during render, shows a
 * recovery UI with a "Try Again" button that remounts the subtree.
 * Does NOT reload the page or collapse surrounding layout.
 *
 * Usage:
 *   <ToolErrorBoundary toolName="Merge PDF">
 *     <MergePDFTool />
 *   </ToolErrorBoundary>
 */
export class ToolErrorBoundary extends React.Component {
  state = { hasError: false, error: null, retryCount: 0 }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    reportError(error, {
      boundary:  'ToolErrorBoundary',
      tool:       this.props.toolName || 'unknown',
      component:  info.componentStack?.split('\n')[1]?.trim(),
    })
  }

  retry = () => {
    this.setState(s => ({
      hasError:   false,
      error:      null,
      retryCount: s.retryCount + 1,
    }))
  }

  render() {
    if (this.state.hasError) {
      const name = this.props.toolName
        ? this.props.toolName.replace(/-/g, ' ')
        : 'This tool'

      return (
        <div className="rounded-xl border border-red-100 bg-red-50 p-8 text-center my-4">
          <p className="text-4xl mb-3">⚠️</p>
          <h3 className="font-bold text-gray-900 mb-2 capitalize">{name} ran into a problem</h3>
          <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto">
            An unexpected error occurred. Your data is safe — click below to try again or refresh the page.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={this.retry}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-sm font-medium transition-colors"
            >
              Refresh Page
            </button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-5 text-left text-xs text-red-600 bg-red-100 p-3 rounded overflow-auto max-h-32">
              {this.state.error.message}
              {'\n'}
              {this.state.error.stack?.split('\n').slice(1, 4).join('\n')}
            </pre>
          )}
        </div>
      )
    }

    // Keyed wrapper: when retryCount changes, React unmounts and remounts children
    // display:contents makes the div layout-transparent
    return (
      <div key={this.state.retryCount} style={{ display: 'contents' }}>
        {this.props.children}
      </div>
    )
  }
}
