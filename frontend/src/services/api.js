const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

// ── Token helpers ─────────────────────────────────────────────────────────────

export const getToken  = () => localStorage.getItem('access_token')
export const setTokens = (access, refresh) => {
  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)
}
export const clearTokens = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
}

// ── Normalise API responses ────────────────────────────────────────────────────
// Django REST Framework returns paginated responses as { count, results: [] }
// or plain arrays depending on the view. This helper always returns an array.
export const toArr = (data) => {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.results)) return data.results
  return []
}

// ── Core fetch ────────────────────────────────────────────────────────────────

async function request(endpoint, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const resp = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers })

  if (resp.status === 401) {
    const refreshed = await _refreshToken()
    if (!refreshed) {
      clearTokens()
      window.location.href = '/login'
      return
    }
    headers.Authorization = `Bearer ${getToken()}`
    const retry = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers })
    if (!retry.ok) throw await retry.json().catch(() => ({ detail: 'Request failed' }))
    return retry.status === 204 ? null : retry.json()
  }

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: 'Request failed' }))
    throw err
  }

  if (resp.status === 204) return null
  return resp.json()
}

// Returns the raw paginated response (keeps count for pagination UI)
async function requestPaged(endpoint, options = {}) {
  return request(endpoint, options)
}

async function _refreshToken() {
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
  login:    (data) => request('/auth/login/',    { method: 'POST', body: JSON.stringify(data) }),
}

// ── Profile ───────────────────────────────────────────────────────────────────

export const profileAPI = {
  me:        ()     => request('/profile/me/'),
  update:    (data) => request('/profile/me/', { method: 'PATCH', body: JSON.stringify(data) }),
  updateFcm: (tok)  => request('/profile/update_fcm/', { method: 'POST', body: JSON.stringify({ fcm_token: tok }) }),
}

// ── Products ──────────────────────────────────────────────────────────────────
// list() keeps the raw paginated object so ProductList/Category pages can read .count
// featured / flashSale / search always return plain arrays

export const productAPI = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return requestPaged(`/products/${q ? '?' + q : ''}`)
  },
  detail:    (slug) => request(`/products/${slug}/`),
  featured:  ()     => request('/products/featured/').then(toArr),
  flashSale: ()     => request('/products/flash-sale/').then(toArr),
  search:    (q)    => request(`/products/search/?q=${encodeURIComponent(q)}`).then(toArr),
  addReview: (slug, data) => request(`/products/${slug}/reviews/`, { method: 'POST', body: JSON.stringify(data) }),
  reviews:   (slug) => request(`/products/${slug}/reviews/`).then(toArr),
}

// ── Categories ────────────────────────────────────────────────────────────────

export const categoryAPI = {
  list:   ()     => request('/categories/').then(toArr),
  detail: (slug) => request(`/categories/${slug}/`),
  all:    ()     => request('/categories/all/').then(toArr),
}

// ── Brands ────────────────────────────────────────────────────────────────────

export const brandAPI = {
  list: () => request('/brands/').then(toArr),
}

// ── Cart ──────────────────────────────────────────────────────────────────────

export const cartAPI = {
  get:    ()                                  => request('/cart/'),
  add:    (productId, quantity = 1, variantId = null) =>
    request('/cart/add/', { method: 'POST', body: JSON.stringify({ product_id: productId, quantity, variant_id: variantId }) }),
  update: (itemId, quantity) =>
    request('/cart/update_item/', { method: 'PATCH', body: JSON.stringify({ item_id: itemId, quantity }) }),
  remove: (itemId) => request(`/cart/remove_item/?item_id=${itemId}`, { method: 'DELETE' }),
  clear:  ()       => request('/cart/clear/', { method: 'DELETE' }),
}

// ── Wishlist ──────────────────────────────────────────────────────────────────

export const wishlistAPI = {
  list:   ()          => request('/wishlist/').then(toArr),
  toggle: (productId) => request('/wishlist/toggle/', { method: 'POST', body: JSON.stringify({ product_id: productId }) }),
}

// ── Counties & Pickup ─────────────────────────────────────────────────────────

export const locationAPI = {
  counties:       ()         => request('/counties/').then(toArr),
  pickupStations: (countyId) => request(`/pickup-stations/?county=${countyId}`).then(toArr),
}

// ── Addresses ─────────────────────────────────────────────────────────────────

export const addressAPI = {
  list:   ()        => request('/addresses/').then(toArr),
  create: (data)    => request('/addresses/',      { method: 'POST',   body: JSON.stringify(data) }),
  update: (id, data)=> request(`/addresses/${id}/`,{ method: 'PATCH',  body: JSON.stringify(data) }),
  delete: (id)      => request(`/addresses/${id}/`,{ method: 'DELETE' }),
}

// ── Orders ────────────────────────────────────────────────────────────────────

export const orderAPI = {
  list:   ()     => request('/orders/').then(toArr),
  detail: (id)   => request(`/orders/${id}/`),
  create: (data) => request('/orders/create_order/', { method: 'POST', body: JSON.stringify(data) }),
  cancel: (id)   => request(`/orders/${id}/cancel/`, { method: 'POST' }),
}

// ── Coupon ────────────────────────────────────────────────────────────────────

export const couponAPI = {
  validate: (code, total) => request('/coupon/validate/', { method: 'POST', body: JSON.stringify({ code, total }) }),
}

// ── Notifications ─────────────────────────────────────────────────────────────

export const notifAPI = {
  list:        ()       => request('/notifications/').then(toArr),
  markRead:    (ids=[]) => request('/notifications/mark_read/', { method: 'POST', body: JSON.stringify({ ids }) }),
  unreadCount: ()       => request('/notifications/unread_count/'),
}

// ── Banners ───────────────────────────────────────────────────────────────────

export const bannerAPI = {
  list: () => request('/banners/').then(toArr),
}