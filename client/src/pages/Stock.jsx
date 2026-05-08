import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../utils/api'
import './Stock.css'

function formatRelativeTime(iso) {
  if (!iso) return ''
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffSec = Math.floor((now - then) / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  const diffWk = Math.floor(diffDay / 7)
  if (diffWk < 4) return `${diffWk}w ago`
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
}

export default function Stock() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mode, setMode] = useState('view')
  const [drafts, setDrafts] = useState({})
  const [expandedId, setExpandedId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [rowErrors, setRowErrors] = useState({})

  const fetchStock = useCallback(() => {
    setLoading(true)
    apiFetch('/api/stock')
      .then((r) => r?.json())
      .then((data) => {
        if (data) setItems(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching stock:', err)
        setError('Failed to load stock')
        setLoading(false)
      })
  }, [])

  useEffect(() => { fetchStock() }, [fetchStock])

  function handleCancel() {
    const count = Object.keys(drafts).length
    if (count > 0) {
      if (!window.confirm(`Discard ${count} unsaved change(s)?`)) return
    }
    setDrafts({})
    setRowErrors({})
    setSaveError('')
    setExpandedId(null)
    setMode('view')
  }

  function updateDraft(itemId, field, value) {
    setDrafts(prev => {
      const item = items.find(i => i.id === itemId)
      const existing = prev[itemId] || {
        unit_type: item?.count?.unit_type ?? 'boxes',
        quantity: item?.count?.quantity ?? null,
        is_full: item?.count?.is_full ?? false,
        notes: item?.count?.notes ?? null,
      }
      return {
        ...prev,
        [itemId]: { ...existing, [field]: value },
      }
    })
  }

  function effectiveValue(item, field) {
    if (drafts[item.id] && field in drafts[item.id]) return drafts[item.id][field]
    if (item.count) return item.count[field]
    if (field === 'unit_type') return 'boxes'
    if (field === 'quantity') return null
    if (field === 'is_full') return false
    if (field === 'notes') return null
  }

  async function handleSaveAll() {
    const localErrors = {}
    for (const [itemId, draft] of Object.entries(drafts)) {
      if ((draft.quantity === null || draft.quantity === undefined) && !draft.is_full) {
        localErrors[itemId] = 'Enter a quantity or mark as full'
      }
    }
    if (Object.keys(localErrors).length > 0) {
      setRowErrors(localErrors)
      setSaveError('Please fix the errors below before saving')
      return
    }

    const counts = Object.entries(drafts).map(([itemId, draft]) => ({
      stock_item_id: parseInt(itemId, 10),
      unit_type: draft.unit_type,
      quantity: draft.quantity,
      is_full: draft.is_full,
      notes: draft.notes || null,
    }))

    setSaving(true)
    setSaveError('')
    setRowErrors({})

    try {
      const res = await apiFetch('/api/stock/counts', {
        method: 'PUT',
        body: JSON.stringify({ counts }),
      })
      if (!res) return

      const data = await res.json()
      if (!res.ok) {
        if (data.invalid && Array.isArray(data.invalid)) {
          const newRowErrors = {}
          for (const { index, reason } of data.invalid) {
            const itemId = counts[index]?.stock_item_id
            if (itemId) {
              newRowErrors[itemId] = newRowErrors[itemId]
                ? `${newRowErrors[itemId]}; ${reason}`
                : reason
            }
          }
          setRowErrors(newRowErrors)
          setSaveError('Some changes could not be saved — see errors below')
        } else if (data.missing_ids) {
          setSaveError(`Items not found: ${data.missing_ids.join(', ')}`)
        } else {
          setSaveError(data.error || 'Save failed')
        }
        return
      }

      setDrafts({})
      setExpandedId(null)
      setMode('view')
      fetchStock()
    } catch (err) {
      console.error('Error saving stock counts:', err)
      setSaveError('Network error — could not save')
    } finally {
      setSaving(false)
    }
  }

  const draftCount = Object.keys(drafts).length

  return (
    <div className={`stock-page${mode === 'edit' ? ' stock-page--editing' : ''}`}>
      <div className="page-header">
        <h1 className="page-title">Stock</h1>
        {mode === 'view'
          ? <button className="btn-primary" onClick={() => setMode('edit')}>Edit</button>
          : <button className="btn-ghost" onClick={handleCancel}>Cancel</button>
        }
      </div>

      {loading && <p className="stock-status">Loading stock…</p>}
      {error && <p className="stock-status stock-status--error">{error}</p>}

      {!loading && !error && (
        <>
          {mode === 'edit' && (
            <div className="stock-edit-banner">Edit mode — type to update each item</div>
          )}
          {saveError && (
            <div className="stock-error-banner">
              {saveError}
              <button
                className="stock-error-banner-close"
                onClick={() => setSaveError('')}
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          )}
          <div className="stock-list">
            {items.map((item) =>
              mode === 'view' ? (
                <div key={item.id} className="stock-row">
                  <div className="stock-row-info">
                    <span className="stock-name">{item.name}</span>
                    <span className="stock-meta">
                      {item.company || '—'}
                      {item.barcode ? ` · ${item.barcode}` : ''}
                    </span>
                  </div>
                  <StockBadge count={item.count} />
                </div>
              ) : (
                <div key={item.id} className="stock-row-wrapper">
                  <EditRow
                    item={item}
                    drafts={drafts}
                    effectiveValue={effectiveValue}
                    updateDraft={updateDraft}
                    expandedId={expandedId}
                    setExpandedId={setExpandedId}
                  />
                  {rowErrors[item.id] && (
                    <div className="stock-row-error">{rowErrors[item.id]}</div>
                  )}
                </div>
              )
            )}
          </div>
        </>
      )}

      {mode === 'edit' && (
        <div className="stock-save-bar">
          <span className="stock-save-bar-info">
            {draftCount} change{draftCount !== 1 ? 's' : ''}
          </span>
          <button
            className="btn-primary"
            onClick={handleSaveAll}
            disabled={draftCount === 0 || saving}
          >
            {saving ? 'Saving…' : 'Save all'}
          </button>
        </div>
      )}
    </div>
  )
}

function StockBadge({ count }) {
  if (!count) {
    return <span className="stock-badge stock-badge--uncounted">Not counted</span>
  }
  if (count.is_full) {
    return <span className="stock-badge stock-badge--full">Full</span>
  }
  return (
    <span className="stock-badge stock-badge--counted">
      {count.quantity} {count.unit_type}
    </span>
  )
}

function EditRow({ item, drafts, effectiveValue, updateDraft, expandedId, setExpandedId }) {
  const isFull = effectiveValue(item, 'is_full')
  const qty = effectiveValue(item, 'quantity')
  const unitType = effectiveValue(item, 'unit_type')
  const notes = effectiveValue(item, 'notes')
  const isDirty = !!drafts[item.id]
  const isExpanded = item.id === expandedId

  let prevHint
  if (item.count?.is_full) {
    prevHint = `was full · ${formatRelativeTime(item.count.counted_at)}`
  } else if (item.count?.quantity !== null && item.count?.quantity !== undefined) {
    prevHint = `was ${item.count.quantity} ${item.count.unit_type} · ${formatRelativeTime(item.count.counted_at)}`
  } else {
    prevHint = 'never counted'
  }

  function handleQtyChange(e) {
    const v = e.target.value === '' ? null : parseInt(e.target.value, 10)
    if (v !== null && (isNaN(v) || v < 0)) return
    updateDraft(item.id, 'quantity', v)
    if (v !== null) updateDraft(item.id, 'is_full', false)
  }

  if (isExpanded) {
    return (
      <ExpandedRow
        item={item}
        isFull={isFull}
        qty={qty}
        unitType={unitType}
        notes={notes}
        isDirty={isDirty}
        prevHint={prevHint}
        handleQtyChange={handleQtyChange}
        updateDraft={updateDraft}
        setExpandedId={setExpandedId}
      />
    )
  }

  let actionContent
  let actionClass = 'stock-row-action'
  if (isFull) {
    actionClass += ' stock-row-action--full'
    actionContent = 'Full'
  } else if (notes) {
    actionClass += ' stock-row-action--has-note'
    actionContent = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
      </svg>
    )
  } else {
    actionContent = (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    )
  }

  return (
    <div className="stock-row--editing">
      <div className="stock-row-info">
        <span className="stock-name">{item.name}</span>
        <span className="stock-meta">{prevHint}</span>
      </div>
      <input
        type="number"
        className={`stock-qty-input${isDirty ? ' stock-qty-input--changed' : ''}`}
        value={qty ?? ''}
        onChange={handleQtyChange}
        disabled={isFull}
        min={0}
      />
      <span className="stock-unit-label">{unitType}</span>
      <button
        className={actionClass}
        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
      >
        {actionContent}
      </button>
    </div>
  )
}

