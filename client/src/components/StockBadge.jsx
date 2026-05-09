export default function StockBadge({ count }) {
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
