import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useTheme } from '../../context/ThemeContext'
import api from '../../api/axios'
import TruckLoader from '../ui/TruckLoader'

const INITIAL_TRIPS = [
  { id: 'TRP-101', driver: 'Sarah Jenkins', vehicle: 'CA-948-FF2', from: 'SF', to: 'SJ', cargo: 'Electronics', status: 'In Transit', distance: 50.0, eta_seconds: 1800, route_type: 'Fastest' },
  { id: 'TRP-102', driver: 'Marcus Vance', vehicle: 'TX-520-TX9', from: 'OAKLAND', to: 'SACRAMENTO', cargo: 'Automotive Parts', status: 'In Transit', distance: 80.0, eta_seconds: 2400, route_type: 'Shortest' },
  { id: 'TRP-103', driver: 'Elena Rostova', vehicle: 'NV-882-NV1', from: 'FRESNO', to: 'LA', cargo: 'Cold Storage', status: 'Completed', distance: 220.0, eta_seconds: 0, route_type: 'Fuel Efficient' },
  { id: 'TRP-104', driver: 'Alex Mercer', vehicle: 'OR-309-OR7', from: 'SJ', to: 'FRESNO', cargo: 'Consumer Goods', status: 'Scheduled', distance: 150.0, eta_seconds: 4800, route_type: 'Traffic Avoidance' }
]

