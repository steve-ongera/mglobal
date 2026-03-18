import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { productAPI, bannerAPI, categoryAPI } from '../services/api'
import ProductCard from '../components/ProductCard'

// ── Countdown ─────────────────────────────────────────────────────────────────

function Countdown({ endTime }) {
  const [time, setTime] = useState({ h: 0, m: 0, s: 0 })
  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, new Date(endTime) - Date.now())
      setTime({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [endTime])
  const pad = n => String(n).padStart(2, '0')
  return (
    <div className="countdown">
      <div className="countdown-item">{pad(time.h)}<span>HRS</span></div>
      <div className="countdown-item">{pad(time.m)}<span>MIN</span></div>
      <div className="countdown-item">{pad(time.s)}<span>SEC</span></div>
    </div>
  )
}

// ── Slider ────────────────────────────────────────────────────────────────────

const DEMO_BANNERS = [
  {
    id: 1,
    title: 'Massive Tech Sale',
    subtitle: 'Up to 50% off on Electronics — Limited time offer!',
    bg: 'linear-gradient(135deg, #0a2463 0%, #1a3a8f 50%, #274690 100%)',
    accent: '#f7b731',
    cta: 'Shop Now',
    link: '/category/electronics',
    icon: 'bi-laptop',
  },
  {
    id: 2,
    title: 'Fashion Forward',
    subtitle: 'New arrivals every week — Dress for the season',
    bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    accent: '#e94560',
    cta: 'Explore Styles',
    link: '/category/fashion',
    icon: 'bi-bag-heart',
  },
  {
    id: 3,
    title: 'Home & Living',
    subtitle: 'Transform your space — Best prices guaranteed',
    bg: 'linear-gradient(135deg, #134e4a 0%, #0f766e 50%, #14b8a6 100%)',
    accent: '#fbbf24',
    cta: 'Discover More',
    link: '/category/home',
    icon: 'bi-house-heart',
  },
]

