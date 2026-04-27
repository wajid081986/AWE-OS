import { useState, useEffect } from 'react';
import axios from 'axios';

export default function InvoiceDashboard() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const token   = localStorage.getItem('awe_token');
  const BASE    = import.meta.env.VITE_API_URL || 'https://awe-os.onrender.com';
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        const res = await axios.get(BASE + '/api/invoices', { headers });
        setInvoices(res.data.data || []);
      } catch (err) {
        setError(err.response?.data?.error || err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  if (error) return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <div className="bg-red-900/20 border border-red-500 rounded-xl p-4 text-red-400">
        {error}
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">🧾 Invoice Generator Pro</h1>
          <p className="text-gray-400">Create and manage professional invoices</p>
        </div>
        <a
          href="/tools/invoice/create"
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium"
        >
          + New Invoice
        </a>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center text-gray-400 py-16">
          <p className="text-4xl mb-4">🧾</p>
          <p className="text-xl mb-2">No invoices yet</p>
          <p>Create your first invoice above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map(inv => (
            <div
              key={inv.id}
              className="bg-gray-800 rounded-xl p-4 border border-gray-700 flex justify-between"
            >
              <div>
                <p className="font-bold">{inv.client_name}</p>
                <p className="text-gray-400 text-sm">
                  {new Date(inv.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-green-400 font-bold">₹{inv.total_amount}</p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  inv.status === 'paid'      ? 'bg-green-900 text-green-300' :
                  inv.status === 'pending'   ? 'bg-yellow-900 text-yellow-300' :
                                               'bg-red-900 text-red-300'
                }`}>
                  {inv.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
