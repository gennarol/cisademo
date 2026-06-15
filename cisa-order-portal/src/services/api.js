import { API_BASE_URL } from '../config/featureFlags';

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `API error: ${res.status}`);
  }
  return res.json();
}

export const ordersApi = {
  getAll: () => request('/orders'),

  getById: (orderId) => request(`/orders/${orderId}`),

  create: (order) => request('/orders', {
    method: 'POST',
    body: JSON.stringify(order),
  }),

  update: (orderId, updates) => request(`/orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  }),

  updateLine: (orderId, lineId, updates) => request(`/orders/${orderId}/lines/${lineId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  }),

  approve: (orderId) => request(`/orders/${orderId}/approve`, {
    method: 'POST',
  }),

  sendToD365: (orderId) => request(`/orders/${orderId}/send-to-d365`, {
    method: 'POST',
  }),

  requestCorrection: (orderId, message, channel) => request(`/orders/${orderId}/request-correction`, {
    method: 'POST',
    body: JSON.stringify({ message, channel }),
  }),

  seed: () => request('/seed', { method: 'POST' }),

  init: () => request('/init', { method: 'POST' }),
};
