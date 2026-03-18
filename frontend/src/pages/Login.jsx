import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { authAPI } from '../services/api'
import { useApp } from '../App'

export default function Login() {
  const { login, toast } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/'

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.email) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password) e.password = 'Password is required'
    return e
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    setLoading(true)
    try {
      const data = await authAPI.login(form)
      login(data.user, { access: data.access, refresh: data.refresh })
      toast(`Welcome back, ${data.user.first_name || data.user.username}!`, 'success')
      navigate(from, { replace: true })
    } catch (err) {
      const msg = err?.non_field_errors?.[0] || err?.detail || 'Login failed. Check your credentials.'
      setErrors({ general: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <Link to="/" className="auth-logo">mg<span>o</span>bal</Link>
        <div className="auth-title">Welcome back</div>
        <div className="auth-subtitle">Sign in to your account to continue shopping</div>

        {errors.general && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
            <i className="bi bi-exclamation-circle" /> {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', fontSize: 16 }}>
                <i className="bi bi-envelope" />
              </span>
              <input
                type="email"
                name="email"
                className={`form-control ${errors.email ? 'error' : ''}`}
                style={{ paddingLeft: 38 }}
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
              />
            </div>
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label className="form-label" style={{ margin: 0 }}>Password</label>
              <a href="#" style={{ fontSize: 12, color: 'var(--primary)' }}>Forgot password?</a>
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', fontSize: 16 }}>
                <i className="bi bi-lock" />
              </span>
              <input
                type={showPw ? 'text' : 'password'}
                name="password"
                className={`form-control ${errors.password ? 'error' : ''}`}
                style={{ paddingLeft: 38, paddingRight: 44 }}
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', fontSize: 17 }}>
                <i className={`bi ${showPw ? 'bi-eye-slash' : 'bi-eye'}`} />
              </button>
            </div>
            {errors.password && <div className="form-error">{errors.password}</div>}
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" style={{ marginTop: 8 }} disabled={loading}>
            {loading ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Signing in...</> : 'Sign In'}
          </button>
        </form>

        <div className="divider"><span className="divider-text">Don't have an account?</span></div>

        <Link to="/register" className="btn btn-outline btn-full">
          <i className="bi bi-person-plus" /> Create Account
        </Link>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--gray-400)' }}>
          By continuing, you agree to Mgobal's <a href="#" style={{ color: 'var(--primary)' }}>Terms of Service</a> and <a href="#" style={{ color: 'var(--primary)' }}>Privacy Policy</a>
        </div>
      </div>
    </div>
  )
}