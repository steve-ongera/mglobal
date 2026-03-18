import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { productAPI, cartAPI, wishlistAPI } from '../services/api'
import { useApp } from '../App'
import ProductCard from '../components/ProductCard'
import { Stars } from '../components/ProductCard'

const PLACEHOLDER = 'https://placehold.co/500x500/f3f4f6/9ca3af?text=No+Image'

export default function ProductDetail() {
  const { slug } = useParams()
  const { user, refreshCart, wishlist, setWishlist, toast } = useApp()
  const navigate = useNavigate()

  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeImg, setActiveImg] = useState(0)
  const [qty, setQty] = useState(1)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [addingCart, setAddingCart] = useState(false)
  const [tab, setTab] = useState('description')
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', body: '' })
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
    setLoading(true)
    productAPI.detail(slug).then(p => {
      setProduct(p)
      document.title = `${p.meta_title || p.name} — Mgobal`
      // Related products
      if (p.category?.slug) {
        productAPI.list({ 'category__slug': p.category.slug, page_size: 6 })
          .then(d => setRelated((d.results || d).filter(r => r.id !== p.id).slice(0, 6)))
          .catch(() => {})
      }
    }).catch(() => navigate('/products')).finally(() => setLoading(false))
  }, [slug])

  const inWishlist = wishlist.some(w => w.product?.id === product?.id)

  const handleAddCart = async (buyNow = false) => {
    if (!user) { toast('Please login to continue', 'warning'); navigate('/login'); return }
    setAddingCart(true)
    try {
      await cartAPI.add(product.id, qty, selectedVariant?.id || null)
      await refreshCart()
      toast(`Added to cart!`, 'success')
      if (buyNow) navigate('/checkout')
    } catch (err) {
      toast(err?.error || 'Failed to add to cart', 'error')
    } finally {
      setAddingCart(false)
    }
  }

  const handleWishlist = async () => {
    if (!user) { toast('Please login first', 'warning'); return }
    try {
      const res = await wishlistAPI.toggle(product.id)
      if (res.action === 'added') { setWishlist(prev => [...prev, { product }]); toast('Saved to wishlist', 'success') }
      else { setWishlist(prev => prev.filter(w => w.product?.id !== product.id)); toast('Removed from wishlist', 'info') }
    } catch {}
  }

  const handleReview = async e => {
    e.preventDefault()
    if (!user) { toast('Login to leave a review', 'warning'); return }
    setSubmittingReview(true)
    try {
      await productAPI.addReview(slug, reviewForm)
      toast('Review submitted!', 'success')
      const updated = await productAPI.detail(slug)
      setProduct(updated)
      setReviewForm({ rating: 5, title: '', body: '' })
    } catch (err) {
      toast(err?.non_field_errors?.[0] || 'Review failed', 'error')
    } finally {
      setSubmittingReview(false)
    }
  }

  if (loading) return <div className="loading-center" style={{ minHeight: '60vh' }}><div className="spinner" /></div>
  if (!product) return null

  const images = product.images?.length ? product.images : [{ image: PLACEHOLDER }]
  const price = parseFloat(product.effective_price || product.price)
  const compare = product.compare_price ? parseFloat(product.compare_price) : null
  const avgRating = product.avg_rating || 0
  const ratingDist = [5, 4, 3, 2, 1].map(r => ({
    star: r,
    count: product.reviews?.filter(rv => rv.rating === r).length || 0
  }))

  const variantGroups = product.variants?.reduce((acc, v) => {
    if (!acc[v.name]) acc[v.name] = []
    acc[v.name].push(v)
    return acc
  }, {}) || {}

  return (
    <div className="page-wrapper">
      <div className="container">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <Link to="/">Home</Link>
          <i className="bi bi-chevron-right" />
          {product.category && <><Link to={`/category/${product.category.slug}`}>{product.category.name}</Link><i className="bi bi-chevron-right" /></>}
          <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</span>
        </div>

        {/* Main Grid */}
        <div className="product-detail-grid">
          {/* Gallery */}
          <div className="product-gallery">
            <div className="gallery-main">
              <img
                src={images[activeImg]?.image || PLACEHOLDER}
                alt={product.name}
                onError={e => e.target.src = PLACEHOLDER}
              />
              {product.discount_percent > 0 && (
                <span className="product-badge badge-discount" style={{ position: 'absolute', top: 12, left: 12 }}>-{product.discount_percent}%</span>
              )}
            </div>
            <div className="gallery-thumbs">
              {images.map((img, i) => (
                <div key={i} className={`gallery-thumb ${i === activeImg ? 'active' : ''}`} onClick={() => setActiveImg(i)}>
                  <img src={img.image} alt="" onError={e => e.target.src = PLACEHOLDER} />
                </div>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div>
            {product.brand && (
              <Link to={`/products?brand__slug=${product.brand.slug}`} style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                {product.brand.name}
              </Link>
            )}
            <h1 className="product-info-title" style={{ marginTop: 6 }}>{product.name}</h1>

            <div className="product-meta">
              <span><i className="bi bi-upc-scan" /> SKU: {product.sku}</span>
              {avgRating > 0 && <span><Stars rating={avgRating} /> {avgRating} ({product.review_count} reviews)</span>}
              <span style={{ color: product.in_stock ? 'var(--success)' : 'var(--danger)' }}>
                <i className={`bi ${product.in_stock ? 'bi-check-circle' : 'bi-x-circle'}`} />
                {product.in_stock ? `In Stock (${product.stock})` : 'Out of Stock'}
              </span>
              <span><i className="bi bi-eye" /> {product.views} views</span>
            </div>

            {/* Price */}
            <div className="product-price-block">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span className="product-price-main">KSh {price.toLocaleString()}</span>
                {compare && compare > price && (
                  <span className="product-price-compare">KSh {compare.toLocaleString()}</span>
                )}
              </div>
              {product.discount_percent > 0 && (
                <div className="product-price-save">
                  <i className="bi bi-tag" /> You save KSh {(compare - price).toLocaleString()} ({product.discount_percent}% OFF)
                </div>
              )}
            </div>

            {/* Variants */}
            {Object.entries(variantGroups).map(([name, variants]) => (
              <div key={name} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  {name}: {selectedVariant?.name === name ? <span style={{ color: 'var(--primary)' }}>{selectedVariant.value}</span> : <span style={{ color: 'var(--gray-400)' }}>Select</span>}
                </div>
                <div className="variant-options">
                  {variants.map(v => (
                    <div key={v.id} className={`variant-chip ${selectedVariant?.id === v.id ? 'selected' : ''}`}
                      onClick={() => setSelectedVariant(selectedVariant?.id === v.id ? null : v)}
                      style={{ opacity: v.stock === 0 ? 0.4 : 1 }}>
                      {v.value}
                      {v.price_adjustment !== 0 && (
                        <span style={{ fontSize: 11, marginLeft: 4 }}>
                          {v.price_adjustment > 0 ? '+' : ''}KSh {v.price_adjustment.toLocaleString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Quantity */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Quantity</div>
              <div className="qty-selector">
                <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1}><i className="bi bi-dash" /></button>
                <div className="qty-display">{qty}</div>
                <button className="qty-btn" onClick={() => setQty(q => Math.min(product.stock, q + 1))} disabled={qty >= product.stock}><i className="bi bi-plus" /></button>
              </div>
            </div>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={() => handleAddCart(false)} disabled={addingCart || !product.in_stock}>
                  <i className="bi bi-bag-plus" />
                  {addingCart ? 'Adding...' : 'Add to Cart'}
                </button>
                <button className={`btn btn-lg ${inWishlist ? 'btn-danger' : 'btn-outline'}`}
                  onClick={handleWishlist} title={inWishlist ? 'Remove from Wishlist' : 'Add to Wishlist'}>
                  <i className={`bi ${inWishlist ? 'bi-heart-fill' : 'bi-heart'}`} />
                </button>
              </div>
              <button className="btn btn-accent btn-lg btn-full" onClick={() => handleAddCart(true)} disabled={!product.in_stock}>
                <i className="bi bi-lightning-fill" /> Buy Now
              </button>
            </div>

            {/* Trust badges */}
            <div style={{ display: 'flex', gap: 16, marginTop: 20, flexWrap: 'wrap' }}>
              {[
                { icon: 'bi-shield-check', text: '100% Genuine' },
                { icon: 'bi-arrow-repeat', text: 'Easy Returns' },
                { icon: 'bi-geo-alt', text: 'Nationwide Delivery' },
                { icon: 'bi-phone', text: 'M-Pesa Payment' },
              ].map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--gray-600)' }}>
                  <i className={`bi ${b.icon}`} style={{ color: 'var(--primary)' }} /> {b.text}
                </div>
              ))}
            </div>
          </div>

          {/* Side Panel — Delivery Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="card">
              <div className="card-header"><i className="bi bi-truck" style={{ color: 'var(--primary)' }} /> Delivery & Returns</div>
              <div className="card-body" style={{ padding: '12px 16px' }}>
                {[
                  { icon: 'bi-geo-alt', title: 'Pickup Stations', desc: '200+ stations across 47 counties from KSh 99' },
                  { icon: 'bi-house', title: 'Home Delivery', desc: 'Door delivery from KSh 350' },
                  { icon: 'bi-arrow-counterclockwise', title: 'Free Returns', desc: 'Within 7 days of delivery' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < 2 ? 12 : 0, paddingBottom: i < 2 ? 12 : 0, borderBottom: i < 2 ? '1px solid var(--gray-100)' : 'none' }}>
                    <i className={`bi ${item.icon}`} style={{ color: 'var(--primary)', fontSize: 18, marginTop: 1 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{item.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header"><i className="bi bi-shield-check" style={{ color: 'var(--success)' }} /> Secure Payment</div>
              <div className="card-body" style={{ padding: '12px 16px', fontSize: 13, color: 'var(--gray-600)' }}>
                Pay with M-Pesa, Visa, or Mastercard. All transactions are encrypted and secure.
              </div>
            </div>

            {product.sold_count > 0 && (
              <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 13, color: '#92400e', display: 'flex', gap: 8, alignItems: 'center' }}>
                <i className="bi bi-fire" style={{ fontSize: 16 }} />
                <span><strong>{product.sold_count}</strong> sold — Popular item!</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="card" style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-200)', overflowX: 'auto' }}>
            {[
              { key: 'description', label: 'Description', icon: 'bi-card-text' },
              { key: 'specs', label: 'Specifications', icon: 'bi-list-ul' },
              { key: 'reviews', label: `Reviews (${product.review_count || 0})`, icon: 'bi-star' },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{ padding: '14px 20px', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap',
                  borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
                  color: tab === t.key ? 'var(--primary)' : 'var(--gray-600)',
                  display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className={`bi ${t.icon}`} /> {t.label}
              </button>
            ))}
          </div>
          <div className="card-body">
            {tab === 'description' && (
              <div style={{ lineHeight: 1.8, color: 'var(--gray-700)', fontSize: 14, whiteSpace: 'pre-wrap' }}>
                {product.description}
              </div>
            )}
            {tab === 'specs' && (
              product.specifications?.length ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <tbody>
                    {product.specifications.map((s, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'var(--gray-50)' : 'var(--white)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--gray-700)', width: '40%', borderBottom: '1px solid var(--gray-100)' }}>{s.key}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--gray-600)', borderBottom: '1px solid var(--gray-100)' }}>{s.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div style={{ color: 'var(--gray-400)', textAlign: 'center', padding: 32 }}>No specifications available</div>
            )}
            {tab === 'reviews' && (
              <div>
                {/* Rating Summary */}
                {product.reviews?.length > 0 && (
                  <div style={{ display: 'flex', gap: 32, marginBottom: 24, flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 56, fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{avgRating}</div>
                      <Stars rating={avgRating} />
                      <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>{product.review_count} reviews</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      {ratingDist.map(({ star, count }) => (
                        <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 12, width: 30 }}>{star} <i className="bi bi-star-fill" style={{ color: 'var(--warning)' }} /></span>
                          <div style={{ flex: 1, height: 8, background: 'var(--gray-200)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: 'var(--warning)', width: `${product.review_count ? (count / product.review_count) * 100 : 0}%`, borderRadius: 4 }} />
                          </div>
                          <span style={{ fontSize: 12, width: 24, color: 'var(--gray-500)' }}>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Review List */}
                {product.reviews?.map(rv => (
                  <div key={rv.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--gray-100)' }}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                        {rv.user_name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{rv.user_name}</span>
                          {rv.is_verified_purchase && <span style={{ background: '#d1fae5', color: '#065f46', fontSize: 11, padding: '2px 7px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}><i className="bi bi-check-circle" /> Verified</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                          <Stars rating={rv.rating} />
                          <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{new Date(rv.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    {rv.title && <div style={{ fontWeight: 600, marginBottom: 4 }}>{rv.title}</div>}
                    <div style={{ fontSize: 14, color: 'var(--gray-600)', lineHeight: 1.7 }}>{rv.body}</div>
                  </div>
                ))}

                {/* Write Review */}
                <div style={{ marginTop: 24, padding: 20, background: 'var(--gray-50)', borderRadius: 'var(--radius)' }}>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Write a Review</div>
                  {!user ? (
                    <div style={{ textAlign: 'center', padding: 20 }}>
                      <p style={{ color: 'var(--gray-500)', marginBottom: 12 }}>Please sign in to leave a review</p>
                      <Link to="/login" className="btn btn-primary">Sign In</Link>
                    </div>
                  ) : (
                    <form onSubmit={handleReview}>
                      <div className="form-group">
                        <label className="form-label">Rating</label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {[1,2,3,4,5].map(r => (
                            <button key={r} type="button" onClick={() => setReviewForm(f => ({ ...f, rating: r }))}
                              style={{ fontSize: 28, color: r <= reviewForm.rating ? 'var(--warning)' : 'var(--gray-300)', transition: 'color 0.15s' }}>
                              <i className="bi bi-star-fill" />
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Title (optional)</label>
                        <input className="form-control" placeholder="Summary of your review" value={reviewForm.title}
                          onChange={e => setReviewForm(f => ({ ...f, title: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Your Review</label>
                        <textarea className="form-control" rows={4} placeholder="Share your experience with this product..." required
                          value={reviewForm.body} onChange={e => setReviewForm(f => ({ ...f, body: e.target.value }))} />
                      </div>
                      <button type="submit" className="btn btn-primary" disabled={submittingReview}>
                        {submittingReview ? 'Submitting...' : 'Submit Review'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div className="section">
            <div className="section-header">
              <div className="section-title">Related <span>Products</span></div>
            </div>
            <div className="product-scroll">
              {related.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}