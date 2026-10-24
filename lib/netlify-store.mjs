import { getDatabase } from '@netlify/database';

const db = getDatabase();
const parseJson = (value, fallback) => typeof value === 'string' ? JSON.parse(value) : (value ?? fallback);
function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id, email: row.email, username: row.username, avatar: row.avatar,
    salt: row.salt, passwordHash: row.password_hash,
    createdAt: new Date(row.created_at).toISOString(),
    budgets: parseJson(row.budgets, {}), transactions: parseJson(row.transactions, []), wishlist: parseJson(row.wishlist, []),
  };
}

export class NetlifyStore {
  async getUserByEmail(email) {
    const rows = await db.sql`SELECT * FROM finz_users WHERE email = ${email} LIMIT 1`;
    return mapUser(rows[0]);
  }
  async createUser(user, sessionHash) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO finz_users (id,email,username,avatar,salt,password_hash,created_at,budgets,transactions,wishlist)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'{}'::jsonb,'[]'::jsonb,'[]'::jsonb)`,
        [user.id, user.email, user.username, user.avatar, user.salt, user.passwordHash, user.createdAt],
      );
      await client.query('INSERT INTO finz_sessions (token_hash,user_id,expires_at) VALUES ($1,$2,NOW() + INTERVAL \'30 days\')', [sessionHash, user.id]);
      await client.query('COMMIT');
    } catch (cause) {
      await client.query('ROLLBACK');
      throw cause;
    } finally { client.release(); }
  }
  async createSession(tokenHash, userId) {
    await db.sql`INSERT INTO finz_sessions (token_hash,user_id,expires_at) VALUES (${tokenHash},${userId},NOW() + INTERVAL '30 days')`;
  }
  async deleteSession(tokenHash) { await db.sql`DELETE FROM finz_sessions WHERE token_hash = ${tokenHash}`; }
  async getUserBySession(tokenHash) {
    const rows = await db.sql`SELECT u.* FROM finz_users u JOIN finz_sessions s ON s.user_id = u.id WHERE s.token_hash = ${tokenHash} AND s.expires_at > NOW() LIMIT 1`;
    return mapUser(rows[0]);
  }
  async updateUser(userId, updater) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const selected = await client.query('SELECT * FROM finz_users WHERE id = $1 FOR UPDATE', [userId]);
      const user = mapUser(selected.rows[0]);
      if (!user) throw Object.assign(new Error('User not found'), { status: 401 });
      const result = await updater(user);
      await client.query(
        `UPDATE finz_users SET username=$2, avatar=$3, budgets=$4::jsonb, transactions=$5::jsonb, wishlist=$6::jsonb WHERE id=$1`,
        [user.id, user.username, user.avatar, JSON.stringify(user.budgets), JSON.stringify(user.transactions), JSON.stringify(user.wishlist)],
      );
      await client.query('COMMIT');
      return { user, result };
    } catch (cause) {
      await client.query('ROLLBACK');
      throw cause;
    } finally { client.release(); }
  }
}
