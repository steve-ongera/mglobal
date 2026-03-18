import { useEffect, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { categoryAPI, productAPI } from '../services/api'
import ProductCard from '../components/ProductCard'

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest' },
  { value: 'price', label: 'Price ↑' },
  { value: '-price', label: 'Price ↓' },
  { value: '-sold_count', label: 'Best Selling' },
]

const CAT_GRADIENTS = [
  'linear-gradient(135deg, #0a2463, #1a3a8f)',
  'linear-gradient(135deg, #c0392b, #e74c3c)',
  'linear-gradient(135deg, #134e4a, #0f766e)',
  'linear-gradient(135deg, #7c3aed, #8b5cf6)',
  'linear-gradient(135deg, #d97706, #f59e0b)',
  'linear-gradient(135deg, #1e40af, #3b82f6)',
]

export default function Category() {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [category, setCategory] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  const page = parseInt(searchParams.get('page') || '1')
  const ordering = searchParams.get('ordering') || '-created_at'
  const minPrice = searchParams.get('min_price') || ''
  const maxPrice = searchParams.get('max_price') || ''
  const [priceFrom, setPriceFrom] = useState(minPrice)
  const [priceTo, setPriceTo] = useState(maxPrice)

  useEffect(() => {
    setLoading(true)
    categoryAPI.detail(slug).then(setCategory).catch(() => {})
    const params = { 'category__slug': slug, ordering }
    if (minPrice) params.min_price = minPrice
    if (maxPrice) params.max_price = maxPrice
    if (page > 1) params.page = page
    productAPI.list(params).then(data => {
      setProducts(data.results || data)
      setTotal(data.count || (data.results || data).length)
      setTotalPages(Math.ceil((data.count || (data.results || data).length) / 24))
    }).catch(() => setProducts([])).finally(() => setLoading(false))
  }, [slug, ordering, minPrice, maxPrice, page])

  useEffect(() => {
    if (category) document.title = `${category.meta_title || category.name} — Mgobal`
  }, [category])

  const update = (key, val) => {
    const p = new URLSearchParams(searchParams)
    if (val) p.set(key, val); else p.delete(key)
    p.delete('page')
    setSearchParams(p)
  }

  const applyPrice = () => {
    const p = new URLSearchParams(searchParams)
    if (priceFrom) p.set('min_price', priceFrom); else p.delete('min_price')
    if (priceTo) p.set('max_price', priceTo); else p.delete('max_price')
    p.delete('page')
    setSearchParams(p)
  }

  const gradIdx = category ? category.name.charCodeAt(0) % CAT_GRADIENTS.length : 0

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="breadcrumb">
          <Link to="/">Home</Link> <i className="bi bi-chevron-right" />
          <Link to="/products">Products</Link> <i className="bi bi-chevron-right" />
          <span>{category?.name || '...'}</span>
        </div>

        {/* Category Hero */}
        {category && (
          <div className="category-hero" style={{ background: CAT_GRADIENTS[gradIdx] }}>
            <div>
              {category.icon && <i className={`bi bi-${category.icon}`} style={{ fontSize: 52, opacity: .7 }} />}
            </div>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,4vw,32px)', fontWeight: 800, marginBottom: 6 }}>
                {category.name}
              </h1>
              {category.description && (
                <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 14 }}>{category.description}</p>
              )}
              <div style={{ marginTop: 10, fontSize: 13, color: 'rgba(255,255,255,.6)' }}>
                {total > 0 && <><i className="bi bi-grid" /> {total.toLocaleString()} products</>}
              </div>
            </div>
          </div>
        )}

        {/* Sub-categories */}
        {category?.children?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {category.children.map(child => (
                <Link key={child.id} to={`/category/${child.slug}`}
                  style={{ padding: '7px 14px', border: '1.5px solid var(--gray-300)', borderRadius: 'var(--radius-full)', fontSize: 13, fontWeight: 500, color: 'var(--gray-700)', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gray-300)'; e.currentTarget.style.color = 'var(--gray-700)' }}>
                  {child.icon && <i className={`bi bi-${child.icon}`} />} {child.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="page-two-col">
          {/* Filter Sidebar */}
          <div className="hide-mobile">
            <div className="card filter-sidebar">
              <div className="card-header"><i className="bi bi-funnel" /> Filter</div>
              <div style={{ padding: '8px 16px' }}>
                <div className="filter-group">
                  <div className="filter-title">Sort By</div>
                  {SORT_OPTIONS.map(o => (
                    <label key={o.value} className="filter-option">
                      <input type="radio" name="sort" checked={ordering === o.value} onChange={() => update('ordering', o.value)} />
                      {o.label}
                    </label>
                  ))}
                </div>
                <div className="filter-group">
                  <div className="filter-title">Price Range (KSh)</div>
                  <div className="price-range" style={{ marginBottom: 8 }}>
                    <input type="number" className="form-control" placeholder="Min" value={priceFrom} onChange={e => setPriceFrom(e.target.value)} />
                    <input type="number" className="form-control" placeholder="Max" value={priceTo} onChange={e => setPriceTo(e.target.value)} />
                  </div>
                  <button className="btn btn-primary btn-sm btn-full" onClick={applyPrice}>Apply</button>
                </div>
              </div>
            </div>
          </div>

          {/* Products */}
          <div>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, color: 'var(--gray-600)', flex: 1 }}>
                {loading ? 'Loading...' : <><strong>{total.toLocaleString()}</strong> products</>}
              </span>
              <select className="form-control" style={{ width: 160, height: 36, fontSize: 13 }}
                value={ordering} onChange={e => update('ordering', e.target.value)}>
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {loading ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : products.length === 0 ? (
              <div className="empty-state">
                <i className="bi bi-box" />
                <h3>No products in this category</h3>
                <p>Check back soon or explore other categories</p>
                <Link to="/products" className="btn btn-primary">Browse All</Link>
              </div>
            ) : (
              <>
                <div className="product-grid">
                  {products.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
                {totalPages > 1 && (
                  <div className="pagination">
                    <div className={`page-item ${page === 1 ? 'disabled' : ''}`} onClick={() => page > 1 && update('page', page - 1)}>
                      <i className="bi bi-chevron-left" />
                    </div>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p2 => (
                      <div key={p2} className={`page-item ${p2 === page ? 'active' : ''}`} onClick={() => update('page', p2)}>{p2}</div>
                    ))}
                    <div className={`page-item ${page === totalPages ? 'disabled' : ''}`} onClick={() => page < totalPages && update('page', page + 1)}>
                      <i className="bi bi-chevron-right" />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}