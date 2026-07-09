import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInitData } from '../lib/telegram';

export default function Catalog() {
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('default');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/categories', {
      headers: { 'X-Telegram-Init-Data': getInitData() }
    })
      .then(r => {
        if (!r.ok) throw new Error('Failed to load categories');
        return r.json();
      })
      .then(data => {
        setCategories(data);
        if (data.length) setActiveCategory(data[0].id);
      })
      .catch(() => setError('Could not load categories. Pull to refresh or try again shortly.'));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadProducts();
    }, search ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [activeCategory, search, sort]);

  function loadProducts() {
    if (!activeCategory && !search) return;
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (search) {
      params.set('search', search);
    } else if (activeCategory) {
      params.set('category', activeCategory);
    }
    if (sort !== 'default') {
      params.set('sort', sort);
    }

    fetch(`/api/products?${params.toString()}`, {
      headers: { 'X-Telegram-Init-Data': getInitData() }
    })
      .then(r => {
        if (!r.ok) throw new Error('Failed to load products');
        return r.json();
      })
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load products. Pull to refresh or try again shortly.');
        setLoading(false);
      });
  }

  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-xl font-bold">Shop</h1>
        <div className="flex gap-3">
          <button onClick={() => navigate('/wishlist')} className="text-sm text-blue-600">
            ❤️ Saved
          </button>
          <button onClick={() => navigate('/orders')} className="text-sm text-blue-600">
            📦 Orders
          </button>
          <button onClick={() => navigate('/cart')} className="text-sm text-blue-600">
            🛒 Cart
          </button>
        </div>
      </div>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search products..."
        className="w-full border rounded-lg p-2 text-sm mb-2"
      />

      {!search && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-3 py-1 rounded-full whitespace-nowrap text-sm ${
                activeCategory === c.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="mb-3">
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="w-full text-sm border rounded-lg p-2"
        >
          <option value="default">Sort: Default</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="newest">Newest First</option>
        </select>
      </div>

      {error && (
        <div className="text-center text-red-500 text-sm mt-6">
          {error}
          <button onClick={loadProducts} className="block mx-auto mt-2 text-blue-600 underline">
            Retry
          </button>
        </div>
      )}

      {loading && !error && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="border rounded-lg p-2 animate-pulse">
              <div className="bg-gray-100 h-24 rounded mb-2" />
              <div className="bg-gray-100 h-3 rounded w-3/4 mb-1" />
              <div className="bg-gray-100 h-3 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-2 gap-3 mt-3">
          {products.map(p => (
            <div
              key={p.id}
              onClick={() => navigate(`/product/${p.id}`)}
              className="border rounded-lg p-2 cursor-pointer"
            >
              <div className="bg-gray-100 h-24 rounded mb-2 flex items-center justify-center text-gray-400 text-xs">
                {p.image_urls?.[0] ? (
                  <img src={p.image_urls[0]} alt={p.name} className="h-full object-cover rounded" />
                ) : (
                  'No image'
                )}
              </div>
              <div className="text-sm font-medium">{p.name}</div>
              <div className="text-sm text-gray-500">{p.price} ETB</div>
            </div>
          ))}
          {products.length === 0 && (
            <p className="col-span-2 text-gray-400 text-sm text-center mt-6">
              {search ? `No products match "${search}".` : 'No products in this category yet.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
