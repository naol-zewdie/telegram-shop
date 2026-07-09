CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id INTEGER REFERENCES categories(id),
    image_url TEXT,
    sort_order INT DEFAULT 0
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    currency TEXT DEFAULT 'ETB',
    stock INT DEFAULT 0,
    image_urls TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    phone TEXT,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE carts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    product_id INTEGER REFERENCES products(id),
    quantity INT DEFAULT 1,
    added_at TIMESTAMP DEFAULT now(),
    UNIQUE(user_id, product_id)
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    status TEXT DEFAULT 'pending',
    total NUMERIC(10,2),
    shipping_address TEXT,
    payment_ref TEXT,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    quantity INT,
    unit_price NUMERIC(10,2)
);

-- Seed data so the app has something to show immediately
INSERT INTO categories (name) VALUES
  ('Electronics'),
  ('Clothing'),
  ('Home & Kitchen');

INSERT INTO products (category_id, name, description, price, stock, image_urls) VALUES
  (1, 'Wireless Earbuds', 'Noise cancelling', 49.99, 25, '{}'),
  (1, 'Phone Charger', 'Fast charging cable', 12.99, 50, '{}'),
  (2, 'T-Shirt', '100% cotton', 19.99, 30, '{}');
