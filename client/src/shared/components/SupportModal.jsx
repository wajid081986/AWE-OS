import { useState } from 'react'
import { useAuth } from '../../modules/auth/context/AuthContext'
import api from '../../services/api.service'

export default function SupportModal({ onClose }) {
  const { user } = useAuth()
  const [subject, setSubject]       = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading]       = useState(false)
  const [ticketId, setTicketId]     = useState(null)
  const [error, setError]           = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) {
      setError('Subject and description are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/support/ticket', {
        user_email:  user?.email || '',
        user_name:   user?.name  || user?.email?.split('@')[0] || 'User',
        subject:     subject.trim(),
        description: description.trim(),
      })
      setTicketId(res.data?.data?.ticket?.id || res.data?.data?.id || 'submitted')
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit ticket. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎫</span>
            <h2 className="text-white font-semibold text-lg">Contact Support</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {ticketId ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">✅</div>
              <p className="text-white font-semibold mb-1">Ticket Submitted!</p>
              <p className="text-gray-400 text-sm mb-2">
                Ticket ID: <span className="text-indigo-400 font-mono text-xs">{ticketId}</span>
              </p>
              <p className="text-gray-400 text-sm">We'll respond within 24 hours.</p>
              <button
                onClick={onClose}
                className="mt-5 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Briefly describe your issue"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe the issue in detail..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  {loading ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
