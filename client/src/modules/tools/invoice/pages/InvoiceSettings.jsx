import React, { useState, useEffect } from 'react';
import axios from 'axios';
const API = import.meta.env.VITE_API_URL;

export default function InvoiceSettings() {
  const token = localStorage.getItem('awe_token');
  if (!token) { window.location.href = '/login'; return null; }
  const headers = { Authorization: `Bearer ${token}` };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [password, setPassword] = useState({ current: '', new: '' });
  const [notifications, setNotifications] = useState({ emailUpdates: false });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saved, setSaved] = useState(false);

  const withLoading = async (fn) => {
    setLoading(true); setError(null); setSaved(false);
    try { await fn(); setSaved(true); }
    catch (err) { setError(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  const updateProfile = () => withLoading(() =>
    axios.put(`${API}/api/users`, profile, { headers })
  );

  const changePassword = () => withLoading(() =>
    axios.put(`${API}/api/users/password`, password, { headers })
      .then(() => setPassword({ current: '', new: '' }))
  );

  const updateNotifications = () => withLoading(() =>
    axios.put(`${API}/api/users/notifications`, notifications, { headers })
  );

  const deleteAccount = () => withLoading(async () => {
    await axios.delete(`${API}/api/users`, { headers });
    localStorage.removeItem('awe_token');
    window.location.href = '/login';
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl text-white mb-6">Invoice Settings</h1>

      {error && <div className="p-3 bg-red-900/30 border border-red-500 rounded text-red-300 mb-4">{error}</div>}
      {saved && <div className="p-3 bg-green-900/30 border border-green-500 rounded text-green-300 mb-4">Saved!</div>}

      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <h2 className="text-lg text-white font-semibold mb-4">Profile</h2>
        <input type="text" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} placeholder="Name" className="border border-gray-600 p-2 rounded w-full mb-3 bg-gray-700 text-white" />
        <input type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} placeholder="Email" className="border border-gray-600 p-2 rounded w-full mb-3 bg-gray-700 text-white" />
        <button onClick={updateProfile} disabled={loading} className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 disabled:opacity-50">Update Profile</button>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <h2 className="text-lg text-white font-semibold mb-4">Change Password</h2>
        <input type="password" value={password.current} onChange={e => setPassword({ ...password, current: e.target.value })} placeholder="Current Password" className="border border-gray-600 p-2 rounded w-full mb-3 bg-gray-700 text-white" />
        <input type="password" value={password.new} onChange={e => setPassword({ ...password, new: e.target.value })} placeholder="New Password" className="border border-gray-600 p-2 rounded w-full mb-3 bg-gray-700 text-white" />
        <button onClick={changePassword} disabled={loading} className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 disabled:opacity-50">Change Password</button>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <h2 className="text-lg text-white font-semibold mb-4">Email Notifications</h2>
        <label className="flex items-center gap-2 text-gray-300 mb-4 cursor-pointer">
          <input type="checkbox" checked={notifications.emailUpdates} onChange={e => setNotifications({ emailUpdates: e.target.checked })} />
          Receive email updates
        </label>
        <button onClick={updateNotifications} disabled={loading} className="bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700 disabled:opacity-50">Save</button>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-lg text-white font-semibold mb-4">Delete Account</h2>
        {!confirmDelete
          ? <button onClick={() => setConfirmDelete(true)} className="bg-red-600 text-white p-2 rounded hover:bg-red-700">Delete Account</button>
          : (
            <div>
              <p className="text-red-300 mb-3">This cannot be undone. Are you sure?</p>
              <div className="flex gap-2">
                <button onClick={deleteAccount} disabled={loading} className="bg-red-600 text-white p-2 rounded hover:bg-red-700 disabled:opacity-50">Confirm Delete</button>
                <button onClick={() => setConfirmDelete(false)} className="bg-gray-600 text-white p-2 rounded hover:bg-gray-500">Cancel</button>
              </div>
            </div>
          )
        }
      </div>
    </div>
  );
}
