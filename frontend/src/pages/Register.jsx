import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import { useApp } from '../App'

export default function Register() {
  const { login, toast } = useApp()
  const navigate = useNavigate()

  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', username: '', password: '', password2: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [step, setStep] = useState(1)

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setErrors(prev => ({ ...prev, [e.target.name]: '' }))
  }

  const validateStep1 = () => {
    const e = {}
    if (!form.first_name.trim()) e.first_name = 'First name required'
    if (!form.last_name.trim()) e.last_name = 'Last name required'
    if (!form.email) e.email = 'Email required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    if (!form.phone) e.phone = 'Phone number required'
    else if (!/^(\+254|0)[17]\d{8}$/.test(form.phone)) e.phone = 'Enter valid Kenyan phone (e.g. 0712345678)'
    return e
  }

  const validateStep2 = () => {
    const e = {}
    if (!form.username.trim()) e.username = 'Username required'
    else if (form.username.length < 3) e.username = 'Min 3 characters'
    if (!form.password) e.password = 'Password required'
    else if (form.password.length < 6) e.password = 'Min 6 characters'
    if (form.password !== form.password2) e.password2 = 'Passwords do not match'
    return e
  }

  const handleNext = () => {
    const e = validateStep1()
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    // Auto-generate username suggestion
    if (!form.username) {
      setForm(f => ({ ...f, username: (f.first_name + f.last_name).toLowerCase().replace(/\s/g, '') + Math.floor(Math.random() * 99) }))
    }
    setStep(2)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const e2 = validateStep2()
    if (Object.keys(e2).length) { setErrors(e2); return }
    setLoading(true)
    try {
      const data = await authAPI.register(form)
      login(data.user, { access: data.access, refresh: data.refresh })
      toast('Account created! Welcome to Mgobal 🎉', 'success')
      navigate('/')
    } catch (err) {
      const msgs = {}
      if (err.email) msgs.email = err.email[0]
      if (err.username) msgs.username = err.username[0]
      if (err.password) msgs.password = err.password[0]
      if (err.non_field_errors) msgs.general = err.non_field_errors[0]
      setErrors(msgs)
      if (msgs.email) setStep(1)
    } finally {
      setLoading(false)
    }
  }

  const Field = ({ name, label, type = 'text', placeholder, icon, autoComplete }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', fontSize: 16 }}>
          <i className={`bi bi-${icon}`} />
        </span>
        <input
          type={name === 'password' || name === 'password2' ? (showPw ? 'text' : 'password') : type}
          name={name}
          className={`form-control ${errors[name] ? 'error' : ''}`}
          style={{ paddingLeft: 38 }}
          placeholder={placeholder}
          value={form[name]}
          onChange={handleChange}
          autoComplete={autoComplete}
        />
        {(name === 'password' || name === 'password2') && (
          <button type="button" onClick={() => setShowPw(!showPw)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', fontSize: 17 }}>
            <i className={`bi ${showPw ? 'bi-eye-slash' : 'bi-eye'}`} />
          </button>
        )}
      </div>
      {errors[name] && <div className="form-error">{errors[name]}</div>}
    </div>
  )

  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <Link to="/" className="auth-logo">mg<span>o</span>bal</Link>
        <div className="auth-title">Create your account</div>
        <div className="auth-subtitle">Join millions of shoppers across Kenya</div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
          {[1, 2].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: s <= step ? 'var(--primary)' : 'var(--gray-200)',
                color: s <= step ? 'white' : 'var(--gray-500)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, transition: 'all 0.3s'
              }}>
                {s < step ? <i className="bi bi-check" /> : s}
              </div>
              <div style={{ fontSize: 11, color: s <= step ? 'var(--primary)' : 'var(--gray-400)', fontWeight: s === step ? 600 : 400 }}>
                {s === 1 ? 'Personal Info' : 'Account Setup'}
              </div>
              {s < 2 && <div style={{ flex: 1, height: 2, background: step > s ? 'var(--primary)' : 'var(--gray-200)', transition: 'background 0.3s' }} />}
            </div>
          ))}
        </div>

        {errors.general && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: 13, marginBottom: 16 }}>
            <i className="bi bi-exclamation-circle" /> {errors.general}
          </div>
        )}

        {step === 1 ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
              <Field name="first_name" label="First Name" placeholder="John" icon="person" />
              <Field name="last_name" label="Last Name" placeholder="Doe" icon="person" />
            </div>
            <Field name="email" label="Email Address" type="email" placeholder="john@example.com" icon="envelope" autoComplete="email" />
            <Field name="phone" label="Phone Number" placeholder="0712 345 678" icon="phone" />
            <button type="button" className="btn btn-primary btn-full btn-lg" onClick={handleNext}>
              Continue <i className="bi bi-arrow-right" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <Field name="username" label="Username" placeholder="Choose a username" icon="at" autoComplete="username" />
            <Field name="password" label="Password" placeholder="Min 6 characters" icon="lock" />
            <Field name="password2" label="Confirm Password" placeholder="Repeat password" icon="shield-lock" />

            <div className="form-check" style={{ marginBottom: 16 }}>
              <input type="checkbox" id="terms" required />
              <label htmlFor="terms" style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                I agree to the <a href="#" style={{ color: 'var(--primary)' }}>Terms of Service</a> & <a href="#" style={{ color: 'var(--primary)' }}>Privacy Policy</a>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setStep(1)} style={{ flex: 1 }}>
                <i className="bi bi-arrow-left" /> Back
              </button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={loading}>
                {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Creating...</> : 'Create Account 🎉'}
              </button>
            </div>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--gray-500)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>Sign in</Link>
        </div>
      </div>
    </div>
  )
}