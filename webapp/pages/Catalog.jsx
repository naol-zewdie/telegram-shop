import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInitData } from '../lib/telegram';

export default function Catalog() {
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/categories', {
      headers: { 'X-Telegram-Init-Data': getInitData() }
    })
      .then(r => r.json())
      .then(data => {
        setCategories(data);
        if (data.length) setActiveCategory(data[0].id); // auto-select first category
      });
  }, []);

  useEffect(() => {
    if (!activeCategory) return;
    fetch(`/api/products?category=${activeCategory}`, {
      headers: { 'X-Telegram-Init-Data': getInitData() }
    })
      .then(r => r.json())
      .then(setProducts);
  }, [activeCategory]);

  return (
    <div className="p-3">
     <div className="flex justify-between items-center mb-3">
  <h1 className="text-xl font-bold">Shop</h1>
  <button onClick={() => navigate('/cart')} className="text-sm text-blue-600">
    🛒 Cart
  </button>
</div>

      <div className="flex gap-2 overflow-x-auto pb-2">
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
            <div className="text-sm text-gray-500">${p.price}</div>
          </div>
        ))}
        {products.length === 0 && activeCategory && (
          <p className="col-span-2 text-gray-400 text-sm">No products in this category yet.</p>
        )}
      </div>
    </div>
  );
}