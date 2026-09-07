import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useToast } from '../../context/ToastContext'
import { useNotifications } from '../../context/NotificationContext'
import { useTheme } from '../../context/ThemeContext'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import { DeliveryStatusTimeline } from './ShipmentPanel'

// Leaflet default icon fix to avoid broken image links
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const DEPOTS = {
  SF: { name: 'SF Depot', lat: 37.7749, lng: -122.4194, trucks: 14, shipments: 8 },
  OAKLAND: { name: 'Oakland Depot', lat: 37.8044, lng: -122.2712, trucks: 9, shipments: 4 },
  SJ: { name: 'San Jose Depot', lat: 37.3382, lng: -121.8863, trucks: 11, shipments: 5 },
  SACRAMENTO: { name: 'Sacramento Hub', lat: 38.5816, lng: -121.4944, trucks: 18, shipments: 12 },
  FRESNO: { name: 'Fresno Center', lat: 36.7378, lng: -119.7871, trucks: 7, shipments: 3 },
  LA: { name: 'LA Terminal', lat: 34.0522, lng: -118.2437, trucks: 25, shipments: 19 }
}

const HIGHWAY_ROUTES = [
  [ [37.7749, -122.4194], [37.8044, -122.2712] ], // SF - Oakland
  [ [37.7749, -122.4194], [37.3382, -121.8863] ], // SF - SJ
  [ [37.8044, -122.2712], [38.5816, -121.4944] ], // Oakland - Sac
  [ [37.8044, -122.2712], [37.3382, -121.8863] ], // Oakland - SJ
  [ [37.3382, -121.8863], [36.7378, -119.7871] ], // SJ - Fresno
  [ [38.5816, -121.4944], [36.7378, -119.7871] ], // Sac - Fresno
  [ [36.7378, -119.7871], [34.0522, -118.2437] ], // Fresno - LA
  [ [37.3382, -121.8863], [34.0522, -118.2437] ]  // SJ - LA
]

// Synthesizer Audio Alerts for Dispatch Command Center (Zero dependencies, Web Audio API)
const playDispatchAudio = (type = 'chime') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)

    const now = ctx.currentTime
    if (type === 'chime') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, now) // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15) // A5
      gain.gain.setValueAtTime(0.08, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
      osc.start(now)
      osc.stop(now + 0.3)
    } else if (type === 'alert') {
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(784, now) // G5
      osc.frequency.setValueAtTime(659.25, now + 0.08) // E5
      gain.gain.setValueAtTime(0.12, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
      osc.start(now)
      osc.stop(now + 0.25)
    } else if (type === 'ping') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(1046.5, now) // C6
      gain.gain.setValueAtTime(0.06, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)
      osc.start(now)
      osc.stop(now + 0.12)
    }
  } catch (e) {
    // AudioContext autoplay restrictions or disabled
  }
}

