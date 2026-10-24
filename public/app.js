import { api } from './api.js';

const $ = (selector, root = document) => root.querySelector(selector);
const monthNow = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const state = { user: null, budgets: {}, transactions: [], wishlist: [] };
let view = 'dashboard';
let selectedMonth = monthNow();
let theme = localStorage.getItem('finz-theme') || 'light';
let authMode = 'login';
let deferredInstallPrompt = null;

const iconPaths = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  receipt: '<path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/><path d="M8 8h8M8 12h8M8 16h3"/>',
  heart: '<path d="M20.8 8.6c0 5.1-8.8 10.2-8.8 10.2S3.2 13.7 3.2 8.6a4.6 4.6 0 0 1 8.8-1.8 4.6 4.6 0 0 1 8.8 1.8Z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrowUp: '<path d="M12 19V5m-6 6 6-6 6 6"/>',
  arrowDown: '<path d="M12 5v14m6-6-6 6-6-6"/>',
  moon: '<path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  trend: '<path d="m3 17 6-6 4 4 8-9"/><path d="M15 6h6v6"/>',
  sparkle: '<path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/>',
  bag: '<path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
  logout: '<path d="M10 17l5-5-5-5m5 5H3"/><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/>',
  edit: '<path d="m15 5 4 4M4 20l4-.8L19.5 7.7a2.1 2.1 0 0 0-3-3L5 16.2 4 20Z"/>',
  trash: '<path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3"/>',
  close: '<path d="m18 6-12 12M6 6l12 12"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5"/><path d="M5 17v4h14v-4"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || ''}</svg>`;
const esc = (value = '') => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const rupiah = n => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n) || 0);
const fmtDate = (value, options = { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }) => new Intl.DateTimeFormat('id-ID', options).format(new Date(value));
const fmtTime = value => new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(value));
const monthLabel = month => new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(`${month}-01T12:00:00`));
const localInputTime = (date = new Date()) => { const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 19); };
const monthForDate = value => { const date = new Date(value); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; };
const initials = name => (name || 'F').trim().split(/\s+/).slice(0, 2).map(x => x[0]).join('').toUpperCase();
const avatar = (user, extra = '') => user?.avatar ? `<img class="avatar ${extra}" src="${esc(user.avatar)}" alt="" />` : `<span class="avatar avatar-fallback ${extra}">${esc(initials(user?.username))}</span>`;
const expensesOf = list => list.filter(t => t.type !== 'INCOME');
const currentTransactions = () => state.transactions.filter(t => monthForDate(t.timestamp) === selectedMonth);
const totalSpent = list => expensesOf(list).reduce((sum, item) => sum + item.amount, 0);
const totalIncome = list => list.filter(t => t.type === 'INCOME').reduce((sum, item) => sum + item.amount, 0);
const budgetOf = month => state.budgets[month] || null;
const currentBalance = (month, list = state.transactions.filter(t => monthForDate(t.timestamp) === month)) => (budgetOf(month)?.startingBalance || 0) + totalIncome(list) - totalSpent(list);

function toast(message, type = 'success') {
  const region = $('#toast-region');
  const node = document.createElement('div'); node.className = `toast toast-${type}`;
  node.innerHTML = `${icon(type === 'error' ? 'close' : 'sparkle')}<span>${esc(message)}</span>`;
  region.append(node); setTimeout(() => node.remove(), 3300);
}

function renderAuth() {
  $('#app').innerHTML = `<main class="auth-page">
    <section class="auth-art">
      <div class="auth-art-top"><span class="brand-mark">f</span><span class="brand-word">FinZ</span></div>
      <div class="art-decoration decor-one"></div><div class="art-decoration decor-two"></div>
      <div class="auth-art-copy"><span class="eyebrow-light">MONEY, BUT MAKE IT MAKE SENSE</span><h1>Dompet aman.<br /><span>Hidup lebih tenang.</span></h1><p>Kenali pola belanjamu, rawat saldo, dan tahu kapan stok favoritmu habis.</p>
        <div class="art-mini-card"><div class="mini-icon">${icon('trend')}</div><div><small>Saldo bulan ini</small><strong>Rp 2.450.000</strong></div><span class="mini-chip">on track ✨</span></div>
      </div><span class="art-foot">Biar gajian nggak cuma numpang lewat.</span>
    </section>
    <section class="auth-panel"><div class="auth-mobile-brand"><span class="brand-mark">f</span><span class="brand-word">FinZ</span></div>
      <div class="auth-card"><div class="auth-intro"><span class="eyebrow">${authMode === 'login' ? 'WELCOME BACK' : 'LET’S GET STARTED'}</span><h2>${authMode === 'login' ? 'Senang melihatmu lagi' : 'Bikin ruang buat cuan'}</h2><p>${authMode === 'login' ? 'Masuk dan cek kondisi dompetmu hari ini.' : 'Buat akun, lalu mulai kenal pola finansialmu.'}</p></div>
      <form id="auth-form" class="form-stack"><input type="hidden" name="mode" value="${authMode}" />
        ${authMode === 'register' ? `<label>Username<div class="input-wrap">${icon('user')}<input name="username" type="text" minlength="2" maxlength="32" placeholder="Nama panggilanmu" autocomplete="username" required /></div></label>` : ''}
        <label>Email<div class="input-wrap"><span class="input-at">@</span><input name="email" type="email" placeholder="nama@email.com" autocomplete="email" required /></div></label>
        <label>Password<div class="input-wrap">${icon('edit')}<input name="password" type="password" minlength="8" placeholder="${authMode === 'register' ? 'Minimal 8 karakter' : 'Masukkan password'}" autocomplete="${authMode === 'register' ? 'new-password' : 'current-password'}" required /></div></label>
        ${authMode === 'register' ? `<p class="form-hint">Password minimal 8 karakter. Data akun disimpan lokal di server FinZ ini.</p>` : ''}
        <button class="button button-primary button-full" type="submit">${authMode === 'login' ? 'Masuk ke FinZ' : 'Buat akun'}${icon('chevron')}</button>
      </form><div class="auth-switch">${authMode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'} <button type="button" class="text-button" data-action="auth-switch">${authMode === 'login' ? 'Daftar dulu' : 'Masuk'}</button></div><div class="install-auth-hint">Akses lebih cepat? <button class="text-button" data-action="install-app">Pasang FinZ di ponsel</button></div>
      <div class="auth-footnote"><span>${icon('calendar')} </span>Keuanganmu, ritmemu. Mulai dari sini.</div></div>
    </section></main>`;
}

