const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// ── Token helpers ────────────────────────────────────────────────────────────

export const getToken = () => localStorage.getItem('access_token')
export const setTokens = (access, refresh) => {
  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)
}
export const clearTokens = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
}

// ── Core fetch ────────────────────────────────────────────────────────────────

async function request(endpoint, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const resp = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (resp.status === 401) {
    // Try refresh
    const refreshed = await refreshToken()
    if (!refreshed) {
      clearTokens()
      window.location.href = '/login'
      return
    }
    // Retry with new token
    headers.Authorization = `Bearer ${getToken()}`
    const retry = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers })
    if (!retry.ok) throw await retry.json()
    return retry.status === 204 ? null : retry.json()
  }

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Request failed' }))
    throw err
  }

  if (resp.status === 204) return null
  return resp.json()
}

async function refreshToken() {
  const refresh = localStorage.getItem('refresh_token')
  if (!refresh) return false
  try {
    const resp = await fetch(`${BASE_URL.replace('/api', '')}/api/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
    if (!resp.ok) return false
    const data = await resp.json()
    localStorage.setItem('access_token', data.access)
    return true
  } catch {
    return false
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authAPI = {
  register: (data) => request('/auth/register/', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login/', { method: 'POST', body: JSON.stringify(data) }),
}

// ── Profile ───────────────────────────────────────────────────────────────────

export const profileAPI = {
  me: () => request('/profile/me/'),
  update: (data) => request('/profile/me/', { method: 'PATCH', body: JSON.stringify(data) }),
  updateFcm: (token) => request('/profile/update_fcm/', { method: 'POST', body: JSON.stringify({ fcm_token: token }) }),
}

// ── Products ──────────────────────────────────────────────────────────────────

export const productAPI = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/products/${q ? '?' + q : ''}`)
  },
  detail: (slug) => request(`/products/${slug}/`),
  featured: () => request('/products/featured/'),
  flashSale: () => request('/products/flash-sale/'),
  search: (q) => request(`/products/search/?q=${encodeURIComponent(q)}`),
  addReview: (slug, data) => request(`/products/${slug}/reviews/`, { method: 'POST', body: JSON.stringify(data) }),
  reviews: (slug) => request(`/products/${slug}/reviews/`),
}

// ── Categories ────────────────────────────────────────────────────────────────

export const categoryAPI = {
  list: () => request('/categories/'),
  detail: (slug) => request(`/categories/${slug}/`),
  all: () => request('/categories/all/'),
}

// ── Brands ────────────────────────────────────────────────────────────────────

export const brandAPI = {
  list: () => request('/brands/'),
}

// ── Cart ──────────────────────────────────────────────────────────────────────

export const cartAPI = {
  get: () => request('/cart/'),
  add: (productId, quantity = 1, variantId = null) =>
    request('/cart/add/', { method: 'POST', body: JSON.stringify({ product_id: productId, quantity, variant_id: variantId }) }),
  update: (itemId, quantity) =>
    request('/cart/update_item/', { method: 'PATCH', body: JSON.stringify({ item_id: itemId, quantity }) }),
  remove: (itemId) => request(`/cart/remove_item/?item_id=${itemId}`, { method: 'DELETE' }),
  clear: () => request('/cart/clear/', { method: 'DELETE' }),
}

// ── Wishlist ──────────────────────────────────────────────────────────────────

export const wishlistAPI = {
  list: () => request('/wishlist/'),
  toggle: (productId) => request('/wishlist/toggle/', { method: 'POST', body: JSON.stringify({ product_id: productId }) }),
}

// ── Counties & Pickup ─────────────────────────────────────────────────────────

export const locationAPI = {
  counties: () => request('/counties/'),
  pickupStations: (countyId) => request(`/pickup-stations/?county=${countyId}`),
}

// ── Addresses ─────────────────────────────────────────────────────────────────

export const addressAPI = {
  list: () => request('/addresses/'),
  create: (data) => request('/addresses/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/addresses/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => request(`/addresses/${id}/`, { method: 'DELETE' }),
}

// ── Orders ────────────────────────────────────────────────────────────────────

export const orderAPI = {
  list: () => request('/orders/'),
  detail: (id) => request(`/orders/${id}/`),
  create: (data) => request('/orders/create_order/', { method: 'POST', body: JSON.stringify(data) }),
  cancel: (id) => request(`/orders/${id}/cancel/`, { method: 'POST' }),
}

// ── Coupon ────────────────────────────────────────────────────────────────────

export const couponAPI = {
  validate: (code, total) => request('/coupon/validate/', { method: 'POST', body: JSON.stringify({ code, total }) }),
}

// ── Notifications ─────────────────────────────────────────────────────────────

export const notifAPI = {
  list: () => request('/notifications/'),
  markRead: (ids = []) => request('/notifications/mark_read/', { method: 'POST', body: JSON.stringify({ ids }) }),
  unreadCount: () => request('/notifications/unread_count/'),
}

// ── Banners ───────────────────────────────────────────────────────────────────

export const bannerAPI = {
  list: () => request('/banners/'),
}