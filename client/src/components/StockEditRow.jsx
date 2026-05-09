import { formatRelativeTime } from '../utils/formatRelativeTime'
import StockExpandedRow from './StockExpandedRow'

export default function StockEditRow({ item, drafts, effectiveValue, updateDraft, expandedId, setExpandedId }) {
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
      <StockExpandedRow
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
