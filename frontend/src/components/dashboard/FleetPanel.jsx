import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useTheme } from '../../context/ThemeContext'
import api from '../../api/axios'
import TruckLoader from '../ui/TruckLoader'

const getVehicleKey = (v, idx) => {
  if (!v) return 'kenworth_t680'
  const model = (v.model || '').toLowerCase()
  const vType = (v.vehicleType || v.vehicle_type || '').toLowerCase()
  
  if (vType.includes('container') || model.includes('container') || model.includes('indigo') || model.includes('vnp')) {
    return 'blue_container'
  }
  if (model.includes('peterbilt') || model.includes('579') || idx % 6 === 2) {
    return 'peterbilt_579'
  }
  if (model.includes('cascadia') || model.includes('freightliner') || idx % 6 === 3) {
    return 'freightliner_cascadia'
  }
  if (model.includes('rider') || model.includes('ktm') || idx % 6 === 4) {
    return 'rider_ktm'
  }
  if (model.includes('volvo') || model.includes('vnl') || idx % 6 === 5) {
    return 'volvo_vnl_860'
  }
  return 'kenworth_t680'
}

const getStatusBadge = (status, isDark) => {
  const sUpper = (status || '').toUpperCase()
  if (sUpper === 'AVAILABLE') {
    return isDark 
      ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-400' 
      : 'bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold'
  }
  if (sUpper === 'IN TRANSIT') {
    return isDark 
      ? 'bg-cyan-950/70 border border-cyan-500/40 text-cyan-400' 
      : 'bg-cyan-50 border border-cyan-300 text-cyan-800 font-bold'
  }
  if (sUpper === 'ASSIGNED') {
    return isDark 
      ? 'bg-blue-950/70 border border-blue-500/40 text-blue-400' 
      : 'bg-blue-50 border border-blue-300 text-blue-800 font-bold'
  }
  if (sUpper === 'MAINTENANCE') {
    return isDark 
      ? 'bg-rose-950/70 border border-rose-500/40 text-rose-400' 
      : 'bg-rose-50 border border-rose-300 text-rose-800 font-bold'
  }
  return isDark 
    ? 'bg-slate-800 border border-slate-700 text-slate-300' 
    : 'bg-slate-100 border border-slate-300 text-slate-700'
}

