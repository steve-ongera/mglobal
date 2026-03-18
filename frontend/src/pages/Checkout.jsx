import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { cartAPI, locationAPI, addressAPI, orderAPI } from '../services/api'
import { useApp } from '../App'

export default function Checkout() {
  const { user, cart, refreshCart, toast } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const passedCoupon = location.state?.coupon || null

  const [step, setStep] = useState(1)
  const [deliveryType, setDeliveryType] = useState('pickup')
  const [counties, setCounties] = useState([])
  const [selectedCounty, setSelectedCounty] = useState(null)
  const [selectedStation, setSelectedStation] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('mpesa')
  const [mpesaPhone, setMpesaPhone] = useState(user?.phone || '')
  const [couponCode, setCouponCode] = useState(passedCoupon?.code || '')
  const [coupon, setCoupon] = useState(passedCoupon)
  const [notes, setNotes] = useState('')
  const [placing, setPlacing] = useState(false)
  const [order, setOrder] = useState(null)
  const [newAddr, setNewAddr] = useState({ full_name: '', phone: '', county: '', town: '', estate: '', landmark: '' })
  const [addingAddr, setAddingAddr] = useState(false)
  const [showNewAddr, setShowNewAddr] = useState(false)

  useEffect(() => {
    document.title = 'Checkout — Mgobal'
    locationAPI.counties().then(setCounties).catch(() => {})
    addressAPI.list().then(data => {
      setAddresses(data)
      const def = data.find(a => a.is_default) || data[0]
      if (def) setSelectedAddress(def)
    }).catch(() => {})
    if (user?.phone) setMpesaPhone(user.phone.startsWith('0') ? '254' + user.phone.slice(1) : user.phone)
  }, [])

  const items = cart?.items || []
  const subtotal = parseFloat(cart?.total || 0)
  const deliveryFee = deliveryType === 'pickup' ? (selectedStation ? parseFloat(selectedStation.fee) : 0) : 350
  const discount = coupon ? parseFloat(coupon.discount_amount || 0) : 0
  const total = Math.max(0, subtotal + deliveryFee - discount)

  const handleSaveAddress = async () => {
    setAddingAddr(true)
    try {
      const addr = await addressAPI.create(newAddr)
      setAddresses(prev => [...prev, addr])
      setSelectedAddress(addr)
      setShowNewAddr(false)
      toast('Address saved', 'success')
    } catch { toast('Failed to save address', 'error') }
    finally { setAddingAddr(false) }
  }

  const handlePlaceOrder = async () => {
    if (deliveryType === 'pickup' && !selectedStation) { toast('Please select a pickup station', 'warning'); return }
    if (deliveryType === 'home' && !selectedAddress) { toast('Please add a delivery address', 'warning'); return }
    if (paymentMethod === 'mpesa' && !mpesaPhone) { toast('Enter your M-Pesa phone number', 'warning'); return }

    setPlacing(true)
    try {
      const payload = {
        delivery_type: deliveryType,
        payment_method: paymentMethod,
        notes,
        coupon_code: couponCode,
        ...(deliveryType === 'pickup' ? { pickup_station_id: selectedStation.id } : { delivery_address_id: selectedAddress.id }),
        ...(paymentMethod === 'mpesa' ? { mpesa_phone: mpesaPhone } : {}),
      }
      const placed = await orderAPI.create(payload)
      await refreshCart()
      setOrder(placed)
      setStep(4)
    } catch (err) {
      toast(err?.error || Object.values(err || {})[0] || 'Failed to place order', 'error')
    } finally { setPlacing(false) }
  }

  if (items.length === 0 && !order) return (
    <div className="page-wrapper">
      <div className="container">
        <div className="empty-state">
          <i className="bi bi-bag" />
          <h3>Your cart is empty</h3>
          <Link to="/products" className="btn btn-primary">Shop Now</Link>
        </div>
      </div>
    </div>
  )

  // ── Step 4: Order Success ─────────────────────────────────────────────────────
  if (step === 4 && order) return (
    <div className="page-wrapper">
      <div className="container" style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 36 }}>
            <i className="bi bi-check-lg" style={{ color: 'var(--success)' }} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Order Placed! 🎉</h2>
          <p style={{ color: 'var(--gray-500)', marginBottom: 20 }}>Thank you for shopping with Mgobal. Your order has been received.</p>

          <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 24, textAlign: 'left' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Order Number', value: order.order_number, bold: true },
                { label: 'Payment Status', value: order.payment_status === 'paid' ? '✅ Paid' : '⏳ Pending' },
                { label: 'Total', value: `KSh ${parseFloat(order.total).toLocaleString()}`, bold: true },
                { label: 'Payment Method', value: order.payment_method.toUpperCase() },
              ].map((r, i) => (
                <div key={i}>
                  <div style={{ fontSize: 11, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: .4 }}>{r.label}</div>
                  <div style={{ fontSize: 15, fontWeight: r.bold ? 700 : 500, marginTop: 2 }}>{r.value}</div>
                </div>
              ))}
            </div>
          </div>

          {order.delivery_type === 'pickup' && order.pickup_station_detail && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius)', padding: 14, marginBottom: 20, textAlign: 'left' }}>
              <div style={{ fontWeight: 700, color: '#1e40af', marginBottom: 6 }}><i className="bi bi-geo-alt" /> Pickup Station</div>
              <div style={{ fontSize: 14 }}>{order.pickup_station_detail.name}</div>
              <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>{order.pickup_station_detail.address}</div>
              <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>{order.pickup_station_detail.working_hours}</div>
            </div>
          )}

          {paymentMethod === 'mpesa' && order.payment_status === 'pending' && (
            <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 'var(--radius)', padding: 14, marginBottom: 20, fontSize: 14 }}>
              <i className="bi bi-phone" style={{ fontSize: 20 }} /> Check your phone <strong>{mpesaPhone}</strong> for M-Pesa prompt to complete payment.
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate(`/orders/${order.id}`)} className="btn btn-primary">
              <i className="bi bi-box-seam" /> Track Order
            </button>
            <Link to="/products" className="btn btn-outline">Continue Shopping</Link>
          </div>
        </div>
      </div>
    </div>
  )

  const StepIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 24 }}>
      {['Delivery', 'Payment', 'Review'].map((s, i) => (
        <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: i + 1 < step ? 'pointer' : 'default' }}
            onClick={() => i + 1 < step && setStep(i + 1)}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: i + 1 < step ? 'var(--success)' : i + 1 === step ? 'var(--primary)' : 'var(--gray-200)',
              color: i + 1 <= step ? 'white' : 'var(--gray-500)', fontWeight: 700, fontSize: 13,
              transition: 'all 0.3s'
            }}>
              {i + 1 < step ? <i className="bi bi-check" /> : i + 1}
            </div>
            <span style={{ fontSize: 11, color: i + 1 === step ? 'var(--primary)' : 'var(--gray-400)', fontWeight: i + 1 === step ? 700 : 400 }}>{s}</span>
          </div>
          {i < 2 && <div style={{ width: 60, height: 2, background: i + 1 < step ? 'var(--success)' : 'var(--gray-200)', margin: '0 4px', marginBottom: 20, transition: 'background 0.3s' }} />}
        </div>
      ))}
    </div>
  )

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="breadcrumb">
          <Link to="/">Home</Link> <i className="bi bi-chevron-right" />
          <Link to="/cart">Cart</Link> <i className="bi bi-chevron-right" />
          <span>Checkout</span>
        </div>

        <StepIndicator />

        <div className="checkout-layout">
          {/* Left: Steps */}
          <div>
            {/* Step 1: Delivery */}
            {step >= 1 && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: step === 1 ? '1px solid var(--gray-200)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="step-number" style={{ background: step > 1 ? 'var(--success)' : 'var(--primary)' }}>
                      {step > 1 ? <i className="bi bi-check" /> : '1'}
                    </div>
                    <span className="step-title">Delivery Method</span>
                    {step > 1 && selectedStation && (
                      <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>— {selectedStation.name}</span>
                    )}
                  </div>
                  {step > 1 && <button onClick={() => setStep(1)} style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>Change</button>}
                </div>

                {step === 1 && (
                  <div style={{ padding: 20 }}>
                    {/* Delivery Type Tabs */}
                    <div className="delivery-tabs">
                      <div className={`delivery-tab ${deliveryType === 'pickup' ? 'active' : ''}`} onClick={() => setDeliveryType('pickup')}>
                        <i className="bi bi-geo-alt" /> Pickup Station
                      </div>
                      <div className={`delivery-tab ${deliveryType === 'home' ? 'active' : ''}`} onClick={() => setDeliveryType('home')}>
                        <i className="bi bi-house" /> Home Delivery
                      </div>
                    </div>

                    {deliveryType === 'pickup' ? (
                      <div>
                        <div style={{ marginBottom: 12 }}>
                          <label className="form-label">Select County</label>
                          <select className="form-control" value={selectedCounty?.id || ''}
                            onChange={e => {
                              const c = counties.find(c => c.id === parseInt(e.target.value))
                              setSelectedCounty(c || null)
                              setSelectedStation(null)
                            }}>
                            <option value="">-- Choose your county --</option>
                            {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>

                        {selectedCounty && (
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: 'var(--gray-700)' }}>
                              Pickup Stations in <span style={{ color: 'var(--primary)' }}>{selectedCounty.name}</span>
                            </div>
                            {selectedCounty.pickup_stations?.filter(s => s.is_active).length === 0 ? (
                              <div style={{ textAlign: 'center', padding: 20, color: 'var(--gray-400)' }}>No pickup stations in this county</div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {selectedCounty.pickup_stations?.filter(s => s.is_active).map(station => (
                                  <div key={station.id}
                                    className={`pickup-station-card ${selectedStation?.id === station.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedStation(station)}>
                                    <input type="radio" name="station" checked={selectedStation?.id === station.id} readOnly />
                                    <div style={{ flex: 1 }}>
                                      <div className="pickup-station-name">{station.name}</div>
                                      <div className="pickup-station-addr"><i className="bi bi-geo-alt" style={{ fontSize: 11 }} /> {station.address}</div>
                                      <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12, color: 'var(--gray-500)' }}>
                                        <span><i className="bi bi-clock" /> {station.working_hours}</span>
                                        <span><i className="bi bi-telephone" /> {station.phone}</span>
                                      </div>
                                      <div className="pickup-station-fee">Delivery Fee: KSh {parseFloat(station.fee).toLocaleString()}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div style={{ marginBottom: 12, padding: '10px 14px', background: '#eff6ff', borderRadius: 'var(--radius)', fontSize: 13, color: '#1e40af' }}>
                          <i className="bi bi-info-circle" /> Home delivery fee: <strong>KSh 350</strong> (flat rate nationwide)
                        </div>

                        {addresses.map(addr => (
                          <div key={addr.id}
                            className={`pickup-station-card ${selectedAddress?.id === addr.id ? 'selected' : ''}`}
                            onClick={() => setSelectedAddress(addr)}
                            style={{ marginBottom: 8 }}>
                            <input type="radio" name="addr" checked={selectedAddress?.id === addr.id} readOnly />
                            <div>
                              <div className="pickup-station-name">{addr.full_name}</div>
                              <div className="pickup-station-addr">{addr.estate}, {addr.town}, {addr.county}</div>
                              <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{addr.phone}</div>
                            </div>
                          </div>
                        ))}

                        {!showNewAddr ? (
                          <button className="btn btn-outline btn-sm" onClick={() => setShowNewAddr(true)} style={{ marginTop: 8 }}>
                            <i className="bi bi-plus" /> Add New Address
                          </button>
                        ) : (
                          <div style={{ marginTop: 12, padding: 16, background: 'var(--gray-50)', borderRadius: 'var(--radius)' }}>
                            <div style={{ fontWeight: 700, marginBottom: 12 }}>New Delivery Address</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                              {[
                                { key: 'full_name', label: 'Full Name', col: 2 },
                                { key: 'phone', label: 'Phone' },
                                { key: 'county', label: 'County' },
                                { key: 'town', label: 'Town' },
                                { key: 'estate', label: 'Estate/Street', col: 2 },
                                { key: 'landmark', label: 'Landmark (optional)', col: 2 },
                              ].map(f => (
                                <div key={f.key} className="form-group" style={{ gridColumn: f.col === 2 ? 'span 2' : 'span 1' }}>
                                  <label className="form-label">{f.label}</label>
                                  <input className="form-control" value={newAddr[f.key]} onChange={e => setNewAddr(a => ({ ...a, [f.key]: e.target.value }))} />
                                </div>
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="btn btn-primary btn-sm" onClick={handleSaveAddress} disabled={addingAddr}>
                                {addingAddr ? 'Saving...' : 'Save Address'}
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setShowNewAddr(false)}>Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <button className="btn btn-primary btn-full" style={{ marginTop: 20 }}
                      onClick={() => {
                        if (deliveryType === 'pickup' && !selectedStation) { toast('Select a pickup station', 'warning'); return }
                        if (deliveryType === 'home' && !selectedAddress) { toast('Add a delivery address', 'warning'); return }
                        setStep(2)
                      }}>
                      Continue to Payment <i className="bi bi-arrow-right" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Payment */}
            {step >= 2 && (
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: step === 2 ? '1px solid var(--gray-200)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="step-number" style={{ background: step > 2 ? 'var(--success)' : 'var(--primary)' }}>
                      {step > 2 ? <i className="bi bi-check" /> : '2'}
                    </div>
                    <span className="step-title">Payment Method</span>
                    {step > 2 && <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>— {paymentMethod.toUpperCase()}</span>}
                  </div>
                  {step > 2 && <button onClick={() => setStep(2)} style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>Change</button>}
                </div>

                {step === 2 && (
                  <div style={{ padding: 20 }}>
                    {[
                      { method: 'mpesa', icon: 'bi-phone', name: 'M-Pesa', desc: 'Pay via Safaricom M-Pesa STK Push', color: '#00a651' },
                      { method: 'card', icon: 'bi-credit-card', name: 'Credit / Debit Card', desc: 'Visa, Mastercard', color: '#1a3a8f' },
                      { method: 'cod', icon: 'bi-cash-stack', name: 'Cash on Delivery', desc: 'Pay when you receive your order', color: '#f7b731' },
                    ].map(pm => (
                      <div key={pm.method}
                        className={`payment-method-card ${paymentMethod === pm.method ? 'selected' : ''}`}
                        onClick={() => setPaymentMethod(pm.method)}>
                        <input type="radio" name="payment" checked={paymentMethod === pm.method} readOnly />
                        <i className={`bi ${pm.icon} payment-icon`} style={{ color: pm.color }} />
                        <div>
                          <div className="payment-name">{pm.name}</div>
                          <div className="payment-desc">{pm.desc}</div>
                        </div>
                      </div>
                    ))}

                    {paymentMethod === 'mpesa' && (
                      <div className="form-group" style={{ marginTop: 8 }}>
                        <label className="form-label"><i className="bi bi-phone" /> M-Pesa Phone Number</label>
                        <input className="form-control" placeholder="e.g. 254712345678" value={mpesaPhone}
                          onChange={e => setMpesaPhone(e.target.value)} />
                        <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
                          An STK push will be sent to this number. Format: 254XXXXXXXXX
                        </div>
                      </div>
                    )}

                    {/* Coupon */}
                    <div className="form-group" style={{ marginTop: 12 }}>
                      <label className="form-label"><i className="bi bi-ticket-perforated" /> Coupon Code (optional)</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input className="form-control" placeholder="Enter coupon" value={couponCode}
                          onChange={e => setCouponCode(e.target.value.toUpperCase())} />
                        <button className="btn btn-outline" onClick={async () => {
                          if (!couponCode) return
                          try {
                            const data = await import('../services/api').then(m => m.couponAPI.validate(couponCode, subtotal))
                            setCoupon({ code: couponCode, ...data })
                            toast('Coupon applied!', 'success')
                          } catch (err) { toast(err?.error || 'Invalid coupon', 'error') }
                        }}>Apply</button>
                      </div>
                      {coupon && <div style={{ color: 'var(--success)', fontSize: 12, marginTop: 4 }}><i className="bi bi-check-circle" /> {coupon.code} — KSh {coupon.discount_amount} off</div>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Order Notes (optional)</label>
                      <textarea className="form-control" rows={2} placeholder="Any special instructions..." value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>

                    <button className="btn btn-primary btn-full" style={{ marginTop: 8 }} onClick={() => setStep(3)}>
                      Review Order <i className="bi bi-arrow-right" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Review */}
            {step >= 3 && (
              <div className="card">
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="step-number">3</div>
                  <span className="step-title">Review & Place Order</span>
                </div>
                {step === 3 && (
                  <div style={{ padding: 20 }}>
                    {items.map(item => (
                      <div key={item.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--gray-100)' }}>
                        <img src={item.product.primary_image || 'https://placehold.co/56x56/f3f4f6/9ca3af?text=Item'} alt=""
                          style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '1px solid var(--gray-200)', padding: 4 }}
                          onError={e => e.target.src = 'https://placehold.co/56x56/f3f4f6/9ca3af?text=Item'} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{item.product.name}</div>
                          {item.variant && <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{item.variant.name}: {item.variant.value}</div>}
                          <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>Qty: {item.quantity}</div>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', whiteSpace: 'nowrap' }}>
                          KSh {parseFloat(item.subtotal).toLocaleString()}
                        </div>
                      </div>
                    ))}

                    <button className="btn btn-primary btn-full btn-lg" style={{ marginTop: 20 }}
                      onClick={handlePlaceOrder} disabled={placing}>
                      {placing ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Placing Order...</> :
                        <>Place Order — KSh {total.toLocaleString()} <i className="bi bi-check-circle" /></>}
                    </button>
                    <div style={{ fontSize: 12, color: 'var(--gray-400)', textAlign: 'center', marginTop: 8 }}>
                      By placing this order you agree to our Terms of Service
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div>
            <div className="card" style={{ position: 'sticky', top: 'calc(var(--navbar-h) + 12px)' }}>
              <div className="card-header"><i className="bi bi-receipt" /> Order Summary</div>
              <div className="card-body">
                {items.slice(0, 3).map(item => (
                  <div key={item.id} style={{ display: 'flex', gap: 8, marginBottom: 10, fontSize: 13 }}>
                    <img src={item.product.primary_image || 'https://placehold.co/40x40/f3f4f6/9ca3af?text=Item'} alt=""
                      style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 'var(--radius-sm)', border: '1px solid var(--gray-200)', flexShrink: 0 }}
                      onError={e => e.target.src = 'https://placehold.co/40x40/f3f4f6/9ca3af?text=Item'} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product.name}</div>
                      <div style={{ color: 'var(--gray-500)' }}>×{item.quantity}</div>
                    </div>
                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>KSh {parseFloat(item.subtotal).toLocaleString()}</div>
                  </div>
                ))}
                {items.length > 3 && <div style={{ fontSize: 12, color: 'var(--gray-400)', textAlign: 'center', marginBottom: 12 }}>+{items.length - 3} more item(s)</div>}

                <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 12 }}>
                  <div className="order-summary-row">
                    <span>Subtotal</span><span>KSh {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="order-summary-row">
                    <span>Delivery Fee</span>
                    <span>{deliveryType === 'pickup' && !selectedStation ? '—' : `KSh ${deliveryFee.toLocaleString()}`}</span>
                  </div>
                  {coupon && (
                    <div className="order-summary-row" style={{ color: 'var(--success)' }}>
                      <span>Coupon Discount</span><span>- KSh {discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="order-summary-row total">
                    <span>Total</span><span>KSh {total.toLocaleString()}</span>
                  </div>
                </div>

                {selectedStation && (
                  <div style={{ marginTop: 12, padding: '10px 12px', background: '#eff6ff', borderRadius: 'var(--radius)', fontSize: 13 }}>
                    <div style={{ fontWeight: 600, color: '#1e40af', marginBottom: 4 }}><i className="bi bi-geo-alt" /> {selectedStation.name}</div>
                    <div style={{ color: 'var(--gray-600)' }}>{selectedStation.address}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}