CREATE TABLE finz_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  avatar TEXT,
  salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  budgets JSONB NOT NULL DEFAULT '{}'::jsonb,
  transactions JSONB NOT NULL DEFAULT '[]'::jsonb,
  wishlist JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE finz_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES finz_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX finz_sessions_expiry_idx ON finz_sessions (expires_at);
