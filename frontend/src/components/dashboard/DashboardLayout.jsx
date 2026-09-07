import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useTheme } from '../../context/ThemeContext'
import api from '../../api/axios'
import ParticleBackground from '../ui/ParticleBackground'
import MountainBackground from '../ui/MountainBackground'
import NotificationDropdown from './NotificationDropdown'
import DriverDutySwitch from './DriverDutySwitch'
import DayNightToggle from '../ui/DayNightToggle'

function DashboardLayout({ activeTab, setActiveTab, children }) {
  const { user, logout } = useAuth()
  const { addToast } = useToast()
  const { theme, isDark, toggleTheme } = useTheme()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleLogout = () => {
    logout()
    addToast('🔌 LOGGED OUT: Your session has ended.', 'info', 'top-right')
  }

  // Format role label for display
  const getRoleLabel = (role) => {
    if (!role) return 'OPERATOR'
    return role.replace(/([A-Z])/g, ' $1').trim().toUpperCase()
  }

  const roleUpper = user?.role?.toUpperCase() || ''
  const isAdminOrManager = roleUpper === 'ADMIN' || roleUpper === 'FLEETMANAGER' || roleUpper === 'DISPATCHER'

  // Modern SVG Icons matching clean dashboard design
  const renderTabIcon = (tabId) => {
    switch (tabId) {
      case 'dashboard':
        return (
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9" rx="1.5" />
            <rect x="14" y="3" width="7" height="5" rx="1.5" />
            <rect x="14" y="12" width="7" height="9" rx="1.5" />
            <rect x="3" y="16" width="7" height="5" rx="1.5" />
          </svg>
        )
      case 'map':
        return (
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        )
      case 'fleet':
        return (
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
            <path d="M14 8h5l3 4v6h-3" />
            <circle cx="7.5" cy="18.5" r="2.5" />
            <circle cx="16.5" cy="18.5" r="2.5" />
          </svg>
        )
      case 'drivers':
        return (
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )
      case 'shipments':
        return (
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="m7.5 4.27 9 5.15" />
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
            <path d="m3.3 7 8.7 5 8.7-5" />
            <path d="M12 22V12" />
          </svg>
        )
      case 'trips':
        return (
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        )
      case 'active-trip':
        return (
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
        )
      case 'maintenance':
        return (
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        )
      case 'attendance':
        return (
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <path d="m9 16 2 2 4-4" />
          </svg>
        )
      case 'reports':
        return (
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        )
      case 'fuel':
        return (
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
            <path d="M15 10h3a2 2 0 0 1 2 2v3a2 2 0 0 0 2 2 2 2 0 0 0 2-2V9l-3-3" />
            <path d="M3 9h12" />
          </svg>
        )
      case 'users':
        return (
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        )
      case 'profile':
        return (
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )
    }
  }

  // Define tabs based on role clearances (Settings/Profile removed from menu since accessible via bottom profile card)
  const adminTabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'map', label: 'Live Tracking' },
    { id: 'fleet', label: 'Vehicles' },
    { id: 'drivers', label: 'Drivers' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'shipments', label: 'Shipments' },
    { id: 'trips', label: 'Trips' },
    { id: 'maintenance', label: 'Maintenance' },
  ]

  if (roleUpper === 'ADMIN' || roleUpper === 'FLEETMANAGER') {
    adminTabs.push({ id: 'fuel', label: 'Fuel Records' })
  }

  // Reports tab available for Admin, FleetManager, Dispatcher
  adminTabs.push({ id: 'reports', label: 'Reports' })

  if (roleUpper === 'ADMIN') {
    adminTabs.push({ id: 'users', label: 'Users & Roles' })
  }

  const driverTabs = [
    { id: 'dashboard', label: 'Driver Dashboard' },
    { id: 'map', label: 'Live Tracking' },
    { id: 'active-trip', label: 'Active Trip' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'shipments', label: 'Shipments' },
    { id: 'fleet', label: 'Vehicle' },
    { id: 'trips', label: 'Trips' },
    { id: 'maintenance', label: 'Maintenance' },
    { id: 'fuel', label: 'Fuel Records' },
    { id: 'reports', label: 'My Reports' },
  ]

  const tabs = isAdminOrManager ? adminTabs : driverTabs

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gradient-to-br from-[#0c0f24] via-[#050614] to-[#010207] text-white' : 'bg-[#f1f5f9] text-slate-900'} flex flex-col md:flex-row overflow-hidden font-sans select-none relative transition-colors duration-300`}>
      
      {/* Background Star Canvas and Mountains (Dark Mode Only) */}
      {isDark && (
        <div className="absolute inset-0 pointer-events-none z-0">
          <ParticleBackground />
          <MountainBackground />
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className={`w-full ${isCollapsed ? 'md:w-20' : 'md:w-64'} md:h-screen md:sticky md:top-0 ${isDark ? 'bg-slate-950/90 border-white/10' : 'bg-white border-slate-200 shadow-lg'} border-b md:border-b-0 md:border-r z-20 flex flex-col justify-between flex-shrink-0 backdrop-blur-xl transition-all duration-300 ease-in-out`}>
        
        {/* ========================================================= */}
        {/* 1. FIXED TOP: BRAND & LOGO HEADER                         */}
        {/* ========================================================= */}
        <div className={`flex-shrink-0 ${isCollapsed ? 'p-2.5 space-y-2' : 'p-3.5 space-y-2.5'} border-b ${isDark ? 'border-white/10 bg-slate-950/80' : 'border-slate-200 bg-white'} backdrop-blur-md relative overflow-hidden transition-colors`}>
          {/* Subtle Ambient Cyber Light Flare */}
          {isDark && (
            <div className="absolute -top-10 -left-10 w-24 h-24 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none"></div>
          )}

          {isCollapsed ? (
            /* Collapsed Mode: Perfectly Centered & Stacked Vertically (No Overlap) */
            <div className="flex flex-col items-center justify-center space-y-2 relative z-10 py-1">
              <div 
                onClick={() => setIsCollapsed(false)}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00f0ff] via-[#00c8ff] to-[#0088ff] flex items-center justify-center shadow-[0_0_18px_rgba(0,240,255,0.4)] border border-white/30 flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                title="Click to Expand Sidebar"
              >
                <span className="text-slate-950 font-black text-lg tracking-tighter">F</span>
              </div>

              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                className={`w-7 h-7 rounded-lg border transition-all duration-200 cursor-pointer flex items-center justify-center ${
                  isDark 
                    ? 'bg-slate-900/90 hover:bg-slate-800 border-white/15 hover:border-cyan-400 text-cyan-300 shadow-sm' 
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                }`}
                title="Expand Sidebar"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="13 17 18 12 13 7" />
                  <polyline points="6 17 11 12 6 7" />
                </svg>
              </button>
            </div>
          ) : (
            /* Expanded Mode: Clean Row with Logo, Title, and Collapse Button */
            <div className="flex items-center justify-between relative z-10 gap-2">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00f0ff] via-[#00c8ff] to-[#0088ff] flex items-center justify-center shadow-[0_0_18px_rgba(0,240,255,0.4)] border border-white/30 flex-shrink-0">
                  <span className="text-slate-950 font-black text-lg tracking-tighter">F</span>
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className={`text-base font-black tracking-wider ${isDark ? 'text-white' : 'text-slate-900'} m-0 leading-none`}>
                    FLEET<span className="text-[#00f0ff] drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]">FLOW</span>
                  </h2>
                  <p className={`text-[7.5px] tracking-widest ${isDark ? 'text-white/50' : 'text-slate-500'} uppercase m-0 mt-1 font-mono font-bold truncate`}>
                    ENTERPRISE LOGISTICS TELEMETRICS
                  </p>
                </div>
              </div>

              {/* Collapse Button */}
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className={`p-1.5 rounded-lg border transition-all duration-200 cursor-pointer flex items-center justify-center flex-shrink-0 ${
                  isDark 
                    ? 'bg-slate-900/80 hover:bg-slate-800 border-white/10 hover:border-cyan-400 text-cyan-300' 
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                }`}
                title="Collapse Sidebar"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="11 17 6 12 11 7" />
                  <polyline points="18 17 13 12 18 7" />
                </svg>
              </button>
            </div>
          )}

          {/* Clean Pill Badge (Only shown when expanded) */}
          {!isCollapsed && (
            <div className={`relative z-10 w-full px-2.5 py-1 rounded-full ${isDark ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-700'} border text-[8.5px] font-mono font-bold tracking-wider flex items-center justify-center space-x-1.5 shadow-sm animate-fade-in`}>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <span className="truncate">PROTECT &amp; OPTIMIZE YOUR FLEET</span>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 2. SCROLLABLE MIDDLE: NAVIGATION LINKS                   */}
        {/* ========================================================= */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-1 sidebar-scroll select-none">
          {!isCollapsed && (
            <div className={`px-3 pt-1.5 pb-2 text-[9px] font-mono font-black tracking-widest ${isDark ? 'text-white/30' : 'text-slate-400'} uppercase flex items-center justify-between animate-fade-in`}>
              <span>MAIN MENU</span>
              <span className="text-[8px] text-cyan-500 font-bold">{tabs.length} MODULES</span>
            </div>
          )}

          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                title={isCollapsed ? tab.label : ''}
                className={`w-full relative flex items-center ${isCollapsed ? 'justify-center p-3' : 'space-x-3 px-3.5 py-2.5'} rounded-xl transition-all duration-200 text-left cursor-pointer border group ${
                  isActive 
                    ? (isDark 
                        ? 'bg-gradient-to-r from-cyan-500/20 via-cyan-500/10 to-transparent border-cyan-500/40 text-[#00f0ff] font-black shadow-[0_0_20px_rgba(0,240,255,0.15)]' 
                        : 'bg-cyan-50 border-cyan-500 text-cyan-900 font-black shadow-sm')
                    : (isDark 
                        ? 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/60 hover:border-white/5 font-medium' 
                        : 'border-transparent text-slate-900 hover:text-cyan-700 hover:bg-slate-100 hover:border-slate-300 font-bold')
                }`}
              >
                {/* Left glowing neon indicator bar for active item */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-5 bg-[#00f0ff] rounded-r-full shadow-[0_0_10px_#00f0ff]"></span>
                )}
                <span className={`transition-transform duration-200 ${isActive ? (isDark ? 'text-[#00f0ff] scale-110' : 'text-cyan-700 scale-110') : (isDark ? 'text-slate-400 group-hover:text-white' : 'text-slate-800 group-hover:text-cyan-700')}`}>
                  {renderTabIcon(tab.id)}
                </span>
                {!isCollapsed && (
                  <span className="text-xs tracking-wide truncate">{tab.label}</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* ========================================================= */}
        {/* 3. FIXED BOTTOM: USER PROFILE & LOGOUT                    */}
        {/* ========================================================= */}
        <div className={`flex-shrink-0 ${isCollapsed ? 'p-2 space-y-2' : 'p-3.5 space-y-3'} border-t ${isDark ? 'border-white/10 bg-slate-950/95' : 'border-slate-200 bg-slate-50'} backdrop-blur-md transition-colors`}>
          
          {/* User Profile Card (Click to open Profile/Settings) */}
          <div 
            onClick={() => setActiveTab('profile')}
            className={`p-2 rounded-xl flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} cursor-pointer group transition-all duration-200 ${
              isDark ? 'hover:bg-white/5 text-white' : 'hover:bg-slate-200/60 text-slate-900'
            }`}
            title={`View Profile & Settings (${user?.full_name || 'System Admin'})`}
          >
            <div className="flex items-center space-x-3 min-w-0">
              {/* Circular Avatar with status badge */}
              <div className="relative flex-shrink-0">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-400 via-cyan-500 to-blue-600 flex items-center justify-center font-black text-slate-950 text-base sm:text-lg shadow-[0_0_14px_rgba(34,211,238,0.4)]">
                  {user?.full_name?.charAt(0) || 'S'}
                </div>
                {/* Active online dot */}
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950"></span>
              </div>
              
              {!isCollapsed && (
                <div className="min-w-0 flex-1 animate-fade-in">
                  <p className={`text-base font-extrabold ${isDark ? 'text-white group-hover:text-cyan-300' : 'text-slate-900 group-hover:text-cyan-700'} truncate m-0 leading-tight transition-colors`}>
                    {user?.full_name || 'System Admin'}
                  </p>
                  <div className="flex items-center space-x-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"></span>
                    <span className={`text-xs font-mono font-black ${isDark ? 'text-cyan-300' : 'text-cyan-700'} uppercase tracking-wider truncate`}>
                      {getRoleLabel(user?.role)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Chevron Arrow (Only when expanded) */}
            {!isCollapsed && (
              <div className={`text-slate-400 group-hover:text-cyan-300 transition-transform group-hover:translate-x-1 pr-1 flex-shrink-0`}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            )}
          </div>

          {/* Full-width Log Out Button */}
          <button
            type="button"
            onClick={handleLogout}
            className={`w-full ${isCollapsed ? 'p-2.5' : 'py-2.5 px-4'} rounded-xl font-sans font-bold text-xs transition-all duration-200 cursor-pointer flex items-center justify-center space-x-2.5 group border ${
              isDark 
                ? 'bg-slate-900/70 hover:bg-slate-800/90 border-white/15 hover:border-cyan-400/50 text-white shadow-sm' 
                : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-sm'
            }`}
            title="Log Out"
          >
            <svg className="w-4 h-4 flex-shrink-0 text-white/70 group-hover:text-cyan-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
            {!isCollapsed && <span className="tracking-wide text-xs">Log Out</span>}
          </button>
        </div>

      </aside>

      {/* Main Panel Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative h-screen">
        {/* Top Control Banner */}
        <header className={`p-6 ${isDark ? 'bg-slate-950/90 border-white/5' : 'bg-white/95 border-slate-200 shadow-sm'} backdrop-blur-md flex flex-col sm:flex-row justify-between sm:items-center space-y-4 sm:space-y-0 flex-shrink-0 z-20 relative border-b transition-colors duration-300`}>
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'} tracking-tight m-0 leading-tight`}>
              {tabs.find((t) => t.id === activeTab)?.label}
            </h1>
            <p className={`text-xs ${isDark ? 'text-[#00f0ff]/70' : 'text-cyan-600'} m-0 mt-0.5 font-mono font-bold`}>
              FLEET OPERATIONS AND ROUTE TRACKING
            </p>
          </div>

          {/* latency / connection status & driver active duty switch */}
          <div className="flex items-center space-x-3 sm:space-x-4 text-xs font-mono">
            {/* Rapido-style driver active duty switch (only rendered when logged in as Driver) */}
            <DriverDutySwitch />

            {/* Day/Night Animated Pill Switch (Sun & Moon Sky Toggle) */}
            <DayNightToggle />

            <div className="hidden sm:flex items-center space-x-1.5 text-white/50">
              <span>LATENCY:</span>
              <span className="text-[#00f0ff] font-bold">18ms</span>
            </div>
            <div className="hidden sm:flex px-3 py-1 bg-[#00f0ff]/10 border border-[#00f0ff]/20 text-[#00f0ff] rounded-full items-center space-x-1.5 font-bold shadow-[0_0_10px_rgba(0,240,255,0.05)]">
              <span className="w-1.5 h-1.5 bg-[#00f0ff] rounded-full animate-pulse"></span>
              <span className="text-[10px] tracking-wider">SYSTEM ONLINE</span>
            </div>

            {/* Notification Bell Dropdown */}
            <NotificationDropdown />
          </div>
        </header>

        {/* Content Container with breathing room */}
        <div className="px-6 md:px-8 pt-5 pb-6 md:pb-8 flex-1 overflow-y-auto">
          {children}
        </div>
      </main>

    </div>
  )
}

export default DashboardLayout
