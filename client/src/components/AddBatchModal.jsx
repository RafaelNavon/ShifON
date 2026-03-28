import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../utils/api'
import './AddBatchModal.css'

const EMPTY_FORM = {
  bull_id: '',
  container_id: '',
  slot_number: '',
  position: '',
  quantity: '',
  sio_batch_code: '',
  production_date: '',
  status: 'approved',
}

export default function AddBatchModal({ containers, onClose, onSuccess, initialSlot }) {
  const [bulls, setBulls] = useState([])
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    container_id: initialSlot?.container_id ? String(initialSlot.container_id) : '',
    slot_number: initialSlot?.slot_number ? String(initialSlot.slot_number) : '',
    position: initialSlot?.position ?? '',
  }))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Fetch bulls
  useEffect(() => {
    apiFetch('/api/bulls')
      .then((r) => r?.json())
      .then((data) => { if (data) setBulls(data) })
  }, [])

  // Close on Escape
  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [handleKey])

  function set(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value }
      // Reset downstream selections when container changes
      if (field === 'container_id') {
        next.slot_number = ''
        next.position = ''
      }
      if (field === 'slot_number') {
        next.position = ''
      }
      return next
    })
  }

  // Derive container data and occupied slot map
  const containerData = containers.find((c) => c.id === parseInt(form.container_id))
  const occupiedSet = new Set()
  if (containerData) {
    for (const slot of containerData.slots || []) {
      if (slot.batch) occupiedSet.add(`${slot.slot_number}-${slot.position}`)
    }
  }

  // Derive the target slot_id for submission
  const targetSlot = containerData?.slots.find(
    (s) =>
      s.slot_number === parseInt(form.slot_number) &&
      s.position === form.position
  )

  async function handleSubmit(e) {
    e.preventDefault()
    if (!targetSlot) {
      setError('Could not find selected slot. Please check your selection.')
      return
    }
    if (occupiedSet.has(`${form.slot_number}-${form.position}`)) {
      setError('That slot position is already occupied.')
      return
    }

    setError('')
    setSubmitting(true)
    try {
      const res = await apiFetch('/api/batches', {
        method: 'POST',
        body: JSON.stringify({
          bull_id: parseInt(form.bull_id),
          slot_id: targetSlot.id,
          quantity: parseInt(form.quantity),
          sio_batch_code: form.sio_batch_code || null,
          production_date: form.production_date || null,
          status: form.status,
        }),
      })
      if (!res) return // 401 handled by apiFetch
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to add batch')
        return
      }
      onSuccess()
    } catch {
      setError('Network error — could not connect to server')
    } finally {
      setSubmitting(false)
    }
  }

  // For slot number options: compute which slot numbers have at least one free position
  const slotOptions = [1, 2, 3, 4, 5, 6].map((n) => {
    const upOccupied = occupiedSet.has(`${n}-UP`)
    const downOccupied = occupiedSet.has(`${n}-DOWN`)
    const full = upOccupied && downOccupied
    return { n, full }
  })

  const positionOptions = ['UP', 'DOWN'].map((pos) => ({
    pos,
    occupied: occupiedSet.has(`${form.slot_number}-${pos}`),
  }))

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 id="modal-title">Add Batch</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          {/* Bull */}
          <div className="mfield mfield--full">
            <label htmlFor="m-bull">Bull</label>
            <select
              id="m-bull"
              value={form.bull_id}
              onChange={(e) => set('bull_id', e.target.value)}
              required
            >
              <option value="">Select bull…</option>
              {bulls.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — {b.bull_code}
                </option>
              ))}
            </select>
          </div>

          {/* Container / Slot / Position */}
          <div className="mfield">
            <label htmlFor="m-container">Container</label>
            <select
              id="m-container"
              value={form.container_id}
              onChange={(e) => set('container_id', e.target.value)}
              required
            >
              <option value="">Select…</option>
              {containers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="mfield">
            <label htmlFor="m-slot">Slot</label>
            <select
              id="m-slot"
              value={form.slot_number}
              onChange={(e) => set('slot_number', e.target.value)}
              required
              disabled={!form.container_id}
            >
              <option value="">Select…</option>
              {slotOptions.map(({ n, full }) => (
                <option key={n} value={n} disabled={full}>
                  Slot {n}{full ? ' (full)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="mfield">
            <label htmlFor="m-pos">Position</label>
            <select
              id="m-pos"
              value={form.position}
              onChange={(e) => set('position', e.target.value)}
              required
              disabled={!form.slot_number}
            >
              <option value="">Select…</option>
              {positionOptions.map(({ pos, occupied }) => (
                <option key={pos} value={pos} disabled={occupied}>
                  {pos}{occupied ? ' (occupied)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity / SIO code */}
          <div className="mfield">
            <label htmlFor="m-qty">Quantity</label>
            <input
              id="m-qty"
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => set('quantity', e.target.value)}
              placeholder="e.g. 100"
              required
            />
          </div>

          <div className="mfield">
            <label htmlFor="m-sio">SIO Batch Code</label>
            <input
              id="m-sio"
              type="text"
              value={form.sio_batch_code}
              onChange={(e) => set('sio_batch_code', e.target.value)}
              placeholder="e.g. SIO-2024-001"
            />
          </div>

          {/* Date / Status */}
          <div className="mfield">
            <label htmlFor="m-date">Production Date</label>
            <input
              id="m-date"
              type="date"
              value={form.production_date}
              onChange={(e) => set('production_date', e.target.value)}
            />
          </div>

          <div className="mfield">
            <label htmlFor="m-status">Status</label>
            <select
              id="m-status"
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              required
            >
              <option value="approved">Approved</option>
              <option value="skew">Skew</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Add Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
