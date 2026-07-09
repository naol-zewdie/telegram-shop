const pool = require('../db/pool');

async function getOrCreateUser(telegramUser) {
  const { id, username, first_name } = telegramUser;

  const existing = await pool.query(
    'SELECT * FROM users WHERE telegram_id = $1',
    [id]
  );
  if (existing.rows.length) return existing.rows[0];

  const inserted = await pool.query(
    'INSERT INTO users (telegram_id, username, first_name) VALUES ($1, $2, $3) RETURNING *',
    [id, username || null, first_name || null]
  );
  return inserted.rows[0];
}

module.exports = { getOrCreateUser };
