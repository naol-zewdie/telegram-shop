import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tg, getInitData } from '../lib/telegram';

const statusMeta = {
  pending:   { label: 'Pending',   icon: '⏳', color: 'bg-yellow-100 text-yellow-700' },
  paid:      { label: 'Paid',      icon: '💳', color: 'bg-blue-100 text-blue-700' },
  shipped:   { label: 'Shipped',   icon: '🚚', color: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Delivered', icon: '✅', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', icon: '❌', color: 'bg-red-100 text-red-700' },
};

function estimatedDelivery(status) {
  if (status === 'paid') return 'Estimated delivery: 3–5 business days';
  if (status === 'shipped') return 'Estimated delivery: 1–2 business days';
  if (status === 'delivered') return 'Delivered';
  return null;
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/orders', {
      headers: { 'X-Telegram-Init-Data': getInitData() }
    })
      .then(r => r.json())
      .then(data => {
        setOrders(data.reverse());
        setLoading(false);
      });

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

  if (loading) {
    return (
      <div className="p-3">
        <div className="bg-gray-100 h-6 rounded w-1/3 mb-3 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="border rounded-lg p-3 animate-pulse">
              <div className="flex justify-between mb-2">
                <div className="bg-gray-100 h-4 rounded w-1/4" />
                <div className="bg-gray-100 h-4 rounded w-16" />
              </div>
              <div className="bg-gray-100 h-3 rounded w-1/3 mb-2" />
              <div className="bg-gray-100 h-3 rounded w-2/3 mb-1" />
              <div className="bg-gray-100 h-3 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="p-3 text-center mt-10">
        <p className="text-gray-400 mb-3">No orders yet.</p>
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
      <h1 className="text-xl font-bold mb-3">Your Orders</h1>
      <div className="space-y-3">
        {orders.map(order => {
          const meta = statusMeta[order.status] || { label: order.status, icon: '•', color: 'bg-gray-100 text-gray-600' };
          const delivery = estimatedDelivery(order.status);

          return (
            <div key={order.id} className="border rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">Order #{order.id}</span>
                <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${meta.color}`}>
                  <span>{meta.icon}</span>
                  <span>{meta.label}</span>
                </span>
              </div>
              <div className="text-xs text-gray-500 mb-2">
                {new Date(order.created_at || order.createdAt).toLocaleString()}
              </div>
              {order.shipping_address && (
                <div className="text-xs text-gray-500 mb-2">📍 {order.shipping_address}</div>
              )}
              <div className="space-y-1 mb-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="text-sm flex justify-between">
                    <span>{item.name || `Product #${item.productId}`} × {item.quantity}</span>
                  </div>
                ))}
              </div>
              {delivery && (
                <div className="text-xs text-gray-500 mb-1">{delivery}</div>
              )}
              <div className="text-right font-semibold text-sm">
                Total: {order.total} ETB
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
