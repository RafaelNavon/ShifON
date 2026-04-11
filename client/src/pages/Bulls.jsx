import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../utils/api'
import './Bulls.css'

const STATUS_COLOR = {
  approved: 'status-approved',
  skew: 'status-skew',
  rejected: 'status-rejected',
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Bulls() {
  const [bulls, setBulls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [panelBullId, setPanelBullId] = useState(null)
  // undefined = modal closed, null = add mode, object = edit mode
  const [modalBull, setModalBull] = useState(undefined)

  const panelBull = bulls.find((b) => b.id === panelBullId) ?? null

  const fetchBulls = useCallback(() => {
    setLoading(true)
    apiFetch('/api/bulls')
      .then((r) => r?.json())
      .then((data) => {
        if (data) setBulls(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching bulls:', err)
        setError('Failed to load bulls')
        setLoading(false)
      })
  }, [])

  useEffect(() => { fetchBulls() }, [fetchBulls])

  function handleModalSuccess() {
    setModalBull(undefined)
    fetchBulls()
  }

  function handleDeleted() {
    setPanelBullId(null)
    fetchBulls()
  }

  return (
    <div className="bulls-page">
      <div className="page-header">
        <h1 className="page-title">Bulls</h1>
        <button className="btn-primary" onClick={() => setModalBull(null)}>+ Add bull</button>
      </div>

      {loading && <p className="bulls-status">Loading bulls…</p>}
      {error && <p className="bulls-status bulls-status--error">{error}</p>}

      {!loading && !error && (
        bulls.length === 0 ? (
          <p className="bulls-status">No bulls registered yet.</p>
        ) : (
          <div className="bulls-grid">
            {bulls.map((b) => (
              <BullCard
                key={b.id}
                bull={b}
                selected={b.id === panelBullId}
                onSelect={() => setPanelBullId(b.id)}
                onEdit={(e) => { e.stopPropagation(); setModalBull(b) }}
              />
            ))}
          </div>
        )
      )}

      {panelBull && (
        <BullPanel
          bull={panelBull}
          onClose={() => setPanelBullId(null)}
          onEdit={() => setModalBull(panelBull)}
          onDeleted={handleDeleted}
        />
      )}

      {modalBull !== undefined && (
        <BullModal
          bull={modalBull}
          onClose={() => setModalBull(undefined)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  )
}

function BullCard({ bull, selected, onSelect, onEdit }) {
  const isActive = Number(bull.total_straws) > 0

  return (
    <button
      className={`bull-card${selected ? ' bull-card--selected' : ''}`}
      onClick={onSelect}
    >
      <div className="bull-card-top">
        <span className={`bull-badge ${isActive ? 'bull-badge--active' : 'bull-badge--inactive'}`}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
        <span className="bull-code-tag">{bull.bull_code}</span>
      </div>

      <div className="bull-card-name">{bull.name}</div>
      {bull.breed && <div className="bull-card-breed">{bull.breed}</div>}

      <div className="bull-card-footer">
        <span className="bull-straw-count">
          {Number(bull.total_straws).toLocaleString()} straws
        </span>
        {bull.last_batch_date && (
          <span className="bull-last-date">Last: {formatDate(bull.last_batch_date)}</span>
        )}
      </div>

      <button className="bull-edit-btn" onClick={onEdit}>
        Edit
      </button>
    </button>
  )
}

function BullPanel({ bull, onClose, onEdit, onDeleted }) {
  const [batches, setBatches] = useState([])
  const [loadingBatches, setLoadingBatches] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    setLoadingBatches(true)
    setBatches([])
    apiFetch(`/api/bulls/${bull.id}/batches`)
      .then((r) => r?.json())
      .then((data) => {
        if (data) setBatches(data)
        setLoadingBatches(false)
      })
      .catch((err) => {
        console.error('Error fetching bull batches:', err)
        setLoadingBatches(false)
      })
  }, [bull.id])

  async function handleDelete() {
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await apiFetch(`/api/bulls/${bull.id}`, { method: 'DELETE' })
      if (!res) return
      if (!res.ok) {
        const d = await res.json()
        setDeleteError(d.error || 'Delete failed')
        setDeleting(false)
        return
      }
      onDeleted()
    } catch (err) {
      console.error('Error deleting bull:', err)
      setDeleteError('Network error')
      setDeleting(false)
    }
  }

  const canDelete = Number(bull.total_straws) === 0
  const isActive = Number(bull.total_straws) > 0

  return (
    <>
      <div className="panel-overlay" onClick={onClose} />
      <div className="slot-panel">
        <div className="panel-header">
          <div>
            <div className="panel-location">{bull.name}</div>
            <div className="panel-container-name">{bull.bull_code}</div>
          </div>
          <button className="panel-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="panel-body">
          <span className={`panel-status-badge ${isActive ? 'bull-status-active' : 'bull-status-inactive'}`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>

          <dl className="panel-fields">
            {bull.breed && (
              <div className="panel-field">
                <dt>Breed</dt>
                <dd>{bull.breed}</dd>
              </div>
            )}
            <div className="panel-field">
              <dt>Total Straws</dt>
              <dd>{Number(bull.total_straws).toLocaleString()}</dd>
            </div>
            {bull.last_batch_date && (
              <div className="panel-field">
                <dt>Last Batch</dt>
                <dd>{formatDate(bull.last_batch_date)}</dd>
              </div>
            )}
            {bull.notes && (
              <div className="panel-field panel-field--block">
                <dt>Notes</dt>
                <dd>{bull.notes}</dd>
              </div>
            )}
          </dl>

          <div className="bull-batches-section">
            <div className="bull-batches-title">Current Batches</div>
            {loadingBatches && <p className="bull-batches-msg">Loading…</p>}
            {!loadingBatches && batches.length === 0 && (
              <p className="bull-batches-msg">No batches in storage.</p>
            )}
            {!loadingBatches && batches.length > 0 && (
              <div className="bull-batches-list">
                {batches.map((b) => (
                  <div key={b.id} className="bull-batch-item">
                    <div className="bull-batch-location">
                      {b.container_name} · Slot {b.slot_number} {b.position === 'UP' ? '↑' : '↓'}
                    </div>
                    <div className="bull-batch-meta">
                      <span className={`bull-status-dot ${STATUS_COLOR[b.status]}`} />
                      <span className="bull-batch-qty">{b.quantity} straws</span>
                      {b.sio_batch_code && (
                        <span className="bull-batch-sio">{b.sio_batch_code}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel-actions">
            {!deleteConfirm ? (
              <>
                <button className="btn-ghost" onClick={onEdit}>Edit</button>
                {canDelete ? (
                  <button
                    className="btn-danger-ghost"
                    onClick={() => setDeleteConfirm(true)}
                  >
                    Delete
                  </button>
                ) : (
                  <span className="bull-cant-delete">Has active inventory</span>
                )}
              </>
            ) : (
              <div className="delete-confirm">
                <span className="delete-confirm-text">Delete {bull.name}?</span>
                {deleteError && <span className="delete-error">{deleteError}</span>}
                <div className="delete-confirm-btns">
                  <button
                    className="btn-ghost"
                    onClick={() => { setDeleteConfirm(false); setDeleteError('') }}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
                    {deleting ? 'Deleting…' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function BullModal({ bull, onClose, onSuccess }) {
  const isEdit = !!bull
  const [form, setForm] = useState({
    name: bull?.name ?? '',
    bull_code: bull?.bull_code ?? '',
    breed: bull?.breed ?? '',
    notes: bull?.notes ?? '',
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
      const res = await apiFetch(
        isEdit ? `/api/bulls/${bull.id}` : '/api/bulls',
        {
          method: isEdit ? 'PUT' : 'POST',
          body: JSON.stringify({
            name: form.name,
            bull_code: form.bull_code,
            breed: form.breed || null,
            notes: form.notes || null,
          }),
        },
      )
      if (!res) return
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `Failed to ${isEdit ? 'update' : 'add'} bull`)
        return
      }
      onSuccess()
    } catch (err) {
      console.error(`Error ${isEdit ? 'updating' : 'creating'} bull:`, err)
      setError('Network error — could not connect to server')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="bull-modal-title">
        <div className="modal-header">
          <h2 id="bull-modal-title">{isEdit ? 'Edit Bull' : 'Add Bull'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="mfield">
            <label htmlFor="bm-name">Name</label>
            <input
              id="bm-name"
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Bull Alpha"
              required
            />
          </div>

          <div className="mfield">
            <label htmlFor="bm-code">Bull Code</label>
            <input
              id="bm-code"
              type="text"
              value={form.bull_code}
              onChange={(e) => set('bull_code', e.target.value)}
              placeholder="e.g. BA-001"
              required
            />
          </div>

          <div className="mfield mfield--full">
            <label htmlFor="bm-breed">
              Breed <span className="mfield-optional">(optional)</span>
            </label>
            <input
              id="bm-breed"
              type="text"
              value={form.breed}
              onChange={(e) => set('breed', e.target.value)}
              placeholder="e.g. Holstein"
            />
          </div>

          <div className="mfield mfield--full">
            <label htmlFor="bm-notes">
              Notes <span className="mfield-optional">(optional)</span>
            </label>
            <textarea
              id="bm-notes"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Any additional notes…"
              rows={3}
            />
          </div>

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Bull'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
