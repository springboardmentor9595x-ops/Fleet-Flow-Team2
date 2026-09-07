import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useTheme } from '../../context/ThemeContext'
import api from '../../api/axios'
import TruckLoader from '../ui/TruckLoader'

const EMPTY_FORM = { 
  full_name: '', 
  email: '', 
  password: '', 
  phone: '', 
  license_number: '', 
  experience_years: '', 
  address: '', 
  status: 'Available' 
}

const DRIVER_PALETTES = [
  {
    name: 'navy',
    bgDark: '#1a3350',
    bgLight: '#e0edff',
    bodyFillDark: '#2d4b70',
    bodyFillLight: '#a0c4f7',
    strokeDark: '#ffffff',
    strokeLight: '#1d4ed8',
    badgeDark: 'bg-blue-950/80 border border-blue-500/40 text-cyan-400',
    badgeLight: 'bg-blue-50 border border-blue-200 text-blue-700',
  },
  {
    name: 'purple',
    bgDark: '#3b1d42',
    bgLight: '#f3e8ff',
    bodyFillDark: '#592e61',
    bodyFillLight: '#d8b4fe',
    strokeDark: '#ffffff',
    strokeLight: '#7e22ce',
    badgeDark: 'bg-purple-950/80 border border-purple-500/40 text-purple-400',
    badgeLight: 'bg-purple-50 border border-purple-200 text-purple-700',
  },
  {
    name: 'forest',
    bgDark: '#163d2e',
    bgLight: '#dcfce7',
    bodyFillDark: '#265945',
    bodyFillLight: '#86efac',
    strokeDark: '#ffffff',
    strokeLight: '#15803d',
    badgeDark: 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-400',
    badgeLight: 'bg-emerald-50 border border-emerald-200 text-emerald-700',
  },
  {
    name: 'burgundy',
    bgDark: '#451a1c',
    bgLight: '#ffe4e6',
    bodyFillDark: '#662b2e',
    bodyFillLight: '#fda4af',
    strokeDark: '#ffffff',
    strokeLight: '#be123c',
    badgeDark: 'bg-rose-950/80 border border-rose-500/40 text-rose-400',
    badgeLight: 'bg-rose-50 border border-rose-200 text-rose-700',
  },
  {
    name: 'teal',
    bgDark: '#1b3447',
    bgLight: '#ccfbf1',
    bodyFillDark: '#2e4f69',
    bodyFillLight: '#5eead4',
    strokeDark: '#ffffff',
    strokeLight: '#0f766e',
    badgeDark: 'bg-teal-950/80 border border-teal-500/40 text-teal-400',
    badgeLight: 'bg-teal-50 border border-teal-200 text-teal-700',
  },
  {
    name: 'amber',
    bgDark: '#4a3716',
    bgLight: '#fef3c7',
    bodyFillDark: '#6e5124',
    bodyFillLight: '#fcd34d',
    strokeDark: '#ffffff',
    strokeLight: '#b45309',
    badgeDark: 'bg-amber-950/80 border border-amber-500/40 text-amber-400',
    badgeLight: 'bg-amber-50 border border-amber-200 text-amber-700',
  }
]

export const getDriverColorIndex = (driver, fallbackIdx = 0) => {
  if (!driver) return fallbackIdx % DRIVER_PALETTES.length
  // Hash driver's unique identifiers (ID, email, or name) for deterministic assignment
  const key = String(driver.driver_id || driver.email || driver.full_name || `${fallbackIdx}`)
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % DRIVER_PALETTES.length
}

