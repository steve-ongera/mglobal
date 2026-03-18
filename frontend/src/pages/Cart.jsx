import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cartAPI, couponAPI } from '../services/api'
import { useApp } from '../App'

const PLACEHOLDER = 'https://placehold.co/80x80/f3f4f6/9ca3af?text=Item'

export default function Cart() {
  const { user, cart, refreshCart, toast } = useApp()
  const navigate = useNavigate()
  const [updating, setUpdating] = useState({})
  const [couponCode, setCouponCode] = useState('')
  const [coupon, setCoupon] = useState(null)
  const [couponError, setCouponError] = useState('')
  const [validatingCoupon, setValidatingCoupon] = useState(false)

  useEffect(() => {
    document.title = 'My Cart — Mgobal'
    if (user) refreshCart()
  }, [user])

  const updateQty = async (itemId, qty) => {
    setUpdating(u => ({ ...u, [itemId]: true }))
    try {
      await cartAPI.update(itemId, qty)
      await refreshCart()
    } catch { toast('Failed to update', 'error') }
    finally { setUpdating(u => ({ ...u, [itemId]: false })) }
  }

  const removeItem = async (itemId, name) => {
    try {
      await cartAPI.remove(itemId)
      await refreshCart()
      toast(`${name.slice(0, 25)}... removed`, 'info')
    } catch { toast('Failed to remove', 'error') }
  }

  const clearCart = async () => {
    if (!window.confirm('Clear all items from cart?')) return
    try {
      await cartAPI.clear()
      await refreshCart()
      setCoupon(null)
    } catch {}
  }

  const validateCoupon = async () => {
    if (!couponCode.trim()) return
    setValidatingCoupon(true)
    setCouponError('')
    try {
      const total = parseFloat(cart.total || 0)
      const data = await couponAPI.validate(couponCode, total)
      setCoupon({ code: couponCode.toUpperCase(), ...data })
      toast(`Coupon applied! You save KSh ${data.discount_amount}`, 'success')
    } catch (err) {
      setCouponError(err?.error || 'Invalid coupon')
      setCoupon(null)
    } finally { setValidatingCoupon(false) }
  }

  const items = cart?.items || []
  const subtotal = parseFloat(cart?.total || 0)
  const discount = coupon ? parseFloat(coupon.discount_amount) : 0
  const total = Math.max(0, subtotal - discount)

  if (!user) return (
    <div className="page-wrapper">
      <div className="container">
        <div className="empty-state">
          <i className="bi bi-bag" />
          <h3>Sign in to view your cart</h3>
          <p>Your cart items are saved when you're signed in</p>
          <Link to="/login" className="btn btn-primary">Sign In</Link>
        </div>
      </div>
    </div>
  )

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="breadcrumb">
          <Link to="/">Home</Link>
          <i className="bi bi-chevron-right" />
          <span>Shopping Cart</span>
          {items.length > 0 && <span style={{ marginLeft: 'auto', color: 'var(--gray-500)', fontSize: 12 }}>{cart.item_count} item{cart.item_count !== 1 ? 's' : ''}</span>}
        </div>

        {items.length === 0 ? (
          <div className="empty-state">
            <i className="bi bi-bag" />
            <h3>Your cart is empty</h3>
            <p>Looks like you haven't added anything to your cart yet</p>
            <Link to="/products" className="btn btn-primary">Start Shopping</Link>
          </div>
        ) : (
          <div className="cart-layout">
            {/* Cart Items */}
            <div>
              <div className="card">
                <div className="card-header" style={{ justifyContent: 'space-between' }}>
                  <span><i className="bi bi-bag" /> Cart ({cart.item_count} items)</span>
                  <button onClick={clearCart} style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <i className="bi bi-trash" /> Clear All
                  </button>
                </div>
                {items.map(item => (
                  <div key={item.id} className="cart-item">
                    <Link to={`/products/${item.product.slug}`}>
                      <img
                        className="cart-item-img"
                        src={item.product.primary_image || PLACEHOLDER}
                        alt={item.product.name}
                        onError={e => e.target.src = PLACEHOLDER}
                      />
                    </Link>
                    <div>
                      <Link to={`/products/${item.product.slug}`}>
                        <div className="cart-item-name">{item.product.name}</div>
                      </Link>
                      {item.variant && (
                        <div className="cart-item-variant">{item.variant.name}: {item.variant.value}</div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                        <div className="qty-selector">
                          <button className="qty-btn" onClick={() => updateQty(item.id, item.quantity - 1)}
                            disabled={updating[item.id] || item.quantity <= 1}>
                            <i className="bi bi-dash" />
                          </button>
                          <div className="qty-display">
                            {updating[item.id] ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : item.quantity}
                          </div>
                          <button className="qty-btn" onClick={() => updateQty(item.id, item.quantity + 1)}
                            disabled={updating[item.id]}>
                            <i className="bi bi-plus" />
                          </button>
                        </div>
                        <button onClick={() => removeItem(item.id, item.product.name)}
                          style={{ fontSize: 13, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <i className="bi bi-trash" /> Remove
                        </button>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="cart-item-price">KSh {parseFloat(item.subtotal).toLocaleString()}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>
                        KSh {parseFloat(item.product.effective_price || item.product.price).toLocaleString()} each
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon */}
              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-header"><i className="bi bi-ticket-perforated" /> Have a Coupon?</div>
                <div className="card-body">
                  {coupon ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#d1fae5', padding: '10px 14px', borderRadius: 'var(--radius)' }}>
                      <i className="bi bi-check-circle-fill" style={{ color: 'var(--success)', fontSize: 20 }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{coupon.code}</div>
                        <div style={{ fontSize: 12, color: 'var(--gray-600)' }}>Saving KSh {coupon.discount_amount}</div>
                      </div>
                      <button onClick={() => { setCoupon(null); setCouponCode('') }} style={{ marginLeft: 'auto', color: 'var(--danger)', fontSize: 18 }}>×</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        className="form-control"
                        placeholder="Enter coupon code"
                        value={couponCode}
                        onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError('') }}
                        onKeyDown={e => e.key === 'Enter' && validateCoupon()}
                      />
                      <button className="btn btn-outline" onClick={validateCoupon} disabled={validatingCoupon}>
                        {validatingCoupon ? '...' : 'Apply'}
                      </button>
                    </div>
                  )}
                  {couponError && <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}><i className="bi bi-exclamation-circle" /> {couponError}</div>}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div>
              <div className="card" style={{ position: 'sticky', top: 'calc(var(--navbar-h) + 12px)' }}>
                <div className="card-header"><i className="bi bi-receipt" /> Order Summary</div>
                <div className="card-body">
                  <div className="order-summary-row">
                    <span>Subtotal ({cart.item_count} items)</span>
                    <span>KSh {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="order-summary-row">
                    <span>Delivery Fee</span>
                    <span style={{ color: 'var(--success)' }}>Calculated at checkout</span>
                  </div>
                  {coupon && (
                    <div className="order-summary-row" style={{ color: 'var(--success)' }}>
                      <span><i className="bi bi-tag" /> Discount ({coupon.code})</span>
                      <span>- KSh {discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="order-summary-row total">
                    <span>Total</span>
                    <span>KSh {total.toLocaleString()}</span>
                  </div>

                  <button
                    className="btn btn-primary btn-full btn-lg"
                    style={{ marginTop: 16 }}
                    onClick={() => navigate('/checkout', { state: { coupon } })}>
                    Proceed to Checkout <i className="bi bi-arrow-right" />
                  </button>

                  <Link to="/products" className="btn btn-ghost btn-full" style={{ marginTop: 8 }}>
                    <i className="bi bi-arrow-left" /> Continue Shopping
                  </Link>

                  <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'center' }}>
                    {['M-Pesa', 'Visa', 'Mastercard'].map(m => (
                      <span key={m} style={{ background: 'var(--gray-100)', padding: '4px 10px', borderRadius: 'var(--radius-sm)', fontSize: 11, color: 'var(--gray-600)' }}>{m}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Promo Info */}
              <div style={{ marginTop: 12, padding: 14, background: '#eff6ff', borderRadius: 'var(--radius)', border: '1px solid #bfdbfe', fontSize: 13 }}>
                <div style={{ fontWeight: 600, color: '#1e40af', marginBottom: 6 }}><i className="bi bi-info-circle" /> Why shop with us?</div>
                {['Secure M-Pesa payments', '7-day easy returns', '200+ pickup stations nationwide', 'Genuine products guaranteed'].map(t => (
                  <div key={t} style={{ display: 'flex', gap: 6, alignItems: 'center', color: 'var(--gray-600)', marginBottom: 3 }}>
                    <i className="bi bi-check-circle-fill" style={{ color: 'var(--success)', fontSize: 13 }} /> {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}