function navItem(key, label, ico) { return `<button class="nav-item ${view === key ? 'active' : ''}" data-view="${key}">${icon(ico)}<span>${label}</span>${view === key ? '<i></i>' : ''}</button>`; }
function renderShell(content) {
  document.documentElement.dataset.theme = theme;
  $('#app').innerHTML = `<div class="app-shell">
    <aside class="sidebar"><a class="brand" href="#" data-view="dashboard"><span class="brand-mark">f</span><span>FinZ</span><small>SMART MONEY</small></a>
      <div class="sidebar-caption">MENU</div><nav class="side-nav">${navItem('dashboard', 'Ringkasan', 'grid')}${navItem('transactions', 'Transaksi', 'receipt')}${navItem('wishlist', 'Cooling-off list', 'heart')}</nav>
      <div class="sidebar-spacer"></div><div class="sidebar-note"><div class="note-spark">${icon('sparkle')}</div><strong>Uangmu punya cerita.</strong><p>Bikin keputusan dengan lebih sadar, satu catatan kecil setiap hari.</p></div>
      <button class="profile-mini" data-view="profile">${avatar(state.user)}<span><strong>${esc(state.user.username)}</strong><small>Personal account</small></span>${icon('chevron')}</button>
    </aside>
    <div class="app-main"><header class="topbar"><div class="mobile-brand"><span class="brand-mark">f</span><span>FinZ</span></div><div class="topbar-left"><span class="crumb">FinZ</span>${icon('chevron')}<span>${({ dashboard: 'Ringkasan', transactions: 'Transaksi', wishlist: 'Cooling-off list', profile: 'Profil' })[view]}</span></div>
      <div class="topbar-actions"><button class="button button-soft button-install" data-action="install-app" aria-label="Pasang FinZ di ponsel">${icon('download')}<span>Pasang app</span></button><button class="icon-button theme-toggle" aria-label="Ubah tema" data-action="theme-toggle">${icon(theme === 'dark' ? 'sun' : 'moon')}</button><button class="user-chip" data-view="profile">${avatar(state.user)}<span>${esc(state.user.username)}</span>${icon('chevron')}</button></div></header>
      <main class="content">${content}</main>
    </div><nav class="mobile-nav">${navItem('dashboard', 'Home', 'grid')}${navItem('transactions', 'Transaksi', 'receipt')}${navItem('wishlist', 'Wishlist', 'heart')}${navItem('profile', 'Profil', 'user')}</nav>
  </div>`;
}

function vibe(balance, initial, list) {
  const spent = totalSpent(list); const elapsed = Math.max(1, new Date().getDate());
  const dailyBurn = spent / elapsed; const daysLeft = Math.max(1, new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate());
  const dailyRoom = balance / daysLeft;
  if (balance < 0 || (initial > 0 && balance / initial < 0.12)) return { cls: 'red', label: 'Broke alert', emoji: '🫠', text: 'Pelan-pelan dulu, bestie. Prioritaskan yang penting sampai gajian berikutnya.' };
  if (spent > 0 && dailyRoom < dailyBurn * 0.7) return { cls: 'yellow', label: 'Watch out', emoji: '👀', text: 'Ritme belanja mulai agak ngebut. Cek lagi mana yang bisa ditahan.' };
  if (initial <= 0 && spent === 0) return { cls: 'green', label: 'Fresh start', emoji: '🌱', text: 'Belum ada transaksi bulan ini. Catat saldo awal biar vibe check makin akurat.' };
  return { cls: 'green', label: 'Safe zone', emoji: '✨', text: dailyBurn ? 'Saldo masih punya ruang napas. Keep it steady, kamu lagi on track.' : 'Semua masih aman. Catat pengeluaran biar tetap mindful.' };
}

