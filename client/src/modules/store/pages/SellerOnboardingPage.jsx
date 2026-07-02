import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import api from '../../../services/api.service'

const EMPTY_FORM = {
  display_name: '', bio: '', payout_method: 'upi',
  upi_id: '', bank_account_name: '', bank_account_number: '', bank_ifsc: '',
  pan_number: '', gstin: '',
}

export default function SellerOnboardingPage() {
  const navigate = useNavigate()
  const [form, setForm]     = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const update = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!localStorage.getItem('awe_token')) { window.location.href = '/login'; return }
    if (!form.display_name) { setError('Display name is required'); return }

    setSaving(true)
    setError(null)
    try {
      await api.post('/api/store/seller/register', form)
      navigate('/dashboard/store/seller')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 px-6 py-12">
      <Helmet>
        <title>Sell on AWE-OS | Become a Seller</title>
        <meta name="description" content="Register as a seller and start selling digital products on India's AWE-OS marketplace." />
      </Helmet>

      <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-10">
        <div className="md:col-span-2">
          <h1 className="text-2xl font-bold text-white mb-4">Sell on AWE-OS</h1>
          <p className="text-gray-400 text-sm mb-6">
            Reach thousands of businesses, students &amp; professionals looking for digital tools and templates.
          </p>

          <div className="space-y-4 text-sm text-gray-300">
            <div>
              <p className="font-semibold text-white mb-1">1. Register</p>
              <p className="text-gray-400">Fill in your seller profile and payout details.</p>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">2. Upload products</p>
              <p className="text-gray-400">Submit your digital products for admin review.</p>
            </div>
            <div>
              <p className="font-semibold text-white mb-1">3. Get paid</p>
              <p className="text-gray-400">You keep 80% of every sale. Request payouts anytime from your dashboard.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="md:col-span-3 bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Display Name <span className="text-red-400">*</span></label>
            <input
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.display_name} onChange={update('display_name')}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Bio</label>
            <textarea
              rows={3}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.bio} onChange={update('bio')}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Payout Method</label>
            <select
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.payout_method} onChange={update('payout_method')}
            >
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>

          {form.payout_method === 'upi' ? (
            <div>
              <label className="block text-sm text-gray-300 mb-1">UPI ID</label>
              <input
                placeholder="yourname@upi"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.upi_id} onChange={update('upi_id')}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm text-gray-300 mb-1">Account Holder Name</label>
                <input
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.bank_account_name} onChange={update('bank_account_name')}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">Account Number</label>
                <input
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.bank_account_number} onChange={update('bank_account_number')}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-1">IFSC</label>
                <input
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.bank_ifsc} onChange={update('bank_ifsc')}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-300 mb-1">PAN (optional)</label>
              <input
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.pan_number} onChange={update('pan_number')}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">GSTIN (optional)</label>
              <input
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.gstin} onChange={update('gstin')}
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {saving ? 'Registering...' : 'Become a Seller'}
          </button>
        </form>
      </div>
    </div>
  )
}
