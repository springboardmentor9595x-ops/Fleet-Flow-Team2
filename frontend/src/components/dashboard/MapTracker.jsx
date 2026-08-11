import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useToast } from '../../context/ToastContext'
import api from '../../api/axios'

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

function MapTracker() {
  const { addToast } = useToast()
  const [selectedNode, setSelectedNode] = useState(null)
  const [selectedTripId, setSelectedTripId] = useState(null)
  const [activeTrips, setActiveTrips] = useState([])
  const [wsConnected, setWsConnected] = useState(false)
  const [isSimulatingPing, setIsSimulatingPing] = useState(false)
  const [lastTripsLength, setLastTripsLength] = useState(0)

  // Auto-select and focus map on the latest shipment/trip when loaded
  useEffect(() => {
    if (activeTrips.length > 0 && activeTrips.length !== lastTripsLength) {
      setSelectedTripId(activeTrips[0].trip_id)
      setLastTripsLength(activeTrips.length)
    }
  }, [activeTrips, lastTripsLength])

  const triggerPingSimulation = async () => {
    try {
      setIsSimulatingPing(true)
      const res = await api.post('/trips/simulate-ping')
      addToast(`📡 GPS PING SENT: ${res.data.message}`, 'success', 'top-right')
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
  
  // Track active vehicle markers & polylines in memory to update them smoothly
  const vehicleMarkersRef = useRef({})
  const activeRoutesGroupRef = useRef(null)

  // 1. Initialize Leaflet Map centered on California
  useEffect(() => {
    if (!mapContainerRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: [36.3, -120.3],
      zoom: 6,
      zoomControl: false,
      attributionControl: false
    })

    // Sleek premium CartoDB Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20
    }).addTo(map)

    L.control.zoom({ position: 'topright' }).addTo(map)

    // Layer group for overlays
    activeRoutesGroupRef.current = L.layerGroup().addTo(map)

    // Render static highway linkages
    HIGHWAY_ROUTES.forEach((route) => {
      L.polyline(route, {
        color: 'rgba(0, 240, 255, 0.15)',
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
  }, [])

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
          if (data.type === 'INITIAL_STATE' || data.type === 'TELEMETRY_UPDATE') {
            setActiveTrips(data.active_trips || [])
          } else if (data.type === 'GEOFENCE_EVENT') {
            addToast(`🚨 GEOFENCE: ${data.message}`, 'info', 'top-right')
          } else if (data.type === 'REROUTE_EVENT') {
            addToast(`⚠️ REROUTE: ${data.message}`, 'warning', 'top-right')
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
  }, [addToast])

  // 3. Update Vehicle Markers on Leaflet Map dynamically
  useEffect(() => {
    if (!mapInstance) return

    const currentTripIds = new Set(activeTrips.map(t => t.trip_id))

    // Remove markers of completed/deleted trips
    Object.keys(vehicleMarkersRef.current).forEach((tripId) => {
      if (!currentTripIds.has(tripId)) {
        vehicleMarkersRef.current[tripId].remove()
        delete vehicleMarkersRef.current[tripId]
      }
    })

    // Add or update active vehicle markers
    activeTrips.forEach((trip) => {
      const { trip_id, lat, lng, license_plate } = trip
      
      if (lat && lng) {
        if (vehicleMarkersRef.current[trip_id]) {
          vehicleMarkersRef.current[trip_id].setLatLng([lat, lng])
        } else {
          const vehicleMarker = L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: '#ff007f', // glowing magenta
            color: '#ffffff',
            weight: 1.5,
            opacity: 0.9,
            fillOpacity: 0.8
          }).addTo(mapInstance)

          vehicleMarker.bindTooltip(`<span class="font-mono text-xs font-bold text-slate-900">${license_plate}</span>`, {
            permanent: false,
            direction: 'right'
          })

          vehicleMarkersRef.current[trip_id] = vehicleMarker
        }
      }
    })
  }, [mapInstance, activeTrips])

  // 4. Draw route path polyline for the selected trip
  useEffect(() => {
    if (!mapInstance || !activeRoutesGroupRef.current) return

    activeRoutesGroupRef.current.clearLayers()

    const selectedTrip = activeTrips.find((t) => t.trip_id === selectedTripId)
    if (selectedTrip && selectedTrip.route_coords && selectedTrip.route_coords.length > 0) {
      const polyline = L.polyline(selectedTrip.route_coords, {
        color: '#00f0ff', // glowing cyan
        weight: 3.5,
        opacity: 0.85,
        lineJoin: 'round'
      }).addTo(activeRoutesGroupRef.current)

      // Auto-fit bounds
      mapInstance.fitBounds(polyline.getBounds(), { padding: [50, 50] })
    }
  }, [mapInstance, activeTrips, selectedTripId])

  const formatEta = (seconds) => {
    if (seconds <= 0) return 'ARRIVED'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} MINS`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}H ${mins}M`
  }

  const formatCargo = (cargoStr) => {
    if (!cargoStr) return 'N/A'
    if (cargoStr.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(cargoStr)
        return parsed.desc || 'MANIFEST CARGO'
      } catch (e) {}
    }
    return cargoStr
  }

  const selectedTrip = activeTrips.find((t) => t.trip_id === selectedTripId)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch relative z-10">
      
      {/* Map visualizer container */}
      <div className="lg:col-span-8 glass-card border border-white/10 p-6 flex flex-col justify-between relative overflow-hidden min-h-[420px] bg-slate-950/40">
        
        {/* HUD Details */}
        <div className="absolute top-4 left-4 right-4 z-20 font-mono text-[9px] text-white/40 tracking-wider flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span>LEAFLET_TACTICAL_MAP // ACTIVE_GPS_RADAR</span>
            <span className="flex items-center space-x-1">
              <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-cyan-400 animate-pulse-glow' : 'bg-red-500'}`}></span>
              <span className={wsConnected ? 'text-cyan-400' : 'text-red-500 font-bold'}>
                {wsConnected ? 'LIVE_STREAM' : 'STREAM_OFFLINE'}
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={triggerPingSimulation}
            disabled={isSimulatingPing || activeTrips.length === 0}
            className={`py-1 px-3 border rounded font-mono text-[9px] font-bold transition-all cursor-pointer select-none ${
              activeTrips.length === 0 
                ? 'bg-transparent border-white/5 text-white/20 cursor-not-allowed'
                : 'bg-cyan-500/10 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-slate-950 shadow-[0_0_10px_rgba(0,240,255,0.1)]'
            }`}
          >
            {isSimulatingPing ? 'PINGING...' : 'SIMULATE GPS PING ⚡'}
          </button>
        </div>

        {/* Leaflet DOM container */}
        <div className="w-full h-[380px] rounded-2xl overflow-hidden mt-6 relative z-0">
          <div ref={mapContainerRef} className="w-full h-full" style={{ background: '#090a15' }}></div>
        </div>

      </div>

      {/* Side list info */}
      <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
        
        {/* Telemetry HUD / Depot info */}
        {selectedTrip ? (
          <div className="glass-card border border-white/10 p-5 bg-slate-950/40 min-h-[160px] flex flex-col justify-between space-y-4 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h3 className="text-xs font-bold text-cyan-400 tracking-wide uppercase m-0">
                📡 TELEMETRY: {selectedTrip.license_plate}
              </h3>
              <button
                onClick={() => setSelectedTripId(null)}
                className="text-[10px] text-white/40 hover:text-white cursor-pointer bg-transparent border-none outline-none font-bold"
              >
                [CLOSE]
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-[10px] text-white/80">
              <div className="p-2 bg-white/2 rounded-xl border border-white/5">
                <span className="text-[8px] text-white/40 block">SPEED</span>
                <span className="text-white font-bold text-xs">64 km/h</span>
              </div>
              <div className="p-2 bg-white/2 rounded-xl border border-white/5">
                <span className="text-[8px] text-white/40 block">HEADING</span>
                <span className="text-white font-bold text-xs">35° NE</span>
              </div>
              <div className="p-2 bg-white/2 rounded-xl border border-white/5 col-span-2">
                <span className="text-[8px] text-white/40 block">COORDINATES</span>
                <span className="text-cyan-400 font-bold text-xs">
                  {selectedTrip.lat?.toFixed(5)}, {selectedTrip.lng?.toFixed(5)}
                </span>
              </div>
            </div>

            <div className="border-t border-white/5 pt-3 space-y-2 text-[10px]">
              <div className="flex justify-between">
                <span className="text-white/40">DRIVER</span>
                <span className="text-white font-bold">{selectedTrip.driver_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">CARGO</span>
                <span className="text-white font-semibold truncate max-w-[150px]">{formatCargo(selectedTrip.cargo)}</span>
              </div>
              {(() => {
                if (selectedTrip.cargo?.trim().startsWith('{')) {
                  try {
                    const parsed = JSON.parse(selectedTrip.cargo)
                    return (
                      <>
                        {parsed.phone && (
                          <div className="flex justify-between border-t border-white/5 pt-1.5 mt-1">
                            <span className="text-white/40">CONTACT PHONE</span>
                            <span className="text-white font-bold">{parsed.phone}</span>
                          </div>
                        )}
                        {parsed.email && (
                          <div className="flex justify-between border-t border-white/5 pt-1.5 mt-1">
                            <span className="text-white/40">CONTACT EMAIL</span>
                            <span className="text-cyan-400 truncate max-w-[150px]">{parsed.email}</span>
                          </div>
                        )}
                      </>
                    )
                  } catch (e) {}
                }
                return null
              })()}
              <div className="flex justify-between">
                <span className="text-white/40">DISTANCE LEFT</span>
                <span className="text-white font-bold">{selectedTrip.distance_remaining} KM</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">ROUTE CALCULATOR</span>
                <span className="text-cyan-400 font-bold uppercase">{selectedTrip.route_type}</span>
              </div>
            </div>

            <div className="border-t border-white/5 pt-3">
              <span className="text-[8px] text-white/40 block mb-1">GPS ROUTE TRAIL</span>
              <div className="max-h-[80px] overflow-y-auto space-y-1 text-[8px] text-white/50 scrollbar-none">
                {selectedTrip.route_coords?.slice(0, 5).map((coord, idx) => (
                  <div key={idx} className="flex justify-between border-b border-white/5 pb-0.5">
                    <span>POINT_{idx + 1}</span>
                    <span>{coord[0].toFixed(4)}°, {coord[1].toFixed(4)}°</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Node/Depot details or default details */
          <div className="glass-card border border-white/10 p-5 bg-slate-950/40 min-h-[160px] flex flex-col justify-between">
            {selectedNode ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono m-0">
                    {DEPOTS[selectedNode].name}
                  </h3>
                  <span className="text-[9px] px-2 py-0.5 border border-cyan-500/30 text-cyan-400 font-mono rounded">
                    ONLINE
                  </span>
                </div>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-white/40">AVAILABLE VEHICLES</span>
                    <span className="text-white font-bold">{DEPOTS[selectedNode].trucks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">QUEUED SHIPMENTS</span>
                    <span className="text-white font-bold">{DEPOTS[selectedNode].shipments}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">COORDINATES</span>
                    <span className="text-cyan-400 font-semibold">{DEPOTS[selectedNode].lat.toFixed(4)}°N, {DEPOTS[selectedNode].lng.toFixed(4)}°W</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-center items-center text-center space-y-2 py-4">
                <span className="text-lg">🗺️</span>
                <p className="text-xs text-white/50 font-mono leading-relaxed max-w-[200px]">
                  CLICK ON ANY DEPOT NODE TO QUERY TELEMETRY DATA
                </p>
              </div>
            )}
          </div>
        )}

        {/* Live signals list */}
        <div className="glass-card border border-white/10 p-5 bg-slate-950/40 flex-1 flex flex-col justify-between">
          <div className="border-b border-white/10 pb-2 mb-3">
            <h3 className="text-xs font-bold text-white/70 uppercase tracking-widest font-mono m-0">
              [ ACTIVE TELEMETRY SIGNALS ]
            </h3>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[220px] pr-1">
            {activeTrips.length === 0 ? (
              <div className="text-center py-8 text-white/30 font-mono text-[10px]">
                NO ACTIVE VEHICLES IN TRANSIT
              </div>
            ) : (
              activeTrips.map((v) => {
                const isSelected = selectedTripId === v.trip_id
                return (
                  <div
                    key={v.trip_id}
                    onClick={() => setSelectedTripId(isSelected ? null : v.trip_id)}
                    className={`p-2.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                      isSelected 
                        ? 'bg-white/10 border-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.15)]' 
                        : 'bg-white/5 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold font-mono text-white text-xs">{v.license_plate}</span>
                      <span className="text-[8px] px-1.5 py-0.2 bg-cyan-950/60 border border-cyan-500/20 text-cyan-400 rounded uppercase font-bold">
                        {v.route_type}
                      </span>
                    </div>
                    <div className="flex justify-between text-[9px] text-white/50 font-mono">
                      <span>ETA: {formatEta(v.eta_seconds)}</span>
                      <span className="text-white/70">{v.distance_remaining} MI LEFT</span>
                    </div>
                    <div className="text-[8px] text-white/40 font-mono mt-1 uppercase flex justify-between">
                      <span>DRIVER: {v.driver_name}</span>
                      <span className="text-white/60">{formatCargo(v.cargo)}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>

    </div>
  )
}

export default MapTracker
