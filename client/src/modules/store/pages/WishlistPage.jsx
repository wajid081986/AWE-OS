import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../../services/api.service'

function Spinner() {
  return <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
}

export default function WishlistPage() {
  const [items, setItems]       = useState([])
  const [isLoading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.get('/api/store/wishlist')
      .then(res => setItems(res.data.wishlist || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const remove = async (productId) => {
    try {
      await api.delete(`/api/store/wishlist/${productId}`)
      setItems(prev => prev.filter(i => i.digital_products?.id !== productId))
    } catch {
      // silent
    }
  }

  if (isLoading) {
    return <div className="p-6 flex justify-center py-24"><Spinner /></div>
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-1">Wishlist</h1>
        <p className="text-gray-400 text-sm mb-8">Products you've saved for later</p>

        {items.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">♡</p>
            <h3 className="text-xl font-bold text-white mb-2">Your wishlist is empty</h3>
            <p className="text-gray-400 text-sm">
              Browse the <Link to="/store" className="text-indigo-400 hover:underline">Store</Link> to find something you like.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map(item => {
              const product = item.digital_products
              if (!product) return null
              return (
                <div key={item.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex items-center gap-4">
                  {product.thumbnail_url ? (
                    <img src={product.thumbnail_url} alt={product.title} className="w-16 h-16 object-cover rounded-lg shrink-0" />
                  ) : (
                    <div className="w-16 h-16 bg-gray-700 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-2xl">📦</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <Link to={`/store/${product.slug}`} className="text-white font-semibold truncate hover:text-indigo-400 transition-colors block">
                      {product.title}
                    </Link>
                    <p className="text-indigo-400 text-sm mt-0.5">{product.price === 0 ? 'Free' : `₹${product.price}`}</p>
                  </div>
                  <button
                    onClick={() => remove(product.id)}
                    className="shrink-0 text-gray-500 hover:text-red-400 text-sm transition-colors"
                  >
                    Remove
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
