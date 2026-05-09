export default function StockExpandedRow({ item, isFull, qty, unitType, notes, isDirty, prevHint, handleQtyChange, updateDraft, setExpandedId }) {
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
