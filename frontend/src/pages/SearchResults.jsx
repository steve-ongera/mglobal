import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { productAPI } from '../services/api'
import ProductCard from '../components/ProductCard'

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Most Relevant' },
  { value: 'price', label: 'Price: Low to High' },
  { value: '-price', label: 'Price: High to Low' },
  { value: '-sold_count', label: 'Best Selling' },
]

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const ordering = searchParams.get('ordering') || '-created_at'
  const minPrice = searchParams.get('min_price') || ''
  const maxPrice = searchParams.get('max_price') || ''
  const page = parseInt(searchParams.get('page') || '1')

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [suggestions, setSuggestions] = useState([])

  const update = (key, val) => {
    const p = new URLSearchParams(searchParams)
    if (val) p.set(key, val); else p.delete(key)
    p.delete('page')
    setSearchParams(p)
  }

  useEffect(() => {
    if (!query) return
    document.title = `"${query}" — Search Results — Mgobal`
    setLoading(true)
    const params = { search: query, ordering }
    if (minPrice) params.min_price = minPrice
    if (maxPrice) params.max_price = maxPrice
    if (page > 1) params.page = page
    productAPI.list(params).then(data => {
      setProducts(data.results || data)
      setTotal(data.count || (data.results || data).length)
      setTotalPages(Math.ceil((data.count || (data.results || data).length) / 24))
    }).catch(() => setProducts([])).finally(() => setLoading(false))
  }, [query, ordering, minPrice, maxPrice, page])

  const POPULAR = ['Samsung', 'iPhone', 'Laptop', 'Shoes', 'Dress', 'Sofa', 'TV', 'Blender']

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="breadcrumb">
          <Link to="/">Home</Link> <i className="bi bi-chevron-right" />
          <span>Search</span>
        </div>

        {/* Search Header */}
        <div className="search-header">
          {query ? (
            <>
              <div className="search-query">
                Results for: <span>"{query}"</span>
              </div>
              {!loading && (
                <div className="search-count">
                  {total > 0 ? `${total.toLocaleString()} products found` : 'No products found'}
                </div>
              )}
            </>
          ) : (
            <div className="search-query">Start typing to search</div>
          )}
        </div>

        {!query ? (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Popular Searches</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {POPULAR.map(s => (
                  <Link key={s} to={`/search?q=${encodeURIComponent(s)}`}
                    style={{ padding: '7px 16px', border: '1.5px solid var(--gray-300)', borderRadius: 'var(--radius-full)', fontSize: 13, color: 'var(--gray-700)', transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gray-300)'; e.currentTarget.style.color = 'var(--gray-700)' }}>
                    <i className="bi bi-search" /> {s}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : products.length === 0 ? (
          <div>
            <div className="empty-state">
              <i className="bi bi-search" />
              <h3>No results for "{query}"</h3>
              <p>Try different keywords, check spelling, or browse our categories</p>
            </div>
            <div style={{ marginTop: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>You might also like</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {POPULAR.map(s => (
                  <Link key={s} to={`/search?q=${encodeURIComponent(s)}`}
                    style={{ padding: '7px 16px', border: '1.5px solid var(--gray-300)', borderRadius: 'var(--radius-full)', fontSize: 13, color: 'var(--gray-700)' }}>
                    {s}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Sort bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, fontSize: 14, color: 'var(--gray-600)' }}>
                <strong>{total.toLocaleString()}</strong> results for <strong>"{query}"</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>Sort:</span>
                <select className="form-control" style={{ height: 36, width: 180, fontSize: 13 }}
                  value={ordering} onChange={e => update('ordering', e.target.value)}>
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {/* Price Filter */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="number" className="form-control" placeholder="Min KSh" style={{ width: 110, height: 36, fontSize: 13 }}
                  defaultValue={minPrice} onBlur={e => update('min_price', e.target.value)} />
                <span style={{ color: 'var(--gray-400)' }}>—</span>
                <input type="number" className="form-control" placeholder="Max KSh" style={{ width: 110, height: 36, fontSize: 13 }}
                  defaultValue={maxPrice} onBlur={e => update('max_price', e.target.value)} />
              </div>
            </div>

            <div className="product-grid">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <div className={`page-item ${page === 1 ? 'disabled' : ''}`} onClick={() => page > 1 && update('page', page - 1)}>
                  <i className="bi bi-chevron-left" />
                </div>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p2 => (
                  <div key={p2} className={`page-item ${p2 === page ? 'active' : ''}`} onClick={() => update('page', p2)}>{p2}</div>
                ))}
                <div className={`page-item ${page === totalPages ? 'disabled' : ''}`} onClick={() => page < totalPages && update('page', page + 1)}>
                  <i className="bi bi-chevron-right" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}