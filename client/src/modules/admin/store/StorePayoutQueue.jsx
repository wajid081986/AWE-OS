import { useState, useEffect } from 'react'
import api from '../../../services/api.service'

function Spinner() {
  return <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
}

export default function StorePayoutQueue() {
  const [payouts, setPayouts]   = useState([])
  const [isLoading, setLoading] = useState(true)
  const [acting, setActing]     = useState(null)
  const [noteFor, setNoteFor]   = useState(null)
  const [note, setNote]         = useState('')

  const load = () => {
    setLoading(true)
    api.get('/api/store/admin/payouts/pending')
      .then(res => setPayouts(res.data.payouts || []))
      .catch(() => setPayouts([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const markPaid = async (id) => {
    setActing(id)
    try {
      await api.post(`/api/store/admin/payouts/${id}/mark-paid`, { reference_note: note })
      setPayouts(prev => prev.filter(p => p.id !== id))
      setNoteFor(null)
      setNote('')
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to mark paid')
    } finally {
      setActing(null)
    }
  }

  const reject = async (id) => {
    setActing(id)
    try {
      await api.post(`/api/store/admin/payouts/${id}/reject`, { reason: note })
      setPayouts(prev => prev.filter(p => p.id !== id))
      setNoteFor(null)
      setNote('')
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject payout')
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-1">Store Payouts</h1>
        <p className="text-gray-400 text-sm mb-8">{payouts.length} payout{payouts.length !== 1 ? 's' : ''} awaiting processing</p>

        {isLoading ? (
          <div className="py-16"><Spinner /></div>
        ) : payouts.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-16">No pending payouts.</p>
        ) : (
          <div className="space-y-4">
            {payouts.map(p => (
              <div key={p.id} className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-semibold">{p.store_sellers?.display_name}</h3>
                    <p className="text-2xl font-bold text-indigo-400 mt-1">₹{Number(p.amount).toFixed(2)}</p>
                    <p className="text-gray-500 text-xs mt-1">Requested {new Date(p.requested_at).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right text-sm text-gray-300">
                    {p.payout_destination?.method === 'upi' ? (
                      <p>UPI: <span className="text-white">{p.payout_destination.upi_id}</span></p>
                    ) : (
                      <>
                        <p>{p.payout_destination?.bank_account_name}</p>
                        <p className="text-gray-500 text-xs">{p.payout_destination?.bank_account_number} · {p.payout_destination?.bank_ifsc}</p>
                      </>
                    )}
                  </div>
                </div>

                {noteFor === p.id ? (
                  <div className="mt-4 flex gap-2">
                    <input
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Reference / note..."
                      className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      onClick={() => markPaid(p.id)}
                      disabled={acting === p.id}
                      className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                    >
                      Confirm Paid
                    </button>
                    <button
                      onClick={() => { setNoteFor(null); setNote('') }}
                      className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => setNoteFor(p.id)}
                      className="bg-green-700 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                    >
                      Mark Paid
                    </button>
                    <button
                      onClick={() => reject(p.id)}
                      disabled={acting === p.id}
                      className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
