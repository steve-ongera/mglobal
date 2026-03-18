import { useApp } from '../App'

export default function Alerts() {
  const { toasts } = useApp()
  if (!toasts?.length) return null

  const icons = {
    success: 'bi-check-circle-fill',
    error: 'bi-x-circle-fill',
    warning: 'bi-exclamation-triangle-fill',
    info: 'bi-info-circle-fill',
  }

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <i className={`bi ${icons[t.type] || icons.info}`} />
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}