function FleetPanel() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const { isDark } = useTheme()
  
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [viewingVehicle, setViewingVehicle] = useState(null)
  
  // Toolbar Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [activeMenuId, setActiveMenuId] = useState(null)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 6

  // Role authorization
  const roleUpper = user?.role?.toUpperCase() || ''
  const canAddVehicle = roleUpper === 'ADMIN' || roleUpper === 'FLEETMANAGER' || roleUpper === 'FLEET MANAGER'
  const canDeleteVehicle = roleUpper === 'ADMIN'

  const [newVehicle, setNewVehicle] = useState({
    regNum: '',
    brand: '',
    vehicleType: 'Heavy Truck',
    model: '',
    year: new Date().getFullYear(),
    fuel: 'Diesel',
    capacity: '5000',
    assignedDriver: '',
    status: 'Available'
  })

  const fetchVehiclesAndDrivers = useCallback(async () => {
    try {
      setIsLoading(true)
      const [vRes, dRes] = await Promise.all([
        api.get('/vehicles'),
        api.get('/drivers')
      ])
      const mapped = (vRes.data || []).map((v) => ({
        id: v.vehicle_id,
        regNum: v.registration_number,
        brand: v.brand || '',
        vehicleType: v.vehicle_type || 'Heavy Truck',
        model: v.model,
        year: v.manufacture_year || '2021',
        fuel: v.fuel_type || 'Diesel',
        capacity: v.capacity || 5000,
        assignedDriver: v.assigned_driver || '',
        status: v.status || 'Available'
      }))
      setVehicles(mapped)
      setDrivers(dRes.data || [])
    } catch (err) {
      console.error('Failed to fetch vehicles:', err)
      addToast('❌ ERROR: Could not retrieve vehicles list.', 'error', 'top-right')
    } finally {
      setIsLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchVehiclesAndDrivers()

    const handleDataChanged = () => {
      fetchVehiclesAndDrivers()
    }
    window.addEventListener('fleetflow:datachanged', handleDataChanged)
    return () => {
      window.removeEventListener('fleetflow:datachanged', handleDataChanged)
    }
  }, [fetchVehiclesAndDrivers])

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)
      await fetchVehiclesAndDrivers()
      addToast('🔄 Fleet vehicles registry refreshed.', 'info', 'top-right')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    if (editingVehicle) {
      setEditingVehicle((prev) => ({ ...prev, [name]: value }))
    } else {
      setNewVehicle((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newVehicle.regNum || !newVehicle.model) return

    try {
      const payload = {
        registration_number: newVehicle.regNum.toUpperCase(),
        brand: newVehicle.brand || null,
        vehicle_type: newVehicle.vehicleType || null,
        model: newVehicle.model,
        manufacture_year: newVehicle.year ? Number(newVehicle.year) : null,
        fuel_type: newVehicle.fuel,
        capacity: newVehicle.capacity ? Number(newVehicle.capacity) : null,
        assigned_driver: newVehicle.assignedDriver || null,
        status: newVehicle.status,
      }
      const res = await api.post('/vehicles', payload)
      const created = {
        id: res.data.vehicle_id,
        regNum: res.data.registration_number,
        brand: res.data.brand || '',
        vehicleType: res.data.vehicle_type || 'Heavy Truck',
        model: res.data.model,
        year: res.data.manufacture_year || '',
        fuel: res.data.fuel_type,
        capacity: res.data.capacity || '',
        assignedDriver: res.data.assigned_driver || '',
        status: res.data.status
      }
      setVehicles((prev) => [created, ...prev])
      setNewVehicle({ regNum: '', brand: '', vehicleType: 'Heavy Truck', model: '', year: new Date().getFullYear(), fuel: 'Diesel', capacity: '5000', assignedDriver: '', status: 'Available' })
      setIsAdding(false)
      window.dispatchEvent(new CustomEvent('fleetflow:datachanged', { detail: { entity: 'vehicle', action: 'create' } }))
      addToast(`🚛 Vehicle ${created.regNum} registered successfully.`, 'success', 'top-right')
    } catch (err) {
      console.error('Failed to add vehicle:', err)
      const errorMsg = err.response?.data?.detail || 'Could not register vehicle.'
      addToast(`❌ ${errorMsg}`, 'error', 'top-right')
    }
  }

  const handleUpdateSubmit = async (e) => {
    e.preventDefault()
    if (!editingVehicle.regNum || !editingVehicle.model) return

    try {
      const payload = {
        registration_number: editingVehicle.regNum.toUpperCase(),
        brand: editingVehicle.brand || null,
        vehicle_type: editingVehicle.vehicleType || null,
        model: editingVehicle.model,
        manufacture_year: editingVehicle.year ? Number(editingVehicle.year) : null,
        fuel_type: editingVehicle.fuel,
        capacity: editingVehicle.capacity ? Number(editingVehicle.capacity) : null,
        assigned_driver: editingVehicle.assignedDriver || null,
        status: editingVehicle.status,
      }
      const res = await api.put(`/vehicles/${editingVehicle.id}`, payload)
      const updated = {
        id: res.data.vehicle_id,
        regNum: res.data.registration_number,
        brand: res.data.brand || '',
        vehicleType: res.data.vehicle_type || '',
        model: res.data.model,
        year: res.data.manufacture_year || '',
        fuel: res.data.fuel_type,
        capacity: res.data.capacity || '',
        assignedDriver: res.data.assigned_driver || '',
        status: res.data.status
      }
      setVehicles((prev) => prev.map((v) => (v.id === editingVehicle.id ? updated : v)))
      setEditingVehicle(null)
      window.dispatchEvent(new CustomEvent('fleetflow:datachanged', { detail: { entity: 'vehicle', action: 'update' } }))
      addToast(`✏️ Vehicle ${updated.regNum} updated successfully.`, 'success', 'top-right')
    } catch (err) {
      console.error('Failed to update vehicle:', err)
      const errorMsg = err.response?.data?.detail || 'Could not update vehicle.'
      addToast(`❌ ${errorMsg}`, 'error', 'top-right')
    }
  }

  const handleDelete = async (id, regNum) => {
    const confirmed = window.confirm(`⚠️ Delete Vehicle ${regNum} from registry?`)
    if (!confirmed) return

    try {
      await api.delete(`/vehicles/${id}`)
      setVehicles((prev) => prev.filter((v) => v.id !== id))
      setActiveMenuId(null)
      window.dispatchEvent(new CustomEvent('fleetflow:datachanged', { detail: { entity: 'vehicle', action: 'delete' } }))
      addToast(`🗑️ Vehicle ${regNum} removed from registry.`, 'success', 'top-right')
    } catch (err) {
      console.error('Failed to delete vehicle:', err)
      addToast('❌ Could not remove vehicle.', 'error', 'top-right')
    }
  }

  const handleQuickStatus = async (id, newStatus) => {
    const v = vehicles.find(item => item.id === id)
    if (!v) return
    try {
      const payload = {
        registration_number: v.regNum,
        brand: v.brand,
        vehicle_type: v.vehicleType,
        model: v.model,
        manufacture_year: v.year ? Number(v.year) : null,
        fuel_type: v.fuel,
        capacity: v.capacity ? Number(v.capacity) : null,
        assigned_driver: v.assignedDriver || null,
        status: newStatus
      }
      await api.put(`/vehicles/${id}`, payload)
      setVehicles(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item))
      setActiveMenuId(null)
      addToast(`🟢 Status updated to ${newStatus} for ${v.regNum}.`, 'success', 'top-right')
    } catch (err) {
      console.error('Status update failed:', err)
      addToast('❌ Failed to update status.', 'error', 'top-right')
    }
  }

  const getDriverName = (driverIdentifier) => {
    if (!driverIdentifier) return 'Unassigned'
    const matched = drivers.find(d => d.driver_id === driverIdentifier || d.full_name === driverIdentifier)
    return matched ? matched.full_name : driverIdentifier
  }

  // Filter & Search Logic
  const filteredVehicles = vehicles.filter((v) => {
    const q = searchQuery.toLowerCase().trim()
    const dName = getDriverName(v.assignedDriver).toLowerCase()
    const matchesSearch = !q || (
      (v.regNum && v.regNum.toLowerCase().includes(q)) ||
      (v.model && v.model.toLowerCase().includes(q)) ||
      (v.brand && v.brand.toLowerCase().includes(q)) ||
      (v.vehicleType && v.vehicleType.toLowerCase().includes(q)) ||
      dName.includes(q)
    )

    const matchesType = typeFilter === 'ALL' || 
      (v.vehicleType && v.vehicleType.toLowerCase().includes(typeFilter.toLowerCase()))

    const matchesStatus = statusFilter === 'ALL' || 
      (v.status && v.status.toLowerCase() === statusFilter.toLowerCase())

    return matchesSearch && matchesType && matchesStatus
  })

  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const paginatedVehicles = filteredVehicles.slice(startIndex, startIndex + pageSize)

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col justify-center items-center font-mono">
        <TruckLoader />
        <div className={`text-xs uppercase tracking-widest mt-6 animate-pulse font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Loading live vehicles registry...
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 font-sans w-full pb-16 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
      
      {/* ========================================================= */}
      {/* 1. TOP TOOLBAR (SEARCH, TYPE, STATUS, REFRESH, ADD)       */}
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
              placeholder="Search by registration number, model, brand..."
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

          {/* Type Dropdown */}
          <div className="relative shrink-0">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value)
                setCurrentPage(1)
              }}
              className={`px-3.5 py-2 rounded-xl text-xs cursor-pointer font-sans appearance-none pr-8 shadow-sm transition-all focus:outline-none ${
                isDark 
                  ? 'bg-[#0c1220] border border-slate-700/80 text-white focus:border-cyan-400' 
                  : 'bg-white border border-slate-300 text-slate-800 focus:border-blue-500'
              }`}
            >
              <option value="ALL">All Types</option>
              <option value="Heavy Truck">Heavy Truck</option>
              <option value="Container">Container</option>
              <option value="Trailer">Trailer</option>
              <option value="Van">Van</option>
              <option value="Refrigerated">Refrigerated</option>
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
              <option value="ALL">All Status</option>
              <option value="Available">Available</option>
              <option value="In Transit">In Transit</option>
              <option value="Assigned">Assigned</option>
              <option value="Maintenance">Maintenance</option>
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

          {canAddVehicle && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_15px_rgba(34,211,238,0.35)]"
            >
              <span className="text-sm font-black">+</span>
              <span>Add Vehicle</span>
            </button>
          )}
        </div>

      </div>

      {/* Subtitle / Counter */}
      <div className={`text-xs font-sans ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        Showing {filteredVehicles.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + pageSize, filteredVehicles.length)} of {filteredVehicles.length} vehicles
      </div>

      {/* ========================================================= */}
      {/* 2. VEHICLE CARDS & FIXED PAGINATION CONTAINER             */}
      {/* ========================================================= */}
      <div className="min-h-[540px] flex flex-col justify-between">
        {paginatedVehicles.length === 0 ? (
          <div className={`p-12 text-center font-mono text-xs rounded-2xl shadow-sm ${
            isDark ? 'bg-[#0b101c] border border-slate-800/80 text-slate-400' : 'bg-white border border-slate-200 text-slate-500'
          }`}>
            No vehicles found matching search criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 content-start">
            {paginatedVehicles.map((v, idx) => {
              const vKey = getVehicleKey(v, startIndex + idx)
              const driverName = getDriverName(v.assignedDriver)
              const isMenuOpen = activeMenuId === v.id

              return (
                <div
                  key={v.id}
                  className={`p-5 rounded-2xl transition-all flex flex-col justify-between relative group ${
                    isDark 
                      ? 'bg-[#0b101c] border border-slate-800/90 shadow-xl hover:border-slate-700/90 text-white' 
                      : 'bg-white border border-slate-200 shadow-md hover:border-slate-300 hover:shadow-lg text-slate-900'
                  }`}
                >
                  <div>
                    
                    {/* Top Row: Registration Tag, Status Badge, Menu */}
                    <div className="flex justify-between items-center gap-2 mb-3.5">
                      {/* License Plate Tag */}
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold tracking-wide uppercase ${
                        isDark 
                          ? 'bg-blue-950/70 border border-blue-500/40 text-cyan-400' 
                          : 'bg-blue-50 border border-blue-200 text-blue-700'
                      }`}>
                        {v.regNum}
                      </span>

                      <div className="flex items-center space-x-1.5">
                        {/* Status Badge */}
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border capitalize ${getStatusBadge(v.status, isDark)}`}>
                          {v.status}
                        </span>

                        {/* Three-dots Menu */}
                        <div className="relative">
                          <button
                            onClick={() => setActiveMenuId(isMenuOpen ? null : v.id)}
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
                                  setViewingVehicle(v)
                                  setActiveMenuId(null)
                                }}
                                className={`w-full px-3 py-1.5 text-left flex items-center gap-2 cursor-pointer ${
                                  isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                }`}
                              >
                                <span>👁️</span>
                                <span>View Details</span>
                              </button>
                              {canAddVehicle && (
                                <button
                                onClick={() => {
                                  setEditingVehicle(v)
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
                            {['Available', 'In Transit', 'Assigned', 'Maintenance'].map((st) => (
                              <button
                                key={st}
                                onClick={() => handleQuickStatus(v.id, st)}
                                className={`w-full px-3 py-1 text-left flex items-center gap-1.5 cursor-pointer text-[11px] ${
                                  isDark ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
                                }`}
                              >
                                <span>•</span>
                                <span>Mark {st}</span>
                              </button>
                            ))}
                            {canDeleteVehicle && (
                              <>
                                <div className={`border-t my-1 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}></div>
                                <button
                                  onClick={() => handleDelete(v.id, v.regNum)}
                                  className={`w-full px-3 py-1.5 text-left text-rose-500 flex items-center gap-2 cursor-pointer ${
                                    isDark ? 'hover:bg-rose-950/40' : 'hover:bg-rose-50'
                                  }`}
                                >
                                  <span>🗑️</span>
                                  <span>Delete Vehicle</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Main Content: Info on Left, 8K Studio Vehicle Viewport on Right */}
                  <div className="flex items-center justify-between gap-3 my-2">
                    
                    {/* Left: Model, Type, Specs, Driver */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <h3 className={`text-base font-bold truncate m-0 leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {v.brand ? `${v.brand} ` : ''}{v.model}
                      </h3>
                      
                      <div className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {v.vehicleType} • {v.year || '2021'}
                      </div>

                      {/* Fuel & Capacity */}
                      <div className="flex items-center space-x-3 text-xs pt-1">
                        <span className={`flex items-center gap-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          <span className="text-rose-500 text-[11px]">⛽</span>
                          <span>{v.fuel}</span>
                        </span>
                        <span className={`flex items-center gap-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          <span className="text-amber-500 text-[11px]">📦</span>
                          <span>{Number(v.capacity || 5000).toLocaleString()} kg</span>
                        </span>
                      </div>

                      {/* Driver */}
                      <div className="text-xs pt-0.5 flex items-center space-x-1 truncate">
                        <span className="text-blue-400">👤</span>
                        <span className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Driver:</span>
                        <span className={`font-bold truncate ${
                          driverName === 'Unassigned' 
                            ? (isDark ? 'text-cyan-400' : 'text-cyan-700') 
                            : (isDark ? 'text-cyan-400 font-mono' : 'text-cyan-700 font-mono')
                        }`}>
                          {driverName}
                        </span>
                      </div>
                    </div>

                    {/* Right: 8K Studio Vehicle Viewport (Crystal Clear in Light & Dark Mode) */}
                    <div className={`w-32 h-22 shrink-0 relative flex items-center justify-center rounded-2xl overflow-hidden shadow-md transition-all group-hover:scale-105 duration-300 ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-800' 
                        : 'bg-slate-950 border border-slate-800/80 shadow-md'
                    }`}>
                      <img 
                        src={`/vehicles/${vKey}_studio.jpg`} 
                        alt={v.model}
                        className="w-full h-full object-cover select-none"
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.src = `/vehicles/${vKey}.png`
                        }}
                      />
                    </div>

                  </div>

                </div>

                {/* Card Bottom Row: Tag Badge and View Details Button */}
                <div className={`mt-4 pt-3 border-t flex items-center justify-between gap-2 ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
                  <span className={`px-3 py-1 rounded-xl text-[11px] font-medium ${
                    isDark 
                      ? 'bg-slate-900 border border-slate-800 text-slate-300' 
                      : 'bg-slate-100 border border-slate-200 text-slate-700'
                  }`}>
                    {v.vehicleType || 'Heavy Truck'}
                  </span>

                  <button
                    onClick={() => setViewingVehicle(v)}
                    className={`px-3.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                      isDark 
                        ? 'border border-cyan-500/40 bg-cyan-950/30 text-cyan-400 hover:bg-cyan-900/50' 
                        : 'border border-cyan-600/40 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 font-bold'
                    }`}
                  >
                    <span>👁️</span>
                    <span>View Details</span>
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
          Showing {filteredVehicles.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + pageSize, filteredVehicles.length)} of {filteredVehicles.length} vehicles
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
      {/* 4. MODAL: ADD NEW VEHICLE                                 */}
      {/* ========================================================= */}
      {canAddVehicle && isAdding && createPortal(
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
                <span>🚚</span>
                <span>Register New Fleet Vehicle</span>
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

            <form onSubmit={handleSubmit} className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>License / Reg Plate</label>
                  <input
                    name="regNum"
                    type="text"
                    placeholder="e.g. GJ-18-WA-7123"
                    value={newVehicle.regNum}
                    onChange={handleChange}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs uppercase font-mono ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Brand / Manufacturer</label>
                  <input
                    name="brand"
                    type="text"
                    placeholder="e.g. Kenworth / Volvo / Tesla"
                    value={newVehicle.brand}
                    onChange={handleChange}
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
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Model Name</label>
                  <input
                    name="model"
                    type="text"
                    placeholder="e.g. T680 / VNL 860"
                    value={newVehicle.model}
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
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Vehicle Type</label>
                  <select
                    name="vehicleType"
                    value={newVehicle.vehicleType}
                    onChange={handleChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  >
                    <option value="Heavy Truck">Heavy Truck</option>
                    <option value="Container">Container</option>
                    <option value="Trailer">Trailer</option>
                    <option value="Van">Van</option>
                    <option value="Refrigerated Truck">Refrigerated Truck</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Fuel Type</label>
                  <select
                    name="fuel"
                    value={newVehicle.fuel}
                    onChange={handleChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  >
                    <option value="Diesel">Diesel</option>
                    <option value="Electric">Electric</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Capacity (kg)</label>
                  <input
                    name="capacity"
                    type="number"
                    placeholder="e.g. 5000"
                    value={newVehicle.capacity}
                    onChange={handleChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs font-mono ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Year</label>
                  <input
                    name="year"
                    type="number"
                    value={newVehicle.year}
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
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Assign Driver</label>
                  <select
                    name="assignedDriver"
                    value={newVehicle.assignedDriver}
                    onChange={handleChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  >
                    <option value="">-- No Driver (Unassigned) --</option>
                    {drivers.map((d) => (
                      <option key={d.driver_id} value={d.driver_id}>
                        {d.full_name} ({d.license_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Status</label>
                  <select
                    name="status"
                    value={newVehicle.status}
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
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl font-bold tracking-wide transition-all cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.35)] mt-4 text-center text-xs"
              >
                + REGISTER FLEET VEHICLE
              </button>

            </form>

          </div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* 5. MODAL: EDIT VEHICLE SPECS                              */}
      {/* ========================================================= */}
      {editingVehicle && createPortal(
        <div 
          onClick={() => setEditingVehicle(null)}
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
                <span>Edit Specs: {editingVehicle.regNum}</span>
              </h3>
              <button 
                onClick={() => setEditingVehicle(null)} 
                className={`cursor-pointer font-bold text-xs p-1.5 rounded-lg transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Brand</label>
                  <input
                    name="brand"
                    type="text"
                    value={editingVehicle.brand}
                    onChange={handleChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Model</label>
                  <input
                    name="model"
                    type="text"
                    value={editingVehicle.model}
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

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Fuel Type</label>
                  <select
                    name="fuel"
                    value={editingVehicle.fuel}
                    onChange={handleChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  >
                    <option value="Diesel">Diesel</option>
                    <option value="Electric">Electric</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Capacity (kg)</label>
                  <input
                    name="capacity"
                    type="number"
                    value={editingVehicle.capacity}
                    onChange={handleChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs font-mono ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Year</label>
                  <input
                    name="year"
                    type="number"
                    value={editingVehicle.year}
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
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Assign Driver</label>
                  <select
                    name="assignedDriver"
                    value={editingVehicle.assignedDriver}
                    onChange={handleChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  >
                    <option value="">-- No Driver (Unassigned) --</option>
                    {drivers.map((d) => (
                      <option key={d.driver_id} value={d.driver_id}>
                        {d.full_name} ({d.license_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Status</label>
                  <select
                    name="status"
                    value={editingVehicle.status}
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
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl font-bold tracking-wide transition-all cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.35)] mt-4 text-center text-xs"
              >
                SAVE VEHICLE UPDATES
              </button>

            </form>

          </div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* 6. MODAL: VIEW VEHICLE DETAILS POPUP                      */}
      {/* ========================================================= */}
      {viewingVehicle && createPortal(
        <div 
          onClick={() => setViewingVehicle(null)}
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
              onClick={() => setViewingVehicle(null)}
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
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm ${
                  isDark ? 'bg-blue-950/80 border border-blue-500/30 text-blue-400' : 'bg-blue-50 border border-blue-200 text-blue-600'
                }`}>
                  🚚
                </div>
                <div>
                  <h3 className={`text-base font-bold m-0 leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {viewingVehicle.brand ? `${viewingVehicle.brand} ` : ''}{viewingVehicle.model}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`font-mono text-xs font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                      {viewingVehicle.regNum}
                    </span>
                    <span className={`inline-block px-2.5 py-0.5 border text-[11px] font-semibold rounded-full capitalize ${getStatusBadge(viewingVehicle.status, isDark)}`}>
                      {viewingVehicle.status}
                    </span>
                  </div>
                </div>
              </div>

              {canAddVehicle && (
                <button
                  onClick={() => {
                    setEditingVehicle(viewingVehicle)
                    setViewingVehicle(null)
                  }}
                  className="px-3.5 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl font-bold text-xs cursor-pointer shadow-sm transition-all"
                >
                  Edit
                </button>
              )}
            </div>

            {/* Vehicle 8K Studio Model Showcase Banner */}
            <div className="w-full h-52 rounded-2xl overflow-hidden relative shadow-lg bg-[#070b14] border border-slate-800 flex items-center justify-center">
              <img 
                src={`/vehicles/${getVehicleKey(viewingVehicle, 0)}_studio.jpg`} 
                alt={viewingVehicle.model} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null
                  e.target.src = `/vehicles/${getVehicleKey(viewingVehicle, 0)}.png`
                }}
              />
              <div className="absolute bottom-3 left-3 px-3 py-1 bg-slate-950/85 backdrop-blur-md rounded-xl text-white text-xs font-semibold border border-slate-700/50 shadow-sm">
                {viewingVehicle.vehicleType} • {viewingVehicle.year}
              </div>
            </div>

            {/* Specifications Sub-Card */}
            <div className={`rounded-2xl p-4 space-y-3.5 shadow-inner ${
              isDark ? 'bg-[#070b14] border border-slate-800/90' : 'bg-slate-50 border border-slate-200'
            }`}>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className={`text-[10px] font-mono uppercase font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    MAX PAYLOAD CAPACITY
                  </span>
                  <div className={`text-sm font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    📦 {Number(viewingVehicle.capacity || 5000).toLocaleString()} kg
                  </div>
                </div>

                <div>
                  <span className={`text-[10px] font-mono uppercase font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    FUEL / POWERTRAIN
                  </span>
                  <div className={`text-sm font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    ⛽ {viewingVehicle.fuel}
                  </div>
                </div>
              </div>

              <div className={`grid grid-cols-2 gap-4 pt-3 border-t ${isDark ? 'border-slate-800/70' : 'border-slate-200'}`}>
                <div>
                  <span className={`text-[10px] font-mono uppercase font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    ASSIGNED DRIVER
                  </span>
                  <div className={`text-xs font-bold mt-0.5 uppercase ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                    👤 {getDriverName(viewingVehicle.assignedDriver)}
                  </div>
                </div>

                <div>
                  <span className={`text-[10px] font-mono uppercase font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    MANUFACTURE YEAR
                  </span>
                  <div className={`text-xs font-mono font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    📅 {viewingVehicle.year || '2021'}
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setViewingVehicle(null)}
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

export default FleetPanel
