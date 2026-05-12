// src/context/AuthContext.jsx
import { createContext, useContext, useState } from 'react'

const ACCOUNTS = {
  'admin@recapp.me':      'Admin',
  'therapist@recapp.me':  'Therapist',
  'ops@recapp.me':        'Staff',
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  function login(email) {
    const role = ACCOUNTS[email.toLowerCase().trim()]
    if (!role) return false
    setUser({ email: email.toLowerCase().trim(), role })
    return true
  }

  function logout() {
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === null) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
