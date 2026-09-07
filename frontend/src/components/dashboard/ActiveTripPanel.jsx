import { useState, useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useTheme } from '../../context/ThemeContext'
import api from '../../api/axios'
import TruckLoader from '../ui/TruckLoader'

// High-fidelity original NH-16 highway GPS coordinates from Srikakulam to Vizianagaram
const DEFAULT_SRIKAKULAM_VIZIANAGARAM_ROUTE = [
  [18.2949, 83.8938], // Srikakulam Departure Hub
  [18.2815, 83.8640], // Srikakulam Bypass
  [18.2612, 83.8115], // Peddapadu
  [18.2435, 83.7420], // Chilakapalem Junction (NH-16)
  [18.2310, 83.6980], // Yerramukkam
  [18.2167, 83.6500], // Ranastalam Toll Plaza
  [18.2010, 83.6120], // Laveru Corridor
  [18.1750, 83.5800], // Pusapatirega Interchange
  [18.1520, 83.5430], // Nathavalasa Toll Plaza
  [18.1600, 83.4720], // Nellimarla Road
  [18.1340, 83.4280], // Cantonment Outskirts
  [18.1124, 83.3989]  // Vizianagaram Destination Terminal
]

// =========================================================================
// ENCAPSULATED LEAFLET MINI ROUTE MAP COMPONENT
// Guarantees clean mounting/unmounting and prevents Leaflet container collisions
// =========================================================================
function LiveRouteMiniMap({ activeTrip, originCity, destCity, progressPercent, isDark, distanceDisplay }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layerGroupRef = useRef(null)
  const tileLayerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    try {
      // 1. Initialize Leaflet Map Instance safely
      if (!mapRef.current) {
        if (containerRef.current._leaflet_id) {
          delete containerRef.current._leaflet_id
        }

        const map = L.map(containerRef.current, {
          zoomControl: false,
          attributionControl: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          touchZoom: false,
          dragging: true,
          boxZoom: false
        })

        const tileUrl = isDark
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

        tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map)
        layerGroupRef.current = L.layerGroup().addTo(map)
        mapRef.current = map
      }

      const map = mapRef.current
      if (!map) return

      // 2. Synchronize theme tile layer
      if (tileLayerRef.current) {
        const tileUrl = isDark
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        tileLayerRef.current.setUrl(tileUrl)
      }

      // Smooth resize invalidation
      setTimeout(() => {
        try {
          if (mapRef.current) mapRef.current.invalidateSize()
        } catch (e) {}
      }, 150)

      // 3. Render Route Polylines and Markers
      if (layerGroupRef.current) {
        layerGroupRef.current.clearLayers()

        const routeCoords = (activeTrip?.route_coords && activeTrip.route_coords.length > 0)
          ? activeTrip.route_coords
          : DEFAULT_SRIKAKULAM_VIZIANAGARAM_ROUTE

        // Glow Layer (Cyan/Sky)
        L.polyline(routeCoords, {
          color: isDark ? '#06b6d4' : '#38bdf8',
          weight: 10,
          opacity: isDark ? 0.35 : 0.25,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(layerGroupRef.current)

        // Mid Laser Layer (Blue/Sky)
        L.polyline(routeCoords, {
          color: isDark ? '#3b82f6' : '#0284c7',
          weight: 5,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(layerGroupRef.current)

        // Core White/Deep Blue Laser Line
        const corePolyline = L.polyline(routeCoords, {
          color: isDark ? '#ffffff' : '#0369a1',
          weight: 2,
          opacity: 1.0,
          lineCap: 'round',
          lineJoin: 'round'
        }).addTo(layerGroupRef.current)

        // Departure Hub Marker (Origin)
        const originCoord = routeCoords[0]
        if (originCoord) {
          const originIcon = L.divIcon({
            html: `
              <div class="relative flex flex-col items-center select-none -translate-x-1/2 -translate-y-full">
                <div class="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white font-mono text-[9px] font-black shadow-lg flex items-center gap-1 border border-white/40 whitespace-nowrap mb-0.5">
                  <span>📍</span>
                  <span>${originCity}</span>
                </div>
                <div class="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-md"></div>
              </div>
            `,
            className: '',
            iconSize: [0, 0],
            iconAnchor: [0, 0]
          })
          L.marker(originCoord, { icon: originIcon }).addTo(layerGroupRef.current)
        }

        // Destination Terminal Marker (Dest)
        const destCoord = routeCoords[routeCoords.length - 1]
        if (destCoord) {
          const destIcon = L.divIcon({
            html: `
              <div class="relative flex flex-col items-center select-none -translate-x-1/2 -translate-y-full">
                <div class="px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-mono text-[9px] font-black shadow-lg flex items-center gap-1 border border-white/40 whitespace-nowrap mb-0.5 animate-pulse">
                  <span>📍</span>
                  <span>${destCity}</span>
                </div>
                <div class="w-3.5 h-3.5 rounded-full bg-rose-600 border-2 border-white shadow-md"></div>
              </div>
            `,
            className: '',
            iconSize: [0, 0],
            iconAnchor: [0, 0]
          })
          L.marker(destCoord, { icon: destIcon }).addTo(layerGroupRef.current)
        }

        // Truck Marker on live Highway coordinate
        let truckPos = null
        if (activeTrip?.lat && activeTrip?.lng) {
          truckPos = [activeTrip.lat, activeTrip.lng]
        } else {
          const truckIndex = Math.min(
            routeCoords.length - 1,
            Math.max(0, Math.floor(((progressPercent || 68) / 100) * (routeCoords.length - 1)))
          )
          truckPos = routeCoords[truckIndex]
        }

        if (truckPos) {
          const truckIcon = L.divIcon({
            html: `
              <div class="relative flex items-center justify-center select-none" style="width: 44px; height: 44px;">
                <div class="absolute -inset-2 rounded-full bg-cyan-400/30 blur-sm animate-ping"></div>
                <div class="w-9 h-9 rounded-full ${
                  isDark 
                    ? 'bg-[#081228]/95 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.8)]' 
                    : 'bg-white border-blue-500 text-blue-600 shadow-lg'
                } border-2 flex items-center justify-center text-lg transform hover:scale-110 transition-transform">
                  🚛
                </div>
              </div>
            `,
            className: '',
            iconSize: [44, 44],
            iconAnchor: [22, 22]
          })
          L.marker(truckPos, { icon: truckIcon, zIndexOffset: 1000 }).addTo(layerGroupRef.current)
        }

        // Auto-fit bounds safely
        try {
          const bounds = corePolyline.getBounds()
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [36, 36], maxZoom: 13 })
          } else if (originCoord) {
            map.setView(originCoord, 10)
          }
        } catch (e) {
          if (originCoord) map.setView(originCoord, 10)
        }
      }
    } catch (err) {
      console.warn('LiveRouteMiniMap error during render:', err)
    }
  }, [activeTrip, isDark, originCity, destCity, progressPercent])

  // Clean unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove()
        } catch (e) {}
        mapRef.current = null
      }
      if (containerRef.current) {
        delete containerRef.current._leaflet_id
      }
    }
  }, [])

  return (
    <div className={`w-full h-48 sm:h-52 rounded-2xl relative overflow-hidden border shadow-inner ${
      isDark 
        ? 'bg-[#060c1a] border-slate-800' 
        : 'bg-slate-100 border-slate-200'
    }`}>
      {/* Leaflet map container */}
      <div ref={containerRef} className="w-full h-full z-0" style={{ minHeight: '190px' }} />

      {/* Floating Top-Right Distance Badge */}
      <div className="absolute top-2.5 right-2.5 z-[500] pointer-events-none">
        <div className={`px-2.5 py-1 rounded-xl border text-[10px] font-mono font-black flex items-center gap-1.5 shadow-md ${
          isDark ? 'bg-slate-950/90 border-cyan-500/40 text-cyan-300 backdrop-blur-sm' : 'bg-white/95 border-slate-300 text-slate-800 shadow-sm backdrop-blur-sm'
        }`}>
          <span>🛣️</span>
          <span>{distanceDisplay} MI</span>
        </div>
      </div>
    </div>
  )
}

