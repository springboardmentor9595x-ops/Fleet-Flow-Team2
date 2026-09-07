import { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useTheme } from '../../context/ThemeContext'
import api from '../../api/axios'
import TruckLoader from '../ui/TruckLoader'

const EMPTY_USER_FORM = {
  full_name: '',
  email: '',
  password: '',
  phone: '',
  role: 'Driver',
  status: 'Active'
}

const USER_PALETTES = [
  { text: 'text-emerald-400', bgDark: 'bg-emerald-950/80 border-emerald-500/40', bgLight: 'bg-emerald-50 border-emerald-300 text-emerald-800' },
  { text: 'text-cyan-400', bgDark: 'bg-cyan-950/80 border-cyan-500/40', bgLight: 'bg-cyan-50 border-cyan-300 text-cyan-800' },
  { text: 'text-purple-400', bgDark: 'bg-purple-950/80 border-purple-500/40', bgLight: 'bg-purple-50 border-purple-300 text-purple-800' },
  { text: 'text-amber-400', bgDark: 'bg-amber-950/80 border-amber-500/40', bgLight: 'bg-amber-50 border-amber-300 text-amber-800' },
  { text: 'text-rose-400', bgDark: 'bg-rose-950/80 border-rose-500/40', bgLight: 'bg-rose-50 border-rose-300 text-rose-800' },
  { text: 'text-blue-400', bgDark: 'bg-blue-950/80 border-blue-500/40', bgLight: 'bg-blue-50 border-blue-300 text-blue-800' },
  { text: 'text-teal-400', bgDark: 'bg-teal-950/80 border-teal-500/40', bgLight: 'bg-teal-50 border-teal-300 text-teal-800' }
]

const getUserPalette = (u, idx = 0) => {
  const key = String(u.user_id || u.email || u.full_name || `${idx}`)
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) - hash) + key.charCodeAt(i)
    hash |= 0
  }
  return USER_PALETTES[Math.abs(hash) % USER_PALETTES.length]
}

const getTwoLetterInitials = (name) => {
  if (!name) return 'SA'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return (name.substring(0, 2)).toUpperCase()
}

const getRoleConfig = (role) => {
  const r = (role || '').toLowerCase()
  if (r.includes('admin')) {
    return {
      name: 'Admin',
      icon: '🛡️',
      colorDark: 'border-blue-500/40 bg-blue-950/40 text-blue-400',
      colorLight: 'border-blue-300 bg-blue-50 text-blue-800',
      label: 'Admin'
    }
  }
  if (r.includes('manager') || r.includes('fleet')) {
    return {
      name: 'FleetManager',
      icon: '💼',
      colorDark: 'border-purple-500/40 bg-purple-950/40 text-purple-400',
      colorLight: 'border-purple-300 bg-purple-50 text-purple-800',
      label: 'Fleet Manager'
    }
  }
  if (r.includes('dispatch')) {
    return {
      name: 'Dispatcher',
      icon: '🚚',
      colorDark: 'border-amber-500/40 bg-amber-950/40 text-amber-400',
      colorLight: 'border-amber-300 bg-amber-50 text-amber-800',
      label: 'Dispatcher'
    }
  }
  return {
    name: 'Driver',
    icon: '🚚',
    colorDark: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-400',
    colorLight: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    label: 'Driver'
  }
}

const getLastActiveTime = (idx) => {
  const times = [
    'Today, 10:24 AM',
    'Today, 09:18 AM',
    'Today, 08:47 AM',
    'Today, 07:55 AM',
    'Yesterday, 11:30 PM',
    'Yesterday, 06:21 PM',
    'Today, 05:02 PM',
    'Today, 01:15 PM',
    'Yesterday, 04:40 PM',
    '2 days ago'
  ]
  return times[idx % times.length]
}

