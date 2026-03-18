import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useApp } from '../App'
import { categoryAPI } from '../services/api'
import Alerts from './Alerts'

export default function Layout() {
  const { user, logout, cart, notifications, unreadCount, notifOpen, setNotifOpen, notifAPI: notifApiCtx, refreshNotifs } = useApp()
  const [search, setSearch] = useState('')
  const [categories, setCategories] = useState([])
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    categoryAPI.list().then(setCategories).catch(() => {})
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (search.trim()) navigate(`/search?q=${encodeURIComponent(search.trim())}`)
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const itemCount = cart?.item_count || 0

  return (
    <>
      {/* Top Bar */}
      <div className="topbar">
        <div className="container">
          <div className="topbar-links">
            <a href="tel:+254700000000"><i className="bi bi-telephone" /> +254 700 000 000</a>
            <a href="mailto:support@mgobal.co.ke"><i className="bi bi-envelope" /> support@mgobal.co.ke</a>
          </div>
          <div className="topbar-links">
            {user ? (
              <>
                <span>Hi, {user.first_name || user.username}</span>
                <a onClick={handleLogout} style={{ cursor: 'pointer' }}>Logout</a>
              </>
            ) : (
              <>
                <Link to="/login">Sign In</Link>
                <Link to="/register">Register</Link>
              </>
            )}
            <a href="#">Track Order</a>
          </div>
        </div>
      </div>

      {/* Navbar */}
      <nav className="navbar">
        <div className="container">
          <Link to="/" className="navbar-brand">mg<span>o</span>bal</Link>

          <form className="navbar-search hide-mobile" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search for products, brands, categories..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button type="submit" className="search-btn"><i className="bi bi-search" /></button>
          </form>

          <div className="navbar-actions">
            {user ? (
              <Link to="/account" className="nav-action hide-mobile">
                <i className="bi bi-person-circle" />
                <span>Account</span>
              </Link>
            ) : (
              <Link to="/login" className="nav-action hide-mobile">
                <i className="bi bi-person" />
                <span>Sign In</span>
              </Link>
            )}

            {user && (
              <button className="nav-action" onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) refreshNotifs(); }}>
                <i className="bi bi-bell" />
                <span className="hide-mobile">Alerts</span>
                {unreadCount > 0 && <span className="badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>
            )}

            <Link to="/cart" className="nav-action">
              <i className="bi bi-bag" />
              <span className="hide-mobile">Cart</span>
              {itemCount > 0 && <span className="badge">{itemCount > 9 ? '9+' : itemCount}</span>}
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile Search */}
      <div style={{ background: 'var(--primary)', padding: '8px 16px 10px' }} className="show-mobile">
        <form onSubmit={handleSearch} style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', height: '38px', borderRadius: 'var(--radius-full)',
              border: 'none', padding: '0 44px 0 14px', fontSize: '14px',
              background: 'rgba(255,255,255,.15)', color: 'white'
            }}
          />
          <button type="submit" style={{
            position: 'absolute', right: 0, top: 0, width: '44px', height: '100%',
            background: 'var(--accent)', borderRadius: '0 var(--radius-full) var(--radius-full) 0',
            color: 'var(--primary)', fontSize: '17px', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <i className="bi bi-search" />
          </button>
        </form>
      </div>

      {/* Category Bar */}
      <div className="catbar">
        <div className="container">
          <Link to="/products" className={`catbar-item ${location.pathname === '/products' && !new URLSearchParams(location.search).get('category') ? 'active' : ''}`}>
            <i className="bi bi-grid-3x3-gap" /> All
          </Link>
          {categories.map(cat => (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className={`catbar-item ${location.pathname === `/category/${cat.slug}` ? 'active' : ''}`}
            >
              {cat.icon && <i className={`bi bi-${cat.icon}`} />}
              {cat.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Notification Panel */}
      {notifOpen && <NotifPanel notifications={notifications} onClose={() => setNotifOpen(false)} />}

      {/* Main Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <div className="footer-brand">mg<span>o</span>bal</div>
              <p className="footer-desc">Kenya's premier online shopping destination. Millions of products. Nationwide delivery to all 47 counties with convenient pickup stations.</p>
              <div className="footer-social" style={{ marginTop: 20 }}>
                <a href="#"><i className="bi bi-facebook" /></a>
                <a href="#"><i className="bi bi-twitter-x" /></a>
                <a href="#"><i className="bi bi-instagram" /></a>
                <a href="#"><i className="bi bi-tiktok" /></a>
              </div>
            </div>
            <div>
              <div className="footer-heading">Help</div>
              <div className="footer-links">
                <a href="#">Help Center</a>
                <a href="#">How to Order</a>
                <a href="#">Track Your Order</a>
                <a href="#">Returns & Refunds</a>
                <a href="#">Report a Product</a>
              </div>
            </div>
            <div>
              <div className="footer-heading">About Mgobal</div>
              <div className="footer-links">
                <a href="#">About Us</a>
                <a href="#">Careers</a>
                <a href="#">Press</a>
                <a href="#">Privacy Policy</a>
                <a href="#">Terms of Service</a>
              </div>
            </div>
            <div>
              <div className="footer-heading">Sell on Mgobal</div>
              <div className="footer-links">
                <a href="#">Vendor Portal</a>
                <a href="#">Seller Guidelines</a>
                <a href="#">Fees & Commissions</a>
              </div>
              <div className="footer-heading" style={{ marginTop: 20 }}>Payment Methods</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {['M-Pesa', 'Visa', 'Mastercard'].map(m => (
                  <span key={m} style={{ background: 'rgba(255,255,255,.1)', padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 11, color: 'rgba(255,255,255,.7)' }}>{m}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Mgobal Limited. All rights reserved.</span>
            <span>🇰🇪 Made in Kenya</span>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-nav">
        <Link to="/" className={`mobile-nav-item ${location.pathname === '/' ? 'active' : ''}`}>
          <i className="bi bi-house" /><span>Home</span>
        </Link>
        <Link to="/products" className={`mobile-nav-item ${location.pathname === '/products' ? 'active' : ''}`}>
          <i className="bi bi-grid" /><span>Shop</span>
        </Link>
        <Link to="/cart" className={`mobile-nav-item ${location.pathname === '/cart' ? 'active' : ''}`} style={{ position: 'relative' }}>
          <i className="bi bi-bag" />
          {itemCount > 0 && <span className="badge" style={{ position: 'absolute', top: 0, right: '50%', transform: 'translateX(12px)' }}>{itemCount}</span>}
          <span>Cart</span>
        </Link>
        <Link to="/orders" className={`mobile-nav-item ${location.pathname.startsWith('/orders') ? 'active' : ''}`}>
          <i className="bi bi-box-seam" /><span>Orders</span>
        </Link>
        <Link to="/account" className={`mobile-nav-item ${location.pathname.startsWith('/account') ? 'active' : ''}`}>
          <i className="bi bi-person" /><span>Account</span>
        </Link>
      </nav>

      {/* Toasts */}
      <Alerts />
    </>
  )
}

function NotifPanel({ notifications, onClose }) {
  const { notifAPI: api } = useApp()
  const icons = { order_update: 'bi-bag-check', promo: 'bi-tag', flash_sale: 'bi-lightning', system: 'bi-info-circle' }

  return (
    <div className="notif-panel">
      <div className="notif-header">
        <span>Notifications</span>
        <button onClick={onClose}><i className="bi bi-x-lg" /></button>
      </div>
      <div className="notif-list">
        {notifications.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--gray-400)' }}>
            <i className="bi bi-bell-slash" style={{ fontSize: 32 }} /><br />No notifications yet
          </div>
        ) : notifications.map(n => (
          <div key={n.id} className={`notif-item ${!n.is_read ? 'unread' : ''}`}>
            <i className={`bi ${icons[n.type] || 'bi-bell'} notif-icon`} style={{ color: 'var(--primary)' }} />
            <div>
              <div className="notif-title">{n.title}</div>
              <div className="notif-body">{n.message}</div>
              <div className="notif-time">{new Date(n.created_at).toLocaleDateString()}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}