function transactionIcon(item) { return item.type === 'INCOME' ? 'arrowDown' : item.type === 'EXPENSE_CONSUMABLE' ? 'bag' : 'receipt'; }
function txRow(item, compact = false) {
  const income = item.type === 'INCOME';
  return `<div class="transaction-row ${compact ? 'compact-row' : ''}"><div class="tx-icon ${income ? 'tx-income' : item.type === 'EXPENSE_CONSUMABLE' ? 'tx-consume' : 'tx-outcome'}">${icon(transactionIcon(item))}</div><div class="tx-title"><strong>${esc(item.title)}</strong><span>${esc(item.category)}${item.brand ? ` · ${esc(item.brand)}` : ''}${item.merchantName ? ` · ${esc(item.merchantName)}` : ''}</span></div><div class="tx-date"><strong>${fmtDate(item.timestamp, { day: 'numeric', month: 'short' })}</strong><span>${fmtTime(item.timestamp)}</span></div><strong class="tx-amount ${income ? 'positive' : ''}">${income ? '+' : '−'}${rupiah(item.amount)}</strong>${compact ? '' : `<button class="icon-button row-delete" title="Hapus transaksi" data-action="delete-tx" data-id="${item.id}">${icon('trash')}</button>`}</div>`;
}

function renderDashboard() {
  const list = currentTransactions(); const expenses = expensesOf(list); const spent = totalSpent(list); const income = totalIncome(list);
  const budget = budgetOf(selectedMonth); const initial = budget?.startingBalance || 0; const balance = currentBalance(selectedMonth, list);
  const consumer = expenses.filter(t => t.type === 'EXPENSE_CONSUMABLE').reduce((s, t) => s + t.amount, 0);
  const nonConsumer = expenses.filter(t => t.type === 'EXPENSE_NON_CONSUMABLE').reduce((s, t) => s + t.amount, 0);
  const consumerPct = spent ? Math.round(consumer / spent * 100) : 0; const nonPct = spent ? 100 - consumerPct : 0;
  const ratio = initial + income > 0 ? Math.min(100, Math.max(0, spent / (initial + income) * 100)) : 0;
  const check = vibe(balance, initial + income, list);
  const activeConsumables = state.transactions.filter(t => t.type === 'EXPENSE_CONSUMABLE' && t.restockDate && new Date(t.restockDate) > new Date());
  const restock = activeConsumables.sort((a, b) => new Date(a.restockDate) - new Date(b.restockDate)).slice(0, 3);
  const content = `<section class="page-heading"><div><span class="eyebrow">${fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}</span><h1>Hai, ${esc(state.user.username.split(/\s+/)[0])} <span class="heading-wave">✦</span></h1><p>Ini ringkasan kecil soal uangmu. Kamu yang pegang kendali.</p></div><div class="heading-actions"><label class="month-picker">${icon('calendar')}<input type="month" id="month-picker" value="${selectedMonth}" aria-label="Pilih bulan" /></label><button class="button button-primary" data-action="add-expense">${icon('plus')}Catat transaksi</button></div></section>
  ${!budget ? `<section class="setup-banner"><div class="setup-icon">${icon('sparkle')}</div><div><strong>Mulai dengan saldo awal bulan ini</strong><p>Tambah budget bulanan supaya FinZ bisa bantu hitung sisa saldo dan kasih vibe check.</p></div><button class="button button-dark" data-action="set-budget">Atur saldo awal ${icon('chevron')}</button></section>` : ''}
  <section class="dashboard-grid top-grid"><article class="card balance-card"><div class="balance-top"><span class="card-label">SALDO TERSEDIA <span class="live-dot"></span></span><button class="text-button small-button" data-action="set-budget">${icon('edit')} ${budget ? 'Ubah saldo awal' : 'Atur budget'}</button></div>
    <div class="balance-value">${rupiah(balance)}</div><div class="balance-caption">${balance < 0 ? 'Saldo minus — kita atur bareng, ya.' : `Bisa dipakai sampai ${fmtDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), { day: 'numeric', month: 'long' })}.`}</div>
    <div class="balance-progress"><span style="width:${ratio}%"></span></div><div class="balance-foot"><span>${Math.round(ratio)}% budget terpakai</span><span>${rupiah(initial + income)} total dana</span></div>
    <div class="balance-buttons"><button class="button button-soft" data-action="topup">${icon('plus')}Tambah saldo</button><button class="button button-outline-light" data-action="add-expense">Catat pengeluaran ${icon('chevron')}</button></div></article>
    <article class="card vibe-card vibe-${check.cls}"><div class="vibe-heading"><span class="card-label">FINANCIAL VIBE CHECK</span><span class="vibe-emoji">${check.emoji}</span></div><div class="vibe-status">${check.label}</div><p>${check.text}</p><div class="vibe-footer"><span>${icon('sparkle')} Update dari aktivitas bulan ini</span></div></article></section>
  <section class="metric-grid"><article class="card metric-card"><div class="metric-label">Total pengeluaran <span class="metric-icon metric-lilac">${icon('arrowUp')}</span></div><strong>${rupiah(spent)}</strong><small>${expenses.length} transaksi di ${monthLabel(selectedMonth)}</small></article><article class="card metric-card"><div class="metric-label">Top-up bulan ini <span class="metric-icon metric-green">${icon('arrowDown')}</span></div><strong>${rupiah(income)}</strong><small>${list.filter(t => t.type === 'INCOME').length} kali tambah saldo</small></article><article class="card metric-card"><div class="metric-label">Biaya konsumsi / hari <span class="metric-icon metric-blue">${icon('trend')}</span></div><strong>${rupiah(activeConsumables.reduce((s, t) => s + (t.costPerDay || 0), 0))}</strong><small>Estimasi dari barang yang belum habis</small></article></section>
  <section class="dashboard-grid middle-grid"><article class="card breakdown-card"><div class="section-title"><div><span class="eyebrow">SPENDING SNAPSHOT</span><h2>Ke mana perginya?</h2></div><span class="period-chip">${monthLabel(selectedMonth)}</span></div>
    <div class="breakdown-total"><strong>${rupiah(spent)}</strong><span>Total keluar</span></div><div class="breakdown-bar"><span class="bar-consumer" style="width:${consumerPct}%"></span><span class="bar-nonconsumer" style="width:${nonPct}%"></span></div>
    <div class="breakdown-legend"><div><span class="legend-dot dot-consumer"></span><span>Konsumsi <small>${consumerPct}%</small></span><strong>${rupiah(consumer)}</strong></div><div><span class="legend-dot dot-nonconsumer"></span><span>Non-konsumsi <small>${nonPct}%</small></span><strong>${rupiah(nonConsumer)}</strong></div></div>
    ${spent ? `<div class="breakdown-insight">${icon('sparkle')} ${consumerPct > nonPct ? 'Barang sehari-hari jadi porsi terbesar bulan ini.' : 'Pengeluaran non-konsumsi jadi porsi terbesar bulan ini.'}</div>` : `<div class="empty-hint">Belum ada pengeluaran di bulan ini. Semua masih tenang 🌿</div>`}</article>
    <article class="card restock-card"><div class="section-title"><div><span class="eyebrow">SMART CONSUMPTION</span><h2>Restock radar</h2></div>${icon('bag', 'section-icon')}</div><p class="section-subtitle">Biar repurchase pas waktunya, bukan karena impuls.</p>
      ${restock.length ? `<div class="restock-list">${restock.map(item => { const days = Math.ceil((new Date(item.restockDate) - new Date()) / 86_400_000); return `<div class="restock-item"><span class="restock-glyph">${icon('bag')}</span><div><strong>${esc(item.title)}</strong><small>${esc(item.brand || 'Konsumsi')} · ${rupiah(item.costPerDay)}/hari</small></div><span class="restock-date ${days <= 5 ? 'soon' : ''}">${days <= 0 ? 'Segera' : `${days} hari lagi`}<small>${fmtDate(item.restockDate, { day: 'numeric', month: 'short' })}</small></span></div>`; }).join('')}</div>` : `<div class="empty-restock"><div>${icon('sparkle')}</div><strong>Belum ada barang di radar</strong><span>Catat barang konsumsi untuk mulai memprediksi tanggal restock.</span></div>`}</article></section>
  <section class="card recent-card"><div class="section-title"><div><span class="eyebrow">LATEST ACTIVITY</span><h2>Transaksi terbaru</h2></div><button class="text-button link-button" data-view="transactions">Lihat semua ${icon('chevron')}</button></div>
    ${list.length ? `<div class="transaction-list">${list.slice(0, 5).map(t => txRow(t, true)).join('')}</div>` : `<div class="empty-state compact-empty"><div class="empty-art">${icon('receipt')}</div><strong>Belum ada catatan di sini</strong><p>Setiap transaksi kecil bikin gambaran finansialmu makin jelas.</p><button class="button button-soft" data-action="add-expense">Catat transaksi pertama</button></div>`}</section>`;
  renderShell(content);
}

