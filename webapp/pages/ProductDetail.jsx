import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tg, getInitData } from '../lib/telegram';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch(`/api/products`, {
      headers: { 'X-Telegram-Init-Data': getInitData() }
    })
      .then(r => r.json())
      .then(products => {
        const found = products.find(p => String(p.id) === id);
        setProduct(found || null);
      });
  }, [id]);

  useEffect(() => {
    if (!product) return;

    tg.BackButton.show();
    tg.BackButton.onClick(handleBack);

    tg.MainButton.setText(`Add to Cart — $${product.price}`);
    tg.MainButton.show();
    tg.MainButton.onClick(handleAdd);

    return () => {
      tg.BackButton.hide();
      tg.BackButton.offClick(handleBack);
      tg.MainButton.hide();
      tg.MainButton.offClick(handleAdd);
    };
  }, [product]);

  function handleBack() {
    navigate('/');
  }

  async function handleAdd() {
    setAdding(true);
    tg.MainButton.showProgress();
    await fetch('/api/cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': getInitData()
      },
      body: JSON.stringify({ productId: product.id, quantity: 1 })
    });
    tg.MainButton.hideProgress();
    setAdding(false);
    tg.HapticFeedback.notificationOccurred('success');
    tg.showAlert(`${product.name} added to cart!`);
  }

  if (!product) {
    return <div className="p-3 text-gray-400">Loading product...</div>;
  }

  return (
    <div className="p-3">
      <div className="bg-gray-100 h-48 rounded-lg mb-3 flex items-center justify-center text-gray-400 text-sm">
        {product.image_urls?.[0] ? (
          <img src={product.image_urls[0]} alt={product.name} className="h-full w-full object-cover rounded-lg" />
        ) : (
          'No image'
        )}
      </div>
      <h1 className="text-lg font-semibold">{product.name}</h1>
      <p className="text-gray-500 mt-1">{product.description}</p>
      <p className="text-xl font-bold mt-2">${product.price}</p>
      {adding && <p className="text-sm text-gray-400 mt-2">Adding to cart...</p>}
    </div>
  );
}