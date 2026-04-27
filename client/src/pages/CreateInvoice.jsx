import React, { useState } from 'react';
import axios from 'axios';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import jsPDF from 'jspdf';

const API = import.meta.env.VITE_API_URL;

const invoiceSchema = z.object({
  clientName: z.string().min(1, 'Client name is required'),
  items: z.array(z.object({
    description: z.string().min(1, 'Description is required'),
    amount: z.number().positive('Amount must be positive'),
  })).min(1, 'At least one item is required'),
});

export default function CreateInvoice() {
  const token = localStorage.getItem('awe_token');
  if (!token) { window.location.href = '/login'; return null; }
  const headers = { Authorization: `Bearer ${token}` };

  const { control, handleSubmit, setValue, getValues, register, formState: { errors } } = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      clientName: '',
      items: [{ description: '', amount: 0 }],
    },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = {
        client_name:  data.clientName,
        items:        data.items,
        total_amount: data.items.reduce((s, i) => s + Number(i.amount), 0),
      };
      const res = await axios.post(`${API}/api/invoices`, payload, { headers });
      setPreview({ ...payload, id: res.data.data?.id });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = () => {
    localStorage.setItem('invoice_draft', JSON.stringify(getValues()));
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.text('Invoice', 10, 10);
    doc.text(`Client: ${preview.client_name}`, 10, 20);
    preview.items.forEach((item, index) => {
      doc.text(`${item.description}: $${item.amount}`, 10, 30 + index * 10);
    });
    doc.text(`Total: $${preview.total_amount}`, 10, 30 + preview.items.length * 10 + 5);
    doc.save('invoice.pdf');
  };

  const addItem = () => {
    const items = getValues('items');
    setValue('items', [...items, { description: '', amount: 0 }]);
  };

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>;

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {error && <div className="p-4 bg-red-900/30 border border-red-500 rounded-lg text-red-300 mb-4">{error}</div>}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl text-white mb-4">Create Invoice</h2>
        <div className="mb-4">
          <label className="block text-gray-300 mb-1">Client Name</label>
          <Controller
            name="clientName"
            control={control}
            render={({ field }) => <input {...field} className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600" />}
          />
          {errors.clientName && <p className="text-red-400 text-sm mt-1">{errors.clientName.message}</p>}
        </div>
        <h3 className="text-lg text-white mb-2">Items</h3>
        <Controller
          name="items"
          control={control}
          render={({ field }) => (
            <>
              {field.value.map((_, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    {...register(`items.${index}.description`)}
                    placeholder="Description"
                    className="w-1/2 p-2 rounded bg-gray-700 text-white border border-gray-600"
                  />
                  <input
                    type="number"
                    {...register(`items.${index}.amount`, { valueAsNumber: true })}
                    placeholder="Amount"
                    className="w-1/2 p-2 rounded bg-gray-700 text-white border border-gray-600"
                  />
                </div>
              ))}
              <button type="button" onClick={addItem} className="bg-gray-700 text-gray-300 p-2 rounded text-sm border border-gray-600 hover:bg-gray-600">
                + Add Item
              </button>
            </>
          )}
        />
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={saveDraft} className="bg-gray-700 text-white p-2 rounded hover:bg-gray-600">Save Draft</button>
          <button type="submit" className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700">Submit Invoice</button>
        </div>
      </form>
      {preview && (
        <div className="mt-6 bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl text-white mb-2">Invoice Created</h2>
          <p className="text-gray-300">Client: {preview.client_name}</p>
          {preview.items.map((item, index) => (
            <p key={index} className="text-gray-300">{item.description}: ${item.amount}</p>
          ))}
          <p className="text-white font-bold mt-2">Total: ${preview.total_amount}</p>
          <button onClick={generatePDF} className="bg-indigo-600 text-white p-2 rounded mt-4 hover:bg-indigo-700">Download PDF</button>
        </div>
      )}
    </div>
  );
}