function ExpandedRow({ item, isFull, qty, unitType, notes, isDirty, prevHint, handleQtyChange, updateDraft, setExpandedId }) {
  function handleMinus() {
    updateDraft(item.id, 'quantity', qty === null ? 0 : Math.max(0, qty - 1))
    updateDraft(item.id, 'is_full', false)
  }

  function handlePlus() {
    updateDraft(item.id, 'quantity', (qty ?? 0) + 1)
    updateDraft(item.id, 'is_full', false)
  }

  function handleFullToggle() {
    if (!isFull) {
      updateDraft(item.id, 'is_full', true)
      updateDraft(item.id, 'quantity', null)
    } else {
      updateDraft(item.id, 'is_full', false)
    }
  }

  return (
    <div className="stock-row--expanded">
      <div className="stock-row-expanded-header">
        <span className="stock-name">{item.name}</span>
        <div className="seg-control">
          <button
            className={`seg-option${unitType === 'boxes' ? ' seg-option--active' : ''}`}
            onClick={() => updateDraft(item.id, 'unit_type', 'boxes')}
          >
            Boxes
          </button>
          <button
            className={`seg-option${unitType === 'units' ? ' seg-option--active' : ''}`}
            onClick={() => updateDraft(item.id, 'unit_type', 'units')}
          >
            Units
          </button>
        </div>
      </div>

      <span className="stock-meta">{prevHint}</span>

      <div className="stock-qty-row">
        <button className="stock-qty-button" onClick={handleMinus}>−</button>
        <input
          type="number"
          className={`stock-qty-input stock-qty-input--wide${isDirty ? ' stock-qty-input--changed' : ''}`}
          value={qty ?? ''}
          onChange={handleQtyChange}
          disabled={isFull}
          min={0}
        />
        <button className="stock-qty-button" onClick={handlePlus}>+</button>
        <button
          className={`stock-full-toggle${isFull ? ' stock-full-toggle--on' : ''}`}
          onClick={handleFullToggle}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          Full
        </button>
      </div>

      <textarea
        className="stock-notes-input"
        placeholder="Add a note (optional)"
        rows={2}
        value={notes ?? ''}
        onChange={(e) => updateDraft(item.id, 'notes', e.target.value || null)}
      />

      <button className="stock-collapse-btn" onClick={() => setExpandedId(null)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </button>
    </div>
  )
}
