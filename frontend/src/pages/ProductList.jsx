import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { productAPI, categoryAPI, brandAPI } from '../services/api'
import ProductCard from '../components/ProductCard'

const SORT_OPTIONS = [
  { value: '-created_at', label: 'Newest First' },
  { value: 'price', label: 'Price: Low to High' },
  { value: '-price', label: 'Price: High to Low' },
  { value: '-sold_count', label: 'Best Selling' },
  { value: '-views', label: 'Most Popular' },
]

export default function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const page = parseInt(searchParams.get('page') || '1')
  const ordering = searchParams.get('ordering') || '-created_at'
  const selectedCat = searchParams.get('category__slug') || ''
  const selectedBrand = searchParams.get('brand__slug') || ''
  const minPrice = searchParams.get('min_price') || ''
  const maxPrice = searchParams.get('max_price') || ''
  const featured = searchParams.get('is_featured') || ''

  const updateParam = (key, val) => {
    const params = new URLSearchParams(searchParams)
    if (val) params.set(key, val); else params.delete(key)
    params.delete('page')
    setSearchParams(params)
  }

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (ordering) params.ordering = ordering
      if (selectedCat) params['category__slug'] = selectedCat
      if (selectedBrand) params['brand__slug'] = selectedBrand
      if (minPrice) params.min_price = minPrice
      if (maxPrice) params.max_price = maxPrice
      if (featured) params.is_featured = featured
      if (page > 1) params.page = page
      const data = await productAPI.list(params)
      setProducts(data.results || data)
      setTotalCount(data.count || (data.results || data).length)
      setTotalPages(Math.ceil((data.count || (data.results || data).length) / 24))
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [ordering, selectedCat, selectedBrand, minPrice, maxPrice, featured, page])

  useEffect(() => {
    document.title = 'All Products — Mgobal'
    categoryAPI.list().then(setBrands).catch(() => {})
    categoryAPI.all().then(setCategories).catch(() => {})
    brandAPI.list().then(setBrands).catch(() => {})
    fetchProducts()
  }, [fetchProducts])

  const [priceFrom, setPriceFrom] = useState(minPrice)
  const [priceTo, setPriceTo] = useState(maxPrice)
  const applyPrice = () => {
    const p = new URLSearchParams(searchParams)
    if (priceFrom) p.set('min_price', priceFrom); else p.delete('min_price')
    if (priceTo) p.set('max_price', priceTo); else p.delete('max_price')
    p.delete('page')
    setSearchParams(p)
  }

  const clearAll = () => {
    setSearchParams({})
    setPriceFrom('')
    setPriceTo('')
  }

  const hasFilters = selectedCat || selectedBrand || minPrice || maxPrice || featured

  const Sidebar = () => (
    <div className="card filter-sidebar">
      <div className="card-header" style={{ justifyContent: 'space-between' }}>
        <span><i className="bi bi-funnel" /> Filters</span>
        {hasFilters && (
          <button onClick={clearAll} style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>
            Clear All
          </button>
        )}
      </div>
      <div className="card-body" style={{ padding: '8px 16px' }}>

        {/* Categories */}
        <div className="filter-group">
          <div className="filter-title">Category</div>
          {categories.map(cat => (
            <label key={cat.id} className="filter-option">
              <input type="radio" name="cat" checked={selectedCat === cat.slug}
                onChange={() => updateParam('category__slug', selectedCat === cat.slug ? '' : cat.slug)} />
              {cat.name}
            </label>
          ))}
        </div>

        {/* Price Range */}
        <div className="filter-group">
          <div className="filter-title">Price Range (KSh)</div>
          <div className="price-range" style={{ marginBottom: 8 }}>
            <input type="number" className="form-control" placeholder="Min" value={priceFrom}
              onChange={e => setPriceFrom(e.target.value)} />
            <input type="number" className="form-control" placeholder="Max" value={priceTo}
              onChange={e => setPriceTo(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm btn-full" onClick={applyPrice}>Apply Price</button>
        </div>

        {/* Brands */}
        {brands.length > 0 && (
          <div className="filter-group">
            <div className="filter-title">Brand</div>
            {brands.slice(0, 8).map(b => (
              <label key={b.id} className="filter-option">
                <input type="radio" name="brand" checked={selectedBrand === b.slug}
                  onChange={() => updateParam('brand__slug', selectedBrand === b.slug ? '' : b.slug)} />
                {b.name}
              </label>
            ))}
          </div>
        )}

        {/* Quick Filters */}
        <div className="filter-group">
          <div className="filter-title">Quick Filters</div>
          <label className="filter-option">
            <input type="checkbox" checked={featured === 'true'}
              onChange={() => updateParam('is_featured', featured === 'true' ? '' : 'true')} />
            Featured Products
          </label>
        </div>
      </div>
    </div>
  )

  return (
    <div className="page-wrapper">
      <div className="container">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <Link to="/">Home</Link>
          <i className="bi bi-chevron-right" />
          <span>All Products</span>
          {totalCount > 0 && <span style={{ marginLeft: 'auto', color: 'var(--gray-400)', fontSize: 12 }}>{totalCount.toLocaleString()} products</span>}
        </div>

        {/* Mobile filter bar */}
        <div className="show-mobile" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button className="btn btn-outline btn-sm" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ flex: 1 }}>
            <i className="bi bi-funnel" /> Filters {hasFilters && <span className="badge" style={{ position: 'static', background: 'var(--primary)' }}>!</span>}
          </button>
          <select className="form-control" style={{ height: 36, flex: 1, fontSize: 13 }}
            value={ordering} onChange={e => updateParam('ordering', e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {sidebarOpen && (
          <div className="show-mobile" style={{ marginBottom: 16 }}>
            <Sidebar />
          </div>
        )}

        <div className="page-two-col">
          {/* Sidebar */}
          <div className="hide-mobile">
            <Sidebar />
          </div>

          {/* Products */}
          <div>
            {/* Sort + Results bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 14, color: 'var(--gray-600)' }}>
                {loading ? 'Loading...' : <>{totalCount.toLocaleString()} <span style={{ fontWeight: 600 }}>products found</span></>}
              </div>
              <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>Sort by:</span>
                <select className="form-control" style={{ height: 36, width: 180, fontSize: 13 }}
                  value={ordering} onChange={e => updateParam('ordering', e.target.value)}>
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Active filters */}
            {hasFilters && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {selectedCat && (
                  <span style={{ background: 'var(--primary)', color: 'white', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {selectedCat} <button onClick={() => updateParam('category__slug', '')} style={{ color: 'rgba(255,255,255,.7)', fontSize: 14 }}>×</button>
                  </span>
                )}
                {minPrice && <span style={{ background: 'var(--primary)', color: 'white', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>From KSh {minPrice} <button onClick={() => updateParam('min_price', '')} style={{ color: 'rgba(255,255,255,.7)', fontSize: 14 }}>×</button></span>}
                {maxPrice && <span style={{ background: 'var(--primary)', color: 'white', padding: '4px 10px', borderRadius: 'var(--radius-full)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>Up to KSh {maxPrice} <button onClick={() => updateParam('max_price', '')} style={{ color: 'rgba(255,255,255,.7)', fontSize: 14 }}>×</button></span>}
              </div>
            )}

            {loading ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : products.length === 0 ? (
              <div className="empty-state">
                <i className="bi bi-search" />
                <h3>No products found</h3>
                <p>Try adjusting your filters or search terms</p>
                <button className="btn btn-primary" onClick={clearAll}>Clear Filters</button>
              </div>
            ) : (
              <>
                <div className="product-grid">
                  {products.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pagination">
                    <div className={`page-item ${page === 1 ? 'disabled' : ''}`}
                      onClick={() => page > 1 && updateParam('page', page - 1)}>
                      <i className="bi bi-chevron-left" />
                    </div>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let p2 = i + 1
                      if (totalPages > 7) {
                        if (page <= 4) p2 = i + 1
                        else if (page >= totalPages - 3) p2 = totalPages - 6 + i
                        else p2 = page - 3 + i
                      }
                      return (
                        <div key={p2} className={`page-item ${p2 === page ? 'active' : ''}`}
                          onClick={() => updateParam('page', p2)}>{p2}</div>
                      )
                    })}
                    <div className={`page-item ${page === totalPages ? 'disabled' : ''}`}
                      onClick={() => page < totalPages && updateParam('page', page + 1)}>
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