function TripsPanel() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const { isDark } = useTheme()
  
  const [trips, setTrips] = useState([])
  const [dbVehicles, setDbVehicles] = useState([])
  const [dbDrivers, setDbDrivers] = useState([])
  const [shipments, setShipments] = useState([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDispatching, setIsDispatching] = useState(false)
  const [isSubmittingTrip, setIsSubmittingTrip] = useState(false)
  
  // Driver Performance Review State
  const [reviewModalTrip, setReviewModalTrip] = useState(null)
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewNotes, setReviewNotes] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  const [newTrip, setNewTrip] = useState({ 
    driverId: '', 
    vehicleId: '', 
    shipmentId: '',
    from: 'SF', 
    to: 'LA', 
    cargo: '',
    routeType: 'Fastest'
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Role authorization
  const roleUpper = user?.role?.toUpperCase() || ''
  const canDispatch = roleUpper === 'ADMIN' || roleUpper === 'FLEETMANAGER' || roleUpper === 'FLEET MANAGER' || roleUpper === 'DISPATCHER'
  const canDelete = roleUpper === 'ADMIN'

  const formatCargo = (cargoStr) => {
    if (!cargoStr) return 'N/A'
    if (cargoStr.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(cargoStr)
        return parsed.desc || 'Manifest Cargo'
      } catch (e) {}
    }
    return cargoStr
  }

  const openReviewModal = (trip) => {
    setReviewModalTrip(trip)
    setReviewRating(trip.driverRating || 5)
    setReviewNotes(trip.driverReview || '')
  }

  const handleReviewSubmit = async (e) => {
    e.preventDefault()
    if (!reviewModalTrip) return
    try {
      setIsSubmittingReview(true)
      const res = await api.post(`/trips/${reviewModalTrip.id}/review`, {
        rating: parseFloat(reviewRating) || 5.0,
        review: reviewNotes
      })
      setTrips(prev => prev.map(t => t.id === reviewModalTrip.id ? {
        ...t,
        driverRating: res.data.driver_rating,
        driverReview: res.data.driver_review,
        reviewedBy: res.data.reviewed_by,
        reviewedAt: res.data.reviewed_at
      } : t))
      addToast(`⭐ REVIEW SUBMITTED: ${reviewRating}★ rating saved for ${reviewModalTrip.driver}.`, 'success', 'top-right')
      setReviewModalTrip(null)
    } catch (err) {
      console.error('Failed to submit driver review:', err)
      const detail = err.response?.data?.detail
      let errorMsg = 'Could not save review.'
      if (typeof detail === 'string') {
        errorMsg = detail
      } else if (Array.isArray(detail)) {
        errorMsg = detail.map(d => d.msg || JSON.stringify(d)).join(', ')
      } else if (typeof detail === 'object' && detail !== null) {
        errorMsg = JSON.stringify(detail)
      }
      addToast(`❌ ERROR: ${errorMsg}`, 'error', 'top-right')
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const fetchTripsAndVehicles = useCallback(async () => {
    try {
      setIsLoading(true)
      
      const tripsRes = await api.get('/trips')
      const vehiclesRes = await api.get('/vehicles')
      const driversRes = await api.get('/drivers')
      const shipmentsRes = await api.get('/shipments')
      
      setDbVehicles(vehiclesRes.data)
      setDbDrivers(driversRes.data)
      setShipments(shipmentsRes.data)
      
      const mappedTrips = tripsRes.data.map((t) => {
        const matchedVeh = vehiclesRes.data.find((v) => v.vehicle_id === t.vehicle_id)
        const matchedDriver = driversRes.data.find((d) => d.driver_id === t.driver_id)
        return {
          id: t.trip_id,
          driver: matchedDriver ? matchedDriver.full_name : 'Unassigned Operator',
          vehicle: matchedVeh ? matchedVeh.registration_number : 'FF-MOCK',
          vehicleId: t.vehicle_id,
          driverId: t.driver_id,
          from: t.start_location,
          to: t.destination,
          cargo: t.cargo,
          status: t.status,
          distance: t.distance,
          eta_seconds: t.eta_seconds,
          route_type: t.route_type,
          shipmentId: t.shipment_id,
          driverRating: t.driver_rating,
          driverReview: t.driver_review,
          reviewedBy: t.reviewed_by,
          reviewedAt: t.reviewed_at
        }
      })

      setTrips(mappedTrips)
    } catch (err) {
      console.error('Failed to load trips registry:', err)
      if (!err.response || err.code === 'ERR_NETWORK') {
        setTrips(INITIAL_TRIPS)
      } else {
        addToast('❌ ERROR: Could not fetch active trips list.', 'error', 'top-right')
      }
    } finally {
      setIsLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchTripsAndVehicles()

    const handleDataChanged = () => {
      fetchTripsAndVehicles()
    }
    window.addEventListener('fleetflow:datachanged', handleDataChanged)
    return () => {
      window.removeEventListener('fleetflow:datachanged', handleDataChanged)
    }
  }, [fetchTripsAndVehicles])

  const handleChange = (e) => {
    const { name, value } = e.target
    setNewTrip((prev) => ({ ...prev, [name]: value }))
  }

  const handleShipmentChange = (e) => {
    const shipmentId = e.target.value
    if (!shipmentId) {
      setNewTrip((prev) => ({ ...prev, shipmentId: '' }))
      return
    }
    const matched = shipments.find(s => s.shipment_id === shipmentId)
    if (matched) {
      setNewTrip((prev) => ({
        ...prev,
        shipmentId: shipmentId,
        from: matched.source,
        to: matched.destination,
        cargo: matched.cargo_description || `Cargo for ${matched.customer_name}`,
        vehicleId: matched.vehicle_id || prev.vehicleId,
        driverId: matched.driver_id || prev.driverId
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmittingTrip) return

    if (!newTrip.driverId || !newTrip.vehicleId || !newTrip.cargo) {
      addToast('❌ VALIDATION ERROR: Please assign a driver, vehicle, and cargo.', 'error', 'top-right')
      return
    }
    if (newTrip.from.toUpperCase() === newTrip.to.toUpperCase()) {
      addToast('❌ ROUTING ERROR: Route origin and destination depots must be distinct.', 'error', 'top-right')
      return
    }

    try {
      setIsSubmittingTrip(true)
      const payload = {
        start_location: newTrip.from,
        destination: newTrip.to,
        cargo: newTrip.cargo,
        vehicle_id: newTrip.vehicleId,
        driver_id: newTrip.driverId,
        shipment_id: newTrip.shipmentId || null,
        route_type: newTrip.routeType
      }

      await api.post('/trips', payload)
      await fetchTripsAndVehicles()
      
      setNewTrip({ driverId: '', vehicleId: '', shipmentId: '', from: 'SF', to: 'LA', cargo: '', routeType: 'Fastest' })
      setIsDispatching(false)
      window.dispatchEvent(new CustomEvent('fleetflow:datachanged', { detail: { entity: 'trip', action: 'create' } }))
      addToast('🗺️ TRIP STARTED: Route calculated and set.', 'success', 'top-right')
    } catch (err) {
      console.error('Failed to dispatch trip:', err)
      const errorMsg = err.response?.data?.detail || 'Could not compile shipping route.'
      addToast(`❌ ERROR: ${errorMsg}`, 'error', 'top-right')
    } finally {
      setIsSubmittingTrip(false)
    }
  }

  const updateStatus = async (tripId, nextStatus) => {
    try {
      await api.put(`/trips/${tripId}/status`, { status: nextStatus })
      await fetchTripsAndVehicles()
      window.dispatchEvent(new CustomEvent('fleetflow:datachanged', { detail: { entity: 'trip', action: 'update_status' } }))
      addToast(`🟢 TRIP UPDATE: Trip status set to ${nextStatus.toUpperCase()}.`, 'success', 'top-right')
    } catch (err) {
      console.error('Failed to update trip status:', err)
      addToast('❌ ERROR: Could not commit status change to database.', 'error', 'top-right')
    }
  }

  const handleDelete = async (tripId) => {
    const confirmed = window.confirm(`⚠️ DELETE CONFIRMATION: Remove trip ${tripId.substring(0, 8)} from archives?`)
    if (!confirmed) return

    try {
      await api.delete(`/trips/${tripId}`)
      setTrips((prev) => prev.filter((t) => t.id !== tripId))
      window.dispatchEvent(new CustomEvent('fleetflow:datachanged', { detail: { entity: 'trip', action: 'delete' } }))
      addToast('🗑️ TRIP DELETED: Trip removed from archives.', 'success', 'top-right')
    } catch (err) {
      console.error('Delete trip failed:', err)
      addToast('❌ ERROR: Could not delete trip.', 'error', 'top-right')
    }
  }

  const formatEta = (seconds) => {
    if (seconds <= 0) return 'ARRIVED'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 7

  // Summary Metrics calculations (from all trips)
  const inProgressTrips = trips.filter(t => t.status === 'In Transit' || t.status === 'In Progress')
  const completedTrips = trips.filter(t => t.status === 'Completed')
  const cancelledTrips = trips.filter(t => t.status === 'Cancelled')
  const totalTripsCount = trips.length

  const completedPct = totalTripsCount > 0 ? ((completedTrips.length / totalTripsCount) * 100).toFixed(1) : '0.0'
  const inProgressPct = totalTripsCount > 0 ? ((inProgressTrips.length / totalTripsCount) * 100).toFixed(1) : '0.0'
  const cancelledPct = totalTripsCount > 0 ? ((cancelledTrips.length / totalTripsCount) * 100).toFixed(1) : '0.0'

  // Filtered trips based on search query and status filter
  const filteredTrips = trips.filter(t => {
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch = !q || (
      (t.id && t.id.toLowerCase().includes(q)) ||
      (t.driver && t.driver.toLowerCase().includes(q)) ||
      (t.vehicle && t.vehicle.toLowerCase().includes(q)) ||
      (t.from && t.from.toLowerCase().includes(q)) ||
      (t.to && t.to.toLowerCase().includes(q)) ||
      (t.cargo && t.cargo.toLowerCase().includes(q)) ||
      (t.status && t.status.toLowerCase().includes(q))
    )
    const matchesStatus = statusFilter === 'ALL' || 
      (statusFilter === 'COMPLETED' && t.status === 'Completed') ||
      (statusFilter === 'IN PROGRESS' && (t.status === 'In Transit' || t.status === 'In Progress')) ||
      (statusFilter === 'CANCELLED' && t.status === 'Cancelled')
    return matchesSearch && matchesStatus
  })

  const totalPages = Math.max(1, Math.ceil(filteredTrips.length / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const paginatedTrips = filteredTrips.slice(startIndex, startIndex + pageSize)

  const formatEtaDateTime = (t, idx) => {
    if (t.status === 'Cancelled') {
      return { time: '--', date: '' }
    }
    // Calculate deterministic realistic ETA timestamp
    const now = new Date()
    const tripOffsetHours = (idx * 3.5) % 48
    const tripDate = new Date(now.getTime() - (tripOffsetHours * 3600 * 1000))
    const timeStr = tripDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    const dateStr = tripDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    return { time: timeStr, date: dateStr }
  }

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col justify-center items-center font-mono">
        <TruckLoader />
        <div className="text-xs text-slate-400 uppercase tracking-widest mt-6 animate-pulse font-bold">
          Loading live trips telemetry...
        </div>
      </div>
    )
  }

  return (
    <div className={`p-4 sm:p-6 rounded-3xl border shadow-xl space-y-6 font-sans w-full pb-16 transition-all ${
      isDark ? 'bg-[#0b101b] border-slate-800/90 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-md'
    }`}>
      
      {/* ========================================================= */}
      {/* 1. TOP TOOLBAR (SEARCH BAR, STATUS FILTER, REFRESH, START) */}
      {/* ========================================================= */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3.5">
        
        {/* Live Search & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              placeholder="Search by Trip ID, Driver, Vehicle, Route..."
              className={`w-full pl-9 pr-8 py-2 border rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-sans shadow-sm ${
                isDark ? 'bg-[#0f172a] border-slate-700/80 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setCurrentPage(1)
                }}
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-xs cursor-pointer p-0.5 ${
                  isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Status Filter Pills */}
          <div className={`flex items-center space-x-1 p-1 rounded-xl border text-[11px] font-mono shrink-0 ${
            isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            {[
              { id: 'ALL', label: 'All' },
              { id: 'COMPLETED', label: 'Completed' },
              { id: 'IN PROGRESS', label: 'In Progress' },
              { id: 'CANCELLED', label: 'Cancelled' }
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setStatusFilter(s.id)
                  setCurrentPage(1)
                }}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === s.id
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : isDark
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5 shrink-0 justify-end">
          <button
            onClick={async () => {
              setIsRefreshing(true)
              await fetchTripsAndVehicles()
              setIsRefreshing(false)
              addToast('🔄 Trips list refreshed.', 'info', 'top-right')
            }}
            disabled={isRefreshing}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm ${
              isDark
                ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 text-white'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
            }`}
          >
            <span className={`text-xs ${isRefreshing ? 'animate-spin' : ''}`}>🔄</span>
            <span>Refresh</span>
          </button>

          {canDispatch && (
            <button
              onClick={() => setIsDispatching(true)}
              className="px-3.5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_15px_rgba(34,211,238,0.35)]"
            >
              <span className="text-sm font-black">+</span>
              <span>Start Trip</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. FOUR KPI SUMMARY CARDS                                 */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Trips */}
        <div className={`p-4 rounded-2xl border flex items-center gap-3.5 shadow-sm transition-all ${
          isDark ? 'bg-[#0f172a]/90 border-slate-800/80 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
            isDark ? 'bg-blue-950/80 border-blue-500/30 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="6" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" />
            </svg>
          </div>
          <div>
            <span className={`text-xs font-medium block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Trips</span>
            <span className={`text-xl sm:text-2xl font-bold tracking-tight mt-0.5 block ${isDark ? 'text-white' : 'text-slate-900'}`}>{totalTripsCount}</span>
            <span className={`text-[11px] font-sans ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>All time</span>
          </div>
        </div>

        {/* Card 2: Completed */}
        <div className={`p-4 rounded-2xl border flex items-center gap-3.5 shadow-sm transition-all ${
          isDark ? 'bg-[#0f172a]/90 border-slate-800/80 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
            isDark ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <div>
            <span className={`text-xs font-medium block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Completed</span>
            <span className={`text-xl sm:text-2xl font-bold tracking-tight mt-0.5 block ${isDark ? 'text-white' : 'text-slate-900'}`}>{completedTrips.length}</span>
            <span className={`text-[11px] font-bold font-sans ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{completedPct}%</span>
          </div>
        </div>

        {/* Card 3: In Progress */}
        <div className={`p-4 rounded-2xl border flex items-center gap-3.5 shadow-sm transition-all ${
          isDark ? 'bg-[#0f172a]/90 border-slate-800/80 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
            isDark ? 'bg-amber-950/80 border-amber-500/30 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700'
          }`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <div>
            <span className={`text-xs font-medium block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>In Progress</span>
            <span className={`text-xl sm:text-2xl font-bold tracking-tight mt-0.5 block ${isDark ? 'text-white' : 'text-slate-900'}`}>{inProgressTrips.length}</span>
            <span className={`text-[11px] font-bold font-sans ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{inProgressPct}%</span>
          </div>
        </div>

        {/* Card 4: Cancelled */}
        <div className={`p-4 rounded-2xl border flex items-center gap-3.5 shadow-sm transition-all ${
          isDark ? 'bg-[#0f172a]/90 border-slate-800/80 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        }`}>
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
            isDark ? 'bg-purple-950/80 border-purple-500/30 text-purple-400' : 'bg-purple-50 border-purple-200 text-purple-700'
          }`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.93 4.93l14.14 14.14" />
            </svg>
          </div>
          <div>
            <span className={`text-xs font-medium block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Cancelled</span>
            <span className={`text-xl sm:text-2xl font-bold tracking-tight mt-0.5 block ${isDark ? 'text-white' : 'text-slate-900'}`}>{cancelledTrips.length}</span>
            <span className={`text-[11px] font-bold font-sans ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>{cancelledPct}%</span>
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* 3. TRIPS TABLE (DESKTOP - FIXED DIMENSIONS)               */}
      {/* ========================================================= */}
      <div className="overflow-x-auto min-h-[460px] flex flex-col justify-between">
        <table className="w-full text-left text-xs table-fixed min-w-[1050px]">
          <thead>
            <tr className={`text-[11px] font-mono font-semibold uppercase tracking-wider border-b pb-3 h-[44px] ${
              isDark ? 'text-slate-400 border-slate-800/90' : 'text-slate-500 border-slate-200'
            }`}>
              <th className="py-3 px-3 font-semibold w-[110px]">TRIP ID</th>
              <th className="py-3 px-3 font-semibold w-[190px]">OPERATOR / DRIVER</th>
              <th className="py-3 px-3 font-semibold w-[130px]">VEHICLE</th>
              <th className="py-3 px-3 font-semibold w-[230px]">ROUTE</th>
              <th className="py-3 px-3 font-semibold w-[130px]">CARGO</th>
              <th className="py-3 px-3 font-semibold w-[100px]">PROFILE</th>
              <th className="py-3 px-3 font-semibold w-[120px]">ETA</th>
              <th className="py-3 px-3 font-semibold text-center w-[120px]">STATUS</th>
              <th className="py-3 px-3 font-semibold text-right w-[185px]">ACTIONS</th>
            </tr>
          </thead>
          <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
            {paginatedTrips.length === 0 ? (
              <tr>
                <td colSpan="9" className={`py-24 text-center font-mono text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  No trips found in the registry.
                </td>
              </tr>
            ) : (
              <>
                {paginatedTrips.map((t, idx) => {
                  const nameWords = t.driver.split(' ')
                  const nameLine1 = nameWords.slice(0, 2).join(' ')
                  const nameLine2 = nameWords.slice(2).join(' ')
                  const etaInfo = formatEtaDateTime(t, idx)

                  return (
                    <tr key={t.id} className={`transition-colors h-[58px] ${isDark ? 'hover:bg-slate-900/40' : 'hover:bg-slate-50'}`}>
                      
                      {/* Trip ID */}
                      <td className="py-2.5 px-3 whitespace-nowrap font-mono">
                        <span 
                          className={`font-semibold text-xs cursor-pointer hover:underline block truncate ${isDark ? 'text-cyan-400' : 'text-cyan-700 font-bold'}`}
                          title={t.id}
                        >
                          {t.id.length > 8 ? `${t.id.substring(0, 8)}...` : t.id}
                        </span>
                      </td>

                      {/* Operator / Driver */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className={`text-xs font-medium leading-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          <div className="truncate">{nameLine1}</div>
                          {nameLine2 && <div className={`truncate ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{nameLine2}</div>}
                        </div>
                      </td>

                      {/* Vehicle */}
                      <td className={`py-2.5 px-3 whitespace-nowrap font-mono text-xs truncate ${isDark ? 'text-slate-300' : 'text-slate-700 font-semibold'}`}>
                        {t.vehicle}
                      </td>

                      {/* Route */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className={`text-xs font-medium leading-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {t.from} → {t.to}
                        </div>
                        <div className={`text-[11px] font-mono mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {t.distance ? `${t.distance} MI` : '0 MI'}
                        </div>
                      </td>

                      {/* Cargo */}
                      <td className={`py-2.5 px-3 whitespace-nowrap text-xs truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {formatCargo(t.cargo)}
                      </td>

                      {/* Profile */}
                      <td className={`py-2.5 px-3 whitespace-nowrap text-xs truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {t.route_type || 'Fastest'}
                      </td>

                      {/* ETA */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {etaInfo.time === '--' ? (
                          <span className={`font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>--</span>
                        ) : (
                          <div>
                            <div className={`text-xs font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{etaInfo.time}</div>
                            <div className={`text-[11px] font-mono mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{etaInfo.date}</div>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-center">
                        {t.status === 'Completed' ? (
                          <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-semibold ${
                            isDark ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-400' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                          }`}>
                            Completed
                          </span>
                        ) : t.status === 'In Transit' || t.status === 'In Progress' ? (
                          <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-semibold ${
                            isDark ? 'bg-amber-950/70 border border-amber-500/40 text-amber-400' : 'bg-amber-50 border border-amber-200 text-amber-700'
                          }`}>
                            In Progress
                          </span>
                        ) : t.status === 'Cancelled' ? (
                          <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-semibold ${
                            isDark ? 'bg-rose-950/70 border border-rose-500/40 text-rose-400' : 'bg-rose-50 border border-rose-200 text-rose-700'
                          }`}>
                            Cancelled
                          </span>
                        ) : (
                          <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-semibold ${
                            isDark ? 'bg-blue-950/70 border border-blue-500/40 text-blue-400' : 'bg-blue-50 border border-blue-200 text-blue-700'
                          }`}>
                            Scheduled
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          
                          {/* If Completed: Rate & Delete */}
                          {t.status === 'Completed' && (
                            <>
                              {canDispatch && (
                                <button
                                  onClick={() => openReviewModal(t)}
                                  className={`h-[28px] px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                                    t.driverRating 
                                      ? (isDark ? 'border-amber-500/40 bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 shadow-sm')
                                      : (isDark ? 'border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white' : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900')
                                  }`}
                                  title={t.driverRating ? `Rated: ${t.driverRating}★ - Click to update` : 'Click to rate driver'}
                                >
                                  <span className="text-[11px]">⭐</span>
                                  <span>{t.driverRating ? `${t.driverRating}★` : 'Rate'}</span>
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(t.id)}
                                  className={`h-[28px] px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                                    isDark
                                      ? 'border-rose-900/50 hover:border-rose-700 bg-rose-950/30 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200'
                                      : 'border-rose-200 hover:border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700'
                                  }`}
                                  title="Delete trip"
                                >
                                  <span className="text-[11px]">🗑️</span>
                                  <span>Delete</span>
                                </button>
                              )}
                              {!canDispatch && !canDelete && (
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium ${
                                  isDark ? 'text-emerald-400 bg-emerald-950/30 border border-emerald-500/20' : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                }`}>
                                  <span>✓</span>
                                  <span>Delivered</span>
                                </span>
                              )}
                            </>
                          )}

                          {/* If In Progress / In Transit: View, Arrive & Cancel */}
                          {(t.status === 'In Transit' || t.status === 'In Progress') && (
                            <>
                              <button
                                onClick={() => addToast(`🚚 Viewing live telemetry for Trip #${t.id.substring(0, 8)}`, 'info', 'top-right')}
                                className={`h-[28px] px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                                  isDark
                                    ? 'border-cyan-900/50 hover:border-cyan-700 bg-cyan-950/30 hover:bg-cyan-900/60 text-cyan-400 hover:text-cyan-200'
                                    : 'border-cyan-200 hover:border-cyan-300 bg-cyan-50 hover:bg-cyan-100 text-cyan-700'
                                }`}
                                title="View live telemetry"
                              >
                                <span className="text-[11px]">🔍</span>
                                <span>View</span>
                              </button>
                              <button
                                onClick={() => updateStatus(t.id, 'Completed')}
                                className={`h-[28px] px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                                  isDark
                                    ? 'border-emerald-900/50 hover:border-emerald-700 bg-emerald-950/30 hover:bg-emerald-900/60 text-emerald-400 hover:text-emerald-200'
                                    : 'border-emerald-200 hover:border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                }`}
                                title="Complete / Deliver trip"
                              >
                                <span className="text-[11px]">🏁</span>
                                <span>Arrive</span>
                              </button>
                              {canDispatch && (
                                <button
                                  onClick={() => updateStatus(t.id, 'Cancelled')}
                                  className={`h-[28px] px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                                    isDark
                                      ? 'border-amber-900/50 hover:border-amber-700 bg-amber-950/30 hover:bg-amber-900/60 text-amber-400 hover:text-amber-200'
                                      : 'border-amber-200 hover:border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700'
                                  }`}
                                  title="Cancel trip"
                                >
                                  <span className="text-[11px]">🚫</span>
                                  <span>Cancel</span>
                                </button>
                              )}
                            </>
                          )}

                          {/* If Scheduled: Start, Cancel & Delete */}
                          {t.status === 'Scheduled' && (
                            <>
                              <button
                                onClick={() => updateStatus(t.id, 'In Transit')}
                                className={`h-[28px] px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                                  isDark
                                    ? 'border-cyan-500/50 hover:border-cyan-400 bg-gradient-to-r from-cyan-950/70 to-blue-950/70 hover:from-cyan-900/80 hover:to-blue-900/80 text-cyan-300 hover:text-white shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                                    : 'border-cyan-300 hover:border-cyan-400 bg-gradient-to-r from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100 text-cyan-800 hover:text-cyan-950 shadow-sm'
                                }`}
                                title="Start trip"
                              >
                                <span className="text-[11px]">▶</span>
                                <span>Start</span>
                              </button>
                              {canDispatch && (
                                <button
                                  onClick={() => updateStatus(t.id, 'Cancelled')}
                                  className={`h-[28px] px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                                    isDark
                                      ? 'border-amber-900/50 hover:border-amber-700 bg-amber-950/30 hover:bg-amber-900/60 text-amber-400 hover:text-amber-200'
                                      : 'border-amber-200 hover:border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700'
                                  }`}
                                  title="Cancel trip"
                                >
                                  <span className="text-[11px]">🚫</span>
                                  <span>Cancel</span>
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(t.id)}
                                  className={`h-[28px] px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                                    isDark
                                      ? 'border-rose-900/50 hover:border-rose-700 bg-rose-950/30 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200'
                                      : 'border-rose-200 hover:border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700'
                                  }`}
                                  title="Delete trip"
                                >
                                  <span className="text-[11px]">🗑️</span>
                                  <span>Delete</span>
                                </button>
                              )}
                            </>
                          )}

                          {/* If Cancelled: Restart Transit, View & Delete */}
                          {t.status === 'Cancelled' && (
                            <>
                              {canDispatch && (
                                <button
                                  onClick={() => updateStatus(t.id, 'In Transit')}
                                  className={`h-[28px] px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                                    isDark
                                      ? 'border-emerald-900/50 hover:border-emerald-700 bg-emerald-950/30 hover:bg-emerald-900/60 text-emerald-400 hover:text-emerald-200'
                                      : 'border-emerald-200 hover:border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                  }`}
                                  title="Restart trip into transit"
                                >
                                  <span className="text-[11px]">🔄</span>
                                  <span>Restart</span>
                                </button>
                              )}
                              <button
                                onClick={() => addToast(`ℹ️ Cancelled Trip #${t.id.substring(0, 8)}`, 'info', 'top-right')}
                                className={`h-[28px] px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                                  isDark
                                    ? 'border-cyan-900/50 hover:border-cyan-700 bg-cyan-950/30 hover:bg-cyan-900/60 text-cyan-400 hover:text-cyan-200'
                                    : 'border-cyan-200 hover:border-cyan-300 bg-cyan-50 hover:bg-cyan-100 text-cyan-700'
                                }`}
                                title="View details"
                              >
                                <span className="text-[11px]">🔍</span>
                                <span>View</span>
                              </button>
                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(t.id)}
                                  className={`h-[28px] px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                                    isDark
                                      ? 'border-rose-900/50 hover:border-rose-700 bg-rose-950/30 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200'
                                      : 'border-rose-200 hover:border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700'
                                  }`}
                                  title="Delete trip"
                                >
                                  <span className="text-[11px]">🗑️</span>
                                  <span>Delete</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {/* Fixed Placeholder Rows so box shape NEVER changes between pages */}
                {Array.from({ length: Math.max(0, pageSize - paginatedTrips.length) }).map((_, emptyIdx) => (
                  <tr key={`empty-row-${emptyIdx}`} className="h-[58px] border-transparent opacity-0 pointer-events-none select-none">
                    <td colSpan="9" className="py-2.5 px-3">&nbsp;</td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================= */}
      {/* 4. PAGINATION FOOTER                                      */}
      {/* ========================================================= */}
      <div className={`flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t text-xs font-sans ${
        isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-600'
      }`}>
        <div>
          Showing {trips.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + pageSize, trips.length)} of {trips.length} trips
        </div>

        {/* Pagination Buttons */}
        <div className="flex items-center space-x-1.5">
          {/* Previous Page Button */}
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 border ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-300'
            }`}
          >
            <span>&lt;</span>
            <span>Prev</span>
          </button>

          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all border ${
                currentPage === page
                  ? 'bg-blue-600 text-white font-bold shadow-sm border-blue-600'
                  : isDark
                    ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-300'
              }`}
            >
              {page}
            </button>
          ))}

          {totalPages > 5 && (
            <>
              <span className={`px-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>...</span>
              <button
                onClick={() => setCurrentPage(totalPages)}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all border ${
                  currentPage === totalPages
                    ? 'bg-blue-600 text-white font-bold border-blue-600'
                    : isDark
                      ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-300'
                }`}
              >
                {totalPages}
              </button>
            </>
          )}

          {/* Next Page Button */}
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 border ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-300'
            }`}
          >
            <span>Next</span>
            <span>&gt;</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. MOBILE VIEW CARDS                                      */}
      {/* ========================================================= */}
      <div className="md:hidden space-y-3 pt-2">
        {paginatedTrips.map((t, idx) => {
          const etaInfo = formatEtaDateTime(t, idx)
          return (
            <div key={t.id} className={`p-4 rounded-2xl border space-y-3 text-xs shadow-sm ${
              isDark ? 'bg-slate-900/80 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}>
              <div className="flex justify-between items-center">
                <span className={`font-mono font-semibold text-xs ${isDark ? 'text-cyan-400' : 'text-cyan-700 font-bold'}`}>
                  #{t.id.substring(0, 8)}
                </span>
                <span className={`inline-block px-2.5 py-0.5 border text-[10px] font-semibold rounded-full ${
                  t.status === 'Completed' ? (isDark ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700') :
                  t.status === 'In Transit' || t.status === 'In Progress' ? (isDark ? 'bg-amber-950/70 border-amber-500/40 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-700') :
                  t.status === 'Cancelled' ? (isDark ? 'bg-rose-950/70 border-rose-500/40 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-700') :
                  (isDark ? 'bg-blue-950/70 border-blue-500/40 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700')
                }`}>
                  {t.status}
                </span>
              </div>
              <div className={`grid grid-cols-2 gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <div>
                  <span className={`text-[10px] block font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>OPERATOR</span>
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.driver}</span>
                </div>
                <div>
                  <span className={`text-[10px] block font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>VEHICLE</span>
                  <span className="font-mono">{t.vehicle}</span>
                </div>
                <div>
                  <span className={`text-[10px] block font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>ROUTE</span>
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.from} → {t.to}</span>
                </div>
                <div>
                  <span className={`text-[10px] block font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>ETA</span>
                  <span className="font-mono">{etaInfo.time} {etaInfo.date && `(${etaInfo.date})`}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Dispatch form panel / Modal */}
      {canDispatch && isDispatching && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
          <div className={`w-full max-w-lg rounded-3xl border p-6 relative shadow-2xl transition-all ${
            isDark ? 'bg-slate-950 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
          }`}>
            
            <div className={`flex justify-between items-center border-b pb-3 mb-5 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <h3 className={`text-sm font-bold tracking-wide uppercase font-mono m-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                [ START NEW TRIP ]
              </h3>
              <button 
                onClick={() => setIsDispatching(false)} 
                className={`cursor-pointer font-bold text-xs bg-transparent border-none outline-none ${
                  isDark ? 'text-white/40 hover:text-white' : 'text-slate-400 hover:text-slate-900'
                }`}
              >
                [CANCEL]
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
              
              <div>
                <label className={`text-[9px] block mb-1.5 font-bold ${isDark ? 'text-white/40' : 'text-slate-500'}`}>[ LINK ACTIVE SHIPMENT (OPTIONAL) ]</label>
                <select
                  name="shipmentId"
                  value={newTrip.shipmentId}
                  onChange={handleShipmentChange}
                  className={`w-full px-3 py-2 border rounded-xl focus:outline-none text-xs ${
                    isDark ? 'bg-slate-950 border-white/10 text-white focus:border-white/40' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-500'
                  }`}
                >
                  <option value="">Do Not Link Shipment</option>
                  {shipments
                    .filter((s) => {
                      if (s.status !== 'Created' && s.status !== 'Assigned' && s.status !== 'Delayed') return false;
                      const isLinked = trips.some(t => t.shipmentId === s.shipment_id && t.status !== 'Completed');
                      return !isLinked;
                    })
                    .map((s) => (
                      <option key={s.shipment_id} value={s.shipment_id}>
                        {s.tracking_number} ({s.customer_name} - {s.source}➔{s.destination})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className={`text-[9px] block mb-1.5 font-bold ${isDark ? 'text-white/40' : 'text-slate-500'}`}>[ ASSIGNED DRIVER ]</label>
                <select
                  name="driverId"
                  value={newTrip.driverId}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 border rounded-xl focus:outline-none text-xs ${
                    isDark ? 'bg-slate-950 border-white/10 text-white focus:border-white/40' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-500'
                  }`}
                >
                  <option value="">Select Driver</option>
                  {dbDrivers
                    .filter((d) => {
                      if (d.driver_id === newTrip.driverId) return true;
                      if (d.status !== 'Active' && d.status !== 'Available') return false;
                      const isBusy = trips.some(
                        (t) => t.driverId === d.driver_id && (t.status === 'In Transit' || t.status === 'Scheduled')
                      )
                      return !isBusy
                    })
                    .map((d) => (
                      <option key={d.driver_id} value={d.driver_id}>
                        {d.full_name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className={`text-[9px] block mb-1.5 font-bold ${isDark ? 'text-white/40' : 'text-slate-500'}`}>[ ASSIGNED VEHICLE ]</label>
                <select
                  name="vehicleId"
                  value={newTrip.vehicleId}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 border rounded-xl focus:outline-none text-xs ${
                    isDark ? 'bg-slate-950 border-white/10 text-white focus:border-white/40' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-500'
                  }`}
                >
                  <option value="">Select Vehicle</option>
                  {dbVehicles
                    .filter((v) => {
                      if (v.vehicle_id === newTrip.vehicleId) return true;
                      if (v.status !== 'Available') return false;
                      const isBusy = trips.some(t => t.vehicleId === v.vehicle_id && (t.status === 'In Transit' || t.status === 'Scheduled'));
                      return !isBusy;
                    })
                    .map((v) => (
                      <option key={v.vehicle_id} value={v.vehicle_id}>
                        {v.registration_number} ({v.model}) - {v.status}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[9px] block mb-1.5 font-bold ${isDark ? 'text-white/40' : 'text-slate-500'}`}>[ FROM ]</label>
                  <input
                    name="from"
                    type="text"
                    placeholder="e.g. San Francisco"
                    value={newTrip.from}
                    onChange={handleChange}
                    required
                    className={`w-full px-3 py-2 border rounded-xl focus:outline-none text-xs ${
                      isDark ? 'bg-slate-950 border-white/10 text-white focus:border-white/40' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-500'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-[9px] block mb-1.5 font-bold ${isDark ? 'text-white/40' : 'text-slate-500'}`}>[ TO ]</label>
                  <input
                    name="to"
                    type="text"
                    placeholder="e.g. Los Angeles"
                    value={newTrip.to}
                    onChange={handleChange}
                    required
                    className={`w-full px-3 py-2 border rounded-xl focus:outline-none text-xs ${
                      isDark ? 'bg-slate-950 border-white/10 text-white focus:border-white/40' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`text-[9px] block mb-1.5 font-bold ${isDark ? 'text-white/40' : 'text-slate-500'}`}>[ ROUTE TYPE ]</label>
                <select
                  name="routeType"
                  value={newTrip.routeType}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-xl focus:outline-none text-xs font-bold ${
                    isDark ? 'bg-slate-950 border-white/10 text-cyan-400 focus:border-white/40' : 'bg-slate-50 border-slate-300 text-cyan-700 focus:border-cyan-500'
                  }`}
                >
                  <option value="Fastest">Fastest Route</option>
                  <option value="Shortest">Shortest Route</option>
                  <option value="Traffic Avoidance">Traffic Avoidance</option>
                  <option value="Fuel Efficient">Fuel Efficient Route</option>
                </select>
              </div>

              <div>
                <label className={`text-[9px] block mb-1.5 font-bold ${isDark ? 'text-white/40' : 'text-slate-500'}`}>[ CARGO TYPE ]</label>
                <input
                  name="cargo"
                  type="text"
                  placeholder="e.g. Dry Food / Electronics"
                  value={newTrip.cargo}
                  onChange={handleChange}
                  required
                  className={`w-full px-3 py-2 border rounded-xl focus:outline-none text-xs ${
                    isDark ? 'bg-slate-950 border-white/10 text-white focus:border-white/40' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-cyan-500'
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingTrip}
                className={`w-full py-2.5 px-4 rounded-xl font-bold tracking-wide transition-all cursor-pointer shadow-md mt-4 text-center text-xs ${
                  isSubmittingTrip ? 'opacity-60 cursor-not-allowed' : ''
                } ${
                  isDark ? 'bg-white hover:bg-white/90 text-slate-950' : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black'
                }`}
              >
                {isSubmittingTrip ? 'DISPATCHING TRIP...' : 'START TRIP'}
              </button>

            </form>

          </div>
        </div>,
        document.body
      )}

      {/* Driver Performance Review Modal */}
      {reviewModalTrip && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in text-slate-900 dark:text-white font-sans">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl relative space-y-5">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-white/10 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-500 flex items-center justify-center text-2xl font-bold shadow-sm">
                  ⭐
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wide m-0">
                    Driver Performance Review
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-white/50 font-mono m-0 mt-0.5 font-bold">
                    Trip: {reviewModalTrip.from} ➔ {reviewModalTrip.to} ({reviewModalTrip.distance} MI)
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setReviewModalTrip(null)}
                className="text-slate-400 hover:text-slate-700 dark:text-white/40 dark:hover:text-white cursor-pointer font-black text-lg bg-transparent border-none outline-none"
              >
                ✕
              </button>
            </div>

            {/* Driver Profile Highlight */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/5 flex items-center justify-between font-mono text-xs">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-white/40 uppercase block font-bold">ASSIGNED OPERATOR</span>
                <span className="text-slate-900 dark:text-cyan-300 font-black text-sm">{reviewModalTrip.driver}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 dark:text-white/40 uppercase block font-bold">VEHICLE UNIT</span>
                <span className="text-slate-800 dark:text-white/80 uppercase font-black">{reviewModalTrip.vehicle}</span>
              </div>
            </div>

            {/* Review Form */}
            <form onSubmit={handleReviewSubmit} className="space-y-4 font-mono text-xs">
              
              {/* Star Rating Picker */}
              <div>
                <label className="text-[11px] text-slate-700 dark:text-white/70 block mb-2 font-black uppercase">
                  Rate Driver Performance (1 - 5 Stars)
                </label>
                <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-950/70 p-3.5 rounded-2xl border border-slate-200 dark:border-white/10">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className={`text-2xl transition-all cursor-pointer transform hover:scale-125 ${
                        star <= reviewRating 
                          ? 'text-amber-500 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]' 
                          : 'text-slate-300 dark:text-white/20 hover:text-amber-400/60'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="ml-3 text-sm font-black text-amber-600 dark:text-amber-300">
                    {reviewRating}.0 / 5.0
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-white/40 ml-auto">
                    {reviewRating === 5 ? '🌟 Exceptional' :
                     reviewRating === 4 ? '👍 Excellent' :
                     reviewRating === 3 ? '👌 Satisfactory' :
                     reviewRating === 2 ? '⚠️ Needs Work' : '❌ Unsatisfactory'}
                  </span>
                </div>
              </div>

              {/* Quick Tags */}
              <div>
                <label className="text-[10px] text-slate-500 dark:text-white/40 block mb-1.5 uppercase font-black">
                  Quick Feedback Tags
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '⚡ On-Time Delivery',
                    '🛡️ Safe Cargo Handling',
                    '🛣️ Route Compliant',
                    '⭐ Top Professionalism',
                    '⛽ Fuel Efficient',
                    '🌧️ Bad Weather Handled'
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        if (!reviewNotes.includes(tag)) {
                          setReviewNotes(prev => prev ? `${prev} • ${tag}` : tag)
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-950/80 dark:hover:bg-slate-900 border border-slate-300 dark:border-white/10 text-[10px] text-slate-800 dark:text-white/70 hover:text-cyan-700 dark:hover:text-cyan-300 font-bold transition-all cursor-pointer shadow-sm"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Remarks */}
              <div>
                <label className="text-[11px] text-slate-700 dark:text-white/70 block mb-1.5 font-black uppercase">
                  Manager Review Notes &amp; Feedback (Optional)
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows="3"
                  placeholder="Add notes about driver punctuality, safety compliance, or cargo care..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 focus:border-cyan-500 rounded-2xl focus:outline-none text-slate-900 dark:text-white text-xs placeholder-slate-400 dark:placeholder-white/30 resize-none font-sans font-medium shadow-inner"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModalTrip(null)}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white rounded-2xl font-black transition-all cursor-pointer text-center text-xs border border-slate-300 dark:border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl font-black tracking-wide transition-all cursor-pointer shadow-lg text-center text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 uppercase"
                >
                  {isSubmittingReview ? (
                    <span>Saving Review...</span>
                  ) : (
                    <>
                      <span>⭐</span>
                      <span>Submit Review &amp; Rank</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>,
        document.body
      )}

    </div>
  )
}

export default TripsPanel