export function DriverAvatarBanner({ idx = 0, isDark = true, className = "w-full h-32" }) {
  const pal = DRIVER_PALETTES[idx % DRIVER_PALETTES.length]
  const bg = isDark ? pal.bgDark : pal.bgLight
  const bodyFill = isDark ? pal.bodyFillDark : pal.bodyFillLight
  const stroke = isDark ? pal.strokeDark : pal.strokeLight

  return (
    <div 
      className={`rounded-2xl overflow-hidden relative flex items-center justify-center select-none shadow-sm transition-all duration-300 ${className}`}
      style={{ backgroundColor: bg }}
    >
      <svg
        viewBox="0 0 300 150"
        className="w-full h-full object-cover"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Subtle background depth gradient */}
        <radialGradient id={`glow-${idx}-${isDark ? 'dark' : 'light'}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.4)"} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <rect width="300" height="150" fill={`url(#glow-${idx}-${isDark ? 'dark' : 'light'})`} />

        {/* Shoulders / Torso Arc */}
        <path
          d="M 65 160 C 65 106, 235 106, 235 160 Z"
          fill={bodyFill}
          stroke={stroke}
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* Head Circle - Clean Silhouette without Any Letters */}
        <circle
          cx="150"
          cy="58"
          r="32"
          fill={bodyFill}
          stroke={stroke}
          strokeWidth="4"
        />
      </svg>
    </div>
  )
}

const getStatusBadge = (status, isDark) => {
  const sUpper = (status || '').toUpperCase()
  if (sUpper === 'AVAILABLE' || sUpper === 'ACTIVE') {
    return isDark 
      ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-400' 
      : 'bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold'
  }
  if (sUpper === 'IN TRANSIT') {
    return isDark 
      ? 'bg-indigo-950/70 border border-indigo-500/40 text-indigo-400' 
      : 'bg-indigo-50 border border-indigo-300 text-indigo-800 font-bold'
  }
  if (sUpper === 'ASSIGNED') {
    return isDark 
      ? 'bg-cyan-950/70 border border-cyan-500/40 text-cyan-400' 
      : 'bg-cyan-50 border border-cyan-300 text-cyan-800 font-bold'
  }
  if (sUpper === 'INACTIVE') {
    return isDark 
      ? 'bg-slate-800 border border-slate-700 text-slate-400' 
      : 'bg-slate-100 border border-slate-300 text-slate-600'
  }
  return isDark 
    ? 'bg-amber-950/70 border border-amber-500/40 text-amber-400' 
    : 'bg-amber-50 border border-amber-300 text-amber-800'
}

