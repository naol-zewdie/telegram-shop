import { useEffect, useState } from 'react';

export default function Admin() {
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [adminCategories, setAdminCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [error, setError] = useState('');

  const [newProduct, setNewProduct] = useState({
    category_id: '',
    name: '',
    description: '',
    price: '',
    stock: '',
    image_urls: ['']
  });

  const [editingImages, setEditingImages] = useState({});

  function headers() {
    return { 'x-admin-secret': secret, 'Content-Type': 'application/json' };
  }

  async function tryLogin() {
    const res = await fetch('/api/admin/products', { headers: headers() });
    if (res.ok) {
      setAuthed(true);
      setError('');
      loadStats();
    } else {
      setError('Wrong admin secret.');
    }
  }

  function loadStats() {
    fetch('/api/admin/stats', { headers: headers() })
      .then(r => r.json())
      .then(setStats);
  }

  function loadProducts() {
    fetch('/api/admin/products', { headers: headers() })
      .then(r => r.json())
      .then(data => {
        setProducts(data);
        const imagesState = {};
        data.forEach(p => {
          imagesState[p.id] = p.image_urls?.length ? [...p.image_urls] : [''];
        });
        setEditingImages(imagesState);
      });
  }

  function loadOrders() {
    fetch('/api/admin/orders', { headers: headers() })
      .then(r => r.json())
      .then(setOrders);
  }

  function loadCategories() {
    fetch('/api/categories')
      .then(r => r.json())
      .then(setCategories);
  }

  function loadAdminCategories() {
    fetch('/api/admin/categories', { headers: headers() })
      .then(r => r.json())
      .then(setAdminCategories);
  }

  useEffect(() => {
    if (!authed) return;
    if (tab === 'dashboard') loadStats();
    if (tab === 'products') {
      loadProducts();
      loadCategories();
    }
    if (tab === 'orders') loadOrders();
    if (tab === 'categories') loadAdminCategories();
  }, [tab, authed]);

  async function updateStock(id, stock) {
    await fetch(`/api/admin/products/${id}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ stock: Number(stock) })
    });
    loadProducts();
  }

  async function saveImages(id) {
    const urls = (editingImages[id] || []).map(u => u.trim()).filter(Boolean);
    await fetch(`/api/admin/products/${id}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ image_urls: urls })
    });
    loadProducts();
  }

  function updateEditingImageAt(productId, index, value) {
    setEditingImages(prev => {
      const list = [...(prev[productId] || [''])];
      list[index] = value;
      return { ...prev, [productId]: list };
    });
  }

  function addEditingImageSlot(productId) {
    setEditingImages(prev => ({
      ...prev,
      [productId]: [...(prev[productId] || ['']), '']
    }));
  }

  function removeEditingImageSlot(productId, index) {
    setEditingImages(prev => {
      const list = [...(prev[productId] || [''])];
      list.splice(index, 1);
      return { ...prev, [productId]: list.length ? list : [''] };
    });
  }

  async function deleteProduct(id) {
    if (!confirm('Remove this product from the storefront?')) return;
    await fetch(`/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: headers()
    });
    loadProducts();
  }

  function updateNewImageAt(index, value) {
    setNewProduct(prev => {
      const list = [...prev.image_urls];
      list[index] = value;
      return { ...prev, image_urls: list };
    });
  }

  function addNewImageSlot() {
    setNewProduct(prev => ({ ...prev, image_urls: [...prev.image_urls, ''] }));
  }

  function removeNewImageSlot(index) {
    setNewProduct(prev => {
      const list = [...prev.image_urls];
      list.splice(index, 1);
      return { ...prev, image_urls: list.length ? list : [''] };
    });
  }

  async function createProduct(e) {
    e.preventDefault();
    if (!newProduct.category_id || !newProduct.name || !newProduct.price) {
      alert('Category, name, and price are required.');
      return;
    }
    const urls = newProduct.image_urls.map(u => u.trim()).filter(Boolean);
    await fetch('/api/admin/products', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        category_id: Number(newProduct.category_id),
        name: newProduct.name,
        description: newProduct.description,
        price: Number(newProduct.price),
        stock: Number(newProduct.stock) || 0,
        image_urls: urls
      })
    });
    setNewProduct({ category_id: '', name: '', description: '', price: '', stock: '', image_urls: [''] });
    loadProducts();
  }

  async function updateOrderStatus(id, status) {
    await fetch(`/api/admin/orders/${id}/status`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ status })
    });
    loadOrders();
  }

  async function createCategory(e) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    await fetch('/api/admin/categories', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ name: newCategoryName })
    });
    setNewCategoryName('');
    loadAdminCategories();
  }

  async function renameCategory(id, name) {
    if (!name.trim()) return;
    await fetch(`/api/admin/categories/${id}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ name })
    });
    loadAdminCategories();
  }

  async function deleteCategory(id) {
    if (!confirm('Delete this category?')) return;
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: 'DELETE',
      headers: headers()
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to delete category.');
      return;
    }
    loadAdminCategories();
  }

  if (!authed) {
    return (
      <div className="p-4 max-w-sm mx-auto mt-10">
        <h1 className="text-xl font-bold mb-3">Admin Login</h1>
        <input
          type="password"
          value={secret}
          onChange={e => setSecret(e.target.value)}
          placeholder="Admin secret"
          className="w-full border rounded-lg p-2 mb-2"
        />
        <button onClick={tryLogin} className="w-full bg-blue-600 text-white rounded-lg p-2">
          Log in
        </button>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="p-3 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-3">Admin Dashboard</h1>

      <div className="flex gap-2 mb-4 overflow-x-auto">
        <button
          onClick={() => setTab('dashboard')}
          className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${tab === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setTab('products')}
          className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${tab === 'products' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          Products
        </button>
        <button
          onClick={() => setTab('categories')}
          className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${tab === 'categories' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          Categories
        </button>
        <button
          onClick={() => setTab('orders')}
          className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${tab === 'orders' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          Orders
        </button>
      </div>

      {tab === 'dashboard' && (
        <div>
          {!stats ? (
            <p className="text-gray-400 text-sm">Loading stats...</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded-lg p-3">
                  <div className="text-xs text-gray-500">Total Revenue</div>
                  <div className="text-xl font-bold">{stats.totalRevenue.toFixed(2)} ETB</div>
                </div>
                <div className="border rounded-lg p-3">
                  <div className="text-xs text-gray-500">Orders</div>
                  <div className="text-xl font-bold">{stats.orderCount}</div>
                </div>
              </div>

              <div>
                <h2 className="font-medium text-sm mb-2">Best-Selling Products</h2>
                {stats.bestSellers.length === 0 ? (
                  <p className="text-gray-400 text-sm">No sales yet.</p>
                ) : (
                  <div className="space-y-1">
                    {stats.bestSellers.map((p, idx) => (
                      <div key={p.id} className="flex justify-between border rounded-lg p-2 text-sm">
                        <span>{idx + 1}. {p.name}</span>
                        <span className="text-gray-500">{p.units_sold} sold · {Number(p.revenue).toFixed(2)} ETB</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {stats.lowStock.length > 0 && (
                <div>
                  <h2 className="font-medium text-sm mb-2 text-red-600">Low Stock</h2>
                  <div className="space-y-1">
                    {stats.lowStock.map(p => (
                      <div key={p.id} className="flex justify-between border rounded-lg p-2 text-sm">
                        <span>{p.name}</span>
                        <span className={p.stock === 0 ? 'text-red-600 font-medium' : 'text-yellow-600'}>
                          {p.stock === 0 ? 'Out of stock' : `${p.stock} left`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'categories' && (
        <div>
          <form onSubmit={createCategory} className="border rounded-lg p-3 mb-4 flex gap-2">
            <input
              placeholder="New category name"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              className="flex-1 border rounded p-2 text-sm"
            />
            <button type="submit" className="bg-blue-600 text-white rounded-lg px-3 text-sm">
              Add
            </button>
          </form>

          <div className="space-y-2">
            {adminCategories.map(c => (
              <div key={c.id} className="border rounded-lg p-3 flex items-center justify-between gap-2">
                <input
                  defaultValue={c.name}
                  onBlur={e => e.target.value !== c.name && renameCategory(c.id, e.target.value)}
                  className="flex-1 border rounded p-1 text-sm"
                />
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {c.product_count} product{c.product_count !== '1' ? 's' : ''}
                </span>
                <button
                  onClick={() => deleteCategory(c.id)}
                  className="text-red-500 text-sm px-2"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div>
          <form onSubmit={createProduct} className="border rounded-lg p-3 mb-4 space-y-2">
            <h2 className="font-medium text-sm">Add New Product</h2>
            <select
              value={newProduct.category_id}
              onChange={e => setNewProduct({ ...newProduct, category_id: e.target.value })}
              className="w-full border rounded p-2 text-sm"
            >
              <option value="">Select category</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input
              placeholder="Product name"
              value={newProduct.name}
              onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
              className="w-full border rounded p-2 text-sm"
            />
            <input
              placeholder="Description"
              value={newProduct.description}
              onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
              className="w-full border rounded p-2 text-sm"
            />
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Price (ETB)"
                value={newProduct.price}
                onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                className="w-1/2 border rounded p-2 text-sm"
              />
              <input
                type="number"
                placeholder="Stock"
                value={newProduct.stock}
                onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })}
                className="w-1/2 border rounded p-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Image URLs</label>
              {newProduct.image_urls.map((url, idx) => (
                <div key={idx} className="flex gap-1 items-center">
                  <input
                    placeholder={`Image URL ${idx + 1}`}
                    value={url}
                    onChange={e => updateNewImageAt(idx, e.target.value)}
                    className="flex-1 border rounded p-2 text-xs"
                  />
                  {url && <img src={url} alt="" className="w-10 h-10 rounded object-cover" />}
                  {newProduct.image_urls.length > 1 && (
                    <button type="button" onClick={() => removeNewImageSlot(idx)} className="text-red-500 text-xs px-1">
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addNewImageSlot} className="text-blue-600 text-xs">
                + Add another image
              </button>
            </div>

            <button type="submit" className="w-full bg-blue-600 text-white rounded-lg p-2 text-sm">
              Add Product
            </button>
          </form>

          <div className="space-y-2">
            {products.map(p => (
              <div key={p.id} className={`border rounded-lg p-3 ${!p.is_active ? 'opacity-40' : ''}`}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-gray-100 w-12 h-12 rounded flex items-center justify-center text-gray-400 text-xs overflow-hidden">
                      {p.image_urls?.[0] ? (
                        <img src={p.image_urls[0]} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        'No img'
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-sm text-gray-500">{p.price} ETB {!p.is_active && '(inactive)'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-500">Stock:</label>
                    <input
                      type="number"
                      defaultValue={p.stock}
                      onBlur={e => updateStock(p.id, e.target.value)}
                      className="w-16 border rounded p-1 text-sm"
                    />
                    <button
                      onClick={() => deleteProduct(p.id)}
                      className="text-red-500 text-sm px-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">Images</label>
                  {(editingImages[p.id] || ['']).map((url, idx) => (
                    <div key={idx} className="flex gap-1 items-center">
                      <input
                        placeholder={`Image URL ${idx + 1}`}
                        value={url}
                        onChange={e => updateEditingImageAt(p.id, idx, e.target.value)}
                        className="flex-1 border rounded p-1 text-xs"
                      />
                      {url && <img src={url} alt="" className="w-8 h-8 rounded object-cover" />}
                      <button
                        onClick={() => removeEditingImageSlot(p.id, idx)}
                        className="text-red-500 text-xs px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => addEditingImageSlot(p.id)} className="text-blue-600 text-xs">
                      + Add image
                    </button>
                    <button onClick={() => saveImages(p.id)} className="text-green-600 text-xs font-medium">
                      Save images
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="space-y-2">
          {orders.map(o => (
            <div key={o.id} className="border rounded-lg p-3">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium">Order #{o.id}</span>
                <select
                  defaultValue={o.status}
                  onChange={e => updateOrderStatus(o.id, e.target.value)}
                  className="text-sm border rounded p-1"
                >
                  <option value="pending">pending</option>
                  <option value="paid">paid</option>
                  <option value="shipped">shipped</option>
                  <option value="delivered">delivered</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>
              <div className="text-xs text-gray-500 mb-1">
                {o.first_name || o.username || 'Unknown'} · {new Date(o.created_at).toLocaleString()}
              </div>
              {(o.contact_name || o.phone) && (
                <div className="text-xs bg-gray-50 rounded p-1.5 mb-1">
                  {o.contact_name && <div>📇 {o.contact_name}</div>}
                  {o.phone && <div>📞 <a href={`tel:${o.phone}`} className="text-blue-600">{o.phone}</a></div>}
                </div>
              )}
              {o.items.map((item, idx) => (
                <div key={idx} className="text-sm">{item.name} × {item.quantity}</div>
              ))}
              <div className="text-right font-semibold text-sm mt-1">{o.total} ETB</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
