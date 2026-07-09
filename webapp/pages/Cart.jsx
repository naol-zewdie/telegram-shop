import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tg, getInitData } from '../lib/telegram';

export default function Cart() {
  const [items, setItems] = useState([]);
  const navigate = useNavigate();

  function loadCart() {
    fetch('/api/cart', {
      headers: { 'X-Telegram-Init-Data': getInitData() }
    })
      .then(r => r.json())
      .then(setItems);
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
    tg.MainButton.setText(`Checkout — $${total.toFixed(2)}`);
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

  if (items.length === 0) {
    return (
      <div className="p-3 text-gray-400 text-center mt-10">
        Your cart is empty.
      </div>
    );
  }

  return (
    <div className="p-3">
      <h1 className="text-xl font-bold mb-3">Your Cart</h1>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.productId} className="flex items-center justify-between border rounded-lg p-2">
            <div>
              <div className="text-sm font-medium">{item.product?.name}</div>
              <div className="text-xs text-gray-500">
                ${item.product?.price} × {item.quantity}
              </div>
            </div>
            <button
              onClick={() => handleRemove(item.productId)}
              className="text-red-500 text-sm px-2"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="mt-4 text-right font-bold text-lg">
        Total: ${total.toFixed(2)}
      </div>
    </div>
  );
}