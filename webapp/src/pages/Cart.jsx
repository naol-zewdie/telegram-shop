import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tg, getInitData } from '../lib/telegram';

export default function Cart() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  function loadCart() {
    setLoading(true);
    fetch('/api/cart', {
      headers: { 'X-Telegram-Init-Data': getInitData() }
    })
      .then(r => r.json())
      .then(data => {
        setItems(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadCart();
    tg.BackButton.show();
    tg.BackButton.onClick(handleBack);
    return () => {
      tg.BackButton.hide();
      tg.BackButton.offClick(handleBack);
    };
  }, []);

  const total = items.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);

  useEffect(() => {
    if (items.length === 0) {
      tg.MainButton.hide();
      return;
    }
    tg.MainButton.setText(`Checkout — ${total.toFixed(2)} ETB`);
    tg.MainButton.show();
    tg.MainButton.onClick(handleCheckout);
    return () => tg.MainButton.offClick(handleCheckout);
  }, [items, total]);

  function handleBack() {
    navigate('/');
  }

  function handleCheckout() {
    navigate('/checkout');
  }

  async function handleRemove(productId) {
    await fetch(`/api/cart/${productId}`, {
      method: 'DELETE',
      headers: { 'X-Telegram-Init-Data': getInitData() }
    });
    tg.HapticFeedback.impactOccurred('light');
    loadCart();
  }

  async function updateQuantity(productId, quantity) {
    await fetch(`/api/cart/${productId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': getInitData()
      },
      body: JSON.stringify({ quantity })
    });
    loadCart();
  }

  if (loading) {
    return (
      <div className="p-3">
        <div className="bg-gray-100 h-6 rounded w-1/3 mb-3 animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="border rounded-lg p-2 animate-pulse">
              <div className="flex justify-between mb-2">
                <div className="bg-gray-100 h-4 rounded w-1/2" />
                <div className="bg-gray-100 h-4 rounded w-10" />
              </div>
              <div className="bg-gray-100 h-6 rounded w-1/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-3 text-center mt-10">
        <p className="text-gray-400 mb-3">Your cart is empty.</p>
        <button
          onClick={() => navigate('/')}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg"
        >
          Browse products
        </button>
      </div>
    );
  }

  return (
    <div className="p-3">
      <h1 className="text-xl font-bold mb-3">Your Cart</h1>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.productId} className="border rounded-lg p-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{item.product?.name}</div>
                <div className="text-xs text-gray-500">{item.product?.price} ETB each</div>
              </div>
              <button
                onClick={() => handleRemove(item.productId)}
                className="text-red-500 text-sm px-2"
              >
                Remove
              </button>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                disabled={item.quantity <= 1}
                className="w-7 h-7 rounded-full bg-gray-100 text-sm font-bold disabled:opacity-30"
              >
                −
              </button>
              <span className="w-6 text-center text-sm">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                disabled={item.quantity >= item.product?.stock}
                className="w-7 h-7 rounded-full bg-gray-100 text-sm font-bold disabled:opacity-30"
              >
                +
              </button>
              <span className="text-xs text-gray-400 ml-auto">
                {(item.product?.price * item.quantity).toFixed(2)} ETB
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 text-right font-bold text-lg">
        Total: {total.toFixed(2)} ETB
      </div>
    </div>
  );
}
