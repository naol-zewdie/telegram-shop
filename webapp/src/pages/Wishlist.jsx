import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tg, getInitData } from '../lib/telegram';

export default function Wishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  function loadWishlist() {
    setLoading(true);
    fetch('/api/wishlist', {
      headers: { 'X-Telegram-Init-Data': getInitData() }
    })
      .then(r => r.json())
      .then(data => {
        setItems(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadWishlist();
    tg.BackButton.show();
    tg.BackButton.onClick(handleBack);
    return () => {
      tg.BackButton.hide();
      tg.BackButton.offClick(handleBack);
    };
  }, []);

  function handleBack() {
    navigate('/');
  }

  async function removeItem(productId) {
    await fetch(`/api/wishlist/${productId}`, {
      method: 'DELETE',
      headers: { 'X-Telegram-Init-Data': getInitData() }
    });
    tg.HapticFeedback.impactOccurred('light');
    loadWishlist();
  }

  if (loading) {
    return <div className="p-3 text-gray-400">Loading wishlist...</div>;
  }

  if (items.length === 0) {
    return (
      <div className="p-3 text-center mt-10">
        <p className="text-gray-400 mb-3">No items saved yet.</p>
        <button onClick={() => navigate('/')} className="text-blue-600 text-sm underline">
          Browse products
        </button>
      </div>
    );
  }

  return (
    <div className="p-3">
      <h1 className="text-xl font-bold mb-3">Wishlist</h1>
      <div className="grid grid-cols-2 gap-3">
        {items.map(item => (
          <div key={item.product_id} className="border rounded-lg p-2 relative">
            <button
              onClick={() => removeItem(item.product_id)}
              className="absolute top-1 right-1 bg-white/80 rounded-full w-7 h-7 flex items-center justify-center text-sm z-10"
            >
              ❤️
            </button>
            <div
              onClick={() => navigate(`/product/${item.product_id}`)}
              className="cursor-pointer"
            >
              <div className="bg-gray-100 h-24 rounded mb-2 flex items-center justify-center text-gray-400 text-xs overflow-hidden">
                {item.image_urls?.[0] ? (
                  <img src={item.image_urls[0]} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  'No image'
                )}
              </div>
              <div className="text-sm font-medium">{item.name}</div>
              <div className="text-sm text-gray-500">
                {item.price} ETB
                {!item.is_active && <span className="text-red-500 ml-1">(unavailable)</span>}
                {item.is_active && item.stock <= 0 && <span className="text-red-500 ml-1">(out of stock)</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