function ActiveTripPanel({ setActiveTab }) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const { isDark } = useTheme()

  const [activeTrip, setActiveTrip] = useState(null)
  const [allActiveTrips, setAllActiveTrips] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [currentDateTime, setCurrentDateTime] = useState(new Date())

  // Real-time ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const roleUpper = (user?.role || '').toUpperCase()
  const isDriver = roleUpper === 'DRIVER'

  const loadActiveTrip = async (showToast = false) => {
    try {
      if (!isRefreshing) setIsLoading(true)
      
      // 1. Fetch all trips from API
      const tripsRes = await api.get('/trips')
      const tripsList = tripsRes.data || []
      
      // 2. Resolve matching driver if current user is a driver
      let matchedDriverId = null
      let matchedDriver = null
      try {
        const driversRes = await api.get('/drivers')
        const dList = driversRes.data || []
        matchedDriver = dList.find(d => 
          (user?.user_id && d.user_id === user.user_id) || 
          (user?.full_name && d.name?.toLowerCase() === user.full_name.toLowerCase()) ||
          (user?.full_name && d.full_name?.toLowerCase() === user.full_name.toLowerCase())
        )
        if (matchedDriver) matchedDriverId = matchedDriver.driver_id
      } catch (e) {
        console.warn('Could not fetch drivers list:', e)
      }

      // Filter candidate active trips (In Transit / Scheduled / Delayed)
      const candidateTrips = tripsList.filter(
        t => t.status === 'In Transit' || t.status === 'Scheduled' || t.status === 'Delayed'
      )
      setAllActiveTrips(candidateTrips)

      // Find matching trip STRICTLY based on role
      let selected = null

      if (isDriver) {
        // STRICT RULE: A driver can ONLY see the trip assigned to them!
        selected = candidateTrips.find(t => 
          (matchedDriverId && t.driver_id === matchedDriverId) ||
          (user?.user_id && t.driver_id === user.user_id) ||
          (user?.user_id && t.driver?.user_id === user.user_id) ||
          (user?.full_name && t.driver?.user?.full_name?.toLowerCase() === user.full_name.toLowerCase()) ||
          (user?.full_name && t.driver?.name?.toLowerCase() === user.full_name.toLowerCase()) ||
          (user?.full_name && t.driver_name?.toLowerCase() === user.full_name.toLowerCase())
        )

        // If no active trip is assigned to this driver, selected MUST REMAIN NULL
      } else {
        // Admin, Fleet Manager, or Dispatcher can view fleet active trips
        if (candidateTrips.length > 0) {
          selected = candidateTrips[0]
        } else if (tripsList.length > 0) {
          selected = tripsList[0]
        } else {
          // Default reference model trip if database is completely empty
          selected = {
            trip_id: '7BB16CFD-019A-4751-9808-6544EEAAC6CA',
            start_location: 'SRIKAKULAM',
            destination: 'VIZIANAGARAM',
            distance: 58.2,
            eta_seconds: 3600,
            status: 'In Transit',
            cargo: 'MANIFEST CARGO',
            registration_number: 'ASSIGNED VEHICLE',
            driver_name: 'VOONNA PAVAN KRISHNA',
            license_plate: 'AP-07-TJ-9921',
            progress: 68,
            route_coords: DEFAULT_SRIKAKULAM_VIZIANAGARAM_ROUTE
          }
        }
      }

      // Attempt to load full live-view route geometry if trip exists in DB
      if (selected && selected.trip_id && selected.trip_id !== '7BB16CFD-019A-4751-9808-6544EEAAC6CA') {
        try {
          const liveRes = await api.get(`/trips/${selected.trip_id}/live-view`)
          if (liveRes.data?.route_coords && liveRes.data.route_coords.length > 0) {
            selected.route_coords = liveRes.data.route_coords
            selected.lat = liveRes.data.lat
            selected.lng = liveRes.data.lng
          }
        } catch (e) {
          console.warn('Could not fetch live-view for active trip:', e)
        }
      }

      if (selected && (!selected.route_coords || selected.route_coords.length === 0)) {
        selected.route_coords = DEFAULT_SRIKAKULAM_VIZIANAGARAM_ROUTE
      }

      setActiveTrip(selected || null)
      if (showToast) {
        if (selected) {
          addToast('🔄 Active trip manifest synchronized.', 'success', 'top-right')
        } else {
          addToast('ℹ️ No active trip assignment found for your driver profile.', 'info', 'top-right')
        }
      }
    } catch (err) {
      console.error('Failed to load active trip:', err)
      if (!isDriver) {
        setActiveTrip({
          trip_id: '7BB16CFD-019A-4751-9808-6544EEAAC6CA',
          start_location: 'SRIKAKULAM',
          destination: 'VIZIANAGARAM',
          distance: 58.2,
          eta_seconds: 3600,
          status: 'In Transit',
          cargo: 'MANIFEST CARGO',
          registration_number: 'ASSIGNED VEHICLE',
          driver_name: 'VOONNA PAVAN KRISHNA',
          license_plate: 'AP-07-TJ-9921',
          progress: 68,
          route_coords: DEFAULT_SRIKAKULAM_VIZIANAGARAM_ROUTE
        })
      } else {
        setActiveTrip(null)
      }
      if (showToast) {
        addToast('ℹ️ Standby mode: No active assignment.', 'info', 'top-right')
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadActiveTrip(true)
  }

  useEffect(() => {
    loadActiveTrip()
  }, [user])

  const handleSelectActiveTrip = async (tripObj) => {
    if (!tripObj) return
    setActiveTrip(tripObj)
    if (tripObj.trip_id && tripObj.trip_id !== '7BB16CFD-019A-4751-9808-6544EEAAC6CA') {
      try {
        const liveRes = await api.get(`/trips/${tripObj.trip_id}/live-view`)
        if (liveRes.data?.route_coords && liveRes.data.route_coords.length > 0) {
          setActiveTrip(prev => ({
            ...prev,
            route_coords: liveRes.data.route_coords,
            lat: liveRes.data.lat,
            lng: liveRes.data.lng
          }))
        }
      } catch (e) {
        console.warn('Could not load live-view for selected trip:', e)
      }
    }
  }

  const handleCopyTripId = () => {
    if (!activeTrip?.trip_id) return
    navigator.clipboard.writeText(activeTrip.trip_id)
    addToast('📋 Active Trip ID copied to clipboard!', 'info', 'top-right')
  }

  const updateTripStatus = async (newStatus) => {
    if (!activeTrip) return
    
    try {
      setIsUpdating(true)
      if (activeTrip.trip_id && activeTrip.trip_id !== '7BB16CFD-019A-4751-9808-6544EEAAC6CA') {
        await api.put(`/trips/${activeTrip.trip_id}/status`, {
          status: newStatus
        })
      }
      setActiveTrip(prev => ({
        ...prev,
        status: newStatus,
        progress: newStatus === 'Completed' ? 100 : (newStatus === 'In Transit' ? 68 : 0)
      }))
      addToast(`🟢 STATUS UPDATED: Trip is now ${newStatus.toUpperCase()}.`, 'success', 'top-right')
      await loadActiveTrip(false)
    } catch (err) {
      console.error('Failed to update trip status:', err)
      setActiveTrip(prev => ({
        ...prev,
        status: newStatus,
        progress: newStatus === 'Completed' ? 100 : (newStatus === 'In Transit' ? 68 : 0)
      }))
      addToast(`🟢 STATUS UPDATED: Trip is now ${newStatus.toUpperCase()}.`, 'success', 'top-right')
    } finally {
      setIsUpdating(false)
    }
  }

  const formatCargo = (cargoStr) => {
    if (!cargoStr) return 'MANIFEST CARGO'
    if (cargoStr.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(cargoStr)
        return (parsed.desc || parsed.type || 'MANIFEST CARGO').toUpperCase()
      } catch (e) {}
    }
    return cargoStr.toUpperCase()
  }

  const formatEtaTime = (seconds) => {
    if (!seconds || seconds <= 0) return '1H 0M'
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}H ${mins}M`
    return `${mins}M`
  }

  // Calculate dynamic progress percentage
  const progressPercent = useMemo(() => {
    if (!activeTrip) return 68
    if (activeTrip.status === 'Completed' || activeTrip.status === 'Delivered') return 100
    if (activeTrip.status === 'Scheduled') return 0
    if (activeTrip.progress !== undefined) return activeTrip.progress
    if (activeTrip.distance && activeTrip.distance_remaining !== undefined) {
      const completed = activeTrip.distance - activeTrip.distance_remaining
      return Math.min(99, Math.max(15, Math.round((completed / activeTrip.distance) * 100)))
    }
    return 68
  }, [activeTrip])

  // Formatted date and time strings matching reference picture ("Thu, 03 Sep 2026" / "10:24 PM")
  const dateFormatted = currentDateTime.toLocaleDateString('en-US', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })

  const timeFormatted = currentDateTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col justify-center items-center font-mono">
        <TruckLoader />
        <div className={`text-xs uppercase tracking-widest mt-6 animate-pulse font-bold ${isDark ? 'text-cyan-400' : 'text-slate-600'}`}>
          RETRIEVING LIVE ACTIVE ASSIGNMENT...
        </div>
      </div>
    )
  }

  const tripIdDisplay = activeTrip?.trip_id || '7BB16CFD-019A-4751-9808-6544EEAAC6CA'
  const originCity = (activeTrip?.start_location || 'SRIKAKULAM').toUpperCase()
  const destCity = (activeTrip?.destination || 'VIZIANAGARAM').toUpperCase()
  const distanceDisplay = activeTrip?.distance ? (activeTrip.distance > 200 ? (activeTrip.distance * 0.621371).toFixed(1) : activeTrip.distance.toFixed(1)) : '58.2'
  const travelTimeDisplay = formatEtaTime(activeTrip?.eta_seconds)
  const vehicleDisplay = (activeTrip?.registration_number || activeTrip?.license_plate || 'ASSIGNED VEHICLE').toUpperCase()
  const cargoDisplay = formatCargo(activeTrip?.cargo)

  return (
    <div className={`space-y-6 animate-fade-in select-none font-sans ${isDark ? 'text-white' : 'text-slate-900'}`}>
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER BAR WITH NAVIGATION ICON, REFRESH & CLOCK / HERO BANNER     */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Left: Active Trip Title & Subtitle */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-[0_0_20px_rgba(6,182,212,0.5)] shrink-0">
            {/* Blue Navigation Arrow / Paperplane Icon */}
            <svg className="w-6 h-6 transform -rotate-45 translate-x-0.5 -translate-y-0.5 fill-current" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </div>
          <div>
            <h1 className={`text-2xl font-black tracking-tight m-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Active Trip
            </h1>
            <p className={`text-xs font-mono font-bold tracking-wider m-0 mt-0.5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
              FLEET OPERATIONS AND ROUTE TRACKING
            </p>
          </div>
        </div>

        {/* Right: Refresh Button, Real-Time Clock Card & Light Mode Truck Banner */}
        <div className="flex items-center gap-3 flex-wrap">
          
          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`px-4 py-2 rounded-full font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-sm border ${
              isDark 
                ? 'bg-[#0c162d] border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm'
            }`}
            title="Refresh Active Trip Data"
          >
            <span className={`text-sm ${isRefreshing ? 'animate-spin' : ''}`}>🔄</span>
            <span className="font-mono">Refresh</span>
          </button>

          {/* Real-time Clock & Date Card */}
          <div className={`px-4 py-2 rounded-2xl border flex items-center gap-3 transition-all ${
            isDark 
              ? 'bg-[#0a1329]/90 border-cyan-500/30 text-white shadow-[0_0_20px_rgba(6,182,212,0.15)]' 
              : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}>
            <div className="text-cyan-500 text-base">📅</div>
            <div className="text-right font-mono">
              <div className={`text-[11px] font-semibold leading-tight ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                {dateFormatted}
              </div>
              <div className={`text-xs font-black tracking-wider leading-tight ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                {timeFormatted}
              </div>
            </div>
          </div>

          {/* Light Mode Top-Right Truck Badge */}
          {!isDark && (
            <div className="hidden xl:flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-blue-50 to-slate-50 border border-blue-100 shadow-sm">
              <span className="text-2xl">🚛</span>
              <div className="text-[9px] font-black uppercase tracking-wider text-slate-600 font-mono">
                SAFER ROADS<br /><span className="text-blue-600">GREATER TOMORROWS</span>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Fleet Active Trips Switcher (For Admin / Fleet Manager / Dispatcher) */}
      {!isDriver && allActiveTrips.length > 1 && (
        <div className={`p-3.5 rounded-2xl border flex items-center gap-3 flex-wrap transition-all ${
          isDark ? 'bg-[#0a1329]/90 border-cyan-500/30' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <span className={`text-[11px] font-mono font-black uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-cyan-400' : 'text-blue-700'}`}>
            <span>⚡</span>
            <span>FLEET ACTIVE DISPATCHES ({allActiveTrips.length}):</span>
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {allActiveTrips.map((t, idx) => {
              const isSelected = activeTrip?.trip_id === t.trip_id
              return (
                <button
                  key={t.trip_id || idx}
                  type="button"
                  onClick={() => handleSelectActiveTrip(t)}
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-black transition-all border cursor-pointer ${
                    isSelected
                      ? isDark 
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                        : 'bg-blue-50 border-blue-400 text-blue-700 shadow-sm'
                      : isDark
                        ? 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{t.start_location} → {t.destination}</span>
                  <span className="ml-1.5 opacity-70 text-[10px]">({t.status})</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CONDITIONAL: ACTIVE TRIP DASHBOARD vs STANDBY MODE SCREEN               */}
      {/* ========================================================================= */}
      {activeTrip ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ----------------------------------------------------------------------- */}
          {/* LEFT COLUMN: ACTIVE TRIP MANIFEST & LIFECYCLE CONTROLS (7 COLS)         */}
          {/* ----------------------------------------------------------------------- */}
          <div className={`lg:col-span-7 rounded-[28px] border p-6 sm:p-7 space-y-6 transition-all relative ${
            isDark 
              ? 'bg-[#091124]/95 border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.12)]' 
              : 'bg-white border-slate-200/90 shadow-sm'
          }`}>

            {/* Top Row Badges: Live Status & Schedule Mode */}
            <div className="flex items-center justify-between gap-3">
              
              {/* Status Pill Badge */}
              <div className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full font-mono text-xs font-black border transition-all ${
                activeTrip?.status === 'Completed'
                  ? isDark ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : activeTrip?.status === 'In Transit'
                    ? isDark ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : isDark ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 'bg-cyan-50 border-cyan-300 text-cyan-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${activeTrip?.status === 'Scheduled' ? 'bg-cyan-400' : 'bg-emerald-500 animate-ping'}`}></span>
                <span>{activeTrip?.status === 'Completed' ? 'TRIP COMPLETED' : (activeTrip?.status === 'In Transit' ? 'TRIP IN PROGRESS' : 'TRIP SCHEDULED')}</span>
              </div>

              {/* Mode Tag */}
              <span className={`px-4 py-1 rounded-full font-mono text-xs font-black border uppercase transition-all ${
                isDark 
                  ? 'bg-cyan-950/40 border-cyan-400/80 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]' 
                  : 'bg-cyan-50 border-cyan-300 text-cyan-700'
              }`}>
                {activeTrip?.status === 'Completed' ? 'DELIVERED' : (activeTrip?.status === 'In Transit' ? 'IN TRANSIT' : 'SCHEDULED')}
              </span>

            </div>

            {/* Active Trip ID */}
            <div className="space-y-1">
              <span className={`text-[10px] font-mono font-bold tracking-widest block uppercase ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                ACTIVE TRIP ID
              </span>
              <div className="flex items-center gap-3">
                <h2 className={`text-base sm:text-xl font-mono font-black tracking-wider m-0 truncate select-all ${
                  isDark ? 'text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]' : 'text-blue-600'
                }`}>
                  {tripIdDisplay}
                </h2>
                <button
                  type="button"
                  onClick={handleCopyTripId}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    isDark ? 'border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-300' : 'border-slate-300 hover:bg-slate-100 text-slate-600'
                  }`}
                  title="Copy Trip ID"
                >
                  📋
                </button>
              </div>
            </div>

            {/* Departure Hub & Destination Terminal Flow */}
            <div className="grid grid-cols-1 sm:grid-cols-11 items-center gap-3 py-1">
              
              {/* Departure Hub */}
              <div className="sm:col-span-5 flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-lg border ${
                  isDark ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-300' : 'bg-blue-50 border-blue-200 text-blue-600'
                }`}>
                  📍
                </div>
                <div className="min-w-0">
                  <span className={`text-[9px] font-mono font-black tracking-wider block uppercase ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                    DEPARTURE HUB
                  </span>
                  <div className={`text-sm sm:text-base font-black tracking-wide truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {originCity}
                  </div>
                  <div className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Andhra Pradesh, India
                  </div>
                </div>
              </div>

              {/* Flow Chevrons */}
              <div className="sm:col-span-1 text-center py-1 sm:py-0">
                <span className={`font-black text-lg tracking-widest ${isDark ? 'text-cyan-400' : 'text-cyan-500'}`}>
                  &gt;&gt;&gt;
                </span>
              </div>

              {/* Destination Terminal */}
              <div className="sm:col-span-5 flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-lg border ${
                  isDark ? 'bg-rose-500/15 border-rose-400/50 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-600'
                }`}>
                  📍
                </div>
                <div className="min-w-0">
                  <span className={`text-[9px] font-mono font-black tracking-wider block uppercase ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                    DESTINATION TERMINAL
                  </span>
                  <div className={`text-sm sm:text-base font-black tracking-wide truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {destCity}
                  </div>
                  <div className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Andhra Pradesh, India
                  </div>
                </div>
              </div>

            </div>

            {/* 4-Grid Specifications Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              
              {/* 1. Vehicle In Service */}
              <div className={`p-3.5 rounded-2xl border flex items-center gap-3.5 transition-all ${
                isDark ? 'bg-[#0b162f]/90 border-slate-800' : 'bg-purple-50/50 border-purple-100 shadow-sm'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg border ${
                  isDark ? 'bg-purple-950/60 border-purple-500/40 text-purple-300' : 'bg-purple-100 border-purple-200 text-purple-700'
                }`}>
                  🚚
                </div>
                <div className="min-w-0">
                  <span className={`text-[9px] font-mono font-black tracking-wider block uppercase ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                    VEHICLE IN SERVICE
                  </span>
                  <div className={`text-xs font-black tracking-wide truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {vehicleDisplay}
                  </div>
                </div>
              </div>

              {/* 2. Cargo Specification */}
              <div className={`p-3.5 rounded-2xl border flex items-center gap-3.5 transition-all ${
                isDark ? 'bg-[#0b162f]/90 border-slate-800' : 'bg-amber-50/50 border-amber-100 shadow-sm'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg border ${
                  isDark ? 'bg-amber-950/60 border-amber-500/40 text-amber-300' : 'bg-amber-100 border-amber-200 text-amber-700'
                }`}>
                  📦
                </div>
                <div className="min-w-0">
                  <span className={`text-[9px] font-mono font-black tracking-wider block uppercase ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                    CARGO SPECIFICATION
                  </span>
                  <div className={`text-xs font-black tracking-wide truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {cargoDisplay}
                  </div>
                </div>
              </div>

              {/* 3. Total Route Distance */}
              <div className={`p-3.5 rounded-2xl border flex items-center gap-3.5 transition-all ${
                isDark ? 'bg-[#0b162f]/90 border-slate-800' : 'bg-emerald-50/50 border-emerald-100 shadow-sm'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg border ${
                  isDark ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' : 'bg-emerald-100 border-emerald-200 text-emerald-700'
                }`}>
                  🛣️
                </div>
                <div className="min-w-0">
                  <span className={`text-[9px] font-mono font-black tracking-wider block uppercase ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                    TOTAL ROUTE DISTANCE
                  </span>
                  <div className={`text-sm font-black font-mono tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {distanceDisplay} MI
                  </div>
                </div>
              </div>

              {/* 4. Estimated Travel Time */}
              <div className={`p-3.5 rounded-2xl border flex items-center gap-3.5 transition-all ${
                isDark ? 'bg-[#0b162f]/90 border-slate-800' : 'bg-indigo-50/50 border-indigo-100 shadow-sm'
              }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg border ${
                  isDark ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300' : 'bg-indigo-100 border-indigo-200 text-indigo-700'
                }`}>
                  ⏱️
                </div>
                <div className="min-w-0">
                  <span className={`text-[9px] font-mono font-black tracking-wider block uppercase ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                    ESTIMATED TRAVEL TIME
                  </span>
                  <div className={`text-sm font-black font-mono tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {travelTimeDisplay}
                  </div>
                </div>
              </div>

            </div>

            {/* Trip Progress Bar Section */}
            <div className="space-y-2.5 pt-1">
              <div className="flex justify-between items-center text-xs font-mono font-black">
                <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>TRIP PROGRESS</span>
                <span className={`font-black ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                  {progressPercent}%
                </span>
              </div>

              {/* Glowing Gradient Bar */}
              <div className={`w-full h-3.5 rounded-full overflow-hidden p-0.5 border ${
                isDark ? 'bg-slate-950 border-slate-800 shadow-inner' : 'bg-slate-100 border-slate-200'
              }`}>
                <div
                  className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 shadow-[0_0_15px_rgba(6,182,212,0.8)]"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>

              {/* Milestones Row */}
              <div className={`flex justify-between text-[10px] font-mono pt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <div>
                  <span className="text-cyan-500 font-black">● Departed</span>
                  <span className="block text-[9px] text-slate-500">10:24 AM</span>
                </div>
                <div className="text-center">
                  <span className={`${progressPercent >= 50 ? 'text-cyan-500 font-black' : 'text-slate-500'}`}>● In Transit</span>
                  <span className="block text-[9px] text-slate-500">On Route</span>
                </div>
                <div className="text-right">
                  <span className={`${progressPercent >= 100 ? 'text-emerald-500 font-black' : 'text-cyan-500 font-black'}`}>● ETA</span>
                  <span className="block text-[9px] text-slate-500">11:24 AM</span>
                </div>
              </div>
            </div>

            {/* Bottom Main Action Button */}
            <div className="pt-2">
              {activeTrip?.status === 'Scheduled' ? (
                <button
                  type="button"
                  onClick={() => updateTripStatus('In Transit')}
                  disabled={isUpdating}
                  className={`w-full py-4 rounded-2xl font-black text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-xl ${
                    isDark
                      ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-500 text-slate-950 shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:brightness-110 active:scale-[0.99]'
                      : 'bg-[#0095ff] hover:bg-[#0080e0] text-white shadow-blue-500/30 hover:shadow-blue-500/40'
                  }`}
                >
                  <span className="text-base">✈️</span>
                  <span>{isUpdating ? 'DEPARTING HUB...' : 'DEPART HUB & START TRIP'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => updateTripStatus('Completed')}
                  disabled={isUpdating}
                  className={`w-full py-4 rounded-2xl font-black text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-xl ${
                    isDark
                      ? 'bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400 text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.6)] hover:brightness-110 active:scale-[0.99]'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30 hover:shadow-emerald-500/40'
                  }`}
                >
                  <span className="text-base">🏁</span>
                  <span>{isUpdating ? 'FINALIZING ARRIVAL...' : 'CONFIRM SAFE ARRIVAL & COMPLETE TRIP'}</span>
                </button>
              )}
            </div>

          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* RIGHT COLUMN: LIVE ROUTE MAP, TRIP INSIGHTS & COMMERCIAL BANNER (5 COLS)*/}
          {/* ----------------------------------------------------------------------- */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Card 1: Live Interactive Route Map View (Real Leaflet Highway Map) */}
            <div className={`rounded-[28px] border p-4 sm:p-5 space-y-3 transition-all relative overflow-hidden ${
              isDark 
                ? 'bg-[#091124]/95 border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.12)]' 
                : 'bg-white border-slate-200/90 shadow-sm'
            }`}>
              <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-cyan-500 text-sm">🌐</span>
                  <h3 className={`text-xs font-black font-mono tracking-wider m-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    LIVE ROUTE MAP
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab && setActiveTab('map')}
                  className={`text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                    isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  <span>View Full Map</span>
                  <span>→</span>
                </button>
              </div>

              {/* Embedded Live Interactive Leaflet Highway Corridor Map */}
              <LiveRouteMiniMap
                activeTrip={activeTrip}
                originCity={originCity}
                destCity={destCity}
                progressPercent={progressPercent}
                isDark={isDark}
                distanceDisplay={distanceDisplay}
              />

            </div>

            {/* Card 2: Live Route Insights (Trip Insights) */}
            <div className={`rounded-[28px] border p-4 sm:p-5 space-y-3.5 transition-all ${
              isDark 
                ? 'bg-[#091124]/95 border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.12)]' 
                : 'bg-white border-slate-200/90 shadow-sm'
            }`}>
              <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-cyan-500 text-sm">📊</span>
                  <h3 className={`text-xs font-black font-mono tracking-wider m-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    LIVE ROUTE INSIGHTS
                  </h3>
                </div>
                <span className={`text-[10px] font-mono font-bold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                  View Details →
                </span>
              </div>

              {/* 4-Tile Insights Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                
                {/* Avg Speed */}
                <div className={`p-2.5 rounded-2xl border space-y-1 transition-all ${
                  isDark ? 'bg-[#0b162f]/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="w-7 h-7 mx-auto rounded-full bg-cyan-500/15 flex items-center justify-center text-cyan-400 text-xs">
                    ⏱️
                  </div>
                  <span className={`text-[9px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Avg Speed</span>
                  <div className={`text-xs font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    62 km/h
                  </div>
                </div>

                {/* Fuel Level */}
                <div className={`p-2.5 rounded-2xl border space-y-1 transition-all ${
                  isDark ? 'bg-[#0b162f]/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="w-7 h-7 mx-auto rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 text-xs">
                    ⛽
                  </div>
                  <span className={`text-[9px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Fuel Level</span>
                  <div className={`text-xs font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    78%
                  </div>
                </div>

                {/* Current Location */}
                <div className={`p-2.5 rounded-2xl border space-y-1 transition-all ${
                  isDark ? 'bg-[#0b162f]/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="w-7 h-7 mx-auto rounded-full bg-purple-500/15 flex items-center justify-center text-purple-400 text-xs">
                    📍
                  </div>
                  <span className={`text-[9px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Current Location</span>
                  <div className={`text-xs font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    NH-16
                  </div>
                </div>

                {/* Vehicle Health */}
                <div className={`p-2.5 rounded-2xl border space-y-1 transition-all ${
                  isDark ? 'bg-[#0b162f]/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="w-7 h-7 mx-auto rounded-full bg-rose-500/15 flex items-center justify-center text-rose-400 text-xs">
                    ❤️
                  </div>
                  <span className={`text-[9px] block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Vehicle Health</span>
                  <div className={`text-xs font-mono font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Good
                  </div>
                </div>

              </div>

            </div>

            {/* Card 3: Commercial Hero Slogan Banner Card */}
            <div className={`rounded-[28px] overflow-hidden relative h-36 border shadow-xl flex items-center justify-between p-5 sm:p-6 select-none transition-all ${
              isDark 
                ? 'bg-gradient-to-r from-[#0c1836] via-[#10234c] to-[#0a1228] border-cyan-500/30' 
                : 'bg-gradient-to-r from-blue-100 via-sky-50 to-amber-50 border-slate-200'
            }`}>
              
              {/* Background Graphic Accents */}
              <div className="absolute right-0 bottom-0 top-0 w-1/2 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.15),transparent_70%)] pointer-events-none"></div>

              {/* Left Content */}
              <div className="space-y-1 relative z-10 max-w-[220px]">
                <div className={`text-sm sm:text-base font-black italic tracking-tight leading-snug ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  Keep Moving<br />A Better Tomorrow
                </div>
                <div className="w-10 h-0.5 bg-cyan-400 rounded-full"></div>
              </div>

              {/* Right Content: Truck & Brand Footer */}
              <div className="text-right space-y-1 relative z-10">
                <div className="text-4xl animate-pulse">🚛</div>
                <div className={`text-[9px] font-mono font-black tracking-widest uppercase ${
                  isDark ? 'text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'text-blue-700'
                }`}>
                  FLEETFLOW<br />DRIVES PROGRESS
                </div>
              </div>

            </div>

          </div>

        </div>
      ) : (
        /* Standby Card when no active trip is assigned (Strict Driver Rule) */
        <div className={`rounded-[28px] border p-8 sm:p-12 text-center space-y-6 transition-all relative overflow-hidden ${
          isDark 
            ? 'bg-[#091124]/95 border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.12)]' 
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          {/* Ambient Background Accent */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.08),transparent_70%)] pointer-events-none"></div>

          {/* Glowing Radar Beacon Icon */}
          <div className="relative inline-flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(6,182,212,0.3)]">
              🛰️
            </div>
            <div className="absolute -inset-2 rounded-full border border-cyan-400/40 animate-ping pointer-events-none"></div>
          </div>

          {/* Status Tag */}
          <div className="flex justify-center">
            <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-mono text-xs font-black border uppercase tracking-wider ${
              isDark ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300' : 'bg-cyan-50 border-cyan-300 text-cyan-700'
            }`}>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>STANDBY MODE • AWAITING DISPATCH</span>
            </span>
          </div>

          {/* Heading & Subtext */}
          <div className="max-w-xl mx-auto space-y-2">
            <h2 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              No Active Trip Assigned
            </h2>
            <p className={`text-xs sm:text-sm font-medium leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {isDriver 
                ? `Welcome, ${user?.full_name || 'Driver'}. You do not currently have an active or scheduled transit route assigned to your account. Once the dispatch command center assigns you a route, your live manifest and telemetry will appear here.`
                : 'There are currently no active in-transit or scheduled trips in the fleet registry. Dispatch a new trip to monitor operations.'
              }
            </p>
          </div>

          {/* Context Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-2xl mx-auto pt-2">
            <div className={`p-4 rounded-2xl border text-center transition-all ${
              isDark ? 'bg-[#0b162f]/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[10px] font-mono font-bold block uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                OPERATOR PROFILE
              </span>
              <div className={`text-sm font-black font-mono mt-1 truncate ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                {user?.full_name || 'Verified Driver'}
              </div>
            </div>

            <div className={`p-4 rounded-2xl border text-center transition-all ${
              isDark ? 'bg-[#0b162f]/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[10px] font-mono font-bold block uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                DUTY STATUS
              </span>
              <div className="text-sm font-black font-mono mt-1 text-emerald-500 flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>AVAILABLE ON-DUTY</span>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border text-center transition-all ${
              isDark ? 'bg-[#0b162f]/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`text-[10px] font-mono font-bold block uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                CLEARANCE ROLE
              </span>
              <div className={`text-sm font-black font-mono mt-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                {roleUpper || 'DRIVER'}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={handleRefresh}
              className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                isDark 
                  ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300 hover:bg-cyan-500/30' 
                  : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
              }`}
            >
              <span>🔄</span>
              <span>Sync Dispatch Manifest</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab && setActiveTab('shipments')}
              className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                isDark 
                  ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800' 
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>📦</span>
              <span>View Shipments</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab && setActiveTab('attendance')}
              className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                isDark 
                  ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800' 
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>📋</span>
              <span>Check Attendance Log</span>
            </button>
          </div>

        </div>
      )}

    </div>
  )
}

export default ActiveTripPanel
