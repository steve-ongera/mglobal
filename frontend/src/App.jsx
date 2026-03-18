import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { cartAPI, notifAPI, setTokens, clearTokens } from './services/api'

// ── Context ───────────────────────────────────────────────────────────────────
export const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

// ── Pages ─────────────────────────────────────────────────────────────────────
import Layout from './components/Layout'
import Home from './pages/index'
import Login from './pages/Login'
import Register from './pages/Register'
import ProductList from './pages/ProductList'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Profile from './pages/Profile'
import Account from './pages/Account'
import Category from './pages/Category'
import SearchResults from './pages/SearchResults'

function PrivateRoute({ children }) {
  const { user } = useApp()
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [cart, setCart] = useState({ items: [], total: 0, item_count: 0 })
  const [wishlist, setWishlist] = useState([])
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [toasts, setToasts] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)

  const login = (userData, tokens) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
    setTokens(tokens.access, tokens.refresh)
  }

  const logout = () => {
    setUser(null)
    clearTokens()
    setCart({ items: [], total: 0, item_count: 0 })
    setWishlist([])
  }

  const toast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  const refreshCart = useCallback(async () => {
    if (!user) return
    try {
      const data = await cartAPI.get()
      setCart(data)
    } catch {}
  }, [user])

  const refreshNotifs = useCallback(async () => {
    if (!user) return
    try {
      const [notifs, countData] = await Promise.all([notifAPI.list(), notifAPI.unreadCount()])
      setNotifications(notifs)
      setUnreadCount(countData.count)
    } catch {}
  }, [user])

  useEffect(() => {
    if (user) {
      refreshCart()
      refreshNotifs()
    }
  }, [user, refreshCart, refreshNotifs])

  const ctx = {
    user, login, logout,
    cart, setCart, refreshCart,
    wishlist, setWishlist,
    notifications, refreshNotifs, unreadCount, setUnreadCount,
    notifOpen, setNotifOpen,
    toast, toasts,
  }

  return (
    <AppContext.Provider value={ctx}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="products" element={<ProductList />} />
            <Route path="products/:slug" element={<ProductDetail />} />
            <Route path="category/:slug" element={<Category />} />
            <Route path="search" element={<SearchResults />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<PrivateRoute><Checkout /></PrivateRoute>} />
            <Route path="orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
            <Route path="orders/:id" element={<PrivateRoute><OrderDetail /></PrivateRoute>} />
            <Route path="account" element={<PrivateRoute><Account /></PrivateRoute>}>
              <Route index element={<Profile />} />
              <Route path="profile" element={<Profile />} />
              <Route path="orders" element={<Orders />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  )
}