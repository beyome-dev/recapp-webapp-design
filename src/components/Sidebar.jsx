// src/components/Sidebar.jsx
import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Activity, Search, LayoutDashboard, CalendarDays,
  Users, CreditCard, Settings, LogOut, UserCog, LifeBuoy, ChevronRight,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './Sidebar.css'

const NAV_ITEMS = [
  { label: 'Home',      path: '/home',      icon: LayoutDashboard, roles: ['Therapist', 'Admin', 'Staff'] },
  { label: 'Sessions',  path: '/sessions',  icon: Activity,        roles: ['Therapist', 'Admin', 'Staff'] },
  { label: 'Calendar',  path: '/calendar',  icon: CalendarDays,    roles: ['Therapist', 'Admin', 'Staff'] },
  { label: 'Clients',   path: '/clients',   icon: Users,           roles: ['Therapist', 'Admin', 'Staff'] },
  { label: 'Billing',   path: '/billing',   icon: CreditCard,      roles: ['Admin', 'Staff'] },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const wrapperRef = useRef(null)

  function handleLogout() {
    setMenuOpen(false)
    logout()
    navigate('/login')
  }

  function go(path) {
    setMenuOpen(false)
    navigate(path)
  }

  useEffect(() => {
    if (!menuOpen) return
    function onClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    function onKey(e) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const userRoles = Array.isArray(user?.role) ? user.role : [user?.role]
  const visibleItems = NAV_ITEMS.filter(item =>
    item.roles.some(r => userRoles.includes(r))
  )

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <Activity size={14} />
        </div>
        <span>Recapp</span>
      </div>

      <div className="sidebar-search">
        <Search size={14} />
        <span>Search</span>
        <span className="sidebar-search-shortcut">⌘K</span>
      </div>

      <nav className="sidebar-nav">
        {visibleItems.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              ['nav-item', isActive ? 'active' : ''].join(' ').trim()
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom" ref={wrapperRef}>
        {menuOpen && (
          <div className="profile-menu" role="menu">
            <button className="profile-menu-item" onClick={() => go('/settings')} role="menuitem">
              <UserCog size={15} />
              <span>Edit Profile</span>
            </button>
            <button className="profile-menu-item" onClick={() => go('/settings')} role="menuitem">
              <Settings size={15} />
              <span>Settings</span>
            </button>
            <button className="profile-menu-item" onClick={() => go('/help')} role="menuitem">
              <LifeBuoy size={15} />
              <span>Help Centre</span>
            </button>
            <div className="profile-menu-divider" />
            <button className="profile-menu-item profile-menu-danger" onClick={handleLogout} role="menuitem">
              <LogOut size={15} />
              <span>Log Out</span>
            </button>
          </div>
        )}

        <button
          type="button"
          className={['sidebar-user', menuOpen ? 'open' : ''].join(' ').trim()}
          onClick={() => setMenuOpen(o => !o)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <div className="user-avatar">
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div className="user-info">
            <span className="user-email">{user?.email}</span>
            <span className="user-role">{user?.role}</span>
          </div>
          <ChevronRight size={14} className="user-chevron" />
        </button>
      </div>
    </aside>
  )
}