function HeroSlider() {
  const [current, setCurrent] = useState(0)
  const timerRef = useRef(null)

  const goTo = (i) => { setCurrent(i); resetTimer() }
  const resetTimer = () => {
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % DEMO_BANNERS.length), 5000)
  }

  useEffect(() => { resetTimer(); return () => clearInterval(timerRef.current) }, [])

  return (
    <div className="slider-container" style={{ minHeight: 280, borderRadius: 'var(--radius-lg)' }}>
      <div className="slider-track" style={{ transform: `translateX(-${current * 100}%)` }}>
        {DEMO_BANNERS.map(b => (
          <div key={b.id} className="slide">
            <div style={{ background: b.bg, borderRadius: 'var(--radius-lg)', padding: '40px 48px', minHeight: 280, display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: b.accent, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Special Offer</div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 4vw, 42px)', fontWeight: 800, color: 'white', lineHeight: 1.1, marginBottom: 12 }}>{b.title}</h1>
                <p style={{ color: 'rgba(255,255,255,.75)', marginBottom: 24, fontSize: 15 }}>{b.subtitle}</p>
                <Link to={b.link} className="btn btn-accent btn-lg">{b.cta} <i className="bi bi-arrow-right" /></Link>
              </div>
              <div className="hide-mobile">
                <i className={`bi ${b.icon}`} style={{ fontSize: 120, color: 'rgba(255,255,255,.15)' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <button className="slider-btn prev" onClick={() => goTo((current - 1 + DEMO_BANNERS.length) % DEMO_BANNERS.length)}><i className="bi bi-chevron-left" /></button>
      <button className="slider-btn next" onClick={() => goTo((current + 1) % DEMO_BANNERS.length)}><i className="bi bi-chevron-right" /></button>
      <div className="slider-dots">
        {DEMO_BANNERS.map((_, i) => (
          <div key={i} className={`slider-dot ${i === current ? 'active' : ''}`} onClick={() => goTo(i)} />
        ))}
      </div>
    </div>
  )
}

// ── Category Icons ────────────────────────────────────────────────────────────

const CAT_COLORS = ['#e3f2fd', '#fce4ec', '#e8f5e9', '#fff3e0', '#f3e5f5', '#e0f7fa', '#fff8e1', '#fbe9e7']
const CAT_ICON_COLORS = ['#1976d2', '#c2185b', '#388e3c', '#f57c00', '#7b1fa2', '#0097a7', '#f9a825', '#d84315']

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [featured, setFeatured] = useState([])
  const [flashSale, setFlashSale] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Mgobal — Kenya\'s Premier Online Store'
    Promise.all([
      productAPI.featured().catch(() => []),
      productAPI.flashSale().catch(() => []),
      categoryAPI.list().catch(() => []),
    ]).then(([feat, flash, cats]) => {
      setFeatured(feat)
      setFlashSale(flash)
      setCategories(cats)
      setLoading(false)
    })
  }, [])

  const flashEnd = flashSale[0]?.flash_sale_end || new Date(Date.now() + 6 * 3600000).toISOString()

  return (
    <div>
      {/* Hero */}
      <section style={{ background: 'var(--white)', padding: '16px 0' }}>
        <div className="container">
          <div className="hero-grid">
            <HeroSlider />
            <div className="hero-side">
              {[
                { bg: 'linear-gradient(135deg, #f7b731, #f59e0b)', title: 'Daily Deals', sub: 'Save up to 70%', icon: 'bi-percent', link: '/products' },
                { bg: 'linear-gradient(135deg, #10b981, #059669)', title: 'Free Pickup', sub: 'At 200+ stations', icon: 'bi-geo-alt', link: '/products' },
              ].map((item, i) => (
                <Link key={i} to={item.link} className="hero-side-item" style={{ background: item.bg, textDecoration: 'none' }}>
                  <i className={`bi ${item.icon}`} style={{ fontSize: 32, color: 'rgba(255,255,255,.7)', position: 'absolute', top: 16, right: 16 }} />
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'white' }}>{item.title}</div>
                  <div style={{ color: 'rgba(255,255,255,.85)', fontSize: 13, marginTop: 4 }}>{item.sub}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Category Grid */}
      <section className="section" style={{ background: 'var(--white)', marginTop: 12 }}>
        <div className="container">
          <div className="section-header">
            <div className="section-title">Shop by <span>Category</span></div>
            <Link to="/products" className="section-link">View all <i className="bi bi-arrow-right" /></Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 12 }}>
            {categories.slice(0, 10).map((cat, i) => (
              <Link key={cat.id} to={`/category/${cat.slug}`} style={{ textDecoration: 'none', textAlign: 'center' }}>
                <div style={{
                  background: CAT_COLORS[i % CAT_COLORS.length],
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px 8px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  transition: 'all var(--transition)',
                  cursor: 'pointer',
                }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >
                  <i className={`bi bi-${cat.icon || 'grid'}`} style={{ fontSize: 28, color: CAT_ICON_COLORS[i % CAT_ICON_COLORS.length] }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-700)', lineHeight: 1.2 }}>{cat.name}</span>
                </div>
              </Link>
            ))}
            <Link to="/products" style={{ textDecoration: 'none', textAlign: 'center' }}>
              <div style={{ background: 'var(--gray-100)', borderRadius: 'var(--radius-lg)', padding: '16px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <i className="bi bi-grid-3x3-gap" style={{ fontSize: 28, color: 'var(--gray-500)' }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-600)' }}>See All</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Flash Sale */}
      {(flashSale.length > 0 || true) && (
        <section className="section">
          <div className="container">
            <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--gray-200)' }}>
              <div className="flash-sale-header">
                <i className="bi bi-lightning-charge-fill" style={{ fontSize: 22, color: 'white' }} />
                <div className="title">Flash Sale</div>
                <Countdown endTime={flashEnd} />
              </div>
              <div style={{ padding: '16px 16px 8px' }}>
                <div className="product-scroll">
                  {(flashSale.length > 0 ? flashSale : featured).slice(0, 8).map(p => (
                    <ProductCard key={p.id} product={{ ...p, is_flash_sale: true }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div className="section-title">Featured <span>Products</span></div>
            <Link to="/products?featured=true" className="section-link">See all <i className="bi bi-arrow-right" /></Link>
          </div>
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <div className="product-grid">
              {featured.slice(0, 12).map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* Promo Banners */}
      <section className="section">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {[
              { title: 'Sell on Mgobal', sub: 'Reach millions of customers', btn: 'Start Selling', icon: 'bi-shop', bg: 'linear-gradient(135deg, #1e3a5f, #0a2463)' },
              { title: 'M-Pesa Payments', sub: 'Safe & instant checkout', btn: 'Learn More', icon: 'bi-phone', bg: 'linear-gradient(135deg, #007a3d, #00a651)' },
              { title: 'Fast Delivery', sub: 'Pickup stations across Kenya', btn: 'Find Station', icon: 'bi-geo-alt', bg: 'linear-gradient(135deg, #c0392b, #e74c3c)' },
            ].map((b, i) => (
              <div key={i} style={{ background: b.bg, borderRadius: 'var(--radius-lg)', padding: '24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <i className={`bi ${b.icon}`} style={{ fontSize: 40, color: 'rgba(255,255,255,.4)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, color: 'white' }}>{b.title}</div>
                  <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, margin: '4px 0 12px' }}>{b.sub}</div>
                  <Link to="/products" className="btn btn-accent btn-sm">{b.btn}</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* All Products */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div className="section-title">Just for <span>You</span></div>
            <Link to="/products" className="section-link">Browse all <i className="bi bi-arrow-right" /></Link>
          </div>
          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : (
            <div className="product-grid">
              {featured.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}