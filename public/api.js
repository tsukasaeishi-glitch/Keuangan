const request = async (path, options = {}) => {
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Ada kendala. Coba lagi.');
  return payload;
};

export const api = {
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  state: () => request('/state'),
  saveProfile: (data) => request('/profile', { method: 'PUT', body: JSON.stringify(data) }),
  saveBudget: (data) => request('/budget', { method: 'PUT', body: JSON.stringify(data) }),
  addTransaction: (data) => request('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),
  addWishlist: (data) => request('/wishlist', { method: 'POST', body: JSON.stringify(data) }),
  deleteWishlist: (id) => request(`/wishlist/${id}`, { method: 'DELETE' }),
  purchaseWishlist: (id, data) => request(`/wishlist/${id}/purchase`, { method: 'PATCH', body: JSON.stringify(data) }),
};