function DriversPanel() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const { isDark } = useTheme()

  const [drivers, setDrivers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [editingDriver, setEditingDriver] = useState(null)
  const [viewingDriver, setViewingDriver] = useState(null)
  const [viewingIdx, setViewingIdx] = useState(0)
  const [activeMenuId, setActiveMenuId] = useState(null)
  
  const [form, setForm] = useState(EMPTY_FORM)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 6

  // Role authorization
  const roleUpper = user?.role?.toUpperCase() || ''
  const canManage = roleUpper === 'ADMIN' || roleUpper === 'FLEETMANAGER' || roleUpper === 'FLEET MANAGER'
  const canDelete = roleUpper === 'ADMIN'

  const fetchDrivers = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await api.get('/drivers')
      setDrivers(res.data || [])
    } catch (err) {
      console.error('Failed to load drivers list:', err)
      if (!err.response || err.code === 'ERR_NETWORK') {
        // Fallback
        setDrivers([
          { driver_id: 'D-01', full_name: 'James O\'Connor', email: 'james.oconnor@fleetflow.com', phone: '555-0105', license_number: 'DL-0120180012345', experience_years: 6, address: 'California, US', status: 'Available' },
          { driver_id: 'D-02', full_name: 'Sarah Jenkins', email: 'sarah.jenkins@fleetflow.com', phone: '555-0101', license_number: 'DL-0120190054321', experience_years: 5, address: 'San Francisco, US', status: 'Available' },
          { driver_id: 'D-03', full_name: 'Voonna Pavan Krishna', email: 'pavankrishna2205@gmail.com', phone: '7702573033', license_number: 'AP107S2', experience_years: 30, address: 'Srikakulam', status: 'Available' },
          { driver_id: 'D-04', full_name: 'Clara Oswald', email: 'clara.oswald@fleetflow.com', phone: '555-0106', license_number: 'DL-0120170098765', experience_years: 4, address: 'London, UK', status: 'Available' },
          { driver_id: 'D-05', full_name: 'Elena Rostova', email: 'elena.rostova@fleetflow.com', phone: '555-0103', license_number: 'NV-88219003322', experience_years: 7, address: 'Nevada, US', status: 'Available' },
          { driver_id: 'D-06', full_name: 'Marcus Vance', email: 'marcus.vance@fleetflow.com', phone: '555-0102', license_number: 'TX-52019001144', experience_years: 10, address: 'Texas, US', status: 'Available' }
        ])
      } else {
        addToast('❌ ERROR: Could not retrieve drivers.', 'error', 'top-right')
      }
    } finally {
      setIsLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchDrivers()

    const handleDataChanged = () => {
      fetchDrivers()
    }
    window.addEventListener('fleetflow:datachanged', handleDataChanged)
    return () => {
      window.removeEventListener('fleetflow:datachanged', handleDataChanged)
    }
  }, [fetchDrivers])

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)
      await fetchDrivers()
      addToast('🔄 Fleet drivers registry refreshed.', 'info', 'top-right')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.full_name || !form.email || !form.password) return

    try {
      const payload = {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: 'DRIVER',
        phone: form.phone || null,
        license_number: form.license_number || null,
        experience_years: form.experience_years ? Number(form.experience_years) : null,
        address: form.address || null,
        status: form.status
      }

      const res = await api.post('/drivers', payload)
      setDrivers(prev => [res.data, ...prev])
      setIsAdding(false)
      setForm(EMPTY_FORM)
      window.dispatchEvent(new CustomEvent('fleetflow:datachanged', { detail: { entity: 'driver', action: 'create' } }))
      addToast(`👥 Driver ${res.data.full_name} registered successfully.`, 'success', 'top-right')
    } catch (err) {
      console.error('Failed to register driver:', err)
      const detail = err.response?.data?.detail
      let errorMsg = 'Could not register driver.'
      if (typeof detail === 'string') errorMsg = detail
      addToast(`❌ ${errorMsg}`, 'error', 'top-right')
    }
  }

  const startEditing = (driver) => {
    setEditingDriver(driver)
    setForm({
      full_name: driver.full_name || '',
      email: driver.email || '',
      phone: driver.phone || '',
      license_number: driver.license_number || '',
      experience_years: driver.experience_years || '',
      address: driver.address || '',
      status: driver.status || 'Available',
      password: ''
    })
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!form.full_name) return

    try {
      const payload = {
        full_name: form.full_name,
        phone: form.phone || null,
        license_number: form.license_number || null,
        experience_years: form.experience_years ? Number(form.experience_years) : null,
        address: form.address || null,
        status: form.status
      }

      const res = await api.put(`/drivers/${editingDriver.driver_id}`, payload)
      setDrivers(prev => prev.map(d => d.driver_id === editingDriver.driver_id ? res.data : d))
      setEditingDriver(null)
      setForm(EMPTY_FORM)
      window.dispatchEvent(new CustomEvent('fleetflow:datachanged', { detail: { entity: 'driver', action: 'update' } }))
      addToast(`✏️ Driver ${res.data.full_name} updated successfully.`, 'success', 'top-right')
    } catch (err) {
      console.error('Failed to update driver details:', err)
      const detail = err.response?.data?.detail
      let errorMsg = 'Could not update driver.'
      if (typeof detail === 'string') errorMsg = detail
      addToast(`❌ ${errorMsg}`, 'error', 'top-right')
    }
  }

  const handleDelete = async (id, name) => {
    const confirmed = window.confirm(`⚠️ Delete Driver ${name} from registry?`)
    if (!confirmed) return

    try {
      await api.delete(`/drivers/${id}`)
      setDrivers(prev => prev.filter(d => d.driver_id !== id))
      setActiveMenuId(null)
      window.dispatchEvent(new CustomEvent('fleetflow:datachanged', { detail: { entity: 'driver', action: 'delete' } }))
      addToast(`🗑️ Driver ${name} removed from registry.`, 'success', 'top-right')
    } catch (err) {
      console.error('Failed to delete driver:', err)
      addToast('❌ Could not delete driver.', 'error', 'top-right')
    }
  }

  const handleQuickStatus = async (id, newStatus) => {
    const d = drivers.find(item => item.driver_id === id)
    if (!d) return
    try {
      const payload = {
        full_name: d.full_name,
        phone: d.phone,
        license_number: d.license_number,
        experience_years: d.experience_years,
        address: d.address,
        status: newStatus
      }
      await api.put(`/drivers/${id}`, payload)
      setDrivers(prev => prev.map(item => item.driver_id === id ? { ...item, status: newStatus } : item))
      setActiveMenuId(null)
      window.dispatchEvent(new CustomEvent('fleetflow:datachanged', { detail: { entity: 'driver', action: 'status_update' } }))
      addToast(`🟢 Status updated to ${newStatus} for ${d.full_name}.`, 'success', 'top-right')
    } catch (err) {
      console.error('Status update failed:', err)
      addToast('❌ Failed to update status.', 'error', 'top-right')
    }
  }

  // Filter & Search Logic
  const filteredDrivers = drivers.filter(d => {
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch = !q || (
      (d.full_name && d.full_name.toLowerCase().includes(q)) ||
      (d.email && d.email.toLowerCase().includes(q)) ||
      (d.license_number && d.license_number.toLowerCase().includes(q)) ||
      (d.address && d.address.toLowerCase().includes(q)) ||
      (d.phone && d.phone.toLowerCase().includes(q))
    )

    const matchesStatus = statusFilter === 'ALL' || 
      (d.status && d.status.toLowerCase() === statusFilter.toLowerCase())

    return matchesSearch && matchesStatus
  })

  const totalPages = Math.max(1, Math.ceil(filteredDrivers.length / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const paginatedDrivers = filteredDrivers.slice(startIndex, startIndex + pageSize)

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col justify-center items-center font-mono">
        <TruckLoader />
        <div className={`text-xs uppercase tracking-widest mt-6 animate-pulse font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Loading drivers fleet registry...
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 font-sans w-full pb-16 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
      
      {/* ========================================================= */}
      {/* 1. TOP TOOLBAR (SEARCH, STATUS FILTER, REFRESH, ADD)      */}
      {/* ========================================================= */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        
        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
          
          {/* Search Input */}
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Search by name, license, address, email..."
              className={`w-full pl-9 pr-8 py-2 rounded-xl text-xs font-sans shadow-sm transition-all focus:outline-none ${
                isDark 
                  ? 'bg-[#0c1220] border border-slate-700/80 text-white placeholder-slate-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400' 
                  : 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-400'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setCurrentPage(1)
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs cursor-pointer p-0.5"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Dropdown */}
          <div className="relative shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className={`px-3.5 py-2 rounded-xl text-xs cursor-pointer font-sans appearance-none pr-8 shadow-sm transition-all focus:outline-none ${
                isDark 
                  ? 'bg-[#0c1220] border border-slate-700/80 text-white focus:border-cyan-400' 
                  : 'bg-white border border-slate-300 text-slate-800 focus:border-blue-500'
              }`}
            >
              <option value="ALL">All Status</option>
              <option value="Available">Available</option>
              <option value="In Transit">In Transit</option>
              <option value="Assigned">Assigned</option>
              <option value="Inactive">Inactive</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none">▼</span>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 shrink-0 justify-end">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm ${
              isDark 
                ? 'bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white' 
                : 'bg-white hover:bg-slate-50 border border-slate-300 text-slate-800'
            }`}
          >
            <span className={`text-xs ${isRefreshing ? 'animate-spin' : ''}`}>🔄</span>
            <span>Refresh</span>
          </button>

          {canManage && (
            <button
              onClick={() => { setIsAdding(true); setForm(EMPTY_FORM) }}
              className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_15px_rgba(34,211,238,0.35)]"
            >
              <span className="text-sm font-black">+</span>
              <span>Add Driver</span>
            </button>
          )}
        </div>

      </div>

      {/* Subtitle / Counter */}
      <div className={`text-xs font-sans ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        Showing {filteredDrivers.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + pageSize, filteredDrivers.length)} of {filteredDrivers.length} drivers
      </div>

      {/* ========================================================= */}
      {/* 2. DRIVER CARDS & FIXED PAGINATION CONTAINER              */}
      {/* ========================================================= */}
      <div className="min-h-[560px] flex flex-col justify-between">
        {paginatedDrivers.length === 0 ? (
          <div className={`p-12 text-center font-mono text-xs rounded-2xl shadow-sm ${
            isDark ? 'bg-[#0b101c] border border-slate-800/80 text-slate-400' : 'bg-white border border-slate-200 text-slate-500'
          }`}>
            No drivers found matching search criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 content-start">
            {paginatedDrivers.map((d, idx) => {
              const colorIdx = getDriverColorIndex(d, startIndex + idx)
              const pal = DRIVER_PALETTES[colorIdx]
              const isMenuOpen = activeMenuId === d.driver_id
              const initial = d.full_name?.charAt(0)?.toUpperCase() || 'D'

              return (
                <div
                  key={d.driver_id}
                  className={`p-5 rounded-2xl transition-all flex flex-col justify-between relative group ${
                    isDark 
                      ? 'bg-[#0b101c] border border-slate-800/90 shadow-xl hover:border-slate-700/90 text-white' 
                      : 'bg-white border border-slate-200 shadow-md hover:border-slate-300 hover:shadow-lg text-slate-900'
                  }`}
                >
                  <div>
                    
                    {/* Top Row: Circular Initial Avatar, Name, Email, Status Badge */}
                    <div className="flex justify-between items-start gap-2.5 mb-2">
                      <div className="flex items-center space-x-3 min-w-0">
                        {/* Clean Avatar Circle with Initial */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm ${
                          isDark ? pal.badgeDark : pal.badgeLight
                        }`}>
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <h3 className={`font-bold text-sm truncate m-0 leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {d.full_name}
                          </h3>
                          <p className={`text-[11px] truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {d.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        {/* Status Badge */}
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border capitalize ${getStatusBadge(d.status, isDark)}`}>
                          {d.status}
                        </span>

                        {/* Three-dots Menu */}
                        <div className="relative">
                          <button
                            onClick={() => setActiveMenuId(isMenuOpen ? null : d.driver_id)}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-sm font-bold ${
                              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                            }`}
                            title="Actions menu"
                          >
                            ⋮
                          </button>

                          {/* Dropdown Menu */}
                          {isMenuOpen && (
                            <div className={`absolute right-0 top-8 w-44 rounded-xl shadow-2xl z-50 py-1.5 font-sans text-xs animate-fade-in ${
                              isDark ? 'bg-[#0f172a] border border-slate-700 text-slate-200' : 'bg-white border border-slate-200 text-slate-800 shadow-xl'
                            }`}>
                              <button
                                onClick={() => {
                                  setViewingDriver(d)
                                  setViewingIdx(colorIdx)
                                  setActiveMenuId(null)
                                }}
                                className={`w-full px-3 py-1.5 text-left flex items-center gap-2 cursor-pointer ${
                                  isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                }`}
                              >
                                <span>👁️</span>
                                <span>View Profile</span>
                              </button>
                              {canManage && (
                                <button
                                  onClick={() => {
                                    startEditing(d)
                                    setActiveMenuId(null)
                                  }}
                                  className={`w-full px-3 py-1.5 text-left flex items-center gap-2 cursor-pointer ${
                                    isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                  }`}
                                >
                                  <span>✏️</span>
                                  <span>Edit Specs</span>
                                </button>
                              )}
                              <div className={`border-t my-1 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}></div>
                              <div className={`px-3 py-1 text-[10px] font-mono uppercase font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Quick Status</div>
                              {['Available', 'In Transit', 'Assigned', 'Inactive'].map((st) => (
                                <button
                                  key={st}
                                  onClick={() => handleQuickStatus(d.driver_id, st)}
                                  className={`w-full px-3 py-1 text-left flex items-center gap-1.5 cursor-pointer text-[11px] ${
                                    isDark ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
                                  }`}
                                >
                                  <span>•</span>
                                  <span>Mark {st}</span>
                                </button>
                              ))}
                              {canDelete && (
                                <>
                                  <div className={`border-t my-1 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}></div>
                                  <button
                                    onClick={() => handleDelete(d.driver_id, d.full_name)}
                                    className={`w-full px-3 py-1.5 text-left text-rose-500 flex items-center gap-2 cursor-pointer ${
                                      isDark ? 'hover:bg-rose-950/40' : 'hover:bg-rose-50'
                                    }`}
                                  >
                                    <span>🗑️</span>
                                    <span>Delete Driver</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Center: Sleek Silhouette Vector Avatar Banner (NO LETTER ON HEAD) */}
                    <DriverAvatarBanner idx={colorIdx} isDark={isDark} className="w-full h-32 my-3" />

                    {/* Bottom Metadata List */}
                    <div className="space-y-1.5 text-xs pt-1">
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-slate-400 text-[11px]">🪪</span>
                        <span className={`font-mono ${d.license_number ? (isDark ? 'text-cyan-400 font-semibold' : 'text-cyan-700 font-bold') : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>
                          {d.license_number || 'No license on file'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-slate-400 text-[11px]">⏳</span>
                        <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                          {d.experience_years != null ? `${d.experience_years} yrs experience` : 'Experience not set'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-rose-500 text-[11px]">📍</span>
                        <span className={`truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {d.address || 'No address on file'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-blue-400 text-[11px]">📞</span>
                        <span className={`font-mono font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {d.phone || 'No phone on file'}
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Card Bottom Row: Driver Tag Badge & View Profile Button */}
                  <div className={`mt-4 pt-3 border-t flex items-center justify-between gap-2 ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
                    <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-medium ${
                      isDark 
                        ? 'bg-slate-900 border border-slate-800 text-slate-300' 
                        : 'bg-slate-100 border border-slate-200 text-slate-700'
                    }`}>
                      Driver
                    </span>

                    <button
                      onClick={() => {
                        setViewingDriver(d)
                        setViewingIdx(colorIdx)
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                        isDark 
                          ? 'border border-cyan-500/40 bg-cyan-950/30 text-cyan-400 hover:bg-cyan-900/50' 
                          : 'border border-cyan-600/40 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 font-bold'
                      }`}
                    >
                      <span>👁️</span>
                      <span>View Profile</span>
                    </button>
                  </div>

                </div>
              )
            })}
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. PAGINATION FOOTER (FIXED IN PLACE AT BOTTOM)           */}
        {/* ========================================================= */}
        <div className={`flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 mt-8 border-t text-xs font-sans ${
          isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-600'
        }`}>
          <div>
            Showing {filteredDrivers.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + pageSize, filteredDrivers.length)} of {filteredDrivers.length} drivers
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 shadow-sm ${
                isDark ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800' : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300'
              }`}
            >
              <span>&lt;</span>
              <span>Prev</span>
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  currentPage === page
                    ? 'bg-cyan-400 text-slate-950 font-black shadow-sm'
                    : isDark 
                      ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800' 
                      : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300'
                }`}
              >
                {page}
              </button>
            ))}

            {totalPages > 5 && (
              <>
                <span className="px-1 text-slate-400">...</span>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    currentPage === totalPages
                      ? 'bg-cyan-400 text-slate-950 font-black'
                      : isDark 
                        ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800' 
                        : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300'
                  }`}
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 shadow-sm ${
                isDark ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800' : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300'
              }`}
            >
              <span>Next</span>
              <span>&gt;</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. MODAL: ADD NEW DRIVER                                  */}
      {/* ========================================================= */}
      {canManage && isAdding && createPortal(
        <div 
          onClick={() => setIsAdding(false)}
          className={`fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in font-sans ${
            isDark ? 'bg-slate-950/80 text-white' : 'bg-slate-900/50 text-slate-900'
          }`}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg p-6 relative rounded-3xl shadow-2xl ${
              isDark ? 'bg-[#0c1220] border border-slate-800' : 'bg-white border border-slate-200 shadow-2xl'
            }`}
          >
            <div className={`flex justify-between items-center border-b pb-3 mb-5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className={`text-base font-bold tracking-tight m-0 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span>👥</span>
                <span>Register New Fleet Driver</span>
              </h3>
              <button 
                onClick={() => setIsAdding(false)} 
                className={`cursor-pointer font-bold text-xs p-1.5 rounded-lg transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Full Name *</label>
                  <input
                    name="full_name"
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={form.full_name}
                    onChange={handleChange}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Phone</label>
                  <input
                    name="phone"
                    type="text"
                    placeholder="+91-XXXXX-XXXXX"
                    value={form.phone}
                    onChange={handleChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs font-mono ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Email *</label>
                  <input
                    name="email"
                    type="email"
                    placeholder="driver@example.com"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Password *</label>
                  <input
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>License Number</label>
                  <input
                    name="license_number"
                    type="text"
                    placeholder="DL-XXXXXXXX"
                    value={form.license_number}
                    onChange={handleChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs uppercase font-mono ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Experience (Years)</label>
                  <input
                    name="experience_years"
                    type="number"
                    min="0"
                    placeholder="e.g. 5"
                    value={form.experience_years}
                    onChange={handleChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs font-mono ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none font-bold text-xs ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-cyan-400' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-blue-600'
                    }`}
                  >
                    <option value="Available">Available</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Address / City</label>
                  <input
                    name="address"
                    type="text"
                    placeholder="City, State"
                    value={form.address}
                    onChange={handleChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl font-bold tracking-wide transition-all cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.35)] mt-4 text-center text-xs"
              >
                + REGISTER FLEET DRIVER
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* 5. MODAL: EDIT DRIVER SPECS                               */}
      {/* ========================================================= */}
      {canManage && editingDriver && createPortal(
        <div 
          onClick={() => setEditingDriver(null)}
          className={`fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in font-sans ${
            isDark ? 'bg-slate-950/80 text-white' : 'bg-slate-900/50 text-slate-900'
          }`}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg p-6 relative rounded-3xl shadow-2xl ${
              isDark ? 'bg-[#0c1220] border border-slate-800' : 'bg-white border border-slate-200 shadow-2xl'
            }`}
          >
            <div className={`flex justify-between items-center border-b pb-3 mb-5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className={`text-base font-bold tracking-tight m-0 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span>✏️</span>
                <span>Edit Specs: {editingDriver.full_name}</span>
              </h3>
              <button 
                onClick={() => setEditingDriver(null)} 
                className={`cursor-pointer font-bold text-xs p-1.5 rounded-lg transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Full Name *</label>
                  <input
                    name="full_name"
                    type="text"
                    value={form.full_name}
                    onChange={handleChange}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Phone</label>
                  <input
                    name="phone"
                    type="text"
                    value={form.phone}
                    onChange={handleChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs font-mono ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>License Number</label>
                  <input
                    name="license_number"
                    type="text"
                    value={form.license_number}
                    onChange={handleChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs uppercase font-mono ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Experience (Years)</label>
                  <input
                    name="experience_years"
                    type="number"
                    min="0"
                    value={form.experience_years}
                    onChange={handleChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs font-mono ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none font-bold text-xs ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-cyan-400' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-blue-600'
                    }`}
                  >
                    <option value="Available">Available</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Address / City</label>
                  <input
                    name="address"
                    type="text"
                    value={form.address}
                    onChange={handleChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl font-bold tracking-wide transition-all cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.35)] mt-4 text-center text-xs"
              >
                SAVE DRIVER UPDATES
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* 6. MODAL: VIEW DRIVER PROFILE                             */}
      {/* ========================================================= */}
      {viewingDriver && createPortal(
        <div 
          onClick={() => setViewingDriver(null)}
          className={`fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm animate-fade-in font-sans ${
            isDark ? 'bg-slate-950/80 text-white' : 'bg-slate-900/50 text-slate-900'
          }`}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-xl p-5 sm:p-6 relative max-h-[90vh] overflow-y-auto text-xs shadow-2xl rounded-3xl space-y-5 ${
              isDark ? 'bg-[#0b101c] border border-slate-800' : 'bg-white border border-slate-200 shadow-2xl'
            }`}
          >
            {/* Close X Button */}
            <button
              onClick={() => setViewingDriver(null)}
              className={`absolute right-4 top-4 text-base cursor-pointer p-1 rounded-lg transition-colors ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Close modal"
            >
              ✕
            </button>

            {/* Modal Header */}
            <div className="flex justify-between items-start gap-3 pr-6">
              <div className="flex items-center space-x-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg shrink-0 shadow-sm ${
                  isDark ? 'bg-cyan-950/80 border border-cyan-500/40 text-cyan-400' : 'bg-blue-50 border border-blue-200 text-blue-700'
                }`}>
                  {viewingDriver.full_name?.charAt(0)?.toUpperCase() || 'D'}
                </div>
                <div>
                  <h3 className={`text-base font-bold m-0 leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {viewingDriver.full_name}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {viewingDriver.email}
                    </span>
                    <span className={`inline-block px-2.5 py-0.5 border text-[11px] font-semibold rounded-full capitalize ${getStatusBadge(viewingDriver.status, isDark)}`}>
                      {viewingDriver.status}
                    </span>
                  </div>
                </div>
              </div>

              {canManage && (
                <button
                  onClick={() => {
                    startEditing(viewingDriver)
                    setViewingDriver(null)
                  }}
                  className="px-3.5 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl font-bold text-xs cursor-pointer shadow-sm transition-all"
                >
                  Edit
                </button>
              )}
            </div>

            {/* Driver Silhouette Banner in Modal */}
            <DriverAvatarBanner idx={viewingIdx} isDark={isDark} className="w-full h-44 shadow-md" />

            {/* Specifications Sub-Card */}
            <div className={`rounded-2xl p-4 space-y-3.5 shadow-inner ${
              isDark ? 'bg-[#070b14] border border-slate-800/90' : 'bg-slate-50 border border-slate-200'
            }`}>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className={`text-[10px] font-mono uppercase font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    COMMERCIAL LICENSE
                  </span>
                  <div className={`text-sm font-mono font-bold mt-0.5 ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                    🪪 {viewingDriver.license_number || 'No license on file'}
                  </div>
                </div>

                <div>
                  <span className={`text-[10px] font-mono uppercase font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    EXPERIENCE RECORD
                  </span>
                  <div className={`text-sm font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    ⏳ {viewingDriver.experience_years != null ? `${viewingDriver.experience_years} Years` : '5 Years'}
                  </div>
                </div>
              </div>

              <div className={`grid grid-cols-2 gap-4 pt-3 border-t ${isDark ? 'border-slate-800/70' : 'border-slate-200'}`}>
                <div>
                  <span className={`text-[10px] font-mono uppercase font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    LOCATION / ADDRESS
                  </span>
                  <div className={`text-xs font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    📍 {viewingDriver.address || 'Central Depot'}
                  </div>
                </div>

                <div>
                  <span className={`text-[10px] font-mono uppercase font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    DIRECT PHONE
                  </span>
                  <div className={`text-xs font-mono font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    📞 {viewingDriver.phone || '555-0100'}
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setViewingDriver(null)}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs cursor-pointer transition-all border ${
                  isDark ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                }`}
              >
                Close
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  )
}

export default DriversPanel
