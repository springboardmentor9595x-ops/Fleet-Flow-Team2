import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
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
  
  const [trips, setTrips] = useState([])
  const [dbVehicles, setDbVehicles] = useState([])
  const [dbDrivers, setDbDrivers] = useState([])
  const [shipments, setShipments] = useState([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [isDispatching, setIsDispatching] = useState(false)
  
  const [newTrip, setNewTrip] = useState({ 
    driverId: '', 
    vehicleId: '', 
    shipmentId: '',
    from: 'SF', 
    to: 'LA', 
    cargo: '',
    routeType: 'Fastest'
  })

  // Role authorization
  const roleUpper = user?.role?.toUpperCase() || ''
  const canDispatch = roleUpper === 'ADMIN' || roleUpper === 'FLEETMANAGER' || roleUpper === 'DISPATCHER'

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
          route_type: t.route_type
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
    if (!newTrip.driverId || !newTrip.vehicleId || !newTrip.cargo) {
      addToast('❌ VALIDATION ERROR: Please assign a driver, vehicle, and cargo.', 'error', 'top-right')
      return
    }
    if (newTrip.from.toUpperCase() === newTrip.to.toUpperCase()) {
      addToast('❌ ROUTING ERROR: Route origin and destination depots must be distinct.', 'error', 'top-right')
      return
    }

    try {
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
      addToast('🗺️ TRIP STARTED: Route calculated and set.', 'success', 'top-right')
    } catch (err) {
      console.error('Failed to dispatch trip:', err)
      const errorMsg = err.response?.data?.detail || 'Could not compile shipping route.'
      addToast(`❌ ERROR: ${errorMsg}`, 'error', 'top-right')
    }
  }

  const updateStatus = async (tripId, nextStatus) => {
    try {
      await api.put(`/trips/${tripId}/status`, { status: nextStatus })
      await fetchTripsAndVehicles()
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
      addToast('🗑️ TRIP DELETED: Trip removed from archives.', 'success', 'top-right')
    } catch (err) {
      console.error('Delete trip failed:', err)
      addToast('❌ ERROR: Could not delete trip.', 'error', 'top-right')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'In Transit': return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
      case 'Completed': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
      case 'Scheduled': return 'bg-amber-500/10 border-amber-500/30 text-amber-400'
      default: return 'bg-slate-500/10 border-slate-500/30 text-slate-400'
    }
  }

  const formatEta = (seconds) => {
    if (seconds <= 0) return 'ARRIVED'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} MINS`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}H ${mins}M`
  }

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col justify-center items-center font-mono">
        <TruckLoader />
        <div className="text-[10px] text-white/50 uppercase tracking-widest mt-6 animate-pulse">
          Loading trips...
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      
      {/* Trips list */}
      <div className="xl:col-span-12 glass-card border border-white/10 p-6 bg-slate-950/40 w-full transition-all duration-300">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-white tracking-wide uppercase font-mono m-0">
            [ TRIPS LIST ]
          </h2>
          {canDispatch && !isDispatching && (
            <button
              onClick={() => setIsDispatching(true)}
              className="py-1.5 px-3 bg-white text-slate-950 rounded-full font-bold text-xs hover:bg-white/90 transition-all cursor-pointer shadow-md"
            >
              + START TRIP
            </button>
          )}
        </div>

        {/* Table layout for larger screens */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm font-mono border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-white/50 text-[10px] tracking-wider uppercase">
                <th className="py-3 px-2">TRIP ID</th>
                <th className="py-3 px-2">OPERATOR / DRIVER</th>
                <th className="py-3 px-2">VEHICLE</th>
                <th className="py-3 px-2">ROUTE</th>
                <th className="py-3 px-2">CARGO</th>
                <th className="py-3 px-2">PROFILE</th>
                <th className="py-3 px-2">ETA</th>
                <th className="py-3 px-2">STATUS</th>
                {(canDispatch || roleUpper === 'DRIVER') && <th className="py-3 px-2 text-right">ACTIONS</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-white/90">
              {trips.map((t) => (
                <tr key={t.id} className="hover:bg-white/2 transition-colors">
                  <td className="py-3.5 px-2 font-bold text-cyan-400 max-w-[100px] truncate" title={t.id}>
                    {t.id.length > 8 ? `${t.id.substring(0, 8)}...` : t.id}
                  </td>
                  <td className="py-3.5 px-2 text-white font-medium">{t.driver}</td>
                  <td className="py-3.5 px-2 text-slate-400 uppercase">{t.vehicle}</td>
                  <td className="py-3.5 px-2 text-white font-medium">
                    {t.from} → {t.to} <span className="text-[10px] text-white/40 font-normal">({t.distance} MI)</span>
                  </td>
                  <td className="py-3.5 px-2 text-slate-400">{formatCargo(t.cargo)}</td>
                  <td className="py-3.5 px-2 text-slate-400 uppercase">{t.route_type}</td>
                  <td className="py-3.5 px-2 font-semibold text-white/90">{formatEta(t.eta_seconds)}</td>
                  <td className="py-3.5 px-2">
                    <span className={`inline-block px-2.5 py-0.5 border text-[9px] font-bold rounded-full ${getStatusColor(t.status)}`}>
                      {t.status.toUpperCase()}
                    </span>
                  </td>
                  {(canDispatch || roleUpper === 'DRIVER') && (
                    <td className="py-3.5 px-2 text-right space-x-2 whitespace-nowrap">
                      {t.status === 'Scheduled' && canDispatch && (
                        <button
                          onClick={() => updateStatus(t.id, 'In Transit')}
                          className="py-1 px-2.5 bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/50 rounded-lg text-[9px] font-bold transition-all cursor-pointer"
                        >
                          🟢 DEPART
                        </button>
                      )}
                      {t.status === 'In Transit' && roleUpper === 'DRIVER' && (
                        <button
                          onClick={() => updateStatus(t.id, 'Completed')}
                          className="py-1 px-2.5 bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/50 rounded-lg text-[9px] font-bold transition-all cursor-pointer"
                        >
                          🏁 ARRIVED
                        </button>
                      )}
                      {canDispatch && (
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="py-1 px-2.5 bg-transparent text-white/30 border border-white/5 hover:border-white/20 hover:text-white rounded-lg text-[9px] font-bold transition-all cursor-pointer"
                        >
                          🗑️ DELETE
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Card layout for mobile screens */}
        <div className="md:hidden space-y-4">
          {trips.map((t) => (
            <div key={t.id} className="p-4 border border-white/5 bg-white/2 rounded-2xl flex flex-col space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-cyan-400 text-sm truncate max-w-[150px]" title={t.id}>
                  {t.id.length > 8 ? `${t.id.substring(0, 8)}...` : t.id}
                </span>
                <span className={`inline-block px-2.5 py-0.5 border text-[9px] font-bold rounded-full ${getStatusColor(t.status)}`}>
                  {t.status.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-white/70">
                <div>
                  <span className="text-[9px] text-white/40 block">DRIVER</span>
                  <span className="text-white font-semibold">{t.driver}</span>
                </div>
                <div>
                  <span className="text-[9px] text-white/40 block">VEHICLE</span>
                  <span className="uppercase">{t.vehicle}</span>
                </div>
                <div>
                  <span className="text-[9px] text-white/40 block">ROUTE</span>
                  <span className="text-white font-semibold">{t.from} → {t.to} ({t.distance} MI)</span>
                </div>
                <div>
                  <span className="text-[9px] text-white/40 block">ETA</span>
                  <span className="text-white font-semibold">{formatEta(t.eta_seconds)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-white/40 block">PROFILE</span>
                  <span className="text-white/80 uppercase">{t.route_type}</span>
                </div>
                <div>
                  <span className="text-[9px] text-white/40 block">CARGOSECURE</span>
                  <span>{formatCargo(t.cargo)}</span>
                </div>
              </div>
              {(canDispatch || roleUpper === 'DRIVER') && (
                <div className="flex space-x-2 pt-2 border-t border-white/5 justify-end">
                  {t.status === 'Scheduled' && canDispatch && (
                    <button
                      onClick={() => updateStatus(t.id, 'In Transit')}
                      className="py-1 px-3 bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/50 rounded-lg text-[9px] font-bold cursor-pointer"
                    >
                      🟢 DEPART
                    </button>
                  )}
                  {t.status === 'In Transit' && roleUpper === 'DRIVER' && (
                    <button
                      onClick={() => updateStatus(t.id, 'Completed')}
                      className="py-1 px-3 bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/50 rounded-lg text-[9px] font-bold cursor-pointer"
                    >
                      🏁 ARRIVED
                    </button>
                  )}
                  {canDispatch && (
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="py-1 px-3 bg-transparent text-white/30 border border-white/5 hover:border-white/20 hover:text-white rounded-lg text-[9px] font-bold cursor-pointer"
                    >
                      🗑️ DELETE
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

      </div>

      {/* Dispatch form panel / Modal */}
      {canDispatch && isDispatching && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in text-white">
          <div className="w-full max-w-lg glass-card border border-white/10 p-6 bg-slate-950/95 relative tech-border-accent">
            
            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-5">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono m-0">
                [ START NEW TRIP ]
              </h3>
              <button 
                onClick={() => setIsDispatching(false)} 
                className="text-white/40 hover:text-white cursor-pointer font-bold text-xs bg-transparent border-none outline-none"
              >
                [CANCEL]
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
              
              <div>
                <label className="text-[9px] text-white/40 block mb-1.5">[ LINK ACTIVE SHIPMENT (OPTIONAL) ]</label>
                <select
                  name="shipmentId"
                  value={newTrip.shipmentId}
                  onChange={handleShipmentChange}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs"
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
                <label className="text-[9px] text-white/40 block mb-1.5">[ ASSIGNED DRIVER ]</label>
                <select
                  name="driverId"
                  value={newTrip.driverId}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs"
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
                <label className="text-[9px] text-white/40 block mb-1.5">[ ASSIGNED VEHICLE ]</label>
                <select
                  name="vehicleId"
                  value={newTrip.vehicleId}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs"
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
                  <label className="text-[9px] text-white/40 block mb-1.5">[ FROM ]</label>
                  <input
                    name="from"
                    type="text"
                    placeholder="e.g. San Francisco"
                    value={newTrip.from}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ TO ]</label>
                  <input
                    name="to"
                    type="text"
                    placeholder="e.g. Los Angeles"
                    value={newTrip.to}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] text-white/40 block mb-1.5">[ ROUTE TYPE ]</label>
                <select
                  name="routeType"
                  value={newTrip.routeType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs font-bold text-cyan-400"
                >
                  <option value="Fastest">Fastest Route</option>
                  <option value="Shortest">Shortest Route</option>
                  <option value="Traffic Avoidance">Traffic Avoidance</option>
                  <option value="Fuel Efficient">Fuel Efficient Route</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] text-white/40 block mb-1.5">[ CARGO TYPE ]</label>
                <input
                  name="cargo"
                  type="text"
                  placeholder="e.g. Dry Food / Electronics"
                  value={newTrip.cargo}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-white hover:bg-white/90 text-slate-950 rounded-xl font-bold tracking-wide transition-all cursor-pointer shadow-md mt-4 text-center text-xs"
              >
                START TRIP
              </button>

            </form>

          </div>
        </div>,
        document.body
      )}

    </div>
  )
}

export default TripsPanel
