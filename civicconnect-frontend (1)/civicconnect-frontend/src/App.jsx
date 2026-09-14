import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import PublicShell from './components/layout/PublicShell'
import AppShell from './components/layout/AppShell'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import IssueList from './pages/IssueList'
import IssueDetail from './pages/IssueDetail'
import ReportIssue from './pages/ReportIssue'
import AdminDashboard from './pages/AdminDashboard'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicShell />}>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* Authenticated routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/issues" element={<IssueList />} />
              <Route path="/issues/new" element={<ReportIssue />} />
              <Route path="/issues/:id" element={<IssueDetail />} />
            </Route>
          </Route>

          {/* Staff/admin-only routes */}
          <Route element={<ProtectedRoute allowedRoles={['staff', 'admin']} />}>
            <Route element={<AppShell />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
