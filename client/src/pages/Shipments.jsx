import { useState, useEffect, useCallback, Fragment } from 'react'
import { apiFetch } from '../utils/api'
import './Shipments.css'

const DEST_LABEL = { north: 'North', south: 'South' }
const DEST_CLASS = { north: 'badge-north', south: 'badge-south' }

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function startOfWeek() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday
  d.setDate(d.getDate() + diff)
  return d
}

export default function Shipments() {
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const fetchShipments = useCallback(() => {
    setLoading(true)
    apiFetch('/api/shipments')
      .then((r) => r?.json())
      .then((data) => {
        if (data) setShipments(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching shipments:', err)
        setError('Failed to load shipments')
        setLoading(false)
      })
  }, [])

  useEffect(() => { fetchShipments() }, [fetchShipments])

  const weekStart = startOfWeek()
  const thisWeek = shipments.filter((s) => new Date(s.shipment_date) >= weekStart)
  const statsNorth = thisWeek.filter((s) => s.destination === 'north').length
  const statsSouth = thisWeek.filter((s) => s.destination === 'south').length

  function toggleRow(id) {
    setExpandedId((prev) => (prev === id ? null : id))
    setDeleteConfirmId(null)
    setDeleteError('')
  }

  async function deleteShipment(id) {
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await apiFetch(`/api/shipments/${id}`, { method: 'DELETE' })
      if (!res) return
      if (!res.ok) {
        const d = await res.json()
        setDeleteError(d.error || 'Delete failed')
        setDeleting(false)
        return
      }
      setDeleteConfirmId(null)
      setExpandedId(null)
      fetchShipments()
    } catch {
      setDeleteError('Network error')
      setDeleting(false)
    }
  }

  return (
    <div className="ship-page">
      <div className="page-header">
        <h1 className="page-title">Shipments</h1>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>+ Log shipment</button>
      </div>

      <div className="inv-stats">
        <div className="stat-card">
          <span className="stat-value">{thisWeek.length}</span>
          <span className="stat-label">This Week</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{statsNorth}</span>
          <span className="stat-label">Sent to North</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{statsSouth}</span>
          <span className="stat-label">Sent to South</span>
        </div>
      </div>

      {loading && <p className="ship-status">Loading shipments…</p>}
      {error && <p className="ship-status ship-status--error">{error}</p>}

      {!loading && !error && (
        <div className="ship-table-wrap">
          {shipments.length === 0 ? (
            <p className="ship-status">No shipments yet.</p>
          ) : (
            <table className="ship-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Destination</th>
                  <th>Total Straws</th>
                  <th>Notes</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shipments.map((s) => {
                  const totalStraws = (s.items || []).reduce((sum, i) => sum + i.quantity, 0)
                  const expanded = expandedId === s.id
                  return (
                    <Fragment key={s.id}>
                      <tr
                        className={`ship-row${expanded ? ' ship-row--expanded' : ''}`}
                        onClick={() => toggleRow(s.id)}
                      >
                        <td>{formatDate(s.shipment_date)}</td>
                        <td>
                          <span className={`dest-badge ${DEST_CLASS[s.destination] || ''}`}>
                            {DEST_LABEL[s.destination] || s.destination}
                          </span>
                        </td>
                        <td>{totalStraws.toLocaleString()}</td>
                        <td className="ship-notes-cell">{s.notes || '—'}</td>
                        <td className="ship-chevron">{expanded ? '▲' : '▼'}</td>
                      </tr>
                      {expanded && (
                        <tr className="ship-detail-row">
                          <td colSpan={5}>
                            <div className="ship-detail-inner">
                              {(s.items || []).length === 0 ? (
                                <p className="ship-detail-empty">No items recorded.</p>
                              ) : (
                                <table className="ship-items-table">
                                  <thead>
                                    <tr>
                                      <th>Bull</th>
                                      <th>Slot</th>
                                      <th>Qty Shipped</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {s.items.map((item) => (
                                      <tr key={item.id}>
                                        <td>
                                          {item.bull_name
                                            ? `${item.bull_name} (${item.bull_code})`
                                            : '—'}
                                        </td>
                                        <td>
                                          {item.container_name
                                            ? `${item.container_name} · Slot ${item.slot_number} ${item.position === 'UP' ? '↑' : '↓'}`
                                            : '—'}
                                        </td>
                                        <td>{item.quantity}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                              {user.role === 'admin' && (
                                <div className="ship-detail-actions">
                                  {deleteConfirmId === s.id ? (
                                    <div className="delete-confirm">
                                      <span className="delete-confirm-text">
                                        Delete this shipment record? This cannot be undone.
                                      </span>
                                      {deleteError && (
                                        <span className="delete-error">{deleteError}</span>
                                      )}
                                      <div className="delete-confirm-btns">
                                        <button
                                          className="btn-ghost"
                                          onClick={() => { setDeleteConfirmId(null); setDeleteError('') }}
                                          disabled={deleting}
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          className="btn-danger"
                                          onClick={() => deleteShipment(s.id)}
                                          disabled={deleting}
                                        >
                                          {deleting ? 'Deleting…' : 'Confirm Delete'}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      className="btn-danger-ghost"
                                      onClick={() => setDeleteConfirmId(s.id)}
                                    >
                                      Delete shipment
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {modalOpen && (
        <LogShipmentModal
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false)
            fetchShipments()
          }}
        />
      )}
    </div>
  )
}

function LogShipmentModal({ onClose, onSuccess }) {
  const [bulls, setBulls] = useState([])
  const [allBatches, setAllBatches] = useState([])
  const [destination, setDestination] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([{ bull_id: '', batch_id: '', quantity: '' }])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/api/bulls')
      .then((r) => r?.json())
      .then((data) => { if (data) setBulls(data) })
      .catch((err) => console.error('Error fetching bulls:', err))
    apiFetch('/api/batches')
      .then((r) => r?.json())
      .then((data) => { if (data) setAllBatches(data) })
      .catch((err) => console.error('Error fetching batches:', err))
  }, [])

  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [handleKey])

  function setItem(index, field, value) {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      if (field === 'bull_id') {
        next[index].batch_id = ''
        next[index].quantity = ''
      }
      if (field === 'batch_id') {
        next[index].quantity = ''
      }
      return next
    })
  }

  function addItem() {
    setItems((prev) => [...prev, { bull_id: '', batch_id: '', quantity: '' }])
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function approvedBatchesForBull(bull_id) {
    if (!bull_id) return []
    return allBatches.filter(
      (b) => b.bull_id === parseInt(bull_id) && b.status === 'approved',
    )
  }

  function maxQtyForBatch(batch_id) {
    if (!batch_id) return null
    const b = allBatches.find((b) => b.id === parseInt(batch_id))
    return b ? b.quantity : null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!destination) { setError('Destination is required'); return }
    if (!date) { setError('Date is required'); return }
    if (items.length === 0) { setError('At least one item is required'); return }
    for (const [i, item] of items.entries()) {
      if (!item.bull_id) { setError(`Item ${i + 1}: select a bull`); return }
      if (!item.batch_id) { setError(`Item ${i + 1}: select a batch`); return }
      if (!item.quantity || parseInt(item.quantity) < 1) {
        setError(`Item ${i + 1}: enter a valid quantity`); return
      }
      const max = maxQtyForBatch(item.batch_id)
      if (max !== null && parseInt(item.quantity) > max) {
        setError(`Item ${i + 1}: quantity exceeds available (${max})`); return
      }
    }

    setError('')
    setSubmitting(true)
    try {
      const res = await apiFetch('/api/shipments', {
        method: 'POST',
        body: JSON.stringify({
          destination,
          shipment_date: date,
          notes: notes || null,
          items: items.map((item) => ({
            batch_id: parseInt(item.batch_id),
            quantity: parseInt(item.quantity),
          })),
        }),
      })
      if (!res) return
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to log shipment')
        return
      }
      onSuccess()
    } catch (err) {
      console.error('Error creating shipment:', err)
      setError('Network error — could not connect to server')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="ship-modal-title">
        <div className="modal-header">
          <h2 id="ship-modal-title">Log Shipment</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="mfield">
            <label htmlFor="sm-dest">Destination</label>
            <select
              id="sm-dest"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            >
              <option value="">Select…</option>
              <option value="north">North</option>
              <option value="south">South</option>
            </select>
          </div>

          <div className="mfield">
            <label htmlFor="sm-date">Date</label>
            <input
              id="sm-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="mfield mfield--full">
            <label htmlFor="sm-notes">Notes</label>
            <input
              id="sm-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes…"
            />
          </div>

          <div className="mfield mfield--full">
            <label className="items-section-label">Items</label>
            <div className="ship-items-list">
              {items.map((item, i) => {
                const batches = approvedBatchesForBull(item.bull_id)
                const max = maxQtyForBatch(item.batch_id)
                return (
                  <div key={i} className="ship-item-row">
                    <div className="ship-item-fields">
                      <div className="mfield">
                        <label>Bull</label>
                        <select
                          value={item.bull_id}
                          onChange={(e) => setItem(i, 'bull_id', e.target.value)}
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

                      <div className="mfield">
                        <label>Batch</label>
                        <select
                          value={item.batch_id}
                          onChange={(e) => setItem(i, 'batch_id', e.target.value)}
                          required
                          disabled={!item.bull_id}
                        >
                          <option value="">Select batch…</option>
                          {batches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.container_name} · Slot {b.slot_number} {b.position === 'UP' ? '↑' : '↓'} — {b.quantity} avail
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="mfield">
                        <label>
                          Quantity
                          {max !== null && (
                            <span className="qty-hint"> (max {max})</span>
                          )}
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={max ?? undefined}
                          value={item.quantity}
                          onChange={(e) => setItem(i, 'quantity', e.target.value)}
                          placeholder="Qty"
                          required
                          disabled={!item.batch_id}
                        />
                      </div>
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        className="ship-item-remove"
                        onClick={() => removeItem(i)}
                        aria-label="Remove item"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )
              })}

              <button type="button" className="btn-add-item" onClick={addItem}>
                + Add another item
              </button>
            </div>
          </div>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Log Shipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
