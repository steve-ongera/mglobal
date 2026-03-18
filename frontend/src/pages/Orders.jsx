import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { orderAPI } from '../services/api'
import { useApp } from '../App'

const STATUS_META = {
  pending: { label: 'Pending', icon: 'bi-hourglass', cls: 'status-pending' },
  confirmed: { label: 'Confirmed', icon: 'bi-check-circle', cls: 'status-confirmed' },
  processing: { label: 'Processing', icon: 'bi-gear', cls: 'status-processing' },
  shipped: { label: 'Shipped', icon: 'bi-truck', cls: 'status-shipped' },
  out_for_delivery: { label: 'Out for Delivery', icon: 'bi-bicycle', cls: 'status-out_for_delivery' },
  delivered: { label: 'Delivered', icon: 'bi-check-all', cls: 'status-delivered' },
  cancelled: { label: 'Cancelled', icon: 'bi-x-circle', cls: 'status-cancelled' },
  returned: { label: 'Returned', icon: 'bi-arrow-counterclockwise', cls: 'status-returned' },
  refunded: { label: 'Refunded', icon: 'bi-arrow-repeat', cls: 'status-returned' },
}

export default function Orders() {
  const { user } = useApp()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    document.title = 'My Orders — Mgobal'
    if (!user) { navigate('/login'); return }
    orderAPI.list().then(setOrders).catch(() => {}).finally(() => setLoading(false))
  }, [user])

  const tabs = [
    { key: 'all', label: 'All Orders' },
    { key: 'pending', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'processing', label: 'Processing' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' },
  ]

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  if (loading) return <div className="loading-center" style={{ minHeight: '60vh' }}><div className="spinner" /></div>

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: 900 }}>
        <div className="breadcrumb">
          <Link to="/">Home</Link> <i className="bi bi-chevron-right" />
          <Link to="/account">Account</Link> <i className="bi bi-chevron-right" />
          <span>My Orders</span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, marginBottom: 20 }}>
          My Orders <span style={{ color: 'var(--primary)' }}>({orders.length})</span>
        </h1>

        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto', background: 'var(--white)', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)', marginBottom: 20, scrollbarWidth: 'none' }}>
          {tabs.map(t => {
            const count = t.key === 'all' ? orders.length : orders.filter(o => o.status === t.key).length
            return (
              <button key={t.key}
                onClick={() => setFilter(t.key)}
                style={{
                  padding: '12px 16px', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 600,
                  borderBottom: filter === t.key ? '2px solid var(--primary)' : '2px solid transparent',
                  color: filter === t.key ? 'var(--primary)' : 'var(--gray-600)',
                  display: 'flex', alignItems: 'center', gap: 6, background: 'none',
                  transition: 'all 0.2s'
                }}>
                {t.label}
                {count > 0 && <span style={{ background: filter === t.key ? 'var(--primary)' : 'var(--gray-200)', color: filter === t.key ? 'white' : 'var(--gray-600)', padding: '1px 7px', borderRadius: 'var(--radius-full)', fontSize: 11 }}>{count}</span>}
              </button>
            )
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <i className="bi bi-box-seam" />
            <h3>{filter === 'all' ? 'No orders yet' : `No ${filter} orders`}</h3>
            <p>Start shopping to see your orders here</p>
            <Link to="/products" className="btn btn-primary">Shop Now</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(order => {
              const meta = STATUS_META[order.status] || STATUS_META.pending
              const firstItem = order.items?.[0]
              return (
                <div key={order.id} className="card" style={{ cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                  onClick={() => navigate(`/orders/${order.id}`)}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                  {/* Order Header */}
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{order.order_number}</span>
                    <span className={`order-status-badge ${meta.cls}`}>
                      <i className={`bi ${meta.icon}`} /> {meta.label}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--gray-500)' }}>
                      {new Date(order.created_at).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  {/* Items Preview */}
                  <div style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {order.items?.slice(0, 3).map((item, i) => (
                        <div key={i} style={{ width: 56, height: 56, border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--gray-50)' }}>
                          <img src={item.image || 'https://placehold.co/56x56/f3f4f6/9ca3af?text=Item'} alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}
                            onError={e => e.target.src = 'https://placehold.co/56x56/f3f4f6/9ca3af?text=Item'} />
                        </div>
                      ))}
                      {order.items?.length > 3 && (
                        <div style={{ width: 56, height: 56, border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', background: 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: 'var(--gray-500)' }}>
                          +{order.items.length - 3}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>
                        {firstItem?.product_name?.slice(0, 50)}{order.items?.length > 1 ? ` +${order.items.length - 1} more` : ''}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 3 }}>
                        {order.delivery_type === 'pickup' ? <><i className="bi bi-geo-alt" /> Pickup Station</> : <><i className="bi bi-house" /> Home Delivery</>}
                        {' · '}
                        <span style={{ textTransform: 'uppercase' }}>{order.payment_method}</span>
                        {' · '}
                        <span style={{ color: order.payment_status === 'paid' ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
                          {order.payment_status === 'paid' ? '✓ Paid' : order.payment_status}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--primary)' }}>
                        KSh {parseFloat(order.total).toLocaleString()}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        View Details <i className="bi bi-chevron-right" />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}