function renderTransactions() {
  const list = currentTransactions(); const expenses = expensesOf(list); const spend = totalSpent(list); const income = totalIncome(list);
  const content = `<section class="page-heading"><div><span class="eyebrow">MONEY MOVES</span><h1>Transaksi</h1><p>Semua uang masuk dan keluar, rapi di satu tempat.</p></div><div class="heading-actions"><label class="month-picker">${icon('calendar')}<input type="month" id="month-picker" value="${selectedMonth}" aria-label="Pilih bulan" /></label><button class="button button-primary" data-action="add-expense">${icon('plus')}Tambah transaksi</button></div></section>
    <section class="metric-grid transaction-metrics"><article class="card metric-card"><div class="metric-label">Pengeluaran</div><strong>${rupiah(spend)}</strong><small>${expenses.length} catatan</small></article><article class="card metric-card"><div class="metric-label">Saldo masuk</div><strong>${rupiah(income)}</strong><small>${list.filter(t => t.type === 'INCOME').length} kali top-up</small></article><article class="card metric-card"><div class="metric-label">Saldo akhir</div><strong>${rupiah(currentBalance(selectedMonth, list))}</strong><small>${monthLabel(selectedMonth)}</small></article></section>
    <section class="card transaction-page-card"><div class="section-title"><div><span class="eyebrow">${monthLabel(selectedMonth).toUpperCase()}</span><h2>Riwayat transaksi</h2></div><span class="count-pill">${list.length} catatan</span></div>
      ${list.length ? `<div class="transaction-list">${list.map(t => txRow(t)).join('')}</div>` : `<div class="empty-state"><div class="empty-art">${icon('receipt')}</div><strong>Belum ada transaksi bulan ini</strong><p>Catat pengeluaran atau top-up pertama untuk mulai melihat pola keuangan.</p><button class="button button-primary" data-action="add-expense">${icon('plus')}Catat transaksi</button></div>`}</section>`;
  renderShell(content);
}

