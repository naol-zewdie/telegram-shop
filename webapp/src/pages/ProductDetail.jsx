import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tg, getInitData } from '../lib/telegram';
import { toast } from '../lib/toast';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [wishlisted, setWishlisted] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    fetch(`/api/products/${id}`, {
      headers: { 'X-Telegram-Init-Data': getInitData() }
    })
      .then(r => r.json())
      .then(setProduct);

    fetch('/api/wishlist', {
      headers: { 'X-Telegram-Init-Data': getInitData() }
    })
      .then(r => r.json())
      .then(items => {
        setWishlisted(items.some(i => String(i.product_id) === id));
      });
  }, [id]);

  const outOfStock = product && product.stock <= 0;
  const images = product?.image_urls?.length ? product.image_urls : [];

  useEffect(() => {
    if (!product) return;

    tg.BackButton.show();
    tg.BackButton.onClick(handleBack);

    if (outOfStock) {
      tg.MainButton.hide();
    } else {
      tg.MainButton.setText(`Add to Cart — ${(product.price * qty).toFixed(2)} ETB`);
      tg.MainButton.show();
      tg.MainButton.onClick(handleAdd);
    }

    return () => {
      tg.BackButton.hide();
      tg.BackButton.offClick(handleBack);
      tg.MainButton.hide();
      tg.MainButton.offClick(handleAdd);
    };
  }, [product, qty]);

  function handleBack() {
    navigate('/');
  }

  function decreaseQty() {
    setQty(q => Math.max(1, q - 1));
  }

  function increaseQty() {
    setQty(q => Math.min(product.stock, q + 1));
  }

  function handleScroll() {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    const index = Math.round(scrollLeft / clientWidth);
    setActiveImage(index);
  }

  function scrollToImage(index) {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ left: index * scrollRef.current.clientWidth, behavior: 'smooth' });
  }

  async function toggleWishlist() {
    tg.HapticFeedback.impactOccurred('light');
    if (wishlisted) {
      await fetch(`/api/wishlist/${id}`, {
        method: 'DELETE',
        headers: { 'X-Telegram-Init-Data': getInitData() }
      });
      setWishlisted(false);
      toast.info('Removed from wishlist');
    } else {
      await fetch(`/api/wishlist/${id}`, {
        method: 'POST',
        headers: { 'X-Telegram-Init-Data': getInitData() }
      });
      setWishlisted(true);
      toast.success('Saved to wishlist');
    }
  }

  async function handleAdd() {
    setAdding(true);
    tg.MainButton.showProgress();
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': getInitData()
      },
      body: JSON.stringify({ productId: product.id, quantity: qty })
    });
    tg.MainButton.hideProgress();
    setAdding(false);

    if (!res.ok) {
      toast.error('Could not add to cart. Please try again.');
      return;
    }

    tg.HapticFeedback.notificationOccurred('success');
    toast.success(`${product.name} added to cart!`);
  }

  if (!product) {
    return (
      <div className="p-3 animate-pulse">
        <div className="bg-gray-100 h-48 rounded-lg mb-3" />
        <div className="bg-gray-100 h-5 rounded w-2/3 mb-2" />
        <div className="bg-gray-100 h-3 rounded w-full mb-1" />
        <div className="bg-gray-100 h-3 rounded w-4/5 mb-3" />
        <div className="bg-gray-100 h-6 rounded w-1/4" />
      </div>
    );
  }

  return (
    <div className="p-3">
      {images.length > 0 ? (
        <div className="relative mb-3">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto snap-x snap-mandatory rounded-lg"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {images.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`${product.name} ${idx + 1}`}
                className="w-full h-48 object-cover flex-shrink-0 snap-center rounded-lg"
                style={{ scrollSnapAlign: 'center' }}
              />
            ))}
          </div>

          <button
            onClick={toggleWishlist}
            className="absolute top-2 right-2 bg-white/80 rounded-full w-9 h-9 flex items-center justify-center text-lg"
          >
            {wishlisted ? '❤️' : '🤍'}
          </button>

          {images.length > 1 && (
            <div className="flex justify-center gap-1 mt-2">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => scrollToImage(idx)}
                  className={`w-2 h-2 rounded-full ${idx === activeImage ? 'bg-blue-600' : 'bg-gray-300'}`}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="relative bg-gray-100 h-48 rounded-lg mb-3 flex items-center justify-center text-gray-400 text-sm">
          No image
          <button
            onClick={toggleWishlist}
            className="absolute top-2 right-2 bg-white/80 rounded-full w-9 h-9 flex items-center justify-center text-lg"
          >
            {wishlisted ? '❤️' : '🤍'}
          </button>
        </div>
      )}

      <h1 className="text-lg font-semibold">{product.name}</h1>
      <p className="text-gray-500 mt-1">{product.description}</p>
      <p className="text-xl font-bold mt-2">{product.price} ETB</p>

      {outOfStock ? (
        <p className="text-red-500 text-sm mt-2 font-medium">Out of stock</p>
      ) : (
        <>
          <p className="text-xs text-gray-400 mt-1">
            {product.stock <= 5 ? `Only ${product.stock} left in stock` : `${product.stock} in stock`}
          </p>

          <div className="flex items-center gap-3 mt-3">
            <span className="text-sm font-medium">Quantity:</span>
            <button
              onClick={decreaseQty}
              disabled={qty <= 1}
              className="w-8 h-8 rounded-full bg-gray-100 text-lg font-bold disabled:opacity-30"
            >
              −
            </button>
            <span className="w-6 text-center">{qty}</span>
            <button
              onClick={increaseQty}
              disabled={qty >= product.stock}
              className="w-8 h-8 rounded-full bg-gray-100 text-lg font-bold disabled:opacity-30"
            >
              +
            </button>
          </div>
        </>
      )}

      {adding && <p className="text-sm text-gray-400 mt-2">Adding to cart...</p>}
    </div>
  );
}
