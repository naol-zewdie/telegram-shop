import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tg, getInitData, getUser } from '../lib/telegram';
import { toast } from '../lib/toast';

export default function Checkout() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [placing, setPlacing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/cart', {
      headers: { 'X-Telegram-Init-Data': getInitData() }
    })
      .then(r => r.json())
      .then(setItems);

    const user = getUser();
    if (user?.first_name) {
      setName([user.first_name, user.last_name].filter(Boolean).join(' '));
    }

    tg.BackButton.show();
    tg.BackButton.onClick(handleBack);
    return () => {
      tg.BackButton.hide();
      tg.BackButton.offClick(handleBack);
    };
  }, []);

  const total = items.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);
  const canSubmit = name.trim() && phone.trim() && address.trim();

  useEffect(() => {
    if (!canSubmit) {
      tg.MainButton.hide();
      return;
    }
    tg.MainButton.setText(`Pay — ${total.toFixed(2)} ETB`);
    tg.MainButton.show();
    tg.MainButton.onClick(handlePay);
    return () => {
      tg.MainButton.offClick(handlePay);
      tg.MainButton.hide();
    };
  }, [name, phone, address, total, items]);

  function handleBack() {
    navigate('/cart');
  }

  async function handlePay() {
    setPlacing(true);
    tg.MainButton.showProgress();

    const res = await fetch('/api/payments/create-invoice-link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': getInitData()
      },
      body: JSON.stringify({
        items,
        contactName: name,
        phone,
        shippingAddress: address,
        telegramUser: getUser()
      })
    });
    const { invoiceLink, error } = await res.json();

    tg.MainButton.hideProgress();
    setPlacing(false);

    if (error || !invoiceLink) {
      toast.error('Could not start payment. Please try again.');
      return;
    }

    tg.openInvoice(invoiceLink, (status) => {
      if (status === 'paid') {
        tg.MainButton.hide();
        tg.HapticFeedback.notificationOccurred('success');
        toast.success('Payment successful! Your order is confirmed.');
        navigate('/');
      } else if (status === 'failed') {
        toast.error('Payment failed. Please try again.');
      } else if (status === 'cancelled') {
        // user closed the payment sheet — no action needed
      }
    });
  }

  return (
    <div className="p-3">
      <h1 className="text-xl font-bold mb-3">Checkout</h1>

      <div className="space-y-1 mb-4">
        {items.map(item => (
          <div key={item.productId} className="flex justify-between text-sm">
            <span>{item.product?.name} × {item.quantity}</span>
            <span>{((item.product?.price || 0) * item.quantity).toFixed(2)} ETB</span>
          </div>
        ))}
      </div>
      <div className="text-right font-bold mb-4">Total: {total.toFixed(2)} ETB</div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your full name"
            className="w-full border rounded-lg p-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+251 9XX XXX XXX"
            className="w-full border rounded-lg p-2 text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">We'll use this to contact you about your delivery.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Shipping Address</label>
          <textarea
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Street, city, postal code..."
            className="w-full border rounded-lg p-2 text-sm"
            rows={3}
          />
        </div>
      </div>

      {placing && <p className="text-sm text-gray-400 mt-2">Starting payment...</p>}
      {!canSubmit && (
        <p className="text-xs text-gray-400 mt-2">Fill in your name, phone, and address to continue.</p>
      )}
    </div>
  );
}
