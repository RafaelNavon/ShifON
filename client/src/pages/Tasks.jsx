import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../utils/api'
import './Tasks.css'

const STATUS_LABEL = { pending: 'Pending', in_progress: 'In Progress', done: 'Done' }
const STATUS_CLASS = {
  pending: 'task-status--pending',
  in_progress: 'task-status--in-progress',
  done: 'task-status--done',
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isOverdue(task) {
  if (task.status === 'done' || !task.due_date) return false
  return task.due_date < todayStr()
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function formatDateTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function Tasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [panelTaskId, setPanelTaskId] = useState(null)
  // undefined = modal closed, null = add, object = edit
  const [modalTask, setModalTask] = useState(undefined)

  const panelTask = tasks.find((t) => t.id === panelTaskId) ?? null

  const fetchTasks = useCallback(() => {
    setLoading(true)
    apiFetch('/api/tasks')
      .then((r) => r?.json())
      .then((data) => {
        if (data) setTasks(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching tasks:', err)
        setError('Failed to load tasks')
        setLoading(false)
      })
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const today = todayStr()
  const pending = tasks.filter((t) => t.status === 'pending')
  const inProgress = tasks.filter((t) => t.status === 'in_progress')
  const done = tasks.filter((t) => t.status === 'done')
  const openCount = pending.length + inProgress.length
  const overdueCount = tasks.filter(isOverdue).length
  const doneTodayCount = done.filter((t) => {
    if (!t.completed_at) return false
    const d = new Date(t.completed_at)
    const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return s === today
  }).length

  function handleModalSuccess() {
    setModalTask(undefined)
    fetchTasks()
  }

  function handleDeleted() {
    setPanelTaskId(null)
    fetchTasks()
  }

  return (
    <div className="tasks-page">
      <div className="page-header">
        <h1 className="page-title">Tasks</h1>
        <button className="btn-primary" onClick={() => setModalTask(null)}>+ New task</button>
      </div>

      <div className="inv-stats">
        <div className="stat-card">
          <span className="stat-value">{openCount}</span>
          <span className="stat-label">Open</span>
        </div>
        <div className="stat-card">
          <span className={`stat-value ${overdueCount > 0 ? 'stat-rejected' : ''}`}>
            {overdueCount}
          </span>
          <span className="stat-label">Overdue</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{doneTodayCount}</span>
          <span className="stat-label">Done Today</span>
        </div>
      </div>

      {loading && <p className="tasks-status">Loading tasks…</p>}
      {error && <p className="tasks-status tasks-status--error">{error}</p>}

      {!loading && !error && (
        <div className="tasks-board">
          <TaskColumn
            title="Pending"
            status="pending"
            tasks={pending}
            onSelect={setPanelTaskId}
            selectedId={panelTaskId}
          />
          <TaskColumn
            title="In Progress"
            status="in_progress"
            tasks={inProgress}
            onSelect={setPanelTaskId}
            selectedId={panelTaskId}
          />
          <TaskColumn
            title="Done"
            status="done"
            tasks={done}
            onSelect={setPanelTaskId}
            selectedId={panelTaskId}
          />
        </div>
      )}

      {panelTask && (
        <TaskPanel
          task={panelTask}
          onClose={() => setPanelTaskId(null)}
          onEdit={() => setModalTask(panelTask)}
          onDeleted={handleDeleted}
        />
      )}

      {modalTask !== undefined && (
        <TaskModal
          task={modalTask}
          onClose={() => setModalTask(undefined)}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  )
}

function TaskColumn({ title, status, tasks, onSelect, selectedId }) {
  return (
    <div className="task-column">
      <div className={`task-col-header task-col-header--${status}`}>
        <span className="task-col-title">{title}</span>
        <span className="task-col-count">{tasks.length}</span>
      </div>
      <div className="task-list">
        {tasks.length === 0 && (
          <p className="task-list-empty">No tasks here.</p>
        )}
        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            selected={t.id === selectedId}
            onSelect={() => onSelect(t.id)}
          />
        ))}
      </div>
    </div>
  )
}

function TaskCard({ task, selected, onSelect }) {
  const overdue = isOverdue(task)

  return (
    <button
      className={`task-card${overdue ? ' task-card--overdue' : ''}${selected ? ' task-card--selected' : ''}`}
      onClick={onSelect}
    >
      <div className="task-card-title">{task.title}</div>
      {task.due_date && (
        <div className={`task-due${overdue ? ' task-due--overdue' : ''}`}>
          {overdue ? '⚠ ' : ''}Due {formatDate(task.due_date)}
        </div>
      )}
      <div className="task-card-meta">
        <span>By {task.created_by_name || '—'}</span>
        {task.status === 'in_progress' && task.in_progress_by_name && (
          <span className="task-card-in-progress-by">● {task.in_progress_by_name}</span>
        )}
        {task.status === 'done' && task.completed_by_name && (
          <span className="task-card-done-by">✓ {task.completed_by_name}</span>
        )}
      </div>
    </button>
  )
}

function TaskPanel({ task, onClose, onEdit, onDeleted }) {
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function handleDelete() {
    setDeleting(true)
    setDeleteError('')
    try {
      const res = await apiFetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
      if (!res) return
      if (!res.ok) {
        const d = await res.json()
        setDeleteError(d.error || 'Delete failed')
        setDeleting(false)
        return
      }
      onDeleted()
    } catch (err) {
      console.error('Error deleting task:', err)
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
            <div className="panel-location">{task.title}</div>
            <div className="panel-container-name">{STATUS_LABEL[task.status]}</div>
          </div>
          <button className="panel-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="panel-body">
          <span className={`panel-status-badge task-status-badge ${STATUS_CLASS[task.status] || ''}`}>
            {STATUS_LABEL[task.status] || task.status}
          </span>

          {task.description && (
            <div className="task-panel-desc">{task.description}</div>
          )}

          <dl className="panel-fields">
            {task.due_date && (
              <div className={`panel-field${isOverdue(task) ? ' panel-field--overdue' : ''}`}>
                <dt>Due Date</dt>
                <dd className={isOverdue(task) ? 'task-overdue-text' : ''}>
                  {formatDate(task.due_date)}
                  {isOverdue(task) && ' — overdue'}
                </dd>
              </div>
            )}
            <div className="panel-field">
              <dt>Created By</dt>
              <dd>{task.created_by_name || '—'}</dd>
            </div>
            <div className="panel-field">
              <dt>Created</dt>
              <dd>{formatDateTime(task.created_at)}</dd>
            </div>
            {task.status === 'in_progress' && (
              <div className="panel-field">
                <dt>In Progress By</dt>
                <dd>{task.in_progress_by_name || '—'}</dd>
              </div>
            )}
            {task.status === 'done' && (
              <>
                <div className="panel-field">
                  <dt>Completed By</dt>
                  <dd>{task.completed_by_name || '—'}</dd>
                </div>
                <div className="panel-field">
                  <dt>Completed At</dt>
                  <dd>{formatDateTime(task.completed_at)}</dd>
                </div>
              </>
            )}
          </dl>

          <div className="panel-actions">
            {!deleteConfirm ? (
              <>
                <button className="btn-ghost" onClick={onEdit}>Edit</button>
                <button
                  className="btn-danger-ghost"
                  onClick={() => setDeleteConfirm(true)}
                >
                  Delete
                </button>
              </>
            ) : (
              <div className="delete-confirm">
                <span className="delete-confirm-text">Delete this task?</span>
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

function TaskModal({ task, onClose, onSuccess }) {
  const isEdit = !!task
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    due_date: task?.due_date ?? '',
    status: task?.status ?? 'pending',
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
      const body = {
        title: form.title,
        description: form.description || null,
        due_date: form.due_date || null,
        ...(isEdit && { status: form.status }),
      }
      const res = await apiFetch(
        isEdit ? `/api/tasks/${task.id}` : '/api/tasks',
        { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(body) },
      )
      if (!res) return
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `Failed to ${isEdit ? 'update' : 'create'} task`)
        return
      }
      onSuccess()
    } catch (err) {
      console.error(`Error ${isEdit ? 'updating' : 'creating'} task:`, err)
      setError('Network error — could not connect to server')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
        <div className="modal-header">
          <h2 id="task-modal-title">{isEdit ? 'Edit Task' : 'New Task'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="mfield mfield--full">
            <label htmlFor="tm-title">Title</label>
            <input
              id="tm-title"
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Task title…"
              required
            />
          </div>

          <div className="mfield mfield--full">
            <label htmlFor="tm-desc">
              Description <span className="mfield-optional">(optional)</span>
            </label>
            <textarea
              id="tm-desc"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Additional details…"
              rows={3}
            />
          </div>

          <div className="mfield">
            <label htmlFor="tm-due">
              Due Date <span className="mfield-optional">(optional)</span>
            </label>
            <input
              id="tm-due"
              type="date"
              value={form.due_date}
              onChange={(e) => set('due_date', e.target.value)}
            />
          </div>

          {isEdit && (
            <div className="mfield">
              <label htmlFor="tm-status">Status</label>
              <select
                id="tm-status"
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          )}

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
