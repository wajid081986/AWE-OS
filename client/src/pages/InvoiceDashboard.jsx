import React, { useState, useEffect } from 'react';
import axios from 'axios';
const API = import.meta.env.VITE_API_URL;

export default function InvoiceDashboard() {
  const token = localStorage.getItem('awe_token');
  if (!token) { window.location.href = '/login'; return null; }
  const headers = { Authorization: `Bearer ${token}` };

  const [invoices, setInvoices] = useState([]);
  const [statistics, setStatistics] = useState({ totalRevenue: 0, invoicesSent: 0, paymentsReceived: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const invoicesRes = await axios.get(`${API}/api/invoices`, { headers });
        const list = invoicesRes.data.data || [];
        setInvoices(list);
        setStatistics({
          totalRevenue:      list.reduce((s, i) => s + Number(i.total_amount || 0), 0),
          invoicesSent:      list.length,
          paymentsReceived:  list.filter(i => i.status === 'paid').length,
        });
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredInvoices = invoices.filter(invoice =>
    invoice.status?.includes(filter) || invoice.client_name?.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>;
  if (error) return <div className="p-4 bg-red-900/30 border border-red-500 rounded-lg text-red-300">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="mb-6">
        <h1 className="text-2xl text-white">Invoice Generator Pro</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg text-white">Total Revenue</h3>
          <p className="text-gray-400">${statistics.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg text-white">Invoices Sent</h3>
          <p className="text-gray-400">{statistics.invoicesSent}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg text-white">Payments Received</h3>
          <p className="text-gray-400">{statistics.paymentsReceived}</p>
        </div>
      </div>
      <div className="mb-6">
        <input
          type="text"
          placeholder="Filter by status or client"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="p-2 rounded-lg bg-gray-800 text-gray-300 border border-gray-700"
        />
      </div>
      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-lg text-white mb-2">Invoices</h2>
        {filteredInvoices.length === 0
          ? <p className="text-gray-400">No invoices yet.</p>
          : (
            <ul>
              {filteredInvoices.map(invoice => (
                <li key={invoice.id} className="flex justify-between items-center border-b border-gray-700 py-2">
                  <span className="text-gray-300">{invoice.client_name}</span>
                  <span className="text-gray-400 text-sm">${invoice.total_amount}</span>
                  <span className={`text-${invoice.status === 'paid' ? 'green' : 'red'}-400 text-sm`}>{invoice.status}</span>
                </li>
              ))}
            </ul>
          )
        }
      </div>
      <button
        className="mt-4 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700"
        onClick={() => window.location.href = '/tools/invoice/create'}
      >
        + Create Invoice
      </button>
    </div>
  );
}
