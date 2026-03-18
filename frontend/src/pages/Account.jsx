import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../App'

export default function Account() {
  const { user, logout, cart, notifications } = useApp()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const unreadNotifs = notifications?.filter(n => !n.is_read).length || 0

  const menuItems = [
    { path: '/account/profile', icon: 'bi-person', label: 'My Profile' },
    { path: '/orders', icon: 'bi-box-seam', label: 'My Orders', badge: null },
    { path: '/account', icon: 'bi-heart', label: 'Wishlist', exact: true },
    { path: '/account', icon: 'bi-geo-alt', label: 'Addresses', exact: true },
    { path: '/account', icon: 'bi-bell', label: 'Notifications', badge: unreadNotifs || null, exact: true },
    { path: '/account', icon: 'bi-shield-check', label: 'Security', exact: true },
  ]

  const initials = user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.username?.[0]?.toUpperCase() : '?'

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="breadcrumb">
          <Link to="/">Home</Link> <i className="bi bi-chevron-right" />
          <span>My Account</span>
        </div>

        <div className="page-two-col">
          {/* Sidebar */}
          <div>
            <div className="profile-sidebar">
              <div className="profile-user">
                <div className="profile-avatar">{initials}</div>
                <div className="profile-name">{user?.first_name} {user?.last_name}</div>
                <div className="profile-email">{user?.email}</div>
              </div>
              <div className="profile-menu">
                {menuItems.map(item => (
                  <Link key={item.label} to={item.path}
                    className={`profile-menu-item ${location.pathname === item.path ? 'active' : ''}`}>
                    <i className={`bi ${item.icon}`} />
                    {item.label}
                    {item.badge > 0 && <span className="badge-count">{item.badge}</span>}
                    <i className="bi bi-chevron-right" style={{ marginLeft: 'auto', fontSize: 12, opacity: .4 }} />
                  </Link>
                ))}
                <button className="profile-menu-item" onClick={handleLogout} style={{ width: '100%', textAlign: 'left', color: 'var(--danger)' }}>
                  <i className="bi bi-box-arrow-right" /> Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div>
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}