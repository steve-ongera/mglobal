import { useState, useEffect } from 'react'
import { profileAPI } from '../services/api'
import { useApp } from '../App'

export default function Profile() {
  const { user, login, toast } = useApp()
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    username: user?.username || '',
  })
  const [saving, setSaving] = useState(false)
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '', confirm: '' })
  const [savingPw, setSavingPw] = useState(false)

  useEffect(() => {
    document.title = 'My Profile — Mgobal'
  }, [])

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSave = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      const updated = await profileAPI.update(form)
      login(updated, { access: localStorage.getItem('access_token'), refresh: localStorage.getItem('refresh_token') })
      toast('Profile updated successfully', 'success')
    } catch (err) {
      toast(err?.email?.[0] || err?.phone?.[0] || 'Update failed', 'error')
    } finally { setSaving(false) }
  }

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || user?.username?.[0]?.toUpperCase() || '?'

  return (
    <div>
      {/* Avatar Section */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><i className="bi bi-person-circle" /> Profile Information</div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 24 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
              color: 'white', fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{user?.first_name} {user?.last_name}</div>
              <div style={{ color: 'var(--gray-500)', fontSize: 13, marginTop: 4 }}>{user?.email}</div>
              <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>
                Member since {new Date(user?.created_at || Date.now()).toLocaleDateString('en-KE', { year: 'numeric', month: 'long' })}
              </div>
            </div>
          </div>

          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 16px' }}>
              {[
                { name: 'first_name', label: 'First Name', icon: 'person' },
                { name: 'last_name', label: 'Last Name', icon: 'person' },
                { name: 'email', label: 'Email Address', icon: 'envelope', type: 'email' },
                { name: 'phone', label: 'Phone Number', icon: 'phone' },
                { name: 'username', label: 'Username', icon: 'at' },
              ].map(f => (
                <div key={f.name} className="form-group">
                  <label className="form-label">{f.label}</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)', fontSize: 15 }}>
                      <i className={`bi bi-${f.icon}`} />
                    </span>
                    <input type={f.type || 'text'} name={f.name} className="form-control" style={{ paddingLeft: 36 }}
                      value={form[f.name]} onChange={handleChange} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving...</> : <><i className="bi bi-check-lg" /> Save Changes</>}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { icon: 'bi-bag-check', label: 'Total Orders', value: '—', color: 'var(--primary)' },
          { icon: 'bi-heart', label: 'Wishlist', value: '—', color: 'var(--danger)' },
          { icon: 'bi-star', label: 'Reviews', value: '—', color: 'var(--warning)' },
          { icon: 'bi-geo-alt', label: 'Addresses', value: '—', color: 'var(--success)' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ textAlign: 'center', padding: 16 }}>
            <i className={`bi ${s.icon}`} style={{ fontSize: 28, color: s.color, marginBottom: 6 }} />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header"><i className="bi bi-lightning" /> Quick Actions</div>
        <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {[
            { icon: 'bi-box-seam', label: 'View Orders', href: '/orders' },
            { icon: 'bi-heart', label: 'My Wishlist', href: '/account' },
            { icon: 'bi-geo-alt', label: 'Addresses', href: '/account' },
            { icon: 'bi-bell', label: 'Notifications', href: '/account' },
          ].map(a => (
            <a key={a.label} href={a.href}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', border: '1.5px solid var(--gray-200)', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 500, color: 'var(--gray-700)', transition: 'all 0.2s', textDecoration: 'none' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gray-200)'; e.currentTarget.style.color = 'var(--gray-700)' }}>
              <i className={`bi ${a.icon}`} style={{ fontSize: 16 }} /> {a.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}