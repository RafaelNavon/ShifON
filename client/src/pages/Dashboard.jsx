import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <span className="dashboard-brand">ShifON</span>
        <div className="dashboard-header-right">
          <span className="dashboard-user">{user.name || user.email}</span>
          <button className="logout-btn" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <main className="dashboard-main">
        <h2>Welcome to ShifON</h2>
        <p>Lab Management System — dashboard coming soon.</p>
      </main>
    </div>
  )
}
