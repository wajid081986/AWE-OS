import { useState, useEffect, useRef } from 'react'
import api from '../../../services/api.service'

function Spinner() {
  return <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
}

const EMPTY_FORM = { name: '', description: '', category: 'General', price: '', preview_url: '', thumbnail_url: '' }

export default function ProductManager() {
  const [products, setProducts]   = useState([])
  const [isLoading, setLoading]   = useState(true)
  const [showModal, setModal]     = useState(false)
  const [form, setForm]           = useState(EMPTY_FORM)
  const [file, setFile]           = useState(null)
  const [saving, setSaving]       = useState(false)
  const [toggling, setToggling]   = useState(null)
  const [error, setError]         = useState(null)
  const fileRef                   = useRef(null)

  const load = () => {
    setLoading(true)
    api.get('/api/products/admin')
      .then(res => setProducts(res.data.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openModal = () => {
    setForm(EMPTY_FORM)
    setFile(null)
    setError(null)
    setModal(true)
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!form.name || !form.price) { setError('Name and price are required'); return }
    if (!file)                     { setError('Please select a file');         return }

    setSaving(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file',          file)
      fd.append('name',          form.name)
      fd.append('description',   form.description)
      fd.append('category',      form.category)
      fd.append('price',         form.price)
      fd.append('preview_url',   form.preview_url)
      fd.append('thumbnail_url', form.thumbnail_url)

      await api.post('/api/products', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setModal(false)
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed')
    } finally {
      setSaving(false)
    }
  }

  const togglePublish = async (product) => {
    setToggling(product.id)
    try {
      await api.put(`/api/products/${product.id}`, { is_published: !product.is_published })
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_published: !p.is_published } : p))
    } catch {
      // silent
    } finally {
      setToggling(null)
    }
  }

  const deleteProduct = async (id) => {
    if (!confirm('Delete this product? This cannot be undone.')) return
    try {
      await api.delete(`/api/products/${id}`)
      setProducts(prev => prev.filter(p => p.id !== id))
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed')
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Digital Products</h2>
          <p className="text-gray-400 text-sm mt-0.5">{products.length} product{products.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Upload Product
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No products yet. Upload your first one.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700">
                <th className="pb-3 pr-4 font-medium">Product</th>
                <th className="pb-3 pr-4 font-medium">Category</th>
                <th className="pb-3 pr-4 font-medium">Price</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {products.map(p => (
                <tr key={p.id} className="text-gray-300">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-white">{p.name}</div>
                    <div className="text-gray-500 text-xs line-clamp-1">{p.description}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-xs bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded-full">
                      {p.category}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-semibold text-indigo-400">₹{p.price}</td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      p.is_published ? 'bg-green-900 text-green-400' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {p.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => togglePublish(p)}
                        disabled={toggling === p.id}
                        className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2.5 py-1 rounded transition-colors disabled:opacity-50"
                      >
                        {toggling === p.id ? '...' : p.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        onClick={() => deleteProduct(p.id)}
                        className="text-xs bg-red-900/50 hover:bg-red-800 text-red-400 px-2.5 py-1 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Upload Product</h3>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Name <span className="text-red-400">*</span></label>
                <input
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Description</label>
                <textarea
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={3}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Category</label>
                  <input
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Price (₹) <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Thumbnail URL</label>
                <input
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://..."
                  value={form.thumbnail_url}
                  onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Preview URL</label>
                <input
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://..."
                  value={form.preview_url}
                  onChange={e => setForm(f => ({ ...f, preview_url: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">File <span className="text-red-400">*</span></label>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={e => setFile(e.target.files[0])}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full bg-gray-700 border border-dashed border-gray-500 hover:border-indigo-500 rounded-lg px-3 py-3 text-gray-400 text-sm transition-colors text-left"
                >
                  {file ? (
                    <span className="text-white">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                  ) : (
                    'Click to select file (max 50 MB)'
                  )}
                </button>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? <><Spinner /> Uploading...</> : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
