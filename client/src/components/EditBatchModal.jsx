import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../utils/api'
import './AddBatchModal.css' // reuse same form styles

export default function EditBatchModal({ batch, onClose, onSuccess }) {
  const [form, setForm] = useState({
    quantity: batch.quantity ?? '',
    sio_batch_code: batch.sio_batch_code ?? '',
    production_date: batch.production_date ? batch.production_date.slice(0, 10) : '',
    status: batch.status ?? 'approved',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [handleKey])

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await apiFetch(`/api/batches/${batch.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          quantity: parseInt(form.quantity),
          sio_batch_code: form.sio_batch_code || null,
          production_date: form.production_date || null,
          status: form.status,
        }),
      })
      if (!res) return
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to update batch')
        return
      }
      onSuccess()
    } catch {
      setError('Network error — could not connect to server')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
        <div className="modal-header">
          <h2 id="edit-modal-title">Edit Batch</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="mfield mfield--full" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 0 4px' }}>
            <span style={{ fontSize: 13, color: 'var(--text)' }}>
              {batch.bull_name} — {batch.bull_code}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text)', opacity: 0.7 }}>
              {batch.container_name} · Slot {batch.slot_number} {batch.position === 'UP' ? '↑' : '↓'}
            </span>
          </div>

          <div className="mfield">
            <label htmlFor="e-qty">Quantity</label>
            <input
              id="e-qty"
              type="number"
              min="0"
              value={form.quantity}
              onChange={(e) => set('quantity', e.target.value)}
              required
            />
          </div>

          <div className="mfield">
            <label htmlFor="e-status">Status</label>
            <select
              id="e-status"
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              required
            >
              <option value="approved">Approved</option>
              <option value="skew">Skew</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="mfield">
            <label htmlFor="e-sio">SIO Batch Code</label>
            <input
              id="e-sio"
              type="text"
              value={form.sio_batch_code}
              onChange={(e) => set('sio_batch_code', e.target.value)}
              placeholder="e.g. SIO-2024-001"
            />
          </div>

          <div className="mfield">
            <label htmlFor="e-date">Production Date</label>
            <input
              id="e-date"
              type="date"
              value={form.production_date}
              onChange={(e) => set('production_date', e.target.value)}
            />
          </div>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
