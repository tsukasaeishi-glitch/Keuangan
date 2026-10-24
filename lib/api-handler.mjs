import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;
const json = (status, body, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
});
const error = (status, message) => Object.assign(new Error(message), { status });
const cookie = (token, maxAge = SESSION_MAX_AGE) => `finz_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${process.env.NODE_ENV === 'production' || process.env.NETLIFY ? '; Secure' : ''}`;
const tokenFrom = request => {
  const value = request.headers.get('cookie') || '';
  const match = value.split(';').map(part => part.trim()).find(part => part.startsWith('finz_session='));
  return match ? decodeURIComponent(match.slice('finz_session='.length)) : null;
};
const tokenHash = token => createHash('sha256').update(token).digest('hex');
const cleanText = (value, max = 100) => String(value ?? '').trim().slice(0, max);
function parseAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000_000) throw error(400, 'Masukkan nominal yang valid.');
  return Math.round(amount);
}
function monthFor(iso) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit' }).format(new Date(iso));
}
function safeUser(user) {
  return { id: user.id, email: user.email, username: user.username, avatar: user.avatar || null, createdAt: user.createdAt };
}
async function bodyJson(request) {
  const text = await request.text();
  if (text.length > 5_000_000) throw error(413, 'Data terlalu besar.');
  try { return text ? JSON.parse(text) : {}; } catch { throw error(400, 'Format data tidak valid.'); }
}
function makeTransaction({ type, title, amount, category, merchantName, brand, netWeight, usageDays, timestamp }) {
  const duration = type === 'EXPENSE_CONSUMABLE' ? Math.max(1, Math.min(3650, Number(usageDays) || 1)) : null;
  const restockDate = duration ? new Date(timestamp.getTime() + duration * 86_400_000).toISOString() : null;
  return {
    id: randomBytes(12).toString('hex'), type, title, amount,
    category: cleanText(category || (type === 'INCOME' ? 'Top-Up' : 'Lainnya'), 40), merchantName,
    brand: type === 'EXPENSE_CONSUMABLE' ? cleanText(brand, 50) : null,
    netWeight: type === 'EXPENSE_CONSUMABLE' ? cleanText(netWeight, 40) : null,
    usageDays: duration, costPerDay: duration ? Math.round((amount / duration) * 100) / 100 : null,
    restockDate, timestamp: timestamp.toISOString(),
    date: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(timestamp),
    day: new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long' }).format(timestamp),
    time: new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(timestamp),
    createdAt: new Date().toISOString(),
  };
}

