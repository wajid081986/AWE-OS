import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || '';

export default function CalculatorsListPage() {
  const [calculators, setCalculators] = useState([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [search, setSearch]           = useState('');
  const [catFilter, setCatFilter]     = useState('all');

  useEffect(() => {
    fetch(`${API}/api/calculators`)
      .then(r => r.json())
      .then(data => {
        setCalculators(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const categories = ['all', ...new Set(calculators.map(c => c.category))];

  const filtered = calculators.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchCat    = catFilter === 'all' || c.category === catFilter;
    return matchSearch && matchCat;
  });

  return (
    <>
      <Helmet>
        <title>Free Online Calculators — AWE-OS</title>
        <meta name="description" content="Free online calculators for EMI, GST, SIP, percentage and more. Instant results, no login required." />
      </Helmet>

      {/* Public Navbar */}
      <nav className="bg-gray-950 border-b border-gray-800 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <Link to="/" className="text-white font-bold text-xl">AWE-OS</Link>
        <div className="flex gap-4 items-center">
          <Link to="/calculators" className="text-gray-400 hover:text-white text-sm transition-colors">
            Calculators
          </Link>
          <Link to="/login" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            Login
          </Link>
        </div>
      </nav>

      <div className="min-h-screen bg-gray-950 py-12 px-6">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">Free Online Calculators</h1>
            <p className="text-gray-400 text-lg">
              Instant calculations for finance, math, and business. No login required.
            </p>
          </div>

          {/* Search */}
          <div className="flex justify-center mb-8">
            <input
              type="text"
              placeholder="Search calculators..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full max-w-md bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
            />
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 flex-wrap justify-center mb-10">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                className={`px-4 py-2 rounded-full text-sm capitalize transition-colors ${
                  catFilter === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="bg-gray-800 rounded-xl p-6 animate-pulse h-40" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(calc => (
                <a
                  key={calc.id}
                  href={`/calculators/${calc.slug}`}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-indigo-500 transition-colors group block"
                >
                  <span className="text-xs bg-indigo-900 text-indigo-300 px-2 py-1 rounded-full capitalize">
                    {calc.category}
                  </span>
                  <h3 className="text-white font-bold text-lg mt-3 mb-2 group-hover:text-indigo-400 transition-colors">
                    {calc.name}
                  </h3>
                  <p className="text-gray-400 text-sm">{calc.description}</p>
                  <span className="mt-4 inline-block text-indigo-400 text-sm font-medium">
                    Calculate Now →
                  </span>
                </a>
              ))}
            </div>
          )}

          {filtered.length === 0 && !isLoading && (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">No calculators found</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