function MapTracker({ target = null }) {
  const { addToast } = useToast()
  const { addNotification } = useNotifications()
  const { isDark } = useTheme()
  const { user } = useAuth()
  
  // Role Clearance: Fleet Manager & Admin have control rights; Driver & Dispatcher cannot modify
  const role = (user?.role || '').toUpperCase()
  const canControlRoute = role === 'ADMIN' || role === 'FLEETMANAGER'
  const isDriverOrDispatcher = role === 'DRIVER' || role === 'DISPATCHER'

  const [selectedNode, setSelectedNode] = useState(null)
  const [selectedTripId, setSelectedTripId] = useState(null)
  const [activeTrips, setActiveTrips] = useState([])
  const [allTrips, setAllTrips] = useState([])
  const [selectedStaticTrip, setSelectedStaticTrip] = useState(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [isSimulatingPing, setIsSimulatingPing] = useState(false)
  const [lastTripsLength, setLastTripsLength] = useState(0)

  // Command Center Live Features
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [activeCheckpointIndex, setActiveCheckpointIndex] = useState(0)
  const [countdownRemaining, setCountdownRemaining] = useState(252) // 4 min 12 sec default
  const [telemetryLogs, setTelemetryLogs] = useState([
    { id: 1, time: '14:32:01', type: 'CORRIDOR', tag: 'FASTAG', text: 'FASTag #6014-9921 auto-cleared at Plaza KM 142' },
    { id: 2, time: '14:32:15', type: 'SIGNAL', tag: 'GREEN-WAVE', text: 'Smart highway signal synchronized: Corridor speed 58 km/h' },
    { id: 3, time: '14:32:30', type: 'GPS', tag: 'TELEMETRY', text: 'GPS coordinates verified [16.3124, 80.4412], Engine load nominal' },
    { id: 4, time: '14:32:45', type: 'DOCK', tag: 'STAGING', text: 'Central Logistics Distribution Hub: Dock Bay 4 locked' }
  ])

  // Route Strategy states (Matching Reference Photo)
  const [selectedStrategy, setSelectedStrategy] = useState('Shortest')
  const [strategies, setStrategies] = useState([
    { id: 'Fastest', name: 'Fastest Route', distance: 335.06, duration_hrs: '4.9 hrs', delay: '+2m delay', delay_type: 'delay' },
    { id: 'Shortest', name: 'Shortest Route', distance: 318.31, duration_hrs: '5.4 hrs', delay: '+5m delay', delay_type: 'delay' },
    { id: 'Traffic Avoidance', name: 'Traffic Avoidance Route', distance: 361.86, duration_hrs: '4.4 hrs', delay: 'Clear', delay_type: 'clear' },
    { id: 'Fuel Efficient', name: 'Fuel-Efficient Route', distance: 328.36, duration_hrs: '5.0 hrs', delay: '+1m delay', delay_type: 'delay' }
  ])
  const [isRecalculating, setIsRecalculating] = useState(false)

  // Camera follow states & refs
  const [isFollowMode, setIsFollowMode] = useState(true)
  const [currentHeading, setCurrentHeading] = useState(null)
  const isFollowModeRef = useRef(true)
  const lastSelectedTripIdRef = useRef(null)
  const lastFittedTripIdRef = useRef(null)

  useEffect(() => {
    isFollowModeRef.current = isFollowMode
  }, [isFollowMode])

  // Helper to reliably resolve camera focus coordinates for reached, in-transit, or scheduled trips
  const getFocusCoordinates = useCallback((trip) => {
    if (!trip) return null
    const isFinished = trip.status === 'Completed' || trip.status === 'Delivered' || (trip.distance_remaining !== undefined && trip.distance_remaining <= 0.05)
    if (trip.route_coords && trip.route_coords.length > 0) {
      if (isFinished) {
        return {
          coords: trip.route_coords[trip.route_coords.length - 1],
          zoom: 17,
          isReached: true
        }
      }
      if (trip.status === 'Scheduled') {
        return {
          coords: trip.route_coords[0],
          zoom: 16,
          isReached: false
        }
      }
      if (trip.lat && trip.lng && !(trip.route_coords[0][0] > 0 && trip.lat < 0) && !(trip.route_coords[0][1] > 0 && trip.lng < 0)) {
        return {
          coords: [trip.lat, trip.lng],
          zoom: 16,
          isReached: false
        }
      }
      return {
        coords: trip.route_coords[0],
        zoom: 16,
        isReached: false
      }
    }
    if (trip.lat && trip.lng) {
      return {
        coords: [trip.lat, trip.lng],
        zoom: isFinished ? 17 : 16,
        isReached: isFinished
      }
    }
    return null
  }, [])

  // Reset follow references when selected trip ID changes
  useEffect(() => {
    if (selectedTripId !== lastSelectedTripIdRef.current) {
      lastSelectedTripIdRef.current = selectedTripId
      setIsFollowMode(true)
    }
  }, [selectedTripId])

  // Fetch all trips on mount
  useEffect(() => {
    const fetchAllTrips = async () => {
      try {
        const res = await api.get('/trips/')
        setAllTrips(res.data || [])
      } catch (err) {
        console.error('Failed to fetch all trips:', err)
      }
    }
    fetchAllTrips()
  }, [])

  // Handle target passed from external panels (e.g. ShipmentPanel "Track" button)
  useEffect(() => {
    if (!target) return

    const findAndSelectTrip = async () => {
      try {
        let matchedTripId = null

        // 1. Check activeTrips or allTrips for shipmentId
        if (target.shipmentId) {
          const matched = activeTrips.find(t => t.shipment_id === target.shipmentId) || 
                          allTrips.find(t => t.shipment_id === target.shipmentId)
          if (matched) matchedTripId = matched.trip_id
        }

        // 2. Check activeTrips or allTrips for vehicleId
        if (!matchedTripId && target.vehicleId) {
          const matched = activeTrips.find(t => t.vehicle_id === target.vehicleId) || 
                          allTrips.find(t => t.vehicle_id === target.vehicleId)
          if (matched) matchedTripId = matched.trip_id
        }

        // 3. Fallback: fetch directly from API to guarantee latest trip list
        if (!matchedTripId && (target.shipmentId || target.vehicleId)) {
          const res = await api.get('/trips/')
          const tripsList = res.data || []
          const found = tripsList.find(t => 
            (target.shipmentId && t.shipment_id === target.shipmentId) ||
            (target.vehicleId && t.vehicle_id === target.vehicleId)
          )
          if (found) matchedTripId = found.trip_id
        }

        if (matchedTripId) {
          setSelectedTripId(matchedTripId)
          setIsFollowMode(true)
          addToast(`🧭 TRACKING: Focused on ${target.trackingNumber ? `Shipment ${target.trackingNumber}` : 'Selected Vehicle'}.`, 'info', 'top-right')
        } else if (target.trackingNumber) {
          addToast(`ℹ️ NOTICE: No active transit route found for ${target.trackingNumber}.`, 'info', 'top-right')
        }
      } catch (e) {
        console.error('Error finding target trip for map tracking:', e)
      }
    }

    findAndSelectTrip()
  }, [target, activeTrips, allTrips])

  // Fetch static trip details if selected trip is not active (In Transit)
  useEffect(() => {
    if (!selectedTripId) {
      setSelectedStaticTrip(null)
      return
    }

    const isActive = activeTrips.some((t) => t.trip_id === selectedTripId)
    if (isActive) {
      setSelectedStaticTrip(null)
      return
    }

    const fetchStaticTrip = async () => {
      try {
        const res = await api.get(`/trips/${selectedTripId}/live-view`)
        setSelectedStaticTrip(res.data)
      } catch (err) {
        console.error('Failed to fetch static trip details:', err)
        setSelectedStaticTrip(null)
      }
    }
    fetchStaticTrip()
  }, [selectedTripId, activeTrips])

  // Fetch route strategies for selected trip
  useEffect(() => {
    if (!selectedTripId) return
    const fetchStrategies = async () => {
      try {
        const res = await api.get(`/trips/${selectedTripId}/strategies`)
        if (res.data?.strategies && res.data.strategies.length > 0) {
          setStrategies(res.data.strategies)
          if (res.data.selected_strategy) {
            setSelectedStrategy(res.data.selected_strategy)
          }
        }
      } catch (err) {
        console.error('Error loading route strategies:', err)
      }
    }
    fetchStrategies()
  }, [selectedTripId])

  const handleSelectStrategy = async (strategyObj) => {
    setSelectedStrategy(strategyObj.id)
    if (!selectedTripId) return
    try {
      await api.post(`/trips/${selectedTripId}/select-strategy`, { route_type: strategyObj.id })
      addToast(`🧭 ROUTE STRATEGY: Switched to ${strategyObj.name} (${strategyObj.distance} km).`, 'info', 'top-right')
      const res = await api.get(`/trips/${selectedTripId}/live-view`)
      if (res.data) setSelectedStaticTrip(res.data)
    } catch (e) {
      console.error('Failed to select strategy:', e)
    }
  }

  const handleRecalculateRoute = async () => {
    if (!selectedTripId) {
      addToast('ℹ️ Please select a vehicle or trip to recalculate route.', 'info', 'top-right')
      return
    }
    setIsRecalculating(true)
    if (audioEnabled) playDispatchAudio('chime')
    try {
      await api.post(`/trips/${selectedTripId}/recalculate`, { route_type: selectedStrategy })
      addToast('⚡ ROUTE OPTIMIZED: Recalculated live path with traffic awareness.', 'success', 'top-right')
      const stratRes = await api.get(`/trips/${selectedTripId}/strategies`)
      if (stratRes.data?.strategies) setStrategies(stratRes.data.strategies)
      const liveRes = await api.get(`/trips/${selectedTripId}/live-view`)
      if (liveRes.data) setSelectedStaticTrip(liveRes.data)
    } catch (e) {
      console.error('Failed to recalculate route:', e)
      addToast('❌ Could not recalculate route.', 'error', 'top-right')
    } finally {
      setIsRecalculating(false)
    }
  }

  // Real-time ticking countdown clock for ETA
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownRemaining(prev => (prev > 1 ? prev - 1 : 240))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Auto-select and focus map on the latest shipment/trip when loaded
  useEffect(() => {
    if (activeTrips.length > 0 && activeTrips.length !== lastTripsLength) {
      setSelectedTripId(activeTrips[0].trip_id)
      setLastTripsLength(activeTrips.length)
      if (activeTrips[0].eta_seconds) {
        setCountdownRemaining(activeTrips[0].eta_seconds)
      }
    }
  }, [activeTrips, lastTripsLength])

  const triggerPingSimulation = async () => {
    try {
      setIsSimulatingPing(true)
      if (audioEnabled) playDispatchAudio('ping')
      const res = await api.post('/trips/simulate-ping')
      addToast(`📡 GPS PING SENT: ${res.data.message}`, 'success', 'top-right')
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      setTelemetryLogs(prev => [
        { id: Date.now(), time: nowStr, type: 'GPS', tag: 'PING-ACK', text: `GPS telemetry frame received: ${res.data.message}` },
        ...prev.slice(0, 19)
      ])
    } catch (err) {
      console.error('Failed to trigger GPS ping simulation:', err)
      addToast('❌ ERROR: Could not trigger GPS ping.', 'error', 'top-right')
    } finally {
      setIsSimulatingPing(false)
    }
  }

  // Leaflet instances
  const [mapInstance, setMapInstance] = useState(null)
  const mapContainerRef = useRef(null)
  const tileLayerRef = useRef(null)
  
  // Track active vehicle markers & polylines in memory to update them smoothly
  const vehicleMarkersRef = useRef({})
  const activeRoutesGroupRef = useRef(null)
  const markerAnimationsRef = useRef({})

  const [isRefreshing, setIsRefreshing] = useState(false)

  // 1. Initialize Leaflet Map centered on India (Guntur) ONCE on mount
  useEffect(() => {
    if (!mapContainerRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: [16.3067, 80.4365],
      zoom: 7,
      zoomControl: false,
      attributionControl: false
    })

    // High-tech Map Tiles: CartoDB Dark Matter (Dark Mode) / OpenStreetMap Standard (Light Mode, No watermarks)
    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

    const tile = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map)
    tileLayerRef.current = tile

    L.control.zoom({ position: 'topleft' }).addTo(map)

    // Layer group for overlays
    activeRoutesGroupRef.current = L.layerGroup().addTo(map)

    map.on('dragstart', () => {
      setIsFollowMode(false)
    })

    // Render static highway linkages
    HIGHWAY_ROUTES.forEach((route) => {
      L.polyline(route, {
        color: isDark ? 'rgba(0, 240, 255, 0.18)' : 'rgba(14, 165, 233, 0.25)',
        weight: 1.5,
        dashArray: '3 5'
      }).addTo(map)
    })

    // Render Depot Markers
    Object.entries(DEPOTS).forEach(([code, data]) => {
      const depotMarker = L.circleMarker([data.lat, data.lng], {
        radius: 6,
        fillColor: '#00f0ff',
        color: '#00f0ff',
        weight: 1.5,
        opacity: 0.7,
        fillOpacity: 0.6
      }).addTo(map)

      depotMarker.on('click', () => {
        setSelectedNode(code)
      })

      depotMarker.bindTooltip(`<span class="font-mono text-xs font-bold text-slate-900">${data.name.toUpperCase()}</span>`, {
        permanent: false,
        direction: 'top'
      })
    })

    setMapInstance(map)

    return () => {
      map.remove()
    }
  }, []) // Empty dependency array: Map initializes once without unmounting on theme toggle

  // 1b. Smoothly swap tile layer and invalidate size when isDark changes
  useEffect(() => {
    if (!mapInstance || !tileLayerRef.current) return

    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

    tileLayerRef.current.setUrl(tileUrl)
    mapInstance.invalidateSize()
  }, [isDark, mapInstance])

  // Manual Refresh Map & Sync Telemetry
  const handleRefreshMap = async () => {
    setIsRefreshing(true)
    if (audioEnabled) playDispatchAudio('chime')
    try {
      // 1. Refetch latest trips
      const res = await api.get('/trips/')
      if (res.data) setAllTrips(res.data)

      if (selectedTripId) {
        const liveRes = await api.get(`/trips/${selectedTripId}/live-view`)
        if (liveRes.data) setSelectedStaticTrip(liveRes.data)
        const stratRes = await api.get(`/trips/${selectedTripId}/strategies`)
        if (stratRes.data?.strategies) setStrategies(stratRes.data.strategies)
      }

      // 2. Refresh Leaflet map viewport and focus
      if (mapInstance) {
        mapInstance.invalidateSize()
        const targetTrip = activeTrips.find((t) => t.trip_id === selectedTripId) || selectedStaticTrip || (activeTrips.length > 0 ? activeTrips[0] : null)
        const focusTarget = getFocusCoordinates(targetTrip)
        if (focusTarget?.coords) {
          mapInstance.setView(focusTarget.coords, focusTarget.zoom, { animate: true })
        }
      }

      addToast('🔄 MAP REFRESHED: Synced live route & fleet telemetry.', 'success', 'top-right')
    } catch (err) {
      console.error('Failed to refresh map telemetry:', err)
      addToast('❌ Could not refresh map.', 'error', 'top-right')
    } finally {
      setTimeout(() => setIsRefreshing(false), 500)
    }
  }

  // 2. Establish real-time telemetry WebSocket connection with auto-reconnect
  useEffect(() => {
    let ws;
    let reconnectTimeout;
    
    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const host = window.location.hostname === 'localhost' ? '127.0.0.1:8000' : window.location.host
      const wsUrl = `${protocol}//${host}/ws/telemetry`

      console.log('[Leaflet Telemetry] Opening connection:', wsUrl)
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        setWsConnected(true)
        console.log('[Leaflet Telemetry] WebSocket active.')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

          if (data.type === 'INITIAL_STATE' || data.type === 'TELEMETRY_UPDATE') {
            setActiveTrips(data.active_trips || [])
            if (data.active_trips?.length > 0 && data.active_trips[0].eta_seconds) {
              setCountdownRemaining(data.active_trips[0].eta_seconds)
            }
          } else if (data.type === 'GEOFENCE_EVENT') {
            if (audioEnabled) playDispatchAudio('alert')
            addToast(`🚨 GEOFENCE: ${data.message}`, 'info', 'top-right')
            addNotification({
              title: data.event === 'ENTER' ? '🎉 SHIPMENT ARRIVED' : '🚨 GEOFENCE DEPARTURE',
              message: data.message,
              type: 'geofence'
            })
            setTelemetryLogs(prev => [
              { id: Date.now(), time: nowStr, type: 'GEOFENCE', tag: data.event || 'ALERT', text: data.message },
              ...prev.slice(0, 19)
            ])
          } else if (data.type === 'REROUTE_EVENT') {
            if (audioEnabled) playDispatchAudio('alert')
            addToast(`⚠️ REROUTE: ${data.message}`, 'warning', 'top-right')
            addNotification({
              title: '⚠️ ROUTE DEVIATION',
              message: data.message,
              type: 'reroute'
            })
            setTelemetryLogs(prev => [
              { id: Date.now(), time: nowStr, type: 'REROUTE', tag: 'CORRIDOR', text: data.message },
              ...prev.slice(0, 19)
            ])
          } else if (data.type === 'MILESTONE_EVENT') {
            if (audioEnabled) playDispatchAudio('chime')
            addToast(`📍 MILESTONE: ${data.message}`, 'info', 'top-right')
            addNotification({
              title: '📍 EN ROUTE MILESTONE',
              message: data.message,
              type: 'info'
            })
            setTelemetryLogs(prev => [
              { id: Date.now(), time: nowStr, type: 'CHECKPOINT', tag: 'MILESTONE', text: data.message },
              ...prev.slice(0, 19)
            ])
          } else if (data.type === 'PROXIMITY_EVENT') {
            if (audioEnabled) playDispatchAudio('alert')
            addToast(`🔔 OUT FOR DELIVERY: ${data.message}`, 'warning', 'top-right')
            addNotification({
              title: '🔔 OUT FOR DELIVERY (2 KM)',
              message: data.message,
              type: 'warning'
            })
            setTelemetryLogs(prev => [
              { id: Date.now(), time: nowStr, type: 'PROXIMITY', tag: '2KM-HUB', text: data.message },
              ...prev.slice(0, 19)
            ])
          } else if (data.type === 'STATUS_EVENT') {
            addToast(`📦 ${data.title || 'STATUS'}: ${data.message}`, 'info', 'top-right')
            addNotification({
              title: data.title || '📦 SHIPMENT UPDATE',
              message: data.message,
              type: 'info'
            })
            setTelemetryLogs(prev => [
              { id: Date.now(), time: nowStr, type: 'STATUS', tag: 'MANIFEST', text: data.message },
              ...prev.slice(0, 19)
            ])
          } else if (data.type === 'MAINTENANCE_EVENT') {
            const toastType = data.alert_type === 'DUE_HOURLY' ? 'error' : (data.alert_type === '1_DAY' ? 'warning' : 'info')
            addToast(`🔧 ${data.title || 'MAINTENANCE'}: ${data.message}`, toastType, 'top-right')
            addNotification({
              title: data.title || '🔧 FLEET MAINTENANCE ALERT',
              message: data.message,
              type: data.alert_type === 'DUE_HOURLY' ? 'error' : (data.alert_type === '1_DAY' ? 'warning' : 'info')
            })
          }
        } catch (err) {
          console.error('[Leaflet Telemetry] Failed to parse payload:', err)
        }
      }

      ws.onerror = (err) => {
        console.error('[Leaflet Telemetry] WebSocket error:', err)
      }

      ws.onclose = () => {
        setWsConnected(false)
        console.log('[Leaflet Telemetry] WebSocket closed. Attempting reconnect in 5s...')
        reconnectTimeout = setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      if (ws) {
        ws.onclose = null
        ws.onerror = null
        ws.close()
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
    }
  }, [addToast, audioEnabled])

  const getInitialHeading = (routeCoords) => {
    if (!routeCoords || routeCoords.length < 2) return 0
    const [p1, p2] = routeCoords
    const dy = p2[0] - p1[0]
    const dx = Math.cos(Math.PI / 180 * p1[0]) * (p2[1] - p1[1])
    let angle = Math.atan2(dy, dx) * 180 / Math.PI
    let heading = 90 - angle
    if (heading < 0) heading += 360
    return Math.round(heading)
  }

  const getCardinalDirection = (angle) => {
    if (angle === null || angle === undefined) return '0° N'
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    const index = Math.round(((angle % 360) / 45)) % 8
    return `${angle}° ${directions[index]}`
  }

  const animateMarkerTo = (tripId, marker, targetLat, targetLng, tripInfo = null) => {
    const startLatLng = marker.getLatLng()
    const startLat = startLatLng.lat
    const startLng = startLatLng.lng
    const duration = 2450 // 2.45s smooth continuous glide matching 2.5s telemetry cycle
    const startTime = performance.now()

    // Helper: distance between two coordinates in degrees (approx Euclidean for small distances)
    const distBetween = (p1, p2) => {
      const dy = p2[0] - p1[0]
      const dx = Math.cos(Math.PI / 180 * p1[0]) * (p2[1] - p1[1])
      return Math.hypot(dy, dx)
    }

    // Extract exact intermediate road vertices from trip.route_coords so truck never skips curves
    let pathPoints = [[startLat, startLng], [targetLat, targetLng]]
    if (tripInfo?.route_coords && tripInfo.route_coords.length >= 2) {
      const coords = tripInfo.route_coords
      
      // Find closest vertex to startLat/startLng
      let startIdx = -1
      let minStartDist = 0.08 // search radius ~8km
      for (let i = 0; i < coords.length; i++) {
        const d = distBetween([startLat, startLng], coords[i])
        if (d < minStartDist) {
          minStartDist = d
          startIdx = i
        }
      }

      // Find closest vertex to targetLat/targetLng (searching forward from startIdx or across all)
      let targetIdx = -1
      let minTargetDist = 0.08
      const searchStart = startIdx >= 0 ? startIdx : 0
      for (let i = searchStart; i < coords.length; i++) {
        const d = distBetween([targetLat, targetLng], coords[i])
        if (d < minTargetDist) {
          minTargetDist = d
          targetIdx = i
        }
      }

      // If valid forward road segment found, follow every single road bend along the corridor
      if (startIdx >= 0 && targetIdx >= startIdx) {
        pathPoints = [[startLat, startLng], ...coords.slice(startIdx, targetIdx + 1), [targetLat, targetLng]]
      } else if (startIdx >= 0) {
        pathPoints = [[startLat, startLng], ...coords.slice(startIdx), [targetLat, targetLng]]
      }
    }

    // Filter duplicate consecutive micro-points in pathPoints
    const cleanPathPoints = []
    for (let p of pathPoints) {
      if (cleanPathPoints.length === 0) {
        cleanPathPoints.push(p)
      } else {
        const last = cleanPathPoints[cleanPathPoints.length - 1]
        if (distBetween(last, p) > 0.00001) {
          cleanPathPoints.push(p)
        }
      }
    }
    pathPoints = cleanPathPoints.length >= 2 ? cleanPathPoints : [[startLat, startLng], [targetLat, targetLng]]

    // Compute cumulative segment distances along the road polyline
    const segDistances = []
    let totalDist = 0
    for (let k = 0; k < pathPoints.length - 1; k++) {
      const d = distBetween(pathPoints[k], pathPoints[k + 1])
      segDistances.push(d)
      totalDist += d
    }

    // Update real-time distance and ETA badge in DOM
    const element = marker.getElement()
    if (element && tripInfo?.distance_remaining !== undefined) {
      const badgeText = element.querySelector('.eta-badge-text')
      if (badgeText) {
        const etaMins = tripInfo.eta_seconds ? Math.ceil(tripInfo.eta_seconds / 60) : Math.max(1, Math.round(tripInfo.distance_remaining * 0.7))
        badgeText.textContent = `${tripInfo.distance_remaining} km • ${etaMins} min`
      }
    }

    // Smoothly pan camera together with marker if in follow mode
    if (tripId === selectedTripId && isFollowModeRef.current && mapInstance) {
      if (mapInstance.getZoom() < 14) {
        mapInstance.setView([targetLat, targetLng], 16, { animate: true })
      } else {
        mapInstance.panTo([targetLat, targetLng], { animate: true, duration: 2.2 })
      }
    }

    const step = (time) => {
      const elapsed = time - startTime
      const progress = Math.min(elapsed / duration, 1)

      let currentLat = targetLat
      let currentLng = targetLng
      let segHeading = null

      // Interpolate along the exact polyline segments of the road
      if (totalDist > 0.000001 && pathPoints.length >= 2) {
        const targetDist = progress * totalDist
        let accumulated = 0
        for (let k = 0; k < segDistances.length; k++) {
          const d = segDistances[k]
          if (accumulated + d >= targetDist || k === segDistances.length - 1) {
            const segT = d > 0 ? Math.max(0, Math.min(1, (targetDist - accumulated) / d)) : 0
            const pA = pathPoints[k]
            const pB = pathPoints[k + 1]
            currentLat = pA[0] + (pB[0] - pA[0]) * segT
            currentLng = pA[1] + (pB[1] - pA[1]) * segT

            // Exact tangent road angle of the current segment
            const dy = pB[0] - pA[0]
            const dx = Math.cos(Math.PI / 180 * pA[0]) * (pB[1] - pA[1])
            if (Math.hypot(dy, dx) > 0.00001) {
              let angle = Math.atan2(dy, dx) * 180 / Math.PI
              let h = 90 - angle
              if (h < 0) h += 360
              segHeading = Math.round(h)
            }
            break
          }
          accumulated += d
        }
      } else {
        currentLat = startLat + (targetLat - startLat) * progress
        currentLng = startLng + (targetLng - startLng) * progress
      }

      marker.setLatLng([currentLat, currentLng])

      // Rotate DOM elements smoothly to match road curve angle
      if (segHeading !== null) {
        const el = marker.getElement()
        if (el) {
          const rotateWrapper = el.querySelector('.rotate-wrapper')
          if (rotateWrapper) {
            rotateWrapper.style.transform = `rotate(${segHeading}deg)`
          }
        }
        if (tripId === selectedTripId) {
          setCurrentHeading(segHeading)
        }
      }

      if (progress < 1) {
        markerAnimationsRef.current[tripId] = requestAnimationFrame(step)
      }
    }

    if (markerAnimationsRef.current[tripId]) {
      cancelAnimationFrame(markerAnimationsRef.current[tripId])
    }
    markerAnimationsRef.current[tripId] = requestAnimationFrame(step)
  }

  // 3. Update Vehicle Markers on Leaflet Map dynamically
  useEffect(() => {
    if (!mapInstance) return

    let tripsToRender = []
    if (selectedTripId) {
      const activeMatch = activeTrips.find(t => t.trip_id === selectedTripId)
      if (activeMatch) {
        tripsToRender = [activeMatch]
      } else if (selectedStaticTrip && selectedStaticTrip.trip_id === selectedTripId) {
        tripsToRender = [selectedStaticTrip]
      }
    } else {
      tripsToRender = activeTrips.filter(t => t.status === 'In Transit')
    }

    const currentTripIds = new Set(tripsToRender.map(t => t.trip_id))

    // Remove markers of completed/deleted trips
    Object.keys(vehicleMarkersRef.current).forEach((tripId) => {
      if (!currentTripIds.has(tripId)) {
        if (markerAnimationsRef.current[tripId]) {
          cancelAnimationFrame(markerAnimationsRef.current[tripId])
          delete markerAnimationsRef.current[tripId]
        }
        vehicleMarkersRef.current[tripId].remove()
        delete vehicleMarkersRef.current[tripId]
      }
    })

    const createTruckIcon = (trip) => {
      const isMoving = trip.status === 'In Transit'
      const isCompleted = trip.status === 'Completed' || (trip.distance_remaining !== undefined && trip.distance_remaining <= 0.05)
      const initialHeading = getInitialHeading(trip.route_coords)
      const etaMins = trip.eta_seconds ? Math.ceil(trip.eta_seconds / 60) : 5

      // Top-down commercial container truck vector SVG with high-tech cyan/blue chassis
      const topDownTruckSvg = `
        <svg width="32" height="64" viewBox="0 0 100 210" fill="none" xmlns="http://www.w3.org/2000/svg" class="drop-shadow-[0_8px_16px_rgba(14,165,233,0.55)]">
          <!-- Undercarriage Wheels -->
          <rect x="5" y="46" width="10" height="24" rx="3" fill="#0f172a" />
          <rect x="85" y="46" width="10" height="24" rx="3" fill="#0f172a" />
          <rect x="5" y="152" width="10" height="28" rx="3" fill="#0f172a" />
          <rect x="85" y="152" width="10" height="28" rx="3" fill="#0f172a" />

          <!-- Side Mirrors -->
          <path d="M12 44 C5 44 3 50 3 55 L14 55 Z" fill="#1e293b" />
          <path d="M88 44 C95 44 97 50 97 55 L86 55 Z" fill="#1e293b" />
          <path d="M12 46 L5 47 L5 53 L12 53 Z" fill="#0284c7" />
          <path d="M88 46 L95 47 L95 53 L88 53 Z" fill="#0284c7" />

          <!-- Cargo Container Box (Trailer) -->
          <rect x="12" y="70" width="76" height="126" rx="4" fill="#1e293b" />
          <rect x="14" y="72" width="72" height="122" rx="3" fill="#334155" />
          <rect x="18" y="76" width="64" height="114" rx="2" fill="#0f172a" />
          
          <!-- Cargo Roof Lighting & Gradient Shading -->
          <path d="M22 78 L52 78 L46 188 L22 188 Z" fill="#0ea5e9" fill-opacity="0.3" />
          <text x="50" y="140" font-family="monospace" font-size="16" font-weight="900" fill="#ffffff" text-anchor="middle" transform="rotate(-90 50 140)" letter-spacing="2">FLEETFLOW</text>
          
          <!-- Container Corner Brackets -->
          <rect x="12" y="70" width="9" height="9" fill="#0ea5e9" />
          <rect x="79" y="70" width="9" height="9" fill="#0ea5e9" />
          <rect x="12" y="187" width="9" height="9" fill="#0ea5e9" />
          <rect x="79" y="187" width="9" height="9" fill="#0ea5e9" />

          <!-- Amber Clearance Lights -->
          <circle cx="10" cy="80" r="2.5" fill="#f59e0b" />
          <circle cx="90" cy="80" r="2.5" fill="#f59e0b" />
          <circle cx="10" cy="180" r="2.5" fill="#f59e0b" />
          <circle cx="90" cy="180" r="2.5" fill="#f59e0b" />

          <!-- Rear Bumper & Taillights -->
          <rect x="12" y="196" width="76" height="6" rx="2" fill="#0f172a" />
          <rect x="16" y="197.5" width="14" height="3" rx="1" fill="#ef4444" />
          <rect x="70" y="197.5" width="14" height="3" rx="1" fill="#ef4444" />

          <!-- Cabin Body (Modern Electric Blue) -->
          <path d="M14 36 C14 16 26 6 50 6 C74 6 86 16 86 36 L86 68 L14 68 Z" fill="#0369a1" />
          <path d="M16 36 C16 18 28 8 50 8 C72 8 84 18 84 36 L84 66 L16 66 Z" fill="#0ea5e9" />
          
          <!-- Cabin Roof Top Air Spoiler / Deflector with Chevrons -->
          <path d="M26 12 C34 8 42 6 50 6 C58 6 66 8 74 12 L70 24 C64 20 58 18 50 18 C42 18 36 20 30 24 Z" fill="#0f172a" />
          <path d="M44 14 L50 9 L56 14" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M44 18 L50 13 L56 18" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />

          <!-- Windshield & Glass -->
          <path d="M20 36 C22 24 32 18 50 18 C68 18 78 24 80 36 L78 48 L22 48 Z" fill="#0f172a" />
          <path d="M24 36 C26 26 34 21 50 21 C66 21 74 26 76 36 L74 46 L26 46 Z" fill="#38bdf8" fill-opacity="0.85" />
          
          <!-- Headlights (Neon Golden Glow) -->
          <ellipse cx="24" cy="18" rx="6" ry="4" transform="rotate(-15 24 18)" fill="#fef08a" />
          <ellipse cx="76" cy="18" rx="6" ry="4" transform="rotate(15 76 18)" fill="#fef08a" />
        </svg>
      `

      return L.divIcon({
        html: `
          <div class="relative flex items-center justify-center select-none" style="width: 72px; height: 90px;">
            <!-- Floating Live Status Badge above truck -->
            <div class="absolute -top-3 left-1/2 -translate-x-1/2 pointer-events-none z-10">
              ${isCompleted ? `
                <div class="bg-emerald-600 text-white font-bold px-2.5 py-0.5 rounded-full text-[9px] shadow-[0_0_12px_rgba(16,185,129,0.7)] whitespace-nowrap border border-white/40 flex items-center gap-1 font-mono animate-bounce">
                  <span>✓ ARRIVED AT DOCK</span>
                </div>
              ` : `
                <div class="bg-black/90 text-white font-bold px-2.5 py-0.5 rounded-full text-[9px] shadow-[0_0_15px_rgba(14,165,233,0.5)] whitespace-nowrap border border-cyan-500/60 flex items-center gap-1.5 font-mono backdrop-blur-md">
                  <span class="w-1.5 h-1.5 rounded-full ${isMoving ? 'bg-cyan-400 animate-ping' : 'bg-white/40'}"></span>
                  <span class="eta-badge-text text-cyan-300 font-black">${trip.distance_remaining ? `${trip.distance_remaining} km • ` : ''}${etaMins} min</span>
                </div>
              `}
            </div>
            <!-- Top-down truck wrapper with Heading Rotation -->
            <div class="rotate-wrapper relative flex items-center justify-center transition-transform duration-300" style="transform: rotate(${initialHeading}deg); transform-origin: center center;">
              ${isMoving ? '<div class="absolute -inset-2 rounded-full bg-cyan-500/25 blur-sm animate-pulse"></div>' : ''}
              ${topDownTruckSvg}
            </div>
          </div>
        `,
        className: '',
        iconSize: [72, 90],
        iconAnchor: [36, 45]
      })
    }

    // Add or update active vehicle markers
    tripsToRender.forEach((trip) => {
      const { trip_id, license_plate } = trip
      
      let lat = trip.lat
      let lng = trip.lng
      
      const isFinished = trip.status === 'Completed' || trip.status === 'Delivered' || (trip.distance_remaining !== undefined && trip.distance_remaining <= 0.05)
      
      // Ensure robust coordinate alignment along the route path
      if (trip.route_coords && trip.route_coords.length > 0) {
        if (isFinished) {
          lat = trip.route_coords[trip.route_coords.length - 1][0]
          lng = trip.route_coords[trip.route_coords.length - 1][1]
        } else if (trip.status === 'Scheduled') {
          lat = trip.route_coords[0][0]
          lng = trip.route_coords[0][1]
        } else if (!lat || !lng || (trip.route_coords[0][0] > 0 && lat < 0) || (trip.route_coords[0][1] > 0 && lng < 0)) {
          lat = trip.route_coords[0][0]
          lng = trip.route_coords[0][1]
        }
      }
      
      if (lat && lng) {
        const truckTrip = { ...trip, lat, lng }
        const truckIcon = createTruckIcon(truckTrip)
        if (vehicleMarkersRef.current[trip_id]) {
          const marker = vehicleMarkersRef.current[trip_id]
          if (marker._lastStatus !== trip.status) {
            marker.setIcon(truckIcon)
            marker._lastStatus = trip.status
          }
          marker.setZIndexOffset(1000)
          animateMarkerTo(trip_id, marker, lat, lng, trip)
        } else {
          const vehicleMarker = L.marker([lat, lng], {
            icon: truckIcon,
            zIndexOffset: 1000
          }).addTo(mapInstance)
          vehicleMarker._lastStatus = trip.status

          vehicleMarker.bindTooltip(`<span class="font-mono text-xs font-black text-slate-900">${license_plate}</span>`, {
            permanent: false,
            direction: 'right'
          })

          vehicleMarkersRef.current[trip_id] = vehicleMarker
        }
      }
    })
  }, [mapInstance, activeTrips, selectedStaticTrip, selectedTripId])

  // 4. Draw Multi-Layer Glowing Neon Polyline, Checkpoints, CCTV nodes, and Pins
  useEffect(() => {
    if (!mapInstance || !activeRoutesGroupRef.current) return

    activeRoutesGroupRef.current.clearLayers()

    // 1. Draw non-selected active trips (translucent slate)
    activeTrips.forEach((trip) => {
      if (trip.trip_id === selectedTripId) return
      if (trip.route_coords && trip.route_coords.length > 0) {
        L.polyline(trip.route_coords, {
          color: '#64748b',
          weight: 3,
          opacity: 0.4,
          lineJoin: 'round'
        }).addTo(activeRoutesGroupRef.current)
      }
    })

    // 2. Draw selected trip corridor with Multi-Layer Glowing Neon Blue Laser Beam (Adjusted for Dark & Light Mode)
    const selectedTrip = activeTrips.find((t) => t.trip_id === selectedTripId) || (selectedStaticTrip && selectedStaticTrip.trip_id === selectedTripId ? selectedStaticTrip : null)
    if (selectedTrip && selectedTrip.route_coords && selectedTrip.route_coords.length > 0) {
      const coords = selectedTrip.route_coords
      const totalPoints = coords.length

      // LAYER 1: Wide Glowing Aura / Neon Halo (Cyan in Dark Mode, Sky Blue in Light Mode)
      L.polyline(coords, {
        color: isDark ? '#00f0ff' : '#0284c7',
        weight: 14,
        opacity: isDark ? 0.35 : 0.25,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(activeRoutesGroupRef.current)

      // LAYER 2: Mid Laser Beam (Vibrant Cyan/Blue in Dark, Royal Azure in Light)
      L.polyline(coords, {
        color: isDark ? '#38bdf8' : '#2563eb',
        weight: 7,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(activeRoutesGroupRef.current)

      // LAYER 3: Bright Core Beam (Pure White in Dark Mode, Deep Sapphire Blue in Light Mode)
      const corePolyline = L.polyline(coords, {
        color: isDark ? '#ffffff' : '#1d4ed8',
        weight: 2.5,
        opacity: 1.0,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(activeRoutesGroupRef.current)

      // 3. Render 5 Strategic Logistics Corridor Checkpoints
      const checkpointIndices = [
        Math.floor(totalPoints * 0.15),
        Math.floor(totalPoints * 0.35),
        Math.floor(totalPoints * 0.55),
        Math.floor(totalPoints * 0.75),
        Math.min(totalPoints - 1, Math.floor(totalPoints * 0.95))
      ]

      const checkpointLabels = [
        '1. TOLL PLAZA KM 142 (FASTAG)',
        '2. HIGHWAY INTERCHANGE 16',
        '3. WEIGH STATION CLEARANCE',
        '4. FREIGHT JUNCTION 4',
        '5. CENTRAL RECEIVING YARD'
      ]

      checkpointIndices.forEach((idx, cIdx) => {
        if (coords[idx]) {
          const pt = coords[idx]
          const isPassed = cIdx < 2
          const isCurrent = cIdx === 2
          const pinColor = isPassed ? '#22c55e' : (isCurrent ? '#06b6d4' : (isDark ? '#e2e8f0' : '#334155'))
          const pinBg = isDark ? '#020617' : '#ffffff'

          const cpIcon = L.divIcon({
            html: `
              <div class="relative flex items-center justify-center select-none cursor-pointer group" style="width: 28px; height: 28px;">
                <div class="absolute inset-0 rounded-full ${isCurrent ? 'bg-cyan-500/40 animate-ping' : ''}"></div>
                <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-lg font-mono text-[10px] font-black" style="background-color: ${pinBg}; border-color: ${pinColor}; color: ${pinColor};">
                  ${cIdx + 1}
                </div>
              </div>
            `,
            className: '',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          })

          const cpMarker = L.marker(pt, { icon: cpIcon }).addTo(activeRoutesGroupRef.current)
          cpMarker.bindTooltip(`<span class="font-mono text-xs font-black">${checkpointLabels[cIdx]}</span>`, {
            direction: 'top',
            offset: [0, -12]
          })
          cpMarker.on('click', () => {
            setActiveCheckpointIndex(cIdx)
            if (audioEnabled) playDispatchAudio('chime')
            mapInstance.flyTo(pt, 16, { animate: true, duration: 1.2 })
          })
        }
      })

      // 4. Pickup Marker (Origin Green Beacon)
      const pickupIcon = L.divIcon({
        html: `
          <div class="relative flex flex-col items-center select-none" style="filter: drop-shadow(0 4px 10px rgba(0,0,0,0.4));">
            <div class="${isDark ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50' : 'bg-emerald-50 text-emerald-800 border-emerald-400'} font-mono font-black px-2 py-0.5 rounded text-[10px] shadow-md border whitespace-nowrap mb-1">
              ORIGIN DEPOT
            </div>
            <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 0C6.27 0 0 6.27 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.27 21.73 0 14 0Z" fill="#22c55e" stroke="#ffffff" stroke-width="2"/>
              <circle cx="14" cy="14" r="5" fill="#ffffff"/>
            </svg>
          </div>
        `,
        className: '',
        iconSize: [64, 70],
        iconAnchor: [32, 68]
      })
      L.marker(coords[0], { icon: pickupIcon }).addTo(activeRoutesGroupRef.current)

      // 5. Destination Marker (Glowing Receiving Dock Beacon)
      const isReached = selectedTrip.status === 'Completed' || (selectedTrip.distance_remaining !== undefined && selectedTrip.distance_remaining <= 0.05)
      const destIcon = L.divIcon({
        html: `
          <div class="relative flex flex-col items-center select-none transition-all duration-500 ${isReached ? 'opacity-20 pointer-events-none scale-90' : 'opacity-100'}" style="filter: drop-shadow(0 4px 12px rgba(14,165,233,0.6));">
            <div class="${isDark ? 'bg-sky-950 text-sky-300 border-sky-500/50' : 'bg-sky-50 text-sky-800 border-sky-400'} font-mono font-black px-2 py-0.5 rounded text-[10px] shadow-md border whitespace-nowrap mb-1 animate-pulse">
              RECEIVING DOCK
            </div>
            <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 0C6.27 0 0 6.27 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.27 21.73 0 14 0Z" fill="${isDark ? '#00f0ff' : '#0284c7'}" stroke="#ffffff" stroke-width="2"/>
              <circle cx="14" cy="14" r="5" fill="#ffffff"/>
            </svg>
          </div>
        `,
        className: '',
        iconSize: [72, 70],
        iconAnchor: [36, 68]
      })
      L.marker(coords[coords.length - 1], { icon: destIcon, zIndexOffset: isReached ? 0 : 500 }).addTo(activeRoutesGroupRef.current)

      // Auto-fit bounds ONCE when selectedTripId changes
      if (lastFittedTripIdRef.current !== selectedTripId) {
        lastFittedTripIdRef.current = selectedTripId
        setIsFollowMode(true)
        mapInstance.fitBounds(corePolyline.getBounds(), { padding: [60, 60] })
        
        const focus = getFocusCoordinates(selectedTrip)
        const targetCoords = focus?.coords || (coords && coords.length > 0 ? (isReached ? coords[coords.length - 1] : coords[0]) : [16.3067, 80.4365])
        const zoomLevel = focus?.zoom || (isReached ? 17 : 16)
        
        const timer = setTimeout(() => {
          mapInstance.setView(targetCoords, zoomLevel, { animate: true })
        }, 1500)
        
        return () => clearTimeout(timer)
      } else if (isReached) {
        const destCoords = coords[coords.length - 1]
        mapInstance.setView(destCoords, 17, { animate: true })
      }
    } else if (activeTrips.length > 0) {
      const allCoords = activeTrips.flatMap((t) => t.route_coords || [])
      if (allCoords.length > 0) {
        const tempPoly = L.polyline(allCoords)
        mapInstance.fitBounds(tempPoly.getBounds(), { padding: [50, 50] })
      }
    }
  }, [mapInstance, activeTrips, selectedTripId, selectedStaticTrip, isDark, audioEnabled, getFocusCoordinates])

  const formatEta = (seconds) => {
    if (seconds <= 0) return 'ARRIVED'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} MINS`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}H ${mins}M`
  }

  const formatCountdown = (totalSecs) => {
    if (!totalSecs || totalSecs <= 0) return '00 MIN 00 SEC'
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    const mStr = String(mins).padStart(2, '0')
    const sStr = String(secs).padStart(2, '0')
    return `${mStr} MIN ${sStr} SEC`
  }

  const formatCargo = (cargoStr) => {
    if (!cargoStr) return 'GENERAL FREIGHT'
    if (cargoStr.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(cargoStr)
        return parsed.desc || 'MANIFEST CARGO'
      } catch (e) {}
    }
    return cargoStr
  }

  const selectedTrip = activeTrips.find((t) => t.trip_id === selectedTripId) || (selectedStaticTrip && selectedStaticTrip.trip_id === selectedTripId ? selectedStaticTrip : null)

  // State checks for completed trip and role permissions
  const isTripCompleted = selectedTrip?.status === 'Completed' || selectedTrip?.status === 'Delivered' || (selectedTrip?.distance_remaining !== undefined && selectedTrip?.distance_remaining <= 0.05)
  const canModifyRoute = canControlRoute && !isTripCompleted

  // Compute live values matching reference picture
  const tripIdDisplay = selectedTrip?.trip_id 
    ? `FF-${selectedTrip.trip_id.slice(0, 8).toUpperCase()}` 
    : (activeTrips[0]?.trip_id ? `FF-${activeTrips[0].trip_id.slice(0, 8).toUpperCase()}` : 'FF-13B97CB4')
  
  const currentActiveStrategy = selectedStrategy || selectedTrip?.route_type || 'Shortest'
  const activeStrategyObj = strategies.find(s => s.id.toLowerCase() === currentActiveStrategy.toLowerCase()) || strategies[1]

  // Dynamic traffic density calculations based on active AI route strategy and trip status
  const trafficData = useMemo(() => {
    if (isTripCompleted) {
      return {
        levelBadge: 'COMPLETED • DESTINATION REACHED',
        badgeColor: isDark ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' : 'bg-emerald-50 border-emerald-400 text-emerald-700',
        speed: '0 KM/H',
        speedSaved: 'Delivered at Terminal',
        speedColor: 'text-emerald-600 dark:text-emerald-400',
        delay: '0 MIN',
        delayDesc: 'Dock Bay Locked',
        delayColor: 'text-emerald-600 dark:text-emerald-400',
        efficiency: '100%',
        redPath: 'M 0,80 Q 60,80 120,80 T 240,80',
        greenPathArea: 'M 0,40 Q 60,40 120,40 T 240,40 L 240,90 L 0,90 Z',
        greenPathLine: 'M 0,40 Q 60,40 120,40 T 240,40',
        liveDot: { cx: 220, cy: 40 },
        dotColor: '#10b981'
      }
    }

    const stratKey = (currentActiveStrategy || '').toLowerCase()

    if (stratKey.includes('avoid') || stratKey.includes('clear')) {
      return {
        levelBadge: 'CLEAR CORRIDOR • 94% FLOW EFFICIENCY',
        badgeColor: isDark ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' : 'bg-emerald-50 border-emerald-400 text-emerald-700',
        speed: '68 KM/H',
        speedSaved: '+26 km/h vs congested',
        speedColor: 'text-emerald-600 dark:text-emerald-400',
        delay: '0 MIN',
        delayDesc: 'Zero Congestion (Bypassed)',
        delayColor: 'text-emerald-600 dark:text-emerald-400',
        efficiency: '94%',
        redPath: 'M 0,82 Q 40,80 80,75 T 160,78 T 240,74',
        greenPathArea: 'M 0,26 Q 50,10 100,18 T 180,12 T 240,8 L 240,90 L 0,90 Z',
        greenPathLine: 'M 0,26 Q 50,10 100,18 T 180,12 T 240,8',
        liveDot: { cx: 215, cy: 10 },
        dotColor: '#22c55e'
      }
    } else if (stratKey.includes('fast')) {
      return {
        levelBadge: 'HIGHWAY EXPRESS • 86% FLOW EFFICIENCY',
        badgeColor: isDark ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300' : 'bg-cyan-50 border-cyan-400 text-cyan-700',
        speed: '58 KM/H',
        speedSaved: '+16 km/h saved via express lanes',
        speedColor: 'text-emerald-600 dark:text-emerald-400',
        delay: '2 MIN',
        delayDesc: 'Minor Interchange Lag',
        delayColor: 'text-cyan-600 dark:text-cyan-400',
        efficiency: '86%',
        redPath: 'M 0,65 Q 40,75 80,45 T 160,50 T 240,32',
        greenPathArea: 'M 0,35 Q 50,15 100,28 T 180,18 T 240,14 L 240,90 L 0,90 Z',
        greenPathLine: 'M 0,35 Q 50,15 100,28 T 180,18 T 240,14',
        liveDot: { cx: 210, cy: 14 },
        dotColor: '#06b6d4'
      }
    } else if (stratKey.includes('fuel') || stratKey.includes('eco')) {
      return {
        levelBadge: 'ECO CRUISE • 89% FLOW EFFICIENCY',
        badgeColor: isDark ? 'bg-teal-950/80 border-teal-500/50 text-teal-300' : 'bg-teal-50 border-teal-400 text-teal-700',
        speed: '52 KM/H',
        speedSaved: 'Optimal RPM & -14% Fuel Burn',
        speedColor: 'text-teal-600 dark:text-teal-400',
        delay: '1 MIN',
        delayDesc: 'Steady Constant Cruise',
        delayColor: 'text-teal-600 dark:text-teal-400',
        efficiency: '89%',
        redPath: 'M 0,72 Q 40,68 80,60 T 160,62 T 240,58',
        greenPathArea: 'M 0,38 Q 50,22 100,32 T 180,24 T 240,18 L 240,90 L 0,90 Z',
        greenPathLine: 'M 0,38 Q 50,22 100,32 T 180,24 T 240,18',
        liveDot: { cx: 210, cy: 20 },
        dotColor: '#14b8a6'
      }
    } else {
      // Default: Shortest / Dense route
      return {
        levelBadge: 'DENSE URBAN DENSITY • 62% FLOW EFFICIENCY',
        badgeColor: isDark ? 'bg-amber-950/80 border-amber-500/50 text-amber-300' : 'bg-amber-50 border-amber-400 text-amber-700',
        speed: '38 KM/H',
        speedSaved: '+4 km/h bottleneck slowdown',
        speedColor: 'text-amber-600 dark:text-amber-400',
        delay: '5 MIN',
        delayDesc: 'Urban Signal Congestion',
        delayColor: 'text-rose-600 dark:text-rose-400',
        efficiency: '62%',
        redPath: 'M 0,75 Q 40,85 80,28 T 160,24 T 240,42',
        greenPathArea: 'M 0,55 Q 50,45 100,48 T 180,42 T 240,38 L 240,90 L 0,90 Z',
        greenPathLine: 'M 0,55 Q 50,45 100,48 T 180,42 T 240,38',
        liveDot: { cx: 205, cy: 38 },
        dotColor: '#f59e0b'
      }
    }
  }, [currentActiveStrategy, isTripCompleted, isDark])

  const hudLat = (() => {
    let lat = selectedTrip?.lat
    if (selectedTrip?.route_coords && selectedTrip.route_coords.length > 0) {
      if (isTripCompleted) {
        lat = selectedTrip.route_coords[selectedTrip.route_coords.length - 1][0]
      } else if (selectedTrip.status === 'Scheduled') {
        lat = selectedTrip.route_coords[0][0]
      }
    }
    return (lat !== undefined ? lat : 16.3067).toFixed(4)
  })()

  const hudLng = (() => {
    let lng = selectedTrip?.lng
    if (selectedTrip?.route_coords && selectedTrip.route_coords.length > 0) {
      if (isTripCompleted) {
        lng = selectedTrip.route_coords[selectedTrip.route_coords.length - 1][1]
      } else if (selectedTrip.status === 'Scheduled') {
        lng = selectedTrip.route_coords[0][1]
      }
    }
    return (lng !== undefined ? lng : 80.4365).toFixed(4)
  })()

  const hudSpeed = isTripCompleted ? '0 km/h' : (selectedTrip?.status === 'In Transit' 
    ? `${55 + Math.floor(Math.sin(Date.now() / 3500) * 6)} km/h` 
    : '0 km/h')

  const hudDist = isTripCompleted 
    ? '0.0 KM (REACHED)' 
    : `${selectedTrip?.distance_remaining !== undefined ? selectedTrip.distance_remaining : 1.8} KM`

  const hudEta = (() => {
    if (isTripCompleted) return 'ARRIVED'
    const totalSecs = selectedTrip?.eta_seconds || countdownRemaining || 252
    const targetDate = new Date(Date.now() + totalSecs * 1000)
    return targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  })()

  // 5 Strategic Logistics Corridor Checkpoints
  const CHECKPOINTS_DATA = [
    {
      id: 1,
      name: 'TOLL PLAZA KM 142',
      detail: 'GATE 4 (FASTAG DEDICATED)',
      dist: '0.4 KM',
      signal: 'GREEN',
      badge: 'AI ROUTE CLEARED',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    },
    {
      id: 2,
      name: 'HIGHWAY INTERCHANGE 16',
      detail: 'CORRIDOR LANE ASSIGNED',
      dist: '1.8 KM',
      signal: 'GREEN',
      badge: 'SIGNAL SYNCHRONIZED',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
    },
    {
      id: 3,
      name: 'RIVER EXPRESSWAY WEIGH STATION',
      detail: 'PRE-WEIGH PASS ACTIVE',
      dist: '3.2 KM',
      signal: 'GREEN',
      badge: 'PRIORITY CLEAR',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    },
    {
      id: 4,
      name: 'URBAN FREIGHT JUNCTION 4',
      detail: 'SMART TRAFFIC PRIORITY',
      dist: '4.5 KM',
      signal: 'AMBER',
      badge: 'SIGNAL HOLD 30S',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    },
    {
      id: 5,
      name: 'CENTRAL HUB RECEIVING YARD',
      detail: 'DOCK BAY 4 RESERVED',
      dist: '5.9 KM',
      signal: 'RED',
      badge: 'APPROACH READY',
      badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30'
    }
  ]

  return (
    <div className="space-y-5 animate-fade-in relative z-10 font-sans">
      
      {/* ========================================================================= */}
      {/* 1. TOP DISPATCH HEADER BAR (AI FLEET TRANSIT CORRIDOR)                     */}
      {/* ========================================================================= */}
      <div className={`p-4 sm:p-5 rounded-[24px] border shadow-2xl transition-all ${
        isDark 
          ? 'bg-[#090d16]/95 border-red-950/60 shadow-[0_0_40px_rgba(239,68,68,0.12)]' 
          : 'bg-white border-slate-200/90 shadow-[0_10px_30px_rgba(0,0,0,0.06)]'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left: Title & Priority Corridor Beacon */}
          <div className="flex items-center gap-3.5 flex-wrap">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white shadow-[0_0_20px_rgba(239,68,68,0.6)] shrink-0">
              <span className="text-lg animate-pulse">📡</span>
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className={`text-base sm:text-lg font-black font-mono tracking-wider m-0 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  AI FLEET TRANSIT DISPATCH
                </h1>
                
                {/* Glowing Red Dispatch Status Badge */}
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-mono text-[10px] font-black border transition-all ${
                  isDark 
                    ? 'bg-red-950/80 border-red-500/60 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.35)]' 
                    : 'bg-red-50 border-red-400 text-red-700 shadow-sm'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                  <span>DISPATCH STATUS: ACTIVE - PRIORITY CORRIDOR</span>
                </div>
              </div>
              <p className={`text-[11px] font-mono mt-0.5 m-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                CENTRAL FREIGHT COMMAND • REAL-TIME SIGNAL & DOCK CLEARANCE
              </p>
            </div>
          </div>

          {/* Right: Interactive Controls (Vehicle Selector, Sound, Recalculate, Ping) */}
          <div className="flex items-center gap-2.5 flex-wrap">
            
            {/* Vehicle / Trip Selector */}
            <select
              value={selectedTripId || ''}
              onChange={(e) => setSelectedTripId(e.target.value || null)}
              className={`px-3 py-2 rounded-xl text-xs font-mono font-bold outline-none cursor-pointer border transition-all shadow-sm ${
                isDark 
                  ? 'bg-slate-900/90 border-slate-700/80 text-white focus:border-red-500' 
                  : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-red-500'
              }`}
            >
              <option value="">[ SELECT FLEET VEHICLE ]</option>
              {allTrips.map((trip) => {
                const shortId = trip.trip_id ? trip.trip_id.slice(0, 8).toUpperCase() : 'MOCK'
                return (
                  <option key={trip.trip_id} value={trip.trip_id}>
                    FF-{shortId} ({trip.start_location} → {trip.destination}) [{trip.status}]
                  </option>
                )
              })}
            </select>

            {/* Audio Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setAudioEnabled(!audioEnabled)
                if (!audioEnabled) playDispatchAudio('chime')
                addToast(audioEnabled ? '🔇 Dispatch audio alerts muted' : '🔊 Dispatch audio alerts enabled', 'info', 'top-right')
              }}
              className={`p-2 rounded-xl border font-mono text-xs transition-all cursor-pointer ${
                audioEnabled 
                  ? isDark 
                    ? 'bg-red-500/10 border-red-500/40 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]' 
                    : 'bg-red-50 border-red-300 text-red-600 shadow-sm'
                  : isDark ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-300 text-slate-400'
              }`}
              title={audioEnabled ? 'Mute audio alerts' : 'Enable audio alerts'}
            >
              <span>{audioEnabled ? '🔊' : '🔇'}</span>
            </button>

            {/* Recalculate Route (Admin / Fleet Manager) */}
            {canControlRoute && !isTripCompleted && (
              <button
                type="button"
                onClick={handleRecalculateRoute}
                disabled={isRecalculating}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-mono text-xs font-black shadow-[0_0_20px_rgba(239,68,68,0.4)] flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
              >
                <span className={isRecalculating ? 'animate-spin' : ''}>⚙️</span>
                <span>{isRecalculating ? 'OPTIMIZING...' : 'OPTIMIZE'}</span>
              </button>
            )}

            {/* GPS Telemetry Ping Trigger */}
            <button
              type="button"
              onClick={triggerPingSimulation}
              disabled={isSimulatingPing}
              className={`px-3 py-2 rounded-xl font-mono text-xs font-black border transition-all cursor-pointer select-none ${
                isSimulatingPing
                  ? isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-200 border-slate-300 text-slate-500'
                  : isDark 
                    ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.25)]' 
                    : 'bg-cyan-50 border-cyan-400 text-cyan-800 hover:bg-cyan-100 shadow-sm'
              }`}
            >
              <span>{isSimulatingPing ? 'PINGING...' : 'PING ⚡'}</span>
            </button>

            {/* Dispatcher Pill */}
            <div className={`hidden xl:flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-mono font-bold ${
              isDark ? 'bg-slate-900/90 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-300 text-slate-700'
            }`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>OP-702 COMMAND</span>
            </div>

          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN 3-COLUMN COMMAND CENTER LAYOUT                                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ----------------------------------------------------------------------- */}
        {/* LEFT COLUMN: UPCOMING CHECKPOINTS & TRAFFIC DENSITY TRENDS (3 COLS)    */}
        {/* ----------------------------------------------------------------------- */}
        <div className="lg:col-span-3 space-y-5">
          
          {/* Card 1: Upcoming Checkpoints & Junctions */}
          <div className={`p-4 rounded-[24px] border shadow-2xl space-y-3.5 transition-all ${
            isDark 
              ? 'bg-[#090d16]/95 border-slate-800/90 shadow-[0_0_30px_rgba(0,0,0,0.5)]' 
              : 'bg-white border-slate-200/90 shadow-sm'
          }`}>
            <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-slate-800/80' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2">
                <span className="text-red-500 text-sm">🚦</span>
                <h3 className={`text-xs font-black font-mono tracking-wider m-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  UPCOMING CHECKPOINTS
                </h3>
              </div>
              <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded border ${
                isDark ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-300 text-emerald-700'
              }`}>
                5 ACTIVE
              </span>
            </div>

            {/* Checkpoint List with 3-Lamp Traffic Signal Lights */}
            <div className="space-y-2.5">
              {CHECKPOINTS_DATA.map((cp, idx) => {
                const isActive = activeCheckpointIndex === idx
                return (
                  <div
                    key={cp.id}
                    onClick={() => {
                      setActiveCheckpointIndex(idx)
                      if (audioEnabled) playDispatchAudio('chime')
                      const coords = selectedTrip?.route_coords
                      if (coords && coords.length > 0) {
                        const targetIdx = Math.min(coords.length - 1, Math.floor(coords.length * (idx * 0.2 + 0.15)))
                        mapInstance?.flyTo(coords[targetIdx], 16, { animate: true, duration: 1.2 })
                      }
                    }}
                    className={`p-2.5 rounded-2xl border transition-all cursor-pointer select-none relative overflow-hidden ${
                      isActive 
                        ? isDark 
                          ? 'border-red-500 bg-red-950/30 shadow-[0_0_15px_rgba(239,68,68,0.25)] ring-1 ring-red-400/40' 
                          : 'border-red-500 bg-red-50/90 shadow-md ring-1 ring-red-400/40'
                        : isDark 
                          ? 'border-slate-800/80 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900' 
                          : 'border-slate-200/90 bg-slate-50/80 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      
                      {/* Vertical 3-Lamp Traffic Signal Light Enclosure */}
                      <div className="p-1 rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center gap-1 shrink-0 shadow-inner">
                        {/* Red Lamp */}
                        <div className={`w-2 h-2 rounded-full ${
                          cp.signal === 'RED' 
                            ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)] ring-1 ring-white' 
                            : 'bg-red-950/80'
                        }`}></div>
                        {/* Amber Lamp */}
                        <div className={`w-2 h-2 rounded-full ${
                          cp.signal === 'AMBER' 
                            ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,1)] ring-1 ring-white' 
                            : 'bg-amber-950/80'
                        }`}></div>
                        {/* Green Lamp */}
                        <div className={`w-2 h-2 rounded-full ${
                          cp.signal === 'GREEN' 
                            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,1)] ring-1 ring-white animate-pulse' 
                            : 'bg-emerald-950/80'
                        }`}></div>
                      </div>

                      {/* Checkpoint Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className={`text-[11px] font-black font-mono truncate m-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {cp.name}
                          </h4>
                          <span className={`text-[10px] font-mono font-black shrink-0 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                            {cp.dist}
                          </span>
                        </div>
                        <p className={`text-[10px] font-mono truncate mt-0.5 m-0 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {cp.detail}
                        </p>
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-black border ${
                            cp.signal === 'GREEN'
                              ? isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : cp.signal === 'AMBER'
                                ? isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-300'
                                : isDark ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-red-50 text-red-700 border-red-300'
                          }`}>
                            {cp.badge}
                          </span>
                          <span className={`text-[9px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-500 hover:text-red-600'}`}>
                            FOCUS 🔍
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Card 2: Traffic Density & Telemetry Trends Wave Graph */}
          <div className={`p-4 rounded-[24px] border shadow-2xl space-y-3 transition-all ${
            isDark 
              ? 'bg-[#090d16]/95 border-slate-800/90 shadow-[0_0_30px_rgba(0,0,0,0.5)]' 
              : 'bg-white border-slate-200/90 shadow-sm'
          }`}>
            <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-slate-800/80' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2">
                <span className="text-cyan-500 text-sm">📈</span>
                <h3 className={`text-xs font-black font-mono tracking-wider m-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  TRAFFIC DENSITY TRENDS
                </h3>
              </div>
              <span className={`text-[9px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>CORRIDOR TIMELINE</span>
            </div>

            {/* Dynamic Traffic Density & Efficiency Level Banner */}
            <div className={`px-2.5 py-1 rounded-xl text-[9px] font-mono font-black border flex items-center justify-between transition-all ${trafficData.badgeColor}`}>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                <span>{trafficData.levelBadge}</span>
              </div>
              <span>EFF: {trafficData.efficiency}</span>
            </div>

            {/* Glowing Neon SVG Wave Graph */}
            <div className="w-full h-28 relative rounded-xl overflow-hidden bg-slate-950 p-2 border border-slate-800/90 shadow-inner">
              <svg className="w-full h-full" viewBox="0 0 240 90" fill="none">
                <defs>
                  <linearGradient id="corridorGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="trafficGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                  </linearGradient>
                </defs>
                
                {/* Grid guidelines */}
                <line x1="0" y1="25" x2="240" y2="25" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />
                <line x1="0" y1="55" x2="240" y2="55" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" />
                
                {/* Dynamic Congestion Curve (Red Wave) */}
                <path
                  d={trafficData.redPath}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeOpacity="0.8"
                  className="transition-all duration-700"
                />

                {/* Dynamic Corridor Flow Curve (Green Neon Glow Wave) */}
                <path
                  d={trafficData.greenPathArea}
                  fill="url(#corridorGlow)"
                  className="transition-all duration-700"
                />
                <path
                  d={trafficData.greenPathLine}
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="2.5"
                  className="transition-all duration-700"
                />

                {/* Dynamic Live Position Point */}
                <circle 
                  cx={trafficData.liveDot.cx} 
                  cy={trafficData.liveDot.cy} 
                  r="4" 
                  fill={trafficData.dotColor} 
                  className="animate-ping transition-all duration-700" 
                />
                <circle 
                  cx={trafficData.liveDot.cx} 
                  cy={trafficData.liveDot.cy} 
                  r="3" 
                  fill="#ffffff" 
                  className="transition-all duration-700" 
                />
              </svg>

              {/* Time stamps */}
              <div className="absolute bottom-1 left-3 right-3 flex justify-between text-[8px] font-mono text-slate-400">
                <span>T-30m</span>
                <span>T-20m</span>
                <span>T-10m</span>
                <span className="text-emerald-400 font-bold">NOW</span>
              </div>
            </div>

            {/* Metrics pills */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className={`p-2 rounded-xl border transition-all ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200/90'}`}>
                <span className={`block text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>CORRIDOR SPEED</span>
                <span className={`font-black text-xs ${trafficData.speedColor}`}>{trafficData.speed}</span>
                <span className={`text-[8px] block truncate ${trafficData.speedColor}`}>{trafficData.speedSaved}</span>
              </div>
              <div className={`p-2 rounded-xl border transition-all ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200/90'}`}>
                <span className={`block text-[9px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>CONGESTION DELAY</span>
                <span className={`font-black text-xs ${trafficData.delayColor}`}>{trafficData.delay}</span>
                <span className={`text-[8px] block truncate ${trafficData.delayColor}`}>{trafficData.delayDesc}</span>
              </div>
            </div>

          </div>

        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* CENTER COLUMN: LEAFLET INTERACTIVE MAP VIEW (6 COLS)                    */}
        {/* ----------------------------------------------------------------------- */}
        <div className="lg:col-span-6 space-y-4">
          
          {/* Map Container */}
          <div className={`p-4 sm:p-5 rounded-[28px] border shadow-2xl relative transition-all ${
            isDark 
              ? 'bg-[#090d16]/95 border-slate-800/90 shadow-[0_0_40px_rgba(0,0,0,0.6)]' 
              : 'bg-white border-slate-200/90 shadow-sm'
          }`}>
            
            {/* Top Map HUD Bar */}
            <div className={`flex items-center justify-between pb-3 border-b text-[11px] font-mono ${isDark ? 'border-slate-800/80' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2">
                <span className="text-cyan-500 font-black">●</span>
                <span className={`font-black tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  LIVE TRANSIT CORRIDOR • {tripIdDisplay}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full font-black text-[9px] border ${
                  wsConnected 
                    ? isDark ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40' : 'bg-cyan-50 text-cyan-700 border-cyan-300'
                    : isDark ? 'bg-rose-950 text-rose-300' : 'bg-rose-50 text-rose-700 border-rose-300'
                }`}>
                  {wsConnected ? 'TELEMETRY ONLINE' : 'DISCONNECTED'}
                </span>
              </div>
            </div>

            {/* Leaflet DOM Viewport */}
            <div className="w-full h-[540px] sm:h-[600px] rounded-2xl overflow-hidden relative z-0 mt-3 border border-slate-300 dark:border-slate-800 shadow-inner">
              <div ref={mapContainerRef} className="w-full h-full bg-slate-100 dark:bg-slate-950"></div>

              {/* FLOATING TOP-LEFT: CORRIDOR IDENTIFIER BADGE */}
              <div className="absolute top-4 left-4 z-[400] pointer-events-auto select-none">
                <div className={`px-3 py-1.5 rounded-xl border backdrop-blur-md shadow-xl font-mono text-[10px] font-black flex items-center gap-2 ${
                  isDark ? 'bg-slate-950/90 border-cyan-500/50 text-cyan-300' : 'bg-white/95 border-blue-400 text-blue-700 shadow-md'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                  <span>CORRIDOR #4A - HIGH PRIORITY</span>
                </div>
              </div>

              {/* FLOATING TOP-RIGHT: LIVE GPS TELEMETRY HUD */}
              <div className={`absolute top-4 right-4 z-[400] rounded-2xl p-3.5 border shadow-2xl backdrop-blur-xl font-mono text-xs space-y-1 select-none min-w-[170px] pointer-events-auto transition-all ${
                isDark 
                  ? 'bg-slate-950/90 border-cyan-500/40 text-white shadow-[0_0_30px_rgba(0,0,0,0.8)]' 
                  : 'bg-white/95 border-slate-300 text-slate-900 shadow-xl'
              }`}>
                <div className={`flex items-center gap-2 font-black text-[11px] pb-1 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">LIVE GPS HUD</span>
                </div>
                <div className="space-y-1 pt-1 text-[10px]">
                  <div className="flex justify-between gap-3">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Lat:</span>
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{hudLat}°N</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Lng:</span>
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{hudLng}°E</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Speed:</span>
                    <span className="font-black text-cyan-600 dark:text-cyan-400">{hudSpeed}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Dist:</span>
                    <span className="font-bold text-cyan-600 dark:text-cyan-400">{hudDist}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Bearing:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{getCardinalDirection(currentHeading)}</span>
                  </div>
                </div>
              </div>

              {/* FLOATING BOTTOM-RIGHT: CAMERA & CORRIDOR CONTROLS */}
              <div className="absolute bottom-4 right-4 z-[400] select-none font-mono">
                <div className={`p-1.5 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-1.5 text-[10px] ${
                  isDark 
                    ? 'bg-[#0a1020]/95 border-slate-700/80 shadow-[0_0_30px_rgba(0,0,0,0.8)]' 
                    : 'bg-white/95 border-slate-300 shadow-xl'
                }`}>
                  
                  {/* Recenter / Focus Vehicle / Reached Point */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsFollowMode(true)
                      const targetTrip = activeTrips.find((t) => t.trip_id === selectedTripId) || (activeTrips.length > 0 ? activeTrips[0] : selectedStaticTrip)
                      const focusTarget = getFocusCoordinates(targetTrip)
                      if (focusTarget && focusTarget.coords) {
                        mapInstance?.setView(focusTarget.coords, focusTarget.zoom, { animate: true })
                        if (focusTarget.isReached) {
                          addToast('🎯 RECENTER: Camera locked on reached destination point.', 'success', 'top-right')
                        } else {
                          addToast('🎯 RECENTER: Camera locked on commercial truck.', 'info', 'top-right')
                        }
                      } else if (targetTrip?.lat && targetTrip?.lng) {
                        mapInstance?.setView([targetTrip.lat, targetTrip.lng], 16, { animate: true })
                        addToast('🎯 RECENTER: Camera locked on commercial truck.', 'info', 'top-right')
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      isFollowMode
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                        : isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    title="Lock camera on reached destination point or moving commercial truck"
                  >
                    <span>🎯</span>
                    <span>RECENTER</span>
                  </button>

                  {/* Fit Entire Corridor */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsFollowMode(false)
                      const targetTrip = activeTrips.find((t) => t.trip_id === selectedTripId) || selectedStaticTrip
                      if (targetTrip?.route_coords && targetTrip.route_coords.length > 0) {
                        const polyline = L.polyline(targetTrip.route_coords)
                        mapInstance?.fitBounds(polyline.getBounds(), { padding: [60, 60] })
                      }
                      addToast('🗺️ FIT CORRIDOR: Full freight route displayed.', 'info', 'top-right')
                    }}
                    className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      !isFollowMode
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                        : isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    title="Fit full corridor view"
                  >
                    <span>🗺️</span>
                    <span>FIT CORRIDOR</span>
                  </button>

                  {/* Manual Refresh Map Button */}
                  <button
                    type="button"
                    onClick={handleRefreshMap}
                    disabled={isRefreshing}
                    className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      isRefreshing
                        ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                        : isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    title="Refresh Map & Telemetry Sync"
                  >
                    <span className={isRefreshing ? 'animate-spin' : ''}>🔄</span>
                    <span>{isRefreshing ? 'SYNCING...' : 'REFRESH'}</span>
                  </button>

                </div>
              </div>

            </div>

          </div>

          {/* Route Strategy Selection Bar */}
          <div className={`p-4 rounded-[24px] border shadow-2xl space-y-3 transition-all ${
            isDark ? 'bg-[#090d16]/95 border-slate-800/90' : 'bg-white border-slate-200/90 shadow-sm'
          }`}>
            <div className="flex items-center justify-between text-xs font-mono font-black">
              <span className={isDark ? 'text-red-400' : 'text-red-600'}>⚡ AI ROUTE OPTIMIZATION STRATEGIES</span>
              <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>CORRIDOR SPEED PRIORITY</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {strategies.map((strat) => {
                const isSelected = strat.id.toLowerCase() === currentActiveStrategy.toLowerCase()
                return (
                  <div
                    key={strat.id}
                    onClick={() => canModifyRoute && handleSelectStrategy(strat)}
                    className={`p-2.5 rounded-2xl border transition-all select-none ${
                      canModifyRoute ? 'cursor-pointer' : 'cursor-default'
                    } ${
                      isSelected 
                        ? isDark 
                          ? 'border-red-500 bg-red-950/40 shadow-[0_0_15px_rgba(239,68,68,0.3)] ring-1 ring-red-400/40 text-red-300' 
                          : 'border-red-500 bg-red-50 text-red-700 shadow-sm'
                        : isDark ? 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <h5 className={`text-[11px] font-black font-mono truncate m-0 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>{strat.name}</h5>
                    <div className={`text-xs font-mono font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>{strat.distance} km</div>
                    <div className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">{strat.delay}</div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* RIGHT COLUMN: ESTIMATED ARRIVAL, HUB CARD, PROGRESS & TELEMETRY (3 COLS) */}
        {/* ----------------------------------------------------------------------- */}
        <div className="lg:col-span-3 space-y-5">
          
          {/* Card 1: Estimated Arrival (Giant Glowing Digital Display) */}
          <div className={`p-4 sm:p-5 rounded-[24px] border shadow-2xl text-center space-y-3 transition-all relative overflow-hidden ${
            isDark 
              ? 'bg-[#090d16]/95 border-red-900/60 shadow-[0_0_35px_rgba(239,68,68,0.2)]' 
              : 'bg-white border-red-200/90 shadow-sm'
          }`}>
            <div className={`text-[10px] font-mono font-black tracking-widest uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              ESTIMATED ARRIVAL (ETA)
            </div>

            {/* Giant Glowing Digital Clock */}
            <div className="py-2">
              <div className={`text-2xl sm:text-3xl font-black font-mono tracking-widest animate-pulse ${
                isTripCompleted 
                  ? 'text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.8)]' 
                  : 'text-red-600 dark:text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)]'
              }`}>
                {isTripCompleted ? 'ARRIVED' : formatCountdown(countdownRemaining)}
              </div>
              <div className={`text-xs font-mono font-bold mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                DISTANCE TO DESTINATION: <span className={`font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{hudDist}</span>
              </div>
            </div>

            {/* Segmented Status Light Bars */}
            <div className={`grid grid-cols-3 gap-1.5 pt-2 border-t text-[9px] font-mono font-black ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className={`p-1.5 rounded-lg border ${isDark ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'}`}>
                ● ESTABLISHED
              </div>
              <div className={`p-1.5 rounded-lg border ${isDark ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'}`}>
                ● CLEAR PATH
              </div>
              <div className={`p-1.5 rounded-lg border ${isDark ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'}`}>
                ● SIGNALS SYNCED
              </div>
            </div>
          </div>

          {/* Card 2: Destination Logistics Hub Card */}
          <div className={`p-4 rounded-[24px] border shadow-2xl space-y-3 transition-all ${
            isDark 
              ? 'bg-[#090d16]/95 border-slate-800/90 shadow-[0_0_30px_rgba(0,0,0,0.5)]' 
              : 'bg-white border-slate-200/90 shadow-sm'
          }`}>
            <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <span className={`text-xs font-black font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>DESTINATION HUB</span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-black border ${
                isDark ? 'bg-red-950/80 text-red-300 border-red-500/40' : 'bg-red-50 text-red-700 border-red-300'
              }`}>
                BAY 4 RESERVED
              </span>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <h4 className={`font-black text-sm m-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {selectedTrip?.destination ? `${selectedTrip.destination.toUpperCase()} HUB` : 'CENTRAL LOGISTICS DISTRIBUTION HUB'}
              </h4>
              <div className={`text-[11px] flex justify-between pt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <span>Receiving Dock:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Bay 4 (Clear)</span>
              </div>
              <div className={`text-[11px] flex justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <span>Yard Capacity:</span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>85% (High Throughput)</span>
              </div>
              <div className={`text-[11px] flex justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                <span>Arrival Window:</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-bold">On Schedule (±0 min)</span>
              </div>
            </div>
          </div>

          {/* Card 3: Corridor Progress */}
          <div className={`p-4 rounded-[24px] border shadow-2xl space-y-2.5 transition-all ${
            isDark ? 'bg-[#090d16]/95 border-slate-800/90' : 'bg-white border-slate-200/90 shadow-sm'
          }`}>
            <div className="flex justify-between items-center text-xs font-mono font-black">
              <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>CORRIDOR PROGRESS</span>
              <span className={isTripCompleted ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-red-600 dark:text-red-400 font-bold'}>
                {isTripCompleted ? '100% COMPLETED (REACHED)' : '82% COMPLETED'}
              </span>
            </div>
            
            {/* Glowing Gradient Progress Bar */}
            <div className={`w-full h-3 rounded-full border overflow-hidden p-0.5 shadow-inner ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isTripCompleted 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.8)]' 
                    : 'bg-gradient-to-r from-red-600 via-rose-500 to-emerald-400 shadow-[0_0_12px_rgba(239,68,68,0.8)]'
                }`}
                style={{ width: isTripCompleted ? '100%' : '82%' }}
              ></div>
            </div>

            {/* Checkpoint milestone indicators */}
            <div className={`flex justify-between text-[9px] font-mono pt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">● Toll</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">● Hwy 16</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">● Weigh</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">● Gate 2</span>
              <span className={`${isTripCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'} font-bold`}>● Dock</span>
            </div>
          </div>

          {/* Card 4: Traffic Status & Vehicle Telemetry (Light & Dark Mode Perfected) */}
          <div className={`p-4 rounded-[24px] border shadow-2xl space-y-3 transition-all ${
            isDark 
              ? 'bg-[#090d16]/95 border-slate-800/90 shadow-[0_0_30px_rgba(0,0,0,0.5)]' 
              : 'bg-white border-slate-200/90 shadow-sm'
          }`}>
            {/* Header */}
            <div className={`text-xs font-mono font-black pb-2 flex justify-between items-center border-b ${
              isDark ? 'text-slate-200 border-slate-800/80' : 'text-slate-800 border-slate-100'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-cyan-500 text-sm">🚛</span>
                <span className="tracking-wider">VEHICLE TELEMETRY</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${
                  isDark ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40' : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                }`}>
                  LIVE ONLINE
                </span>
              </div>
            </div>

            {/* Core Vehicle & Driver Identity */}
            <div className="space-y-1.5 text-[11px] font-mono">
              <div className="flex justify-between items-center">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>DRIVER:</span>
                <div className="flex items-center gap-1.5">
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {selectedTrip?.driver_name || 'VOONNA PAVAN KRISHNA'}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[8px] font-black border ${
                    isDark ? 'bg-cyan-950 text-cyan-300 border-cyan-500/30' : 'bg-cyan-50 text-cyan-700 border-cyan-300'
                  }`}>
                    CDL-A
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>VEHICLE / RIG:</span>
                <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  {selectedTrip?.license_plate || 'AP-07-TJ-9921'} • Volvo FH16
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>CARGO:</span>
                <span className="text-cyan-600 dark:text-cyan-300 font-bold truncate max-w-[150px]">
                  {formatCargo(selectedTrip?.cargo)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>FASTAG CLEARANCE:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-1">
                  <span>✓</span> PRE-APPROVED
                </span>
              </div>
            </div>

            {/* Live Mechanical Telemetry 4-Grid */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1">
              <div className={`p-2 rounded-xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200/90'}`}>
                <span className={`block text-[8px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>LIVE SPEED</span>
                <span className="font-black text-xs text-cyan-600 dark:text-cyan-400">{hudSpeed}</span>
                <span className="text-[8px] text-emerald-600 dark:text-emerald-400 block">Cruise Active</span>
              </div>
              <div className={`p-2 rounded-xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200/90'}`}>
                <span className={`block text-[8px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>ENGINE LOAD</span>
                <span className={`font-black text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {isTripCompleted ? 'IDLE' : '42% LOAD'}
                </span>
                <span className="text-[8px] text-slate-500 dark:text-slate-400 block">
                  {isTripCompleted ? '650 RPM' : '1,420 RPM'}
                </span>
              </div>
              <div className={`p-2 rounded-xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200/90'}`}>
                <span className={`block text-[8px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>FUEL & RANGE</span>
                <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">
                  {isTripCompleted ? '74%' : '78%'}
                </span>
                <span className="text-[8px] text-slate-500 dark:text-slate-400 block">
                  {isTripCompleted ? '390 km range' : '410 km range'}
                </span>
              </div>
              <div className={`p-2 rounded-xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200/90'}`}>
                <span className={`block text-[8px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>TYRE PRESSURE</span>
                <span className={`font-black text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>115 PSI</span>
                <span className="text-[8px] text-emerald-600 dark:text-emerald-400 block">10/10 Nominal</span>
              </div>
            </div>

            {/* 4-Stage Delivery Lifecycle Component */}
            <div className={`border-t pt-2.5 ${isDark ? 'border-slate-800/80' : 'border-slate-100'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className={`text-[9px] font-mono font-black uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  DELIVERY LIFECYCLE
                </span>
                <span className={`text-[9px] font-mono font-bold ${
                  isTripCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {selectedTrip?.status || 'In Transit'}
                </span>
              </div>
              <DeliveryStatusTimeline 
                status={selectedTrip?.status || 'In Transit'} 
                hasTrip={true}
                isDark={isDark}
                timestamps={{
                  t1: '14:00',
                  t2: '14:15',
                  t3: '14:30',
                  t4: isTripCompleted ? '15:10' : '--'
                }}
              />
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. BOTTOM FULL-WIDTH DISPATCH LOGS & GPS TELEMETRY STREAM CONSOLE          */}
      {/* ========================================================================= */}
      <div className={`p-4 sm:p-5 rounded-[24px] border shadow-2xl space-y-3 transition-all ${
        isDark 
          ? 'bg-[#090d16]/95 border-slate-800/90 shadow-[0_0_35px_rgba(0,0,0,0.5)]' 
          : 'bg-white border-slate-200/90 shadow-sm'
      }`}>
        <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2">
            <span className="text-red-500 text-sm">📋</span>
            <h3 className={`text-xs font-black font-mono tracking-wider m-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              FLEET DISPATCH LOGS & GPS TELEMETRY STREAM
            </h3>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-emerald-600 dark:text-emerald-400 font-black">STREAM ACTIVE (2.5s INTERVAL)</span>
          </div>
        </div>

        {/* Live logs grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 max-h-36 overflow-y-auto pr-1">
          {telemetryLogs.map((log) => (
            <div
              key={log.id}
              className={`p-2.5 rounded-xl border space-y-1 font-mono text-[10px] transition-all ${
                isDark ? 'bg-slate-950/80 border-slate-800/90' : 'bg-slate-50 border-slate-200/90 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{log.time}</span>
                <span className={`px-1.5 py-0.2 rounded text-[8px] font-black border ${
                  log.type === 'CORRIDOR' 
                    ? isDark ? 'bg-red-950 text-red-300 border-red-500/30' : 'bg-red-50 text-red-700 border-red-200' :
                  log.type === 'SIGNAL' 
                    ? isDark ? 'bg-emerald-950 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  log.type === 'GPS' 
                    ? isDark ? 'bg-cyan-950 text-cyan-300 border-cyan-500/30' : 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                  isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-200 text-slate-700 border-slate-300'
                }`}>
                  {log.tag}
                </span>
              </div>
              <p className={`font-semibold line-clamp-2 m-0 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                {log.text}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

export default MapTracker
