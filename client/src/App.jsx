import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Shipments from './pages/Shipments'

function ProtectedLayout() {
  if (!localStorage.getItem('token')) return <Navigate to="/login" replace />
  return <Layout />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/shipments" element={<Shipments />} />
          <Route path="*" element={<Navigate to="/inventory" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
