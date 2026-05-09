import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../utils/api'
import StockBadge from '../components/StockBadge'
import StockEditRow from '../components/StockEditRow'
import './Stock.css'

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
                  <StockEditRow
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
