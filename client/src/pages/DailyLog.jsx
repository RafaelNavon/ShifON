import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../utils/api'
import './DailyLog.css'

function todayStr() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export default function DailyLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const today = todayStr()
  const isToday = (log) => log.log_date?.slice(0, 10) === today

  const fetchLogs = useCallback(() => {
    setLoading(true)
    apiFetch('/api/daily-logs')
      .then((r) => r?.json())
      .then((data) => {
        if (data) setLogs(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching daily logs:', err)
        setError('Failed to load daily logs')
        setLoading(false)
      })
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const todayLogs = logs.filter(isToday)
  const prevLogs = logs.filter((l) => !isToday(l))

  const totalStraws = todayLogs.reduce((sum, l) => sum + (l.quantity_produced || 0), 0)
  const bullsToday = new Set(todayLogs.map((l) => l.bull_id).filter(Boolean)).size

  return (
    <div className="dlog-page">
      <div className="page-header">
        <h1 className="page-title">Daily Log</h1>
      </div>

      <div className="inv-stats">
        <div className="stat-card">
          <span className="stat-value">{totalStraws.toLocaleString()}</span>
          <span className="stat-label">Straws Today</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{bullsToday}</span>
          <span className="stat-label">Bulls Worked</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{todayLogs.length}</span>
          <span className="stat-label">Entries Today</span>
        </div>
      </div>

      {loading && <p className="dlog-status">Loading logs…</p>}
      {error && <p className="dlog-status dlog-status--error">{error}</p>}

      {!loading && !error && (
        <>
          <LogSection
            title="Today"
            logs={todayLogs}
            timeMode="time"
            emptyMsg="No batches added today."
          />
          <LogSection
            title="Previous Days"
            logs={prevLogs}
            timeMode="date"
            emptyMsg="No previous entries."
          />
        </>
      )}
    </div>
  )
}

function LogSection({ title, logs, timeMode, emptyMsg }) {
  return (
    <div className="dlog-section">
      <h2 className="dlog-section-title">{title}</h2>
      {logs.length === 0 ? (
        <p className="dlog-empty">{emptyMsg}</p>
      ) : (
        <div className="dlog-table-wrap">
          <table className="dlog-table">
            <thead>
              <tr>
                <th>Bull</th>
                <th>Container / Slot</th>
                <th>Qty Produced</th>
                <th>SIO Code</th>
                <th>Notes</th>
                <th>Logged By</th>
                <th>{timeMode === 'time' ? 'Time' : 'Date'}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <span className="dlog-bull-name">{log.bull_name || '—'}</span>
                    {log.bull_code && (
                      <span className="dlog-bull-code">{log.bull_code}</span>
                    )}
                  </td>
                  <td>
                    {log.container_name
                      ? `${log.container_name} · Slot ${log.slot_number} ${log.position === 'UP' ? '↑' : '↓'}`
                      : '—'}
                  </td>
                  <td className="dlog-qty">{log.quantity_produced}</td>
                  <td className="dlog-code">{log.sio_batch_code || '—'}</td>
                  <td className="dlog-notes-cell">{log.notes || '—'}</td>
                  <td>{log.recorded_by_name || '—'}</td>
                  <td className="dlog-time">
                    {timeMode === 'time'
                      ? formatTime(log.created_at)
                      : formatDate(log.log_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
