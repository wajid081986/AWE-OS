import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
const API = import.meta.env.VITE_API_URL;

export default function InvoiceDetails() {
  const token = localStorage.getItem('awe_token');
  if (!token) { window.location.href = '/login'; return null; }
  const headers = { Authorization: `Bearer ${token}` };

  const { id: invoiceId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API}/api/invoices/${invoiceId}`, { headers });
        setData(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [invoiceId]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    setLoading(true);
    try {
      await axios.delete(`${API}/api/invoices/${invoiceId}`, { headers });
      navigate('/tools/invoice');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setPaymentStatus('Processing payment...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    setPaymentStatus('Payment successful!');
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>;
  if (error) return <div className="p-4 bg-red-900/30 border border-red-500 rounded-lg text-red-300">{error}</div>;
  if (!data) return <div className="text-center py-12 text-gray-400">Invoice not found.</div>;

  return (
    <div className="p-6">
      <div className="bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-white mb-4">Invoice Details</h2>
        <p className="text-gray-300">Invoice ID: {data.id}</p>
        <p className="text-gray-300">Client: {data.client_name}</p>
        <p className="text-gray-300">Amount: ${data.total_amount}</p>
        <p className="text-gray-300">Status: {data.status}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={handlePayment} className="bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700">Pay Invoice</button>
          <button onClick={() => navigate('/tools/invoice')} className="bg-gray-700 text-white py-2 px-4 rounded hover:bg-gray-600">← Back</button>
          <button onClick={handleDelete} className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700">Delete</button>
        </div>
        {paymentStatus && <p className="mt-4 text-green-400">{paymentStatus}</p>}
      </div>
    </div>
  );
}
