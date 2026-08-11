import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import api from '../../api/axios'
import ParticleBackground from '../ui/ParticleBackground'
import MountainBackground from '../ui/MountainBackground'

function DashboardLayout({ activeTab, setActiveTab, children }) {
  const { user, logout } = useAuth()
  const { addToast } = useToast()

  const handleLogout = () => {
    logout()
    addToast('🔌 LOGGED OUT: Your session has ended.', 'info', 'top-right')
  }

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "⚠️ WARNING: Are you sure you want to permanently delete your account?\n\n" +
      "This will remove your account and all your profile data from the system.\n" +
      "This action is irreversible."
    )
    if (!confirmed) return

    try {
      await api.delete('/auth/me')
      logout()
      addToast('🗑️ ACCOUNT DELETED: Your account has been deleted.', 'success', 'top-right')
    } catch (error) {
      console.error('Delete account failed:', error)
      if (!error.response || error.code === 'ERR_NETWORK') {
        logout()
        addToast('🗑️ ACCOUNT DELETED (OFFLINE): Your local account session has been removed.', 'success', 'top-right')
      } else {
        addToast('❌ ERROR: Could not delete your account.', 'error', 'top-right')
      }
    }
  }

  // Format role label for display
  const getRoleLabel = (role) => {
    if (!role) return 'OPERATOR'
    return role.replace(/([A-Z])/g, ' $1').trim().toUpperCase()
  }

  const roleUpper = user?.role?.toUpperCase() || ''
  const isAdminOrManager = roleUpper === 'ADMIN' || roleUpper === 'FLEETMANAGER' || roleUpper === 'DISPATCHER'

  // Define tabs based on role clearances (Overview, Users, Reports, and Settings removed)
  const adminTabs = [
    { id: 'map', label: 'Live Tracking', icon: '🌐' },
    { id: 'shipments', label: 'Shipments', icon: '📦' },
    { id: 'fleet', label: 'Vehicles', icon: '🚚' },
    { id: 'trips', label: 'Trips', icon: '🗺️' },
    { id: 'drivers', label: 'Drivers', icon: '👤' },
    { id: 'maintenance', label: 'Maintenance', icon: '🔧' },
    { id: 'profile', label: 'Settings', icon: '⚙️' },
  ]

  const driverTabs = [
    { id: 'map', label: 'Live Tracking', icon: '🌐' },
    { id: 'active-trip', label: 'Active Trip', icon: '🛣️' },
    { id: 'shipments', label: 'Shipments', icon: '📦' },
    { id: 'fleet', label: 'Vehicle', icon: '🚚' },
    { id: 'trips', label: 'Trips', icon: '🗺️' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
  ]

  const tabs = isAdminOrManager ? adminTabs : driverTabs

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c0f24] via-[#050614] to-[#010207] text-white flex flex-col md:flex-row overflow-hidden font-sans select-none relative">
      
      {/* Background Star Canvas and Mountains */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <ParticleBackground />
        <MountainBackground />
      </div>

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 md:h-screen md:sticky md:top-0 bg-slate-950/60 border-b md:border-b-0 md:border-r border-white/5 z-20 flex flex-col justify-between flex-shrink-0 shadow-2xl backdrop-blur-md">
        
        <div className="overflow-y-auto flex-1">
          {/* Logo Brand area */}
          <div className="p-6 border-b border-white/5 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#00f0ff] flex items-center justify-center shadow-[0_0_10px_rgba(0,240,255,0.4)]">
              <span className="text-[#06070d] font-extrabold text-lg">F</span>
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white m-0 leading-none">
                FleetFlow
              </h2>
              <span className="text-[9px] text-[#00f0ff]/70 tracking-wider uppercase font-semibold">Ops Control Center</span>
            </div>
          </div>
 
          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-left cursor-pointer border ${
                    isActive 
                      ? 'bg-white/5 border-white/10 text-[#00f0ff] font-semibold shadow-[0_0_15px_rgba(0,240,255,0.1)]' 
                      : 'border-transparent text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-base">{tab.icon}</span>
                  <span className="text-sm tracking-wide">{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* User Profile details */}
        <div className="p-4 border-t border-white/5 bg-slate-950/40 flex flex-col space-y-3.5">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-[#00f0ff]/10 border border-[#00f0ff]/20 flex items-center justify-center font-bold text-[#00f0ff] text-sm shadow-[0_0_10px_rgba(0,240,255,0.1)]">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate m-0 leading-tight">
                {user?.full_name || 'User'}
              </p>
              <span className="text-[9px] text-[#00f0ff] font-mono tracking-wider font-bold">
                {getRoleLabel(user?.role)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleLogout}
              className="py-2 px-3 border border-white/10 bg-slate-900/60 hover:bg-slate-800 text-white rounded-xl font-semibold tracking-wide text-[10px] transition-all cursor-pointer text-center"
            >
              LOG OUT
            </button>
            <button
              onClick={handleDeleteAccount}
              className="py-2 px-3 border border-rose-500/20 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 rounded-xl font-semibold tracking-wide text-[10px] transition-all cursor-pointer text-center"
            >
              DELETE
            </button>
          </div>
        </div>

      </aside>

      {/* Main Panel Area */}
      <main className="flex-1 flex flex-col overflow-hidden z-10 relative h-screen">
        {/* Top Control Banner */}
        <header className="p-6 bg-slate-950/90 backdrop-blur-md flex flex-col sm:flex-row justify-between sm:items-center space-y-4 sm:space-y-0 flex-shrink-0 z-20">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight m-0 leading-tight">
              {tabs.find((t) => t.id === activeTab)?.label}
            </h1>
            <p className="text-xs text-[#00f0ff]/70 m-0 mt-0.5 font-mono">
              FLEET OPERATIONS AND ROUTE TRACKING
            </p>
          </div>

          {/* latency / connection status */}
          <div className="flex items-center space-x-4 text-xs font-mono">
            <div className="flex items-center space-x-1.5 text-white/50">
              <span>LATENCY:</span>
              <span className="text-[#00f0ff] font-bold">18ms</span>
            </div>
            <div className="px-3 py-1 bg-[#00f0ff]/10 border border-[#00f0ff]/20 text-[#00f0ff] rounded-full flex items-center space-x-1.5 font-bold shadow-[0_0_10px_rgba(0,240,255,0.05)]">
              <span className="w-1.5 h-1.5 bg-[#00f0ff] rounded-full animate-pulse"></span>
              <span className="text-[10px] tracking-wider">SYSTEM ONLINE</span>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <div className="px-6 md:px-8 pb-6 md:pb-8 flex-1 overflow-y-auto">
          {children}
        </div>
      </main>

    </div>
  )
}

export default DashboardLayout