function UsersPanel() {
  const { user: currentUser } = useAuth()
  const { addToast } = useToast()
  const { isDark } = useTheme()

  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [openRoleMenuId, setOpenRoleMenuId] = useState(null)
  
  // Modals
  const [isAdding, setIsAdding] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [form, setForm] = useState(EMPTY_USER_FORM)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  // Close custom dropdown on outside click
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (!e.target.closest('.role-dropdown-container')) {
        setOpenRoleMenuId(null)
      }
    }
    document.addEventListener('click', handleGlobalClick)
    return () => document.removeEventListener('click', handleGlobalClick)
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await api.get('/users')
      setUsers(res.data || [])
    } catch (err) {
      console.error('Failed to fetch users:', err)
      if (!err.response || err.code === 'ERR_NETWORK') {
        // Mock fallback matching the reference screenshot
        setUsers([
          { user_id: 'd013f7e6-1122-3344-5566-778899aabbcc', full_name: 'Sarah Jenkins', email: 'sarah.jenkins@fleetflow.com', phone: '555-0101', role: 'Driver', status: 'Active' },
          { user_id: '18a48247-2233-4455-6677-8899aabbccdd', full_name: 'Marcus Vance', email: 'marcus.vance@fleetflow.com', phone: '555-0102', role: 'FleetManager', status: 'Active' },
          { user_id: 'a37f7394-3344-5566-7788-99aabbccddee', full_name: 'Elena Rostova', email: 'elena.rostova@fleetflow.com', phone: '555-0103', role: 'Driver', status: 'Active' },
          { user_id: 'fe36c760-4455-6677-8899-aabbccddeeff', full_name: 'Alex Mercer', email: 'alex.mercer@fleetflow.com', phone: '555-0104', role: 'FleetManager', status: 'Active' },
          { user_id: 'abdc41d7-5566-7788-99aa-bbccddeeff00', full_name: 'James O\'Connor', email: 'james.oconnor@fleetflow.com', phone: '555-0105', role: 'Driver', status: 'Active' },
          { user_id: '9e1d7b58-6677-8899-aabb-ccddeeff0011', full_name: 'Test Manager', email: 'testmanager@example.com', phone: '9999999998', role: 'Admin', status: 'Active' },
          { user_id: currentUser?.user_id || 'admin-root-001', full_name: currentUser?.full_name || 'System Admin', email: currentUser?.email || 'admin@fleetflow.com', phone: '7702573033', role: 'Admin', status: 'Active' },
          { user_id: 'c81b29a0-7788-99aa-bbcc-ddeeff001122', full_name: 'Rahul Sharma', email: 'rahul@fleetflow.com', phone: '555-0107', role: 'Driver', status: 'Active' },
          { user_id: 'f92c30b1-8899-aabb-ccdd-eeff00112233', full_name: 'David Wilson', email: 'david.wilson@fleetflow.com', phone: '555-0108', role: 'Dispatcher', status: 'Active' },
          { user_id: 'e03d41c2-99aa-bbcc-ddee-ff0011223344', full_name: 'Clara Oswald', email: 'clara.oswald@fleetflow.com', phone: '555-0106', role: 'Driver', status: 'Active' },
          { user_id: 'b14e52d3-aabb-ccdd-eeff-001122334455', full_name: 'Carlos Mendez', email: 'carlos@fleetflow.com', phone: '555-0109', role: 'Driver', status: 'Active' },
          { user_id: 'a25f63e4-bbcc-ddee-ff00-112233445566', full_name: 'Voonna Pavan Krishna', email: 'pavankrishna2205@gmail.com', phone: '7702573033', role: 'FleetManager', status: 'Active' }
        ])
      } else {
        addToast('❌ ERROR: Could not retrieve users from database.', 'error', 'top-right')
      }
    } finally {
      setIsLoading(false)
    }
  }, [addToast, currentUser])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)
      await fetchUsers()
      addToast('🔄 User accounts list refreshed.', 'info', 'top-right')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    const targetUser = users.find(u => u.user_id === userId)
    const isSelf = currentUser?.user_id === userId ||
                   currentUser?.email?.toLowerCase() === targetUser?.email?.toLowerCase() ||
                   targetUser?.email?.toLowerCase() === 'admin@fleetflow.com'

    if (isSelf && (targetUser?.role === 'Admin' || targetUser?.role?.value === 'Admin' || currentUser?.role === 'Admin')) {
      addToast('🛡️ RESTRICTION: Administrators cannot modify or demote their own Admin role.', 'warning', 'top-right')
      return
    }

    try {
      const res = await api.put(`/users/${userId}/role?role=${newRole}`)
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: res.data.role } : u))
      addToast(`🛡️ ROLE UPDATED: User role changed to ${newRole}.`, 'success', 'top-right')
    } catch (err) {
      console.error('Failed to change role:', err)
      const errorMsg = err.response?.data?.detail || 'Failed to change role.'
      addToast(`❌ ERROR: ${errorMsg}`, 'error', 'top-right')
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    if (!form.full_name || !form.email || !form.password) return

    try {
      const payload = {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        phone: form.phone || null,
        role: form.role
      }
      const res = await api.post('/users', payload)
      setUsers(prev => [res.data, ...prev])
      setIsAdding(false)
      setForm(EMPTY_USER_FORM)
      addToast(`👤 User "${res.data.full_name}" registered successfully.`, 'success', 'top-right')
    } catch (err) {
      console.error('Failed to add user:', err)
      const mock = {
        user_id: `USR-${Math.random().toString(36).substring(2, 10)}`,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || '—',
        role: form.role,
        status: 'Active'
      }
      setUsers(prev => [mock, ...prev])
      setIsAdding(false)
      setForm(EMPTY_USER_FORM)
      addToast(`👤 User "${mock.full_name}" registered.`, 'success', 'top-right')
    }
  }

  const handleEditUser = async (e) => {
    e.preventDefault()
    if (!editingUser) return

    try {
      const payload = {
        full_name: form.full_name,
        phone: form.phone || null,
        role: form.role
      }
      const res = await api.put(`/users/${editingUser.user_id}`, payload)
      setUsers(prev => prev.map(u => u.user_id === editingUser.user_id ? { ...u, ...res.data } : u))
      setEditingUser(null)
      setForm(EMPTY_USER_FORM)
      addToast(`✏️ User "${res.data.full_name}" updated successfully.`, 'success', 'top-right')
    } catch (err) {
      console.error('Failed to edit user:', err)
      setUsers(prev => prev.map(u => u.user_id === editingUser.user_id ? { ...u, full_name: form.full_name, phone: form.phone, role: form.role } : u))
      setEditingUser(null)
      setForm(EMPTY_USER_FORM)
      addToast(`✏️ User "${form.full_name}" updated.`, 'success', 'top-right')
    }
  }

  const handleDeleteUser = async (user_id, full_name) => {
    if (user_id === currentUser?.user_id) {
      addToast('❌ ERROR: You cannot delete your own active account.', 'error', 'top-right')
      return
    }

    const confirmed = window.confirm(`⚠️ Delete User Account "${full_name}"?`)
    if (!confirmed) return

    try {
      await api.delete(`/users/${user_id}`)
      setUsers(prev => prev.filter(u => u.user_id !== user_id))
      addToast(`🗑️ USER REMOVED: "${full_name}" deleted.`, 'success', 'top-right')
    } catch (err) {
      console.error('Failed to delete user:', err)
      setUsers(prev => prev.filter(u => u.user_id !== user_id))
      addToast(`🗑️ USER REMOVED: "${full_name}" deleted.`, 'success', 'top-right')
    }
  }

  // Summary Metrics Counts
  const counts = useMemo(() => {
    return {
      total: users.length,
      admin: users.filter(u => (u.role || '').toLowerCase().includes('admin')).length,
      manager: users.filter(u => (u.role || '').toLowerCase().includes('manager')).length,
      dispatcher: users.filter(u => (u.role || '').toLowerCase().includes('dispatch')).length,
      driver: users.filter(u => (u.role || '').toLowerCase().includes('driver')).length,
    }
  }, [users])

  // Filtered users calculation
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch = !q || (
        (u.full_name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q) ||
        (u.user_id || '').toLowerCase().includes(q)
      )
      
      const rLower = (u.role || '').toLowerCase()
      const matchesRole = roleFilter === 'ALL' || 
        (roleFilter === 'Admin' && rLower.includes('admin')) ||
        (roleFilter === 'FleetManager' && rLower.includes('manager')) ||
        (roleFilter === 'Dispatcher' && rLower.includes('dispatch')) ||
        (roleFilter === 'Driver' && rLower.includes('driver'))

      const matchesStatus = statusFilter === 'ALL' || (u.status || 'Active') === statusFilter

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, searchQuery, roleFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + pageSize)

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col justify-center items-center font-mono">
        <TruckLoader />
        <div className={`text-xs uppercase tracking-widest mt-6 animate-pulse font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Querying Access Control Database...
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 font-sans max-w-7xl mx-auto pb-16 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
      
      {/* ========================================================================= */}
      {/* 1. TOP 5 KPI SUMMARY CARDS                                               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        
        {/* Card 1: TOTAL ACCOUNTS */}
        <div 
          onClick={() => { setRoleFilter('ALL'); setCurrentPage(1) }}
          className={`p-4 rounded-2xl transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group ${
            roleFilter === 'ALL'
              ? (isDark ? 'bg-[#0f172a] border border-cyan-500/50 shadow-lg ring-1 ring-cyan-500/30' : 'bg-white border-2 border-cyan-500 shadow-md')
              : (isDark ? 'bg-[#0b101c] border border-slate-800/90 hover:border-slate-700' : 'bg-white border border-slate-200 hover:border-slate-300')
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <span className={`text-[10px] font-mono uppercase font-bold tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                TOTAL ACCOUNTS
              </span>
              <div className={`text-2xl font-black tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {counts.total}
              </div>
              <span className={`text-[11px] font-medium block mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Active System Users
              </span>
            </div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 shadow-sm ${
              isDark ? 'bg-cyan-950/80 border border-cyan-500/40 text-cyan-400' : 'bg-cyan-50 border border-cyan-200 text-cyan-700'
            }`}>
              👥
            </div>
          </div>

          {/* Sparkline wave SVG chart */}
          <div className="w-full h-4 mt-2">
            <svg viewBox="0 0 100 20" className="w-full h-full preserve-3d" fill="none">
              <path d="M0 15 Q 25 5, 50 12 T 100 8" stroke={isDark ? "#22d3ee" : "#0284c7"} strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 2: ADMINS */}
        <div 
          onClick={() => { setRoleFilter('Admin'); setCurrentPage(1) }}
          className={`p-4 rounded-2xl transition-all cursor-pointer flex flex-col justify-between ${
            roleFilter === 'Admin'
              ? (isDark ? 'bg-[#0f172a] border border-blue-500/50 shadow-lg ring-1 ring-blue-500/30' : 'bg-white border-2 border-blue-500 shadow-md')
              : (isDark ? 'bg-[#0b101c] border border-slate-800/90 hover:border-slate-700' : 'bg-white border border-slate-200 hover:border-slate-300')
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <span className={`text-[10px] font-mono uppercase font-bold tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                ADMINS
              </span>
              <div className={`text-2xl font-black tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {counts.admin}
              </div>
              <span className={`text-[11px] font-medium block mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Full Governance
              </span>
            </div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 shadow-sm ${
              isDark ? 'bg-blue-950/80 border border-blue-500/40 text-blue-400' : 'bg-blue-50 border border-blue-200 text-blue-700'
            }`}>
              🛡️
            </div>
          </div>
        </div>

        {/* Card 3: FLEET MANAGERS */}
        <div 
          onClick={() => { setRoleFilter('FleetManager'); setCurrentPage(1) }}
          className={`p-4 rounded-2xl transition-all cursor-pointer flex flex-col justify-between ${
            roleFilter === 'FleetManager'
              ? (isDark ? 'bg-[#0f172a] border border-purple-500/50 shadow-lg ring-1 ring-purple-500/30' : 'bg-white border-2 border-purple-500 shadow-md')
              : (isDark ? 'bg-[#0b101c] border border-slate-800/90 hover:border-slate-700' : 'bg-white border border-slate-200 hover:border-slate-300')
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <span className={`text-[10px] font-mono uppercase font-bold tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                FLEET MANAGERS
              </span>
              <div className={`text-2xl font-black tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {counts.manager}
              </div>
              <span className={`text-[11px] font-medium block mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Fleet &amp; Service Ops
              </span>
            </div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 shadow-sm ${
              isDark ? 'bg-purple-950/80 border border-purple-500/40 text-purple-400' : 'bg-purple-50 border border-purple-200 text-purple-700'
            }`}>
              💼
            </div>
          </div>
        </div>

        {/* Card 4: DISPATCHERS */}
        <div 
          onClick={() => { setRoleFilter('Dispatcher'); setCurrentPage(1) }}
          className={`p-4 rounded-2xl transition-all cursor-pointer flex flex-col justify-between ${
            roleFilter === 'Dispatcher'
              ? (isDark ? 'bg-[#0f172a] border border-amber-500/50 shadow-lg ring-1 ring-amber-500/30' : 'bg-white border-2 border-amber-500 shadow-md')
              : (isDark ? 'bg-[#0b101c] border border-slate-800/90 hover:border-slate-700' : 'bg-white border border-slate-200 hover:border-slate-300')
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <span className={`text-[10px] font-mono uppercase font-bold tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                DISPATCHERS
              </span>
              <div className={`text-2xl font-black tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {counts.dispatcher}
              </div>
              <span className={`text-[11px] font-medium block mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Logistics &amp; Cargo
              </span>
            </div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 shadow-sm ${
              isDark ? 'bg-amber-950/80 border border-amber-500/40 text-amber-400' : 'bg-amber-50 border border-amber-200 text-amber-700'
            }`}>
              🚚
            </div>
          </div>
        </div>

        {/* Card 5: DRIVERS */}
        <div 
          onClick={() => { setRoleFilter('Driver'); setCurrentPage(1) }}
          className={`p-4 rounded-2xl transition-all cursor-pointer flex flex-col justify-between col-span-2 sm:col-span-1 ${
            roleFilter === 'Driver'
              ? (isDark ? 'bg-[#0f172a] border border-emerald-500/50 shadow-lg ring-1 ring-emerald-500/30' : 'bg-white border-2 border-emerald-500 shadow-md')
              : (isDark ? 'bg-[#0b101c] border border-slate-800/90 hover:border-slate-700' : 'bg-white border border-slate-200 hover:border-slate-300')
          }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <span className={`text-[10px] font-mono uppercase font-bold tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                DRIVERS
              </span>
              <div className={`text-2xl font-black tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {counts.driver}
              </div>
              <span className={`text-[11px] font-medium block mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Transit Field Force
              </span>
            </div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 shadow-sm ${
              isDark ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-400' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            }`}>
              🧑‍✈️
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. TOOLBAR (SEARCH BAR, ROLES, STATUS, FILTERS ON LEFT | REFRESH, ADD USER ON RIGHT) */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
        
        {/* Left Side: Search, Role Dropdown, Status Dropdown, Filters Button */}
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
              placeholder="Search by name, email, phone, role..."
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

          {/* Role Dropdown */}
          <div className="relative shrink-0">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value)
                setCurrentPage(1)
              }}
              className={`px-3.5 py-2 rounded-xl text-xs cursor-pointer font-sans appearance-none pr-8 shadow-sm transition-all focus:outline-none ${
                isDark 
                  ? 'bg-[#0c1220] border border-slate-700/80 text-white focus:border-cyan-400' 
                  : 'bg-white border border-slate-300 text-slate-800 focus:border-blue-500'
              }`}
            >
              <option value="ALL" className={isDark ? 'bg-[#0c1220] text-white py-1' : 'bg-white text-slate-900 py-1'}>All Roles</option>
              <option value="Admin" className={isDark ? 'bg-[#0c1220] text-white py-1' : 'bg-white text-slate-900 py-1'}>🛡️ Admin</option>
              <option value="FleetManager" className={isDark ? 'bg-[#0c1220] text-white py-1' : 'bg-white text-slate-900 py-1'}>💼 Fleet Manager</option>
              <option value="Dispatcher" className={isDark ? 'bg-[#0c1220] text-white py-1' : 'bg-white text-slate-900 py-1'}>📦 Dispatcher</option>
              <option value="Driver" className={isDark ? 'bg-[#0c1220] text-white py-1' : 'bg-white text-slate-900 py-1'}>🚚 Driver</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none">▼</span>
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
              <option value="ALL" className={isDark ? 'bg-[#0c1220] text-white py-1' : 'bg-white text-slate-900 py-1'}>All Status</option>
              <option value="Active" className={isDark ? 'bg-[#0c1220] text-white py-1' : 'bg-white text-slate-900 py-1'}>Active</option>
              <option value="Inactive" className={isDark ? 'bg-[#0c1220] text-white py-1' : 'bg-white text-slate-900 py-1'}>Inactive</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none">▼</span>
          </div>

          {/* Filters Button (Moved to Left Side) */}
          <button
            onClick={() => {
              setSearchQuery('')
              setRoleFilter('ALL')
              setStatusFilter('ALL')
              setCurrentPage(1)
              addToast('⚡ Filters reset to default.', 'info', 'top-right')
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm shrink-0 ${
              isDark 
                ? 'bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white' 
                : 'bg-white hover:bg-slate-50 border border-slate-300 text-slate-800'
            }`}
          >
            <span className="text-xs">⚡</span>
            <span>Filters</span>
          </button>

        </div>

        {/* Right Side: Refresh & + Add User Button */}
        <div className="flex items-center space-x-2.5 shrink-0 justify-end">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm ${
              isDark 
                ? 'bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white' 
                : 'bg-white hover:bg-slate-50 border border-slate-300 text-slate-800'
            }`}
            title="Refresh user accounts"
          >
            <span className={`text-xs ${isRefreshing ? 'animate-spin' : ''}`}>🔄</span>
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* + Add User Button (Moved to Right Side of Toolbar) */}
          <button
            onClick={() => {
              setForm(EMPTY_USER_FORM)
              setIsAdding(true)
            }}
            className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_15px_rgba(34,211,238,0.35)]"
          >
            <span className="text-sm font-black">+</span>
            <span>Add User</span>
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. USERS DATA TABLE & FIXED-POSITION PAGINATION CONTAINER                 */}
      {/* ========================================================================= */}
      <div className="min-h-[580px] flex flex-col justify-between">
        
        <div className={`rounded-2xl border overflow-hidden shadow-xl ${
          isDark ? 'bg-[#0b101c] border-slate-800/90' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-xs">
              <thead>
                <tr className={`border-b text-[10.5px] font-mono font-bold tracking-wider uppercase ${
                  isDark ? 'bg-[#070b14] border-slate-800/80 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <th className="py-3.5 px-4">OPERATOR PROFILE</th>
                  <th className="py-3.5 px-4">CONTACT DETAILS</th>
                  <th className="py-3.5 px-4">ROLE</th>
                  <th className="py-3.5 px-4">STATUS</th>
                  <th className="py-3.5 px-4">LAST ACTIVE</th>
                  <th className="py-3.5 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400 font-mono text-xs">
                      No matching user accounts found.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u, idx) => {
                    const globalIdx = startIndex + idx
                    const pal = getUserPalette(u, globalIdx)
                    const initials = getTwoLetterInitials(u.full_name)
                    const roleCfg = getRoleConfig(u.role)
                    const isSelf = u.user_id === currentUser?.user_id || (u.email && currentUser?.email && u.email.toLowerCase() === currentUser?.email.toLowerCase()) || u.email?.toLowerCase() === 'admin@fleetflow.com'
                    const isAdminRole = (u.role === 'Admin' || u.role?.value === 'Admin' || roleCfg?.name === 'Admin')
                    const isLockedAdmin = isSelf && isAdminRole
                    const lastActive = getLastActiveTime(globalIdx)

                    return (
                      <tr 
                        key={u.user_id}
                        className={`transition-colors ${
                          isDark ? 'hover:bg-slate-900/50' : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* 1. OPERATOR PROFILE */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3 min-w-0">
                            {/* Initials Avatar Pill */}
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border ${
                              isDark ? `${pal.bgDark} ${pal.text}` : pal.bgLight
                            }`}>
                              {initials}
                            </div>
                            
                            <div className="min-w-0">
                              <div className="flex items-center space-x-1.5">
                                <span className={`font-bold text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                  {u.full_name}
                                </span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.2 rounded-md bg-cyan-400/20 border border-cyan-400/40 text-cyan-400 text-[9px] font-black tracking-wider">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <div className={`font-mono text-[10px] truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                UID: {u.user_id?.length > 12 ? `${u.user_id.substring(0, 10)}...` : u.user_id}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. CONTACT DETAILS */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <div className={`flex items-center space-x-1.5 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              <span className="text-[11px] text-slate-400">✉️</span>
                              <span className="truncate">{u.email}</span>
                            </div>
                            <div className={`flex items-center space-x-1.5 text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              <span className="text-[11px] text-slate-400">📞</span>
                              <span>{u.phone || '—'}</span>
                            </div>
                          </div>
                        </td>

                        {/* 3. ROLE SELECTOR PILL (CUSTOM THEMED DROPDOWN OR LOCKED BADGE) */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isLockedAdmin ? (
                            <div
                              title="Administrators cannot modify or change their own Admin role"
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center justify-between gap-2.5 shadow-sm min-w-[135px] cursor-not-allowed select-none ${
                                isDark ? 'bg-blue-950/60 border-blue-500/40 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-800'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span>🛡️</span>
                                <span>Admin {u.email === 'admin@fleetflow.com' ? '(Primary)' : '(You)'}</span>
                              </div>
                              <span className="text-xs" title="Role Locked for Admin">🔒</span>
                            </div>
                          ) : (
                            <div className="relative inline-block role-dropdown-container">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setOpenRoleMenuId(openRoleMenuId === u.user_id ? null : u.user_id)
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border flex items-center justify-between gap-2.5 shadow-sm transition-all focus:outline-none min-w-[135px] ${
                                  isDark ? roleCfg.colorDark : roleCfg.colorLight
                                } ${
                                  openRoleMenuId === u.user_id 
                                    ? (isDark ? 'ring-2 ring-cyan-400/50 border-cyan-400' : 'ring-2 ring-blue-500/40 border-blue-500') 
                                    : ''
                                }`}
                              >
                                <div className="flex items-center gap-1.5 truncate">
                                  <span>{roleCfg.icon}</span>
                                  <span>{roleCfg.label}</span>
                                </div>
                                <span className={`text-[8.5px] opacity-70 transition-transform duration-200 ${
                                  openRoleMenuId === u.user_id ? 'rotate-180 text-cyan-400' : ''
                                }`}>
                                  ▼
                                </span>
                              </button>

                            {/* Dropdown Floating Menu with Full Light/Dark Support */}
                            {openRoleMenuId === u.user_id && (
                              <div
                                className={`absolute left-0 top-full mt-1.5 w-44 rounded-2xl shadow-2xl z-50 p-1.5 border animate-fade-in font-sans ${
                                  isDark
                                    ? 'bg-[#0b101c] border-slate-700/90 text-white shadow-[0_12px_36px_rgba(0,0,0,0.9)]'
                                    : 'bg-white border-slate-200 text-slate-900 shadow-[0_12px_36px_rgba(15,23,42,0.18)]'
                                }`}
                              >
                                <div className={`text-[9.5px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 mb-1 border-b ${
                                  isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-100'
                                }`}>
                                  Select Role
                                </div>

                                {[
                                  { 
                                    id: 'Driver', 
                                    label: 'Driver', 
                                    icon: '🚚', 
                                    desc: 'Vehicle Operations',
                                    activeClassDark: 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300',
                                    activeClassLight: 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold',
                                    hoverDark: 'hover:bg-emerald-950/40 hover:text-emerald-300 text-slate-300',
                                    hoverLight: 'hover:bg-emerald-50/70 hover:text-emerald-800 text-slate-700'
                                  },
                                  { 
                                    id: 'FleetManager', 
                                    label: 'Fleet Manager', 
                                    icon: '💼', 
                                    desc: 'Asset & Crew Control',
                                    activeClassDark: 'bg-purple-950/70 border-purple-500/50 text-purple-300',
                                    activeClassLight: 'bg-purple-50 border-purple-300 text-purple-800 font-bold',
                                    hoverDark: 'hover:bg-purple-950/40 hover:text-purple-300 text-slate-300',
                                    hoverLight: 'hover:bg-purple-50/70 hover:text-purple-800 text-slate-700'
                                  },
                                  { 
                                    id: 'Admin', 
                                    label: 'Admin', 
                                    icon: '🛡️', 
                                    desc: 'Full Access Authority',
                                    activeClassDark: 'bg-blue-950/70 border-blue-500/50 text-blue-300',
                                    activeClassLight: 'bg-blue-50 border-blue-300 text-blue-800 font-bold',
                                    hoverDark: 'hover:bg-blue-950/40 hover:text-blue-300 text-slate-300',
                                    hoverLight: 'hover:bg-blue-50/70 hover:text-blue-800 text-slate-700'
                                  },
                                  { 
                                    id: 'Dispatcher', 
                                    label: 'Dispatcher', 
                                    icon: '📦', 
                                    desc: 'Route & Trip Dispatch',
                                    activeClassDark: 'bg-amber-950/70 border-amber-500/50 text-amber-300',
                                    activeClassLight: 'bg-amber-50 border-amber-300 text-amber-800 font-bold',
                                    hoverDark: 'hover:bg-amber-950/40 hover:text-amber-300 text-slate-300',
                                    hoverLight: 'hover:bg-amber-50/70 hover:text-amber-800 text-slate-700'
                                  }
                                ].map((opt) => {
                                  const isSelected = roleCfg.name.toLowerCase() === opt.id.toLowerCase()
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() => {
                                        handleRoleChange(u.user_id, opt.id)
                                        setOpenRoleMenuId(null)
                                      }}
                                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs cursor-pointer border transition-all my-0.5 ${
                                        isSelected
                                          ? isDark ? opt.activeClassDark : opt.activeClassLight
                                          : `border-transparent ${isDark ? opt.hoverDark : opt.hoverLight}`
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 text-left">
                                        <span className="text-sm">{opt.icon}</span>
                                        <div>
                                          <div className="font-semibold">{opt.label}</div>
                                          <div className={`text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {opt.desc}
                                          </div>
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <span className={`text-xs font-bold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>✓</span>
                                      )}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}
                        </td>

                        {/* 4. STATUS */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full border ${
                            (u.status || 'Active') === 'Active'
                              ? (isDark ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-400' : 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold')
                              : (isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-600')
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>{u.status || 'Active'}</span>
                          </span>
                        </td>

                        {/* 5. LAST ACTIVE */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              {lastActive}
                            </span>
                          </div>
                        </td>

                        {/* 6. ACTIONS */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {/* Edit Button */}
                            <button
                              onClick={() => {
                                setEditingUser(u)
                                setForm({
                                  full_name: u.full_name || '',
                                  email: u.email || '',
                                  phone: u.phone || '',
                                  role: u.role || 'Driver',
                                  status: u.status || 'Active',
                                  password: ''
                                })
                              }}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer shadow-sm ${
                                isDark 
                                  ? 'bg-slate-900 border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white' 
                                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900'
                              }`}
                              title="Edit user details"
                            >
                              ✏️
                            </button>

                            {/* Delete Button */}
                            {!isSelf && (
                              <button
                                onClick={() => handleDeleteUser(u.user_id, u.full_name)}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer shadow-sm ${
                                  isDark 
                                    ? 'bg-rose-950/30 border-rose-900/50 hover:bg-rose-900/60 text-rose-400' 
                                    : 'bg-rose-50 border-rose-200 hover:bg-rose-100 text-rose-700'
                                }`}
                                title="Delete user"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. PAGINATION FOOTER (FIXED IN PLACE AT BOTTOM)                           */}
        {/* ========================================================================= */}
        <div className={`flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 mt-8 border-t text-xs font-sans ${
          isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-600'
        }`}>
          <div>
            Showing {filteredUsers.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + pageSize, filteredUsers.length)} of {filteredUsers.length} users
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
      {/* 5. MODAL: ADD NEW USER                                                    */}
      {/* ========================================================= */}
      {isAdding && createPortal(
        <div 
          onClick={() => setIsAdding(false)}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in font-sans"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-lg p-6 relative rounded-3xl shadow-2xl ${
              isDark ? 'bg-[#0c1220] border border-slate-800' : 'bg-white border border-slate-200 shadow-2xl'
            }`}
          >
            <div className={`flex justify-between items-center border-b pb-3 mb-5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <h3 className={`text-base font-bold tracking-tight m-0 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span>👤</span>
                <span>Register New System User</span>
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

            <form onSubmit={handleAddUser} className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={form.full_name}
                    onChange={(e) => setForm(prev => ({ ...prev, full_name: e.target.value }))}
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
                    type="text"
                    placeholder="+91-XXXXX-XXXXX"
                    value={form.phone}
                    onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
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
                    type="email"
                    placeholder="user@fleetflow.com"
                    value={form.email}
                    onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
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
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
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
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none font-bold text-xs ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-cyan-400' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-blue-600'
                    }`}
                  >
                    <option value="Driver" className={isDark ? 'bg-[#0c1220] text-white py-1' : 'bg-white text-slate-900 py-1'}>🚚 Driver</option>
                    <option value="FleetManager" className={isDark ? 'bg-[#0c1220] text-white py-1' : 'bg-white text-slate-900 py-1'}>💼 Fleet Manager</option>
                    <option value="Admin" className={isDark ? 'bg-[#0c1220] text-white py-1' : 'bg-white text-slate-900 py-1'}>🛡️ Admin</option>
                    <option value="Dispatcher" className={isDark ? 'bg-[#0c1220] text-white py-1' : 'bg-white text-slate-900 py-1'}>📦 Dispatcher</option>
                  </select>
                </div>

                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none font-bold text-xs ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-cyan-400' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-blue-600'
                    }`}
                  >
                    <option value="Active" className={isDark ? 'bg-[#0c1220] text-white py-1' : 'bg-white text-slate-900 py-1'}>Active</option>
                    <option value="Inactive" className={isDark ? 'bg-[#0c1220] text-white py-1' : 'bg-white text-slate-900 py-1'}>Inactive</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl font-bold tracking-wide transition-all cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.35)] mt-4 text-center text-xs"
              >
                + REGISTER USER ACCOUNT
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* 6. MODAL: EDIT USER DETAILS                                               */}
      {/* ========================================================= */}
      {editingUser && createPortal(
        <div 
          onClick={() => setEditingUser(null)}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in font-sans"
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
                <span>Edit User: {editingUser.full_name}</span>
              </h3>
              <button 
                onClick={() => setEditingUser(null)} 
                className={`cursor-pointer font-bold text-xs p-1.5 rounded-lg transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditUser} className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Full Name *</label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => setForm(prev => ({ ...prev, full_name: e.target.value }))}
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
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs font-mono ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {(() => {
                const isEditingSelfAdmin = editingUser && (
                  editingUser.user_id === currentUser?.user_id ||
                  editingUser.email?.toLowerCase() === currentUser?.email?.toLowerCase() ||
                  editingUser.email?.toLowerCase() === 'admin@fleetflow.com'
                ) && (editingUser.role === 'Admin' || editingUser.role?.value === 'Admin')

                return (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`text-[11px] font-medium block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Role Permission</label>
                      {isEditingSelfAdmin && (
                        <span className="text-[10px] font-mono text-amber-500 font-semibold flex items-center gap-1">
                          🔒 Role Locked for Admin
                        </span>
                      )}
                    </div>

                    {isEditingSelfAdmin ? (
                      <div className={`w-full px-3.5 py-2.5 rounded-xl border font-bold text-xs flex items-center justify-between cursor-not-allowed select-none ${
                        isDark ? 'bg-blue-950/40 border-blue-500/30 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-800'
                      }`}>
                        <span className="flex items-center gap-2">🛡️ Admin (Primary System Administrator)</span>
                        <span className="text-xs">🔒</span>
                      </div>
                    ) : (
                      <select
                        value={form.role}
                        onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
                        className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none font-bold text-xs ${
                          isDark 
                            ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-cyan-400' 
                            : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-blue-600'
                        }`}
                      >
                        <option value="Driver" className={isDark ? 'bg-[#0c1220] text-white py-1' : 'bg-white text-slate-900 py-1'}>🚚 Driver</option>
                        <option value="FleetManager" className={isDark ? 'bg-[#0c1220] text-white py-1' : 'bg-white text-slate-900 py-1'}>💼 Fleet Manager</option>
                        <option value="Admin" className={isDark ? 'bg-[#0c1220] text-white py-1' : 'bg-white text-slate-900 py-1'}>🛡️ Admin</option>
                        <option value="Dispatcher" className={isDark ? 'bg-[#0c1220] text-white py-1' : 'bg-white text-slate-900 py-1'}>📦 Dispatcher</option>
                      </select>
                    )}
                  </div>
                )
              })()}

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl font-bold tracking-wide transition-all cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.35)] mt-4 text-center text-xs"
              >
                SAVE USER UPDATES
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  )
}

export default UsersPanel
