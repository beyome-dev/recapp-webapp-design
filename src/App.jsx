// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ClientsProvider } from './context/ClientsContext'
import { BillingProvider } from './context/BillingContext'
import { SessionsProvider } from './context/SessionsContext'
import { SettingsProvider } from './context/SettingsContext'
import AppLayout from './layouts/AppLayout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Home from './pages/Home'
import Calendar from './pages/Calendar'
import SessionsList from './pages/SessionsList'
import ActiveSession from './pages/ActiveSession'
import SessionNotes from './pages/SessionNotes'
import Clients from './pages/Clients'
import ClientProfile from './pages/ClientProfile'
import Billing from './pages/Billing'
import Settings from './pages/Settings'
import Placeholder from './pages/Placeholder'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        element={
          <ProtectedRoute>
            <SettingsProvider>
              <ClientsProvider>
                <BillingProvider>
                  <SessionsProvider>
                    <AppLayout />
                  </SessionsProvider>
                </BillingProvider>
              </ClientsProvider>
            </SettingsProvider>
          </ProtectedRoute>
        }
      >
        <Route path="home" element={<Home />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="sessions" element={<SessionsList />} />
        <Route path="sessions/:id/active" element={<ActiveSession />} />
        <Route path="sessions/:id/notes" element={<SessionNotes />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientProfile />} />
        <Route path="billing" element={<Billing />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/:section" element={<Settings />} />
        <Route path="settings/:section/:sub" element={<Settings />} />
        <Route path="help" element={<Placeholder title="Help Centre" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
