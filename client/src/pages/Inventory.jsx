import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../utils/api'
import AddBatchModal from '../components/AddBatchModal'
import EditBatchModal from '../components/EditBatchModal'
import './Inventory.css'

const STATUS_COLOR = {
  approved: 'status-approved',
  skew: 'status-skew',
  rejected: 'status-rejected',
}

const STATUS_LABEL = {
  approved: 'Approved',
  skew: 'Skew',
  rejected: 'Rejected',
}

export default function Inventory() {
  const [containers, setContainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalInitialSlot, setModalInitialSlot] = useState(null)
  const [editBatch, setEditBatch] = useState(null)

  const fetchInventory = useCallback(() => {
    setLoading(true)
    apiFetch('/api/containers')
      .then((r) => r?.json())
      .then((data) => {
        if (data) setContainers(data)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load inventory')
        setLoading(false)
      })
  }, [])

  useEffect(() => { fetchInventory() }, [fetchInventory])

  function openModal(initialSlot = null) {
    setModalInitialSlot(initialSlot)
    setModalOpen(true)
  }

  function handleModalSuccess() {
    setModalOpen(false)
    setSelectedSlot(null)
    fetchInventory()
  }

  function handleEditSuccess() {
    setEditBatch(null)
    setSelectedSlot(null)
    fetchInventory()
  }

  function handleDeleted() {
    setSelectedSlot(null)
    fetchInventory()
  }

  const allSlots = containers.flatMap((c) => c.slots || [])
  const totalStraws = allSlots.reduce((sum, s) => sum + (s.batch?.quantity || 0), 0)
  const slotsUsed = allSlots.filter((s) => s.batch).length
  const rejectedCount = allSlots.filter((s) => s.batch?.status === 'rejected').length

  return (
    <div className="inv-page">
      <div className="page-header">
        <h1 className="page-title">Inventory</h1>
        <button className="btn-primary" onClick={() => openModal()}>+ Add batch</button>
      </div>

      <div className="inv-stats">
        <div className="stat-card">
          <span className="stat-value">{totalStraws.toLocaleString()}</span>
          <span className="stat-label">Total Straws</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{slotsUsed}<span className="stat-dim"> / {allSlots.length}</span></span>
          <span className="stat-label">Slots Used</span>
        </div>
        <div className="stat-card">
          <span className={`stat-value ${rejectedCount > 0 ? 'stat-rejected' : ''}`}>
            {rejectedCount}
          </span>
          <span className="stat-label">Rejected</span>
        </div>
      </div>

      {loading && <p className="inv-loading">Loading inventory…</p>}
      {error && <p className="inv-error">{error}</p>}

      {!loading && !error && (
        <div className="containers-grid">
          {containers.map((c) => (
            <ContainerCard
              key={c.id}
              container={c}
              selectedSlotId={selectedSlot?.id}
              onSelect={setSelectedSlot}
            />
          ))}
        </div>
      )}

      {selectedSlot !== null && (
        <SlotPanel
          slot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
          onAddBatch={(slot) => {
            setSelectedSlot(null)
            openModal({ container_id: slot.container_id, slot_number: slot.slot_number, position: slot.position })
          }}
          onEdit={(batch) => setEditBatch(batch)}
          onDeleted={handleDeleted}
        />
      )}

      {modalOpen && (
        <AddBatchModal
          containers={containers}
          initialSlot={modalInitialSlot}
          onClose={() => setModalOpen(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {editBatch && (
        <EditBatchModal
          batch={editBatch}
          onClose={() => setEditBatch(null)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  )
}

function ContainerCard({ container, selectedSlotId, onSelect }) {
  // Index slots by slot_number + position for O(1) lookup
  const index = {}
  for (const slot of container.slots || []) {
    index[`${slot.slot_number}-${slot.position}`] = slot
  }

  return (
    <div className="container-card">
      <div className="container-title">{container.name}</div>
      <div className="slot-grid">
        {/* Column headers */}
        <div className="slot-row-label" />
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div key={n} className="slot-col-header">{n}</div>
        ))}
        {/* UP row */}
        <div className="slot-row-label">↑</div>
        {[1, 2, 3, 4, 5, 6].map((n) => {
          const slot = index[`${n}-UP`]
          return (
            <SlotCell
              key={`${n}-UP`}
              slot={slot}
              selected={slot?.id === selectedSlotId}
              onClick={() => slot && onSelect({ ...slot, container_name: container.name })}
            />
          )
        })}
        {/* DOWN row */}
        <div className="slot-row-label">↓</div>
        {[1, 2, 3, 4, 5, 6].map((n) => {
          const slot = index[`${n}-DOWN`]
          return (
            <SlotCell
              key={`${n}-DOWN`}
              slot={slot}
              selected={slot?.id === selectedSlotId}
              onClick={() => slot && onSelect({ ...slot, container_name: container.name })}
            />
          )
        })}
      </div>
    </div>
  )
}

function SlotCell({ slot, selected, onClick }) {
  if (!slot) {
    return <div className="slot-cell slot-cell--missing" />
  }
  const { batch } = slot
  const statusClass = batch ? STATUS_COLOR[batch.status] || '' : ''

  return (
    <button
      className={`slot-cell ${statusClass} ${selected ? 'slot-cell--selected' : ''} ${!batch ? 'slot-cell--empty' : ''}`}
      onClick={onClick}
      title={batch ? `${batch.bull_name} — ${batch.quantity} straws (${batch.status})` : 'Empty'}
    >
      {batch ? (
        <>
          <span className="cell-bull">{batch.bull_name}</span>
          <span className="cell-qty">{batch.quantity}</span>
        </>
      ) : (
        <span className="cell-empty">—</span>
      )}
    </button>
  )
}

function SlotPanel({ slot, onClose, onAddBatch, onEdit, onDeleted }) {
  const { batch } = slot
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  async function handleDelete() {
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await apiFetch(`/api/batches/${batch.id}`, { method: 'DELETE' })
      if (!res) return
      if (!res.ok) {
        const d = await res.json()
        setDeleteError(d.error || 'Delete failed')
        setDeleting(false)
        return
      }
      onDeleted()
    } catch {
      setDeleteError('Network error')
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="panel-overlay" onClick={onClose} />
      <div className="slot-panel">
        <div className="panel-header">
          <div>
            <div className="panel-location">
              Slot {slot.slot_number} {slot.position === 'UP' ? '↑' : '↓'}
            </div>
            {slot.container_name && (
              <div className="panel-container-name">{slot.container_name}</div>
            )}
          </div>
          <button className="panel-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {batch ? (
          <div className="panel-body">
            <div className={`panel-status-badge ${STATUS_COLOR[batch.status]}`}>
              {STATUS_LABEL[batch.status] || batch.status}
            </div>

            <dl className="panel-fields">
              <div className="panel-field">
                <dt>Bull Name</dt>
                <dd>{batch.bull_name || '—'}</dd>
              </div>
              <div className="panel-field">
                <dt>Bull ID</dt>
                <dd>{batch.bull_code || '—'}</dd>
              </div>
              <div className="panel-field">
                <dt>SIO Batch Code</dt>
                <dd>{batch.sio_batch_code || '—'}</dd>
              </div>
              <div className="panel-field">
                <dt>Quantity</dt>
                <dd>{batch.quantity} straws</dd>
              </div>
              <div className="panel-field">
                <dt>Production Date</dt>
                <dd>{formatDate(batch.production_date)}</dd>
              </div>
            </dl>

            <div className="panel-actions">
              {!deleteConfirm ? (
                <>
                  <button
                    className="btn-ghost"
                    onClick={() => onEdit({ ...batch, container_name: slot.container_name, slot_number: slot.slot_number, position: slot.position })}
                  >
                    Edit
                  </button>
                  <button className="btn-danger-ghost" onClick={() => setDeleteConfirm(true)}>
                    Delete
                  </button>
                </>
              ) : (
                <div className="delete-confirm">
                  <span className="delete-confirm-text">Delete this batch?</span>
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
        ) : (
          <div className="panel-body panel-empty">
            <p>This slot is empty.</p>
            <button className="btn-primary" onClick={() => onAddBatch(slot)}>+ Add batch here</button>
          </div>
        )}
      </div>
    </>
  )
}
