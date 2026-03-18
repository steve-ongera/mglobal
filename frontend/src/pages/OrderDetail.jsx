import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { orderAPI } from '../services/api'
import { useApp } from '../App'

const STEPS = [
  { key: 'pending', label: 'Order Placed', icon: 'bi-bag-check' },
  { key: 'confirmed', label: 'Confirmed', icon: 'bi-check-circle' },
  { key: 'processing', label: 'Processing', icon: 'bi-gear' },
  { key: 'shipped', label: 'Shipped', icon: 'bi-truck' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: 'bi-bicycle' },
  { key: 'delivered', label: 'Delivered', icon: 'bi-house-check' },
]

const STATUS_ORDER = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered']

export default function OrderDetail() {
  const { id } = useParams()
  const { toast } = useApp()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    orderAPI.detail(id).then(data => {
      setOrder(data)
      document.title = `Order ${data.order_number} — Mgobal`
    }).catch(() => navigate('/orders')).finally(() => setLoading(false))
  }, [id])

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return
    setCancelling(true)
    try {
      const updated = await orderAPI.cancel(id)
      setOrder(updated)
      toast('Order cancelled successfully', 'info')
    } catch (err) {
      toast(err?.error || 'Could not cancel order', 'error')
    } finally { setCancelling(false) }
  }

  if (loading) return <div className="loading-center" style={{ minHeight: '60vh' }}><div className="spinner" /></div>
  if (!order) return null

  const currentStepIdx = STATUS_ORDER.indexOf(order.status)
  const isCancelled = order.status === 'cancelled' || order.status === 'returned' || order.status === 'refunded'

  const InfoRow = ({ label, value, color }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--gray-100)', fontSize: 14 }}>
      <span style={{ color: 'var(--gray-500)' }}>{label}</span>
      <span style={{ fontWeight: 500, color: color || 'var(--gray-800)', textAlign: 'right' }}>{value}</span>
    </div>
  )

  return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: 960 }}>
        <div className="breadcrumb">
          <Link to="/">Home</Link> <i className="bi bi-chevron-right" />
          <Link to="/orders">Orders</Link> <i className="bi bi-chevron-right" />
          <span>{order.order_number}</span>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800 }}>{order.order_number}</h1>
            <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>
              Placed on {new Date(order.created_at).toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['pending', 'confirmed'].includes(order.status) && (
              <button className="btn btn-danger btn-sm" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? 'Cancelling...' : <><i className="bi bi-x-circle" /> Cancel Order</>}
              </button>
            )}
          </div>
        </div>

        {/* Tracking */}
        {!isCancelled && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header"><i className="bi bi-map" style={{ color: 'var(--primary)' }} /> Order Tracking</div>
            <div className="card-body">
              <div className="order-track">
                {STEPS.map((s, i) => {
                  const isDone = i < currentStepIdx
                  const isActive = i === currentStepIdx
                  return (
                    <div key={s.key} className="track-step">
                      <div className={`track-dot ${isDone ? 'done' : isActive ? 'active' : ''}`}>
                        <i className={`bi ${isDone ? 'bi-check' : s.icon}`} />
                      </div>
                      <div className="track-label" style={{ color: isActive ? 'var(--primary)' : isDone ? 'var(--success)' : 'var(--gray-400)', fontWeight: isActive ? 700 : 400 }}>
                        {s.label}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {isCancelled && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', padding: 16, marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
            <i className="bi bi-x-circle-fill" style={{ fontSize: 24, color: 'var(--danger)' }} />
            <div>
              <div style={{ fontWeight: 700 }}>Order {order.status.charAt(0).toUpperCase() + order.status.slice(1)}</div>
              <div style={{ fontSize: 13, color: 'var(--gray-600)', marginTop: 2 }}>This order has been {order.status}. {order.payment_status === 'paid' && 'A refund will be processed within 3–5 business days.'}</div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

            {/* Order Summary */}
            <div className="card">
              <div className="card-header"><i className="bi bi-receipt" /> Payment Summary</div>
              <div className="card-body">
                <InfoRow label="Subtotal" value={`KSh ${parseFloat(order.subtotal).toLocaleString()}`} />
                <InfoRow label="Delivery Fee" value={`KSh ${parseFloat(order.delivery_fee).toLocaleString()}`} />
                {parseFloat(order.discount_amount) > 0 && (
                  <InfoRow label="Discount" value={`- KSh ${parseFloat(order.discount_amount).toLocaleString()}`} color="var(--success)" />
                )}
                <InfoRow label="Total" value={`KSh ${parseFloat(order.total).toLocaleString()}`} color="var(--primary)" />
                <InfoRow label="Payment Method" value={order.payment_method.toUpperCase()} />
                <InfoRow
                  label="Payment Status"
                  value={order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                  color={order.payment_status === 'paid' ? 'var(--success)' : order.payment_status === 'failed' ? 'var(--danger)' : 'var(--warning)'}
                />
                {order.mpesa_transaction_id && (
                  <InfoRow label="M-Pesa Code" value={order.mpesa_transaction_id} />
                )}
              </div>
            </div>

            {/* Delivery Info */}
            <div className="card">
              <div className="card-header"><i className="bi bi-geo-alt" /> Delivery Info</div>
              <div className="card-body">
                <InfoRow label="Type" value={order.delivery_type === 'pickup' ? 'Pickup Station' : 'Home Delivery'} />
                {order.pickup_station_detail && <>
                  <InfoRow label="Station" value={order.pickup_station_detail.name} />
                  <InfoRow label="Address" value={order.pickup_station_detail.address} />
                  <InfoRow label="Hours" value={order.pickup_station_detail.working_hours} />
                  <InfoRow label="Phone" value={order.pickup_station_detail.phone} />
                </>}
                {order.delivery_address && <>
                  <InfoRow label="Name" value={order.delivery_address.full_name} />
                  <InfoRow label="Address" value={`${order.delivery_address.estate}, ${order.delivery_address.town}`} />
                  <InfoRow label="County" value={order.delivery_address.county} />
                </>}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="card">
            <div className="card-header"><i className="bi bi-bag" /> Order Items ({order.items?.length})</div>
            {order.items?.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, padding: '14px 20px', borderBottom: i < order.items.length - 1 ? '1px solid var(--gray-100)' : 'none', alignItems: 'center' }}>
                <div style={{ width: 72, height: 72, border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0, background: 'var(--gray-50)' }}>
                  <img src={item.image || 'https://placehold.co/72x72/f3f4f6/9ca3af?text=Item'} alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 6 }}
                    onError={e => e.target.src = 'https://placehold.co/72x72/f3f4f6/9ca3af?text=Item'} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 4 }}>{item.product_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                    SKU: {item.product_sku}
                    {item.variant_info && <> · {item.variant_info}</>}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 4, color: 'var(--gray-600)' }}>
                    KSh {parseFloat(item.unit_price).toLocaleString()} × {item.quantity}
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                  KSh {parseFloat(item.subtotal).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/orders" className="btn btn-ghost"><i className="bi bi-arrow-left" /> Back to Orders</Link>
          <Link to="/products" className="btn btn-primary"><i className="bi bi-bag" /> Continue Shopping</Link>
        </div>
      </div>
    </div>
  )
}