import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ROLE } from './domain/requestLifecycle'
import ProtectedRoute, { RoleHome } from './routes/ProtectedRoute'
import AppShell from './components/layout/AppShell'
import PublicShell from './components/layout/PublicShell'

import AuthPage from './pages/auth/AuthPage'
import CheckEmail from './pages/auth/CheckEmail'
import VerifyEmail from './pages/auth/VerifyEmail'
import MyRequests from './pages/requester/MyRequests'
import SubmitRequest from './pages/requester/SubmitRequest'
import RequestPage from './pages/RequestPage'
import Worklist from './pages/staff/Worklist'
import Oversight from './pages/management/Oversight'
import AuditTrail from './pages/management/AuditTrail'
import AllRequests from './pages/management/AllRequests'
import NotFound from './pages/NotFound'

/**
 * Route map = the information architecture of PED §10.1, one block per zone.
 * Each protected block names the user_type allowed in; ProtectedRoute does the rest.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public / auth zone */}
          <Route element={<PublicShell />}>
            <Route path="/sign-in" element={<AuthPage mode="sign-in" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
            <Route path="/check-email" element={<CheckEmail />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<RoleHome />} />
            <Route element={<AppShell />}>
              {/* One URL per request for every role; the API scopes who may load it */}
              <Route path="/requests/:id" element={<RequestPage />} />

              {/* Requester portal */}
              <Route element={<ProtectedRoute roles={[ROLE.REQUESTER]} />}>
                <Route path="/requests" element={<MyRequests />} />
                <Route path="/requests/new" element={<SubmitRequest />} />
              </Route>

              {/* Staff and triage portal */}
              <Route element={<ProtectedRoute roles={[ROLE.STAFF]} />}>
                <Route path="/worklist" element={<Worklist />} />
              </Route>

              {/* Management portal */}
              <Route element={<ProtectedRoute roles={[ROLE.MANAGEMENT]} />}>
                <Route path="/oversight" element={<Oversight />} />
                <Route path="/audit" element={<AuditTrail />} />
                <Route path="/all-requests" element={<AllRequests />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