export async function handleApi(request, store) {
  const route = new URL(request.url).pathname;
  const method = request.method.toUpperCase();
  try {
    if (method === 'POST' && route === '/api/auth/register') {
      const input = await bodyJson(request);
      const email = cleanText(input.email, 254).toLowerCase();
      const username = cleanText(input.username, 32);
      const password = String(input.password || '');
      if (!/^\S+@\S+\.\S+$/.test(email)) return json(400, { error: 'Masukkan alamat email yang valid.' });
      if (username.length < 2) return json(400, { error: 'Username minimal 2 karakter.' });
      if (password.length < 8) return json(400, { error: 'Password minimal 8 karakter.' });
      if (await store.getUserByEmail(email)) return json(409, { error: 'Email ini sudah terdaftar.' });
      const salt = randomBytes(16).toString('hex');
      const passwordHash = (await scrypt(password, salt, 64)).toString('hex');
      const user = { id: randomBytes(16).toString('hex'), email, username, avatar: null, salt, passwordHash, createdAt: new Date().toISOString(), budgets: {}, transactions: [], wishlist: [] };
      const token = randomBytes(32).toString('hex');
      await store.createUser(user, tokenHash(token));
      return json(201, { user: safeUser(user) }, { 'Set-Cookie': cookie(token) });
    }

    if (method === 'POST' && route === '/api/auth/login') {
      const input = await bodyJson(request);
      const email = cleanText(input.email, 254).toLowerCase();
      const user = await store.getUserByEmail(email);
      if (!user) return json(401, { error: 'Email atau password belum cocok.' });
      const passwordHash = (await scrypt(String(input.password || ''), user.salt, 64)).toString('hex');
      const expected = Buffer.from(user.passwordHash, 'hex');
      const actual = Buffer.from(passwordHash, 'hex');
      if (expected.length !== actual.length || !timingSafeEqual(actual, expected)) return json(401, { error: 'Email atau password belum cocok.' });
      const token = randomBytes(32).toString('hex');
      await store.createSession(tokenHash(token), user.id);
      return json(200, { user: safeUser(user) }, { 'Set-Cookie': cookie(token) });
    }

    if (method === 'POST' && route === '/api/auth/logout') {
      const token = tokenFrom(request);
      if (token) await store.deleteSession(tokenHash(token));
      return json(200, { ok: true }, { 'Set-Cookie': cookie('', 0) });
    }

    const token = tokenFrom(request);
    const user = token ? await store.getUserBySession(tokenHash(token)) : null;
    if (!user) return json(401, { error: 'Sesi kamu berakhir. Silakan masuk lagi.' });

    if (method === 'GET' && route === '/api/state') {
      return json(200, { user: safeUser(user), budgets: user.budgets, transactions: user.transactions, wishlist: user.wishlist });
    }
    if (method === 'PUT' && route === '/api/profile') {
      const input = await bodyJson(request);
      const username = cleanText(input.username, 32);
      const avatar = input.avatar === null ? null : String(input.avatar || '');
      if (username.length < 2) return json(400, { error: 'Username minimal 2 karakter.' });
      if (avatar && (!/^data:image\/(png|jpeg|webp|gif);base64,/.test(avatar) || avatar.length > 2_800_000)) return json(400, { error: 'Foto harus berupa gambar dan berukuran maksimal 2 MB.' });
      const { user: updated } = await store.updateUser(user.id, current => { current.username = username; current.avatar = avatar || null; });
      return json(200, { user: safeUser(updated) });
    }
    if (method === 'PUT' && route === '/api/budget') {
      const input = await bodyJson(request);
      const month = cleanText(input.month, 7);
      if (!/^\d{4}-\d{2}$/.test(month)) return json(400, { error: 'Bulan tidak valid.' });
      const amount = parseAmount(input.amount);
      const { result } = await store.updateUser(user.id, current => {
        current.budgets[month] = { startingBalance: amount, updatedAt: new Date().toISOString() };
        return current.budgets[month];
      });
      return json(200, { budget: result });
    }
    if (method === 'POST' && route === '/api/transactions') {
      const input = await bodyJson(request);
      const type = input.type;
      const title = cleanText(input.title, 90);
      const amount = parseAmount(input.amount);
      const timestamp = new Date(input.timestamp || Date.now());
      if (!title) return json(400, { error: 'Nama transaksi wajib diisi.' });
      if (!['INCOME', 'EXPENSE_CONSUMABLE', 'EXPENSE_NON_CONSUMABLE'].includes(type)) return json(400, { error: 'Tipe transaksi tidak valid.' });
      const merchantName = type === 'INCOME' ? null : cleanText(input.merchantName, 80);
      if (type !== 'INCOME' && !merchantName) return json(400, { error: 'Nama toko/tempat pembelian wajib diisi.' });
      if (Number.isNaN(timestamp.getTime()) || timestamp.getTime() > Date.now() + 60_000) return json(400, { error: 'Tanggal transaksi tidak valid.' });
      const month = monthFor(timestamp.toISOString());
      const transaction = makeTransaction({ type, title, amount, category: input.category, merchantName, brand: input.brand, netWeight: input.netWeight, usageDays: input.usageDays, timestamp });
      const { user: updated } = await store.updateUser(user.id, current => {
        if (type === 'INCOME' && !current.budgets[month]) current.budgets[month] = { startingBalance: 0, updatedAt: new Date().toISOString() };
        if (type !== 'INCOME' && !current.budgets[month]) throw error(400, 'Atur saldo awal bulan ini sebelum mencatat pengeluaran.');
        current.transactions.unshift(transaction);
      });
      return json(201, { transaction, budget: updated.budgets[month] });
    }
    const transactionMatch = route.match(/^\/api\/transactions\/([a-f0-9]+)$/);
    if (method === 'DELETE' && transactionMatch) {
      const { result } = await store.updateUser(user.id, current => {
        const index = current.transactions.findIndex(item => item.id === transactionMatch[1]);
        if (index < 0) throw error(404, 'Transaksi tidak ditemukan.');
        current.transactions.splice(index, 1);
        return true;
      });
      return json(200, { ok: result });
    }
    if (method === 'POST' && route === '/api/wishlist') {
      const input = await bodyJson(request);
      const title = cleanText(input.title, 90);
      const amount = parseAmount(input.amount);
      if (!title) return json(400, { error: 'Nama barang wajib diisi.' });
      const createdAt = new Date().toISOString();
      const item = { id: randomBytes(12).toString('hex'), title, amount, category: cleanText(input.category || 'Lifestyle', 40), note: cleanText(input.note, 180), createdAt, unlockAt: new Date(Date.now() + 48 * 3_600_000).toISOString(), purchased: false };
      await store.updateUser(user.id, current => current.wishlist.unshift(item));
      return json(201, { item });
    }
    const wishlistMatch = route.match(/^\/api\/wishlist\/([a-f0-9]+)(\/purchase)?$/);
    if (wishlistMatch && method === 'PATCH' && wishlistMatch[2]) {
      const input = await bodyJson(request);
      const merchantName = cleanText(input.merchantName, 80);
      if (!merchantName) return json(400, { error: 'Nama toko/tempat pembelian wajib diisi.' });
      const { result } = await store.updateUser(user.id, current => {
        const item = current.wishlist.find(entry => entry.id === wishlistMatch[1]);
        if (!item) throw error(404, 'Wishlist tidak ditemukan.');
        if (item.purchased) throw error(409, 'Wishlist ini sudah ditandai dibeli.');
        if (Date.now() < new Date(item.unlockAt).getTime()) throw error(400, 'Cooldown 48 jamnya belum selesai.');
        const timestamp = new Date().toISOString();
        const month = monthFor(timestamp);
        if (!current.budgets[month]) throw error(400, 'Atur saldo awal bulan ini sebelum menandai wishlist sebagai dibeli.');
        const transaction = makeTransaction({ type: 'EXPENSE_NON_CONSUMABLE', title: item.title, amount: item.amount, category: item.category, merchantName, timestamp: new Date(timestamp) });
        current.transactions.unshift(transaction);
        item.purchased = true; item.purchasedAt = timestamp; item.merchantName = merchantName; item.transactionId = transaction.id;
        return { item, transaction };
      });
      return json(200, result);
    }
    if (wishlistMatch && method === 'DELETE' && !wishlistMatch[2]) {
      await store.updateUser(user.id, current => {
        const index = current.wishlist.findIndex(entry => entry.id === wishlistMatch[1]);
        if (index < 0) throw error(404, 'Wishlist tidak ditemukan.');
        current.wishlist.splice(index, 1);
      });
      return json(200, { ok: true });
    }
    return json(404, { error: 'Endpoint tidak ditemukan.' });
  } catch (cause) {
    if (cause?.code === '23505') return json(409, { error: 'Email ini sudah terdaftar.' });
    if (cause?.status) return json(cause.status, { error: cause.message });
    console.error(cause);
    return json(500, { error: 'Terjadi kendala. Coba lagi sebentar.' });
  }
}
