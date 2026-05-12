// src/layouts/AppLayout.jsx
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import './AppLayout.css'

export default function AppLayout() {
  const { pathname } = useLocation()
  const isFullBleed = /\/sessions\/[^/]+(\/active|\/notes)/.test(pathname)

  return (
    <div className="app-shell">
      <Sidebar />
      <main className={`app-main${isFullBleed ? ' app-main--full' : ''}`}>
        <div className={`app-content${isFullBleed ? ' app-content--full' : ''}`}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
