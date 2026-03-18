import { Link } from 'react-router-dom'
import { useApp } from '../App'
import { cartAPI, wishlistAPI } from '../services/api'
import { useState } from 'react'

const PLACEHOLDER = 'https://placehold.co/300x300/f3f4f6/9ca3af?text=No+Image'

function Stars({ rating }) {
  return (
    <div className="stars">
      {[1,2,3,4,5].map(i => (
        <i key={i} className={`bi ${i <= Math.round(rating) ? 'bi-star-fill' : i - 0.5 <= rating ? 'bi-star-half' : 'bi-star'}`} />
      ))}
    </div>
  )
}

export { Stars }

export default function ProductCard({ product }) {
  const { user, refreshCart, wishlist, setWishlist, toast } = useApp()
  const [adding, setAdding] = useState(false)
  const inWishlist = wishlist.some(w => w.product?.id === product.id)

  const handleAddCart = async (e) => {
    e.preventDefault()
    if (!user) { toast('Please login to add items to cart', 'warning'); return }
    setAdding(true)
    try {
      await cartAPI.add(product.id, 1)
      await refreshCart()
      toast(`${product.name.slice(0, 30)}... added to cart`, 'success')
    } catch {
      toast('Failed to add to cart', 'error')
    } finally {
      setAdding(false)
    }
  }

  const handleWishlist = async (e) => {
    e.preventDefault()
    if (!user) { toast('Please login', 'warning'); return }
    try {
      const res = await wishlistAPI.toggle(product.id)
      if (res.action === 'added') {
        setWishlist(prev => [...prev, { product }])
        toast('Added to wishlist', 'success')
      } else {
        setWishlist(prev => prev.filter(w => w.product?.id !== product.id))
        toast('Removed from wishlist', 'info')
      }
    } catch {}
  }

  const img = product.primary_image || PLACEHOLDER
  const price = parseFloat(product.effective_price || product.price)
  const compare = product.compare_price ? parseFloat(product.compare_price) : null
  const discount = product.discount_percent

  return (
    <Link to={`/products/${product.slug}`} className="product-card">
      <div className="product-card-img">
        <img src={img} alt={product.name} loading="lazy" onError={e => e.target.src = PLACEHOLDER} />
        {discount > 0 && <span className="product-badge badge-discount">-{discount}%</span>}
        {product.is_flash_sale && !discount && <span className="product-badge badge-flash"><i className="bi bi-lightning-fill" /> Flash</span>}
        <button className={`product-wishlist ${inWishlist ? 'active' : ''}`} onClick={handleWishlist} title="Add to wishlist">
          <i className={`bi ${inWishlist ? 'bi-heart-fill' : 'bi-heart'}`} />
        </button>
      </div>
      <div className="product-card-body">
        <div className="product-name">{product.name}</div>
        {product.avg_rating > 0 && (
          <div className="product-rating">
            <Stars rating={product.avg_rating} />
            <span className="rating-count">({product.review_count})</span>
          </div>
        )}
        <div className="product-price">
          <span className="price-current">KSh {price.toLocaleString()}</span>
          {compare && compare > price && (
            <span className="price-original">KSh {compare.toLocaleString()}</span>
          )}
          {discount > 0 && <span className="price-off">{discount}% off</span>}
        </div>
        {!product.in_stock && <span style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4, display: 'block' }}>Out of stock</span>}
      </div>
      <div className="product-card-footer">
        <button className="btn-add-cart" onClick={handleAddCart} disabled={adding || !product.in_stock}>
          <i className="bi bi-bag-plus" />
          {adding ? 'Adding...' : 'Add to Cart'}
        </button>
      </div>
    </Link>
  )
}