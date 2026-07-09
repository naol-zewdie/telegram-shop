CREATE TABLE wishlists (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    product_id INTEGER REFERENCES products(id),
    added_at TIMESTAMP DEFAULT now(),
    UNIQUE(user_id, product_id)
);