function countdown(unlockAt) {
  const ms = Math.max(0, new Date(unlockAt) - Date.now());
  if (!ms) return 'Siap diputuskan';
  const hours = Math.floor(ms / 3_600_000); const mins = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours} jam ${mins} mnt lagi`;
}
function renderWishlist() {
  const active = state.wishlist.filter(item => !item.purchased); const bought = state.wishlist.filter(item => item.purchased);
  const cards = (items, done = false) => items.map(item => {
    const ready = new Date(item.unlockAt) <= new Date();
    return `<article class="wishlist-item ${done ? 'purchased' : ''}"><div class="wish-top"><span class="wish-icon">${icon(done ? 'bag' : 'heart')}</span><span class="wish-category">${esc(item.category)}</span>${done ? '<span class="done-badge">Sudah dibeli</span>' : ''}</div><h3>${esc(item.title)}</h3><strong class="wish-price">${rupiah(item.amount)}</strong>${item.note ? `<p class="wish-note">${esc(item.note)}</p>` : ''}
      <div class="cooldown-line">${icon('clock')}<span>${done ? `Dibeli ${fmtDate(item.purchasedAt, { day: 'numeric', month: 'short' })}` : ready ? 'Cooldown selesai · keputusan di tanganmu' : `Jeda 48 jam · ${countdown(item.unlockAt)}`}</span></div>
      ${done && item.merchantName ? `<p class="purchased-at">Dibeli di ${esc(item.merchantName)}</p>` : ''}${!done ? `<div class="wish-actions"><button class="button ${ready ? 'button-primary' : 'button-disabled'}" data-action="wish-purchase" data-id="${item.id}" ${ready ? '' : 'disabled'}>${ready ? 'Tandai dibeli' : 'Biar dingin dulu'}</button><button class="icon-button" title="Hapus dari wishlist" data-action="delete-wish" data-id="${item.id}">${icon('trash')}</button></div>` : ''}</article>`;
  }).join('');
  const content = `<section class="page-heading"><div><span class="eyebrow">BUY IT? MAYBE LATER.</span><h1>Cooling-off list <span class="heading-wave">♡</span></h1><p>Kasih diri sendiri 48 jam. Keinginan impulsif biasanya punya masa kedaluwarsa.</p></div><div class="heading-actions"><button class="button button-primary" data-action="add-wish">${icon('plus')}Tambah ke wishlist</button></div></section>
    <section class="cooldown-banner"><div class="cooldown-icon">${icon('clock')}</div><div><strong>Aturan 48 jam</strong><p>Setiap wishlist akan menunggu 48 jam sebelum bisa ditandai dibeli. Saat dibeli, pengeluaran otomatis tercatat.</p></div><div class="cooldown-number">48<span>JAM</span></div></section>
    <section class="wishlist-section"><div class="section-title"><div><span class="eyebrow">MENUNGGU KEPUTUSAN</span><h2>Masih dipikirin <span class="tiny-count">${active.length}</span></h2></div></div>
      ${active.length ? `<div class="wishlist-grid">${cards(active)}</div>` : `<div class="card empty-state wish-empty"><div class="empty-art">${icon('heart')}</div><strong>Ruang keputusan masih kosong</strong><p>Ada yang kamu pengin, tapi belum yakin? Taruh dulu di sini, lalu cek lagi dua hari lagi.</p><button class="button button-soft" data-action="add-wish">Tambah ke wishlist</button></div>`}</section>
    ${bought.length ? `<section class="wishlist-section purchased-section"><div class="section-title"><div><span class="eyebrow">KEPUTUSAN YANG SUDAH DIAMBIL</span><h2>Sudah dibeli <span class="tiny-count">${bought.length}</span></h2></div></div><div class="wishlist-grid">${cards(bought, true)}</div></section>` : ''}`;
  renderShell(content);
}

function renderProfile() {
  const content = `<section class="page-heading"><div><span class="eyebrow">YOUR SPACE</span><h1>Profil</h1><p>Atur identitas dan preferensi FinZ-mu.</p></div></section>
    <section class="profile-layout"><article class="card profile-card"><div class="section-title"><div><span class="eyebrow">PERSONAL ACCOUNT</span><h2>Info profil</h2></div></div><div class="profile-summary">${avatar(state.user, 'profile-large')}<div><strong>${esc(state.user.username)}</strong><span>${esc(state.user.email)}</span><small>Bergabung ${fmtDate(state.user.createdAt, { day: 'numeric', month: 'long', year: 'numeric' })}</small></div><button class="button button-soft" data-action="edit-profile">${icon('edit')}Edit profil</button></div><div class="profile-preferences"><div><span class="preference-icon">${icon(theme === 'dark' ? 'moon' : 'sun')}</span><div><strong>Tampilan</strong><small>Tema ${theme === 'dark' ? 'gelap' : 'terang'}</small></div><button class="toggle-switch ${theme === 'dark' ? 'on' : ''}" data-action="theme-toggle" role="switch" aria-checked="${theme === 'dark'}"><span></span></button></div><div><span class="preference-icon">${icon('logout')}</span><div><strong>Akun</strong><small>Keluar dari sesi FinZ ini</small></div><button class="button button-quiet" data-action="logout">Keluar</button></div></div></article>
    <article class="card profile-side"><div class="profile-side-icon">${icon('sparkle')}</div><span class="eyebrow">SMALL STEPS, BIG CLARITY</span><h2>Melek uang nggak harus ribet.</h2><p>FinZ bantu kamu melihat kemana uang pergi, tanpa bikin setiap keputusan terasa seperti ujian.</p><div class="profile-side-line"></div><small>Versi lokal · 1.0.0</small></article></section>`;
  renderShell(content);
}

function render() {
  if (!state.user) return renderAuth();
  document.documentElement.dataset.theme = theme;
  if (view === 'transactions') return renderTransactions();
  if (view === 'wishlist') return renderWishlist();
  if (view === 'profile') return renderProfile();
  return renderDashboard();
}

function modal(title, subtitle, body, footer = '') {
  $('#modal-root').innerHTML = `<div class="modal-backdrop" data-action="backdrop-close"><section class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><button class="icon-button modal-close" data-action="close-modal" aria-label="Tutup">${icon('close')}</button><div class="modal-header"><span class="modal-mark">${icon('sparkle')}</span><h2>${title}</h2><p>${subtitle}</p></div>${body}${footer}</section></div>`;
  $('.modal-backdrop').addEventListener('mousedown', e => { if (e.target === e.currentTarget) closeModal(); });
}
function closeModal() { $('#modal-root').innerHTML = ''; }
function openBudgetModal() {
  const existing = budgetOf(selectedMonth);
  const body = `<form id="budget-form" class="form-stack modal-form"><label>Bulan anggaran<div class="input-wrap">${icon('calendar')}<input type="month" name="month" value="${selectedMonth}" required /></div></label><label>Saldo awal bulan<div class="input-wrap currency-input"><span>Rp</span><input name="amount" type="number" min="1" step="1" value="${existing?.startingBalance || ''}" placeholder="Contoh: 3500000" required /></div><small class="field-help">Masukkan dana awal yang tersedia. Top-up berikutnya dicatat terpisah.</small></label><div class="modal-actions"><button type="button" class="button button-quiet" data-action="close-modal">Batal</button><button class="button button-primary" type="submit">Simpan saldo</button></div></form>`;
  modal('Saldo awal bulanan', 'Mulai dengan angka yang realistis. Kamu bisa mengubahnya kapan saja.', body);
}
function openTransactionModal(type = 'EXPENSE_NON_CONSUMABLE') {
  const isIncome = type === 'INCOME';
  const modeButtons = isIncome ? '' : `<div class="segmented-control"><button type="button" class="segment ${type === 'EXPENSE_CONSUMABLE' ? 'selected' : ''}" data-tx-type="EXPENSE_CONSUMABLE">Konsumsi</button><button type="button" class="segment ${type === 'EXPENSE_NON_CONSUMABLE' ? 'selected' : ''}" data-tx-type="EXPENSE_NON_CONSUMABLE">Non-konsumsi</button></div>`;
  const dynamic = type === 'EXPENSE_CONSUMABLE' ? `<div class="field-pair"><label>Merek <span class="optional">Opsional</span><div class="input-wrap">${icon('bag')}<input name="brand" maxlength="50" placeholder="Mis. Skintific" /></div></label><label>Netto / ukuran <span class="optional">Opsional</span><div class="input-wrap">${icon('edit')}<input name="netWeight" maxlength="40" placeholder="Mis. 100 ml" /></div></label></div><label>Estimasi lama pemakaian<div class="input-wrap">${icon('clock')}<input name="usageDays" type="number" min="1" max="3650" value="30" required /><span class="input-suffix">hari</span></div><small class="field-help">Biaya per hari dan prediksi restock dihitung otomatis.</small></label>` : type === 'EXPENSE_NON_CONSUMABLE' ? `<label>Kategori<div class="input-wrap">${icon('grid')}<select name="category"><option>Lifestyle</option><option>Tagihan</option><option>Transportasi</option><option>Hiburan</option><option>Hangout</option><option>Langganan</option><option>Fashion</option><option>Kesehatan</option><option>Pendidikan</option><option>Lainnya</option></select></div></label>` : `<div class="callout-soft">${icon('arrowDown')}<span>Saldo akan ditambahkan ke budget bulan transaksi.</span></div>`;
  const body = `<form id="transaction-form" class="form-stack modal-form"><input type="hidden" name="type" value="${type}" />${modeButtons}
    <label>${isIncome ? 'Sumber saldo' : 'Nama barang / transaksi'}<div class="input-wrap">${icon(isIncome ? 'arrowDown' : 'receipt')}<input name="title" maxlength="90" placeholder="${isIncome ? 'Mis. Top-up tabungan' : type === 'EXPENSE_CONSUMABLE' ? 'Mis. Sunscreen' : 'Mis. Makan siang'}" required /></div></label>
    <label>${isIncome ? 'Jumlah saldo' : 'Nominal'}<div class="input-wrap currency-input"><span>Rp</span><input name="amount" type="number" min="1" step="1" placeholder="0" required /></div></label>${dynamic}
    ${isIncome ? '' : `<label>Nama toko / tempat pembelian<div class="input-wrap">${icon('bag')}<input name="merchantName" maxlength="80" placeholder="Mis. Guardian, Indomaret, Tokopedia" required /></div></label>`}
    <label>Tanggal & waktu<div class="input-wrap">${icon('calendar')}<input name="timestamp" type="datetime-local" step="1" value="${localInputTime()}" required /></div></label><small class="field-help date-hint">Tanggal dan waktu tersimpan otomatis. Kamu bisa ubah jika baru mencatat transaksi lama.</small>
    <div class="modal-actions"><button type="button" class="button button-quiet" data-action="close-modal">Batal</button><button class="button button-primary" type="submit">${isIncome ? 'Tambah saldo' : 'Simpan transaksi'}</button></div></form>`;
  modal(isIncome ? 'Top-up saldo' : 'Catat pengeluaran', isIncome ? 'Saldo bertambah begitu kamu menyimpan catatan ini.' : 'Satu catatan kecil bikin gambaran finansialmu makin jelas.', body);
}
function openWishModal() {
  const body = `<form id="wishlist-form" class="form-stack modal-form"><label>Barang yang kamu pengin<div class="input-wrap">${icon('heart')}<input name="title" maxlength="90" placeholder="Mis. Headphone baru" required /></div></label><label>Perkiraan harga<div class="input-wrap currency-input"><span>Rp</span><input name="amount" type="number" min="1" step="1" placeholder="0" required /></div></label><label>Kategori<div class="input-wrap">${icon('grid')}<select name="category"><option>Lifestyle</option><option>Fashion</option><option>Gadget</option><option>Hobi</option><option>Lainnya</option></select></div></label><label>Kenapa pengin? <span class="optional">Opsional</span><div class="input-wrap textarea-wrap"><textarea name="note" maxlength="180" rows="2" placeholder="Biar dua hari lagi kamu ingat alasannya..."></textarea></div></label><div class="modal-actions"><button type="button" class="button button-quiet" data-action="close-modal">Batal</button><button class="button button-primary" type="submit">Mulai cooldown ${icon('clock')}</button></div></form>`;
  modal('Tahan dulu sebentar', 'Wishlist akan terkunci selama 48 jam sebelum bisa ditandai dibeli.', body);
}
function openWishPurchaseModal(id) {
  const body = `<form id="wish-purchase-form" class="form-stack modal-form"><input type="hidden" name="id" value="${esc(id)}" /><label>Nama toko / tempat pembelian<div class="input-wrap">${icon('bag')}<input name="merchantName" maxlength="80" placeholder="Mis. Tokopedia, Uniqlo, toko dekat rumah" required /></div></label><p class="field-help">Pembelian ini akan langsung tercatat sebagai pengeluaran.</p><div class="modal-actions"><button type="button" class="button button-quiet" data-action="close-modal">Batal</button><button class="button button-primary" type="submit">Konfirmasi pembelian</button></div></form>`;
  modal('Sudah memutuskan?', 'Catat di mana kamu membeli barang ini supaya riwayatnya lengkap.', body);
}
function openProfileModal() {
  const body = `<form id="profile-form" class="form-stack modal-form"><div class="photo-picker-row"><div id="avatar-preview">${avatar(state.user, 'profile-large')}</div><label class="button button-soft upload-button">${icon('image')}Pilih foto<input type="file" name="photo" accept="image/png,image/jpeg,image/webp,image/gif" hidden /></label><small>Maks. 2 MB. JPG, PNG, WebP, atau GIF.</small></div><label>Username<div class="input-wrap">${icon('user')}<input name="username" minlength="2" maxlength="32" value="${esc(state.user.username)}" required /></div></label><div class="modal-actions"><button type="button" class="button button-quiet" data-action="close-modal">Batal</button><button class="button button-primary" type="submit">Simpan perubahan</button></div></form>`;
  modal('Edit profil', 'Biar FinZ terasa lebih personal.', body);
}

function openInstallModal() {
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const steps = isIOS
    ? '<ol class="install-steps"><li>Buka FinZ lewat <strong>Safari</strong>.</li><li>Ketuk tombol <strong>Bagikan</strong> (ikon kotak dengan panah ke atas).</li><li>Pilih <strong>Tambahkan ke Layar Utama</strong>, lalu ketuk <strong>Tambah</strong>.</li></ol>'
    : '<ol class="install-steps"><li>Buka menu browser <strong>⋮</strong> di Chrome atau browser yang mendukung.</li><li>Pilih <strong>Install app</strong> atau <strong>Add to Home screen</strong>.</li><li>Konfirmasi pemasangan. FinZ akan muncul di layar utama.</li></ol>';
  modal('Bawa FinZ ke layar utama', isIOS ? 'Pasang FinZ dari Safari agar tampil seperti aplikasi iPhone.' : 'Pasang FinZ agar bisa dibuka langsung dari layar utama.', `${steps}<div class="install-note">Instalasi membutuhkan alamat FinZ yang aman (HTTPS) dan servernya harus tetap online agar data akun bisa dimuat.</div><div class="modal-actions"><button type="button" class="button button-primary" data-action="close-modal">Mengerti</button></div>`);
}

async function refresh() { const data = await api.state(); Object.assign(state, data); render(); }
function setView(key) { view = key; closeModal(); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }

document.addEventListener('click', async event => {
  const viewButton = event.target.closest('[data-view]');
  if (viewButton) { event.preventDefault(); setView(viewButton.dataset.view); return; }
  const txType = event.target.closest('[data-tx-type]');
  if (txType) { openTransactionModal(txType.dataset.txType); return; }
  const button = event.target.closest('[data-action]'); if (!button) return;
  const action = button.dataset.action;
  if (action === 'auth-switch') { authMode = authMode === 'login' ? 'register' : 'login'; renderAuth(); }
  if (action === 'theme-toggle') { theme = theme === 'light' ? 'dark' : 'light'; localStorage.setItem('finz-theme', theme); render(); }
  if (action === 'set-budget') openBudgetModal();
  if (action === 'add-expense') openTransactionModal();
  if (action === 'topup') openTransactionModal('INCOME');
  if (action === 'add-wish') openWishModal();
  if (action === 'edit-profile') openProfileModal();
  if (action === 'install-app') {
    if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) { toast('FinZ sudah dipasang di perangkat ini.'); return; }
    if (deferredInstallPrompt) {
      try {
        deferredInstallPrompt.prompt();
        const result = await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        if (result?.outcome === 'accepted') toast('FinZ sedang dipasang.');
      } catch { openInstallModal(); }
    } else openInstallModal();
  }
  if (action === 'close-modal' || (action === 'backdrop-close' && event.target === button)) closeModal();
  if (action === 'logout') {
    try { await api.logout(); } catch {}
    state.user = null; state.budgets = {}; state.transactions = []; state.wishlist = []; authMode = 'login'; render();
  }
  if (action === 'delete-tx') {
    if (!confirm('Hapus transaksi ini? Saldo akan dihitung ulang.')) return;
    try { await api.deleteTransaction(button.dataset.id); await refresh(); toast('Transaksi dihapus.'); } catch (error) { toast(error.message, 'error'); }
  }
  if (action === 'delete-wish') {
    if (!confirm('Hapus barang ini dari wishlist?')) return;
    try { await api.deleteWishlist(button.dataset.id); await refresh(); toast('Wishlist dihapus.'); } catch (error) { toast(error.message, 'error'); }
  }
  if (action === 'wish-purchase') {
    openWishPurchaseModal(button.dataset.id);
  }
});

document.addEventListener('change', async event => {
  if (event.target.id === 'month-picker') { selectedMonth = event.target.value || monthNow(); render(); }
  if (event.target.name === 'photo') {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { event.target.value = ''; return toast('Ukuran foto maksimal 2 MB.', 'error'); }
    const reader = new FileReader(); reader.onload = () => { const target = $('#avatar-preview'); if (target) target.innerHTML = `<img class="avatar profile-large" src="${reader.result}" alt="Preview foto profil" />`; }; reader.readAsDataURL(file);
  }
});

document.addEventListener('submit', async event => {
  const form = event.target; event.preventDefault(); const data = new FormData(form);
  try {
    if (form.id === 'auth-form') {
      const mode = data.get('mode');
      const payload = { email: data.get('email'), password: data.get('password'), ...(mode === 'register' ? { username: data.get('username') } : {}) };
      await (mode === 'register' ? api.register(payload) : api.login(payload));
      await refresh(); toast(mode === 'register' ? 'Akun FinZ-mu berhasil dibuat.' : 'Berhasil masuk. Hai lagi!');
    }
    if (form.id === 'budget-form') {
      await api.saveBudget({ month: data.get('month'), amount: Number(data.get('amount')) }); selectedMonth = data.get('month'); await refresh(); closeModal(); toast('Saldo awal tersimpan.');
    }
    if (form.id === 'transaction-form') {
      const type = data.get('type');
      const timestamp = new Date(data.get('timestamp')).toISOString();
      const payload = { type, title: data.get('title'), amount: Number(data.get('amount')), timestamp, ...(type === 'INCOME' ? {} : { merchantName: data.get('merchantName') }), ...(type === 'EXPENSE_CONSUMABLE' ? { brand: data.get('brand'), netWeight: data.get('netWeight'), usageDays: Number(data.get('usageDays')), category: 'Konsumsi' } : type === 'EXPENSE_NON_CONSUMABLE' ? { category: data.get('category') } : { category: 'Top-Up' }) };
      await api.addTransaction(payload); selectedMonth = monthForDate(timestamp); await refresh(); closeModal(); toast(type === 'INCOME' ? 'Saldo berhasil ditambahkan.' : 'Transaksi berhasil dicatat.');
    }
    if (form.id === 'wish-purchase-form') {
      await api.purchaseWishlist(data.get('id'), { merchantName: data.get('merchantName') }); await refresh(); closeModal(); toast('Pembelian tercatat beserta nama tokonya.');
    }
    if (form.id === 'wishlist-form') {
      await api.addWishlist({ title: data.get('title'), amount: Number(data.get('amount')), category: data.get('category'), note: data.get('note') }); await refresh(); closeModal(); toast('Wishlist masuk. Mulai cooldown 48 jam!');
    }
    if (form.id === 'profile-form') {
      const file = data.get('photo'); let photo = state.user.avatar;
      if (file?.size) photo = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
      await api.saveProfile({ username: data.get('username'), avatar: photo || null }); await refresh(); closeModal(); toast('Profil berhasil diperbarui.');
    }
  } catch (error) { toast(error.message, 'error'); }
});

document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });
setInterval(() => { if (view === 'wishlist' && state.user) render(); }, 60_000);

window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstallPrompt = event; });
window.addEventListener('appinstalled', () => { deferredInstallPrompt = null; toast('FinZ berhasil dipasang di perangkat ini.'); });
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(error => console.warn('FinZ app shell belum tersimpan offline:', error)));
}

document.documentElement.dataset.theme = theme;
api.state().then(data => { Object.assign(state, data); render(); }).catch(() => renderAuth());
