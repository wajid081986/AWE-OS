import { useState, useEffect, useMemo } from 'react'
import api from '../../../services/api.service'
import { useTools } from '../../../shared/hooks/useTools'

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function Toast({ message, type }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {message}
    </div>
  )
}

function PermissionsModal({ user, tools, onSave, onClose, saving }) {
  const [permissions, setPermissions] = useState(
    Array.isArray(user.permissions) ? user.permissions : []
  )

  const toggle = (slug) => {
    const key = `tool:${slug}`
    setPermissions(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-white mb-0.5">Manage Permissions</h3>
        <p className="text-sm text-gray-400 mb-5">{user.email}</p>

        <div className="space-y-1 max-h-64 overflow-y-auto mb-6 pr-1">
          {tools.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">No tools available</p>
          ) : (
            tools.map(tool => (
              <label
                key={tool.id || tool.slug}
                className="flex items-center gap-3 cursor-pointer hover:bg-gray-700 px-3 py-2 rounded-lg"
              >
                <input
                  type="checkbox"
                  checked={permissions.includes(`tool:${tool.slug}`)}
                  onChange={() => toggle(tool.slug)}
                  className="accent-indigo-500 w-4 h-4 shrink-0"
                />
                <div>
                  <p className="text-white text-sm font-medium">{tool.name}</p>
                  <p className="text-gray-400 text-xs font-mono">{tool.slug}</p>
                </div>
              </label>
            ))
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(user.id, permissions)}
            disabled={saving}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors"
          >
            {saving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UserManager() {
  const [users, setUsers]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [selectedUser, setSelected] = useState(null)
  const [saving, setSaving]         = useState(null)
  const [toast, setToast]           = useState(null)

  const { tools } = useTools()

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/users')
      setUsers(res.data.users || [])
    } catch {
      showToast('Failed to load users', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const filtered = useMemo(() =>
    users.filter(u => {
      const q = search.toLowerCase()
      return (
        u.email.toLowerCase().includes(q) ||
        (u.name || '').toLowerCase().includes(q)
      )
    }),
    [users, search]
  )

  const toggleRole = async (user) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    setSaving(user.id)
    try {
      await api.put(`/api/admin/users/${user.id}/role`, { role: newRole })
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u))
      showToast(`Role updated to ${newRole}`)
    } catch {
      showToast('Failed to update role', 'error')
    } finally {
      setSaving(null)
    }
  }

  const savePermissions = async (userId, permissions) => {
    setSaving(userId)
    try {
      await api.put(`/api/admin/users/${userId}/permissions`, { permissions })
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, permissions } : u))
      showToast('Permissions saved')
      setSelected(null)
    } catch {
      showToast('Failed to save permissions', 'error')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">User Manager</h1>

        {/* Search */}
        <div className="mb-5">
          <input
            className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        {loading ? <Spinner /> : (
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Email</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Role</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Subscription</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Permissions</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                      {search ? 'No users match your search' : 'No users found'}
                    </td>
                  </tr>
                ) : filtered.map(user => (
                  <tr key={user.id} className="border-b border-gray-700 last:border-0 hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3 text-white">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-indigo-900 text-indigo-300' : 'bg-gray-700 text-gray-300'}`}>
                        {user.role || 'user'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${user.subscription_status === 'active' ? 'text-green-400' : 'text-gray-400'}`}>
                        {user.subscription_status || 'free'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {Array.isArray(user.permissions) && user.permissions.length > 0
                        ? <span className="text-indigo-300">{user.permissions.length} tool{user.permissions.length !== 1 ? 's' : ''}</span>
                        : <span>none</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleRole(user)}
                          disabled={saving === user.id}
                          className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2.5 py-1 rounded transition-colors disabled:opacity-50"
                        >
                          {saving === user.id ? '...' : user.role === 'admin' ? 'Make User' : 'Make Admin'}
                        </button>
                        <button
                          onClick={() => setSelected(user)}
                          className="text-xs bg-indigo-700 hover:bg-indigo-600 text-white px-2.5 py-1 rounded transition-colors"
                        >
                          Permissions
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedUser && (
        <PermissionsModal
          user={selectedUser}
          tools={tools}
          onSave={savePermissions}
          onClose={() => setSelected(null)}
          saving={saving === selectedUser.id}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
