import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import api from '../../api/axios'
import TruckLoader from '../ui/TruckLoader'

function ActiveTripPanel() {
  const { user } = useAuth()
  const { addToast } = useToast()

  const [activeTrip, setActiveTrip] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)

  const loadActiveTrip = async () => {
    try {
      setIsLoading(true)
      // 1. Resolve current driver's driver_id
      const driversRes = await api.get('/drivers')
      const matchedDriver = driversRes.data.find(d => d.user_id === user?.user_id)
      
      if (!matchedDriver) {
        setActiveTrip(null)
        return
      }

      // 2. Fetch all trips and find the scheduled or in-transit one assigned to this driver
      const tripsRes = await api.get('/trips')
      const matchedTrip = tripsRes.data.find(
        t => t.driver_id === matchedDriver.driver_id && (t.status === 'Scheduled' || t.status === 'In Transit')
      )

      setActiveTrip(matchedTrip || null)
    } catch (err) {
      console.error('Failed to load active trip:', err)
      addToast('❌ ERROR: Could not load active trip manifest.', 'error', 'top-right')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadActiveTrip()
  }, [user])

  const updateTripStatus = async (newStatus) => {
    if (!activeTrip) return
    
    try {
      setIsUpdating(true)
      const res = await api.put(`/trips/${activeTrip.trip_id}/status`, {
        status: newStatus
      })
      addToast(`🟢 STATUS UPDATED: Trip is now ${newStatus.toUpperCase()}.`, 'success', 'top-right')
      
      // Reload active trip details
      await loadActiveTrip()
    } catch (err) {
      console.error('Failed to update trip status:', err)
      addToast('❌ ERROR: Could not update trip status.', 'error', 'top-right')
    } finally {
      setIsUpdating(false)
    }
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
      <div className="min-h-[300px] flex flex-col justify-center items-center font-mono">
        <TruckLoader />
        <div className="text-[10px] text-white/50 uppercase tracking-widest mt-6 animate-pulse">
          Retrieving active assignment...
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto font-mono text-xs text-white/90">
      
      {!activeTrip ? (
        <div className="glass-card border border-white/10 p-12 bg-slate-950/40 text-center rounded-2xl shadow-xl">
          <div className="text-4xl mb-4">🛣️</div>
          <h2 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-2">NO ACTIVE ASSIGNMENTS</h2>
          <p className="text-white/30 text-[10px] uppercase tracking-wide max-w-sm mx-auto">
            You currently have no scheduled or in-transit trip manifests assigned to you.
          </p>
        </div>
      ) : (
        <div className="glass-card border border-white/10 bg-slate-950/40 rounded-2xl overflow-hidden shadow-2xl p-6 md:p-8 space-y-6 relative">
          {/* Subtle live indicator pulse in corner */}
          {activeTrip.status === 'In Transit' && (
            <div className="absolute top-4 right-4 flex items-center space-x-1.5 px-2 py-0.5 bg-indigo-950/60 border border-indigo-500/20 text-indigo-400 rounded-full font-bold text-[8px] tracking-wider uppercase animate-pulse">
              <span className="w-1 h-1 bg-indigo-400 rounded-full"></span>
              <span>IN TRANSIT</span>
            </div>
          )}
          {activeTrip.status === 'Scheduled' && (
            <div className="absolute top-4 right-4 flex items-center space-x-1.5 px-2 py-0.5 bg-cyan-950/60 border border-cyan-500/20 text-cyan-400 rounded-full font-bold text-[8px] tracking-wider uppercase">
              <span>SCHEDULED</span>
            </div>
          )}

          <div className="border-b border-white/10 pb-4">
            <span className="text-[9px] text-white/40 block">ACTIVE TRIP ID</span>
            <h2 className="text-sm font-bold text-cyan-400 uppercase m-0 leading-tight">
              {activeTrip.trip_id}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <span className="text-[9px] text-white/40 block mb-1">DEPARTURE HUB</span>
              <span className="text-sm font-bold text-white">{activeTrip.start_location}</span>
            </div>
            <div>
              <span className="text-[9px] text-white/40 block mb-1">DESTINATION TERMINAL</span>
              <span className="text-sm font-bold text-white">{activeTrip.destination}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 border-t border-white/5 pt-4">
            <div>
              <span className="text-[9px] text-white/40 block mb-1">VEHICLE IN SERVICE</span>
              <span className="text-slate-300 font-bold uppercase">{activeTrip.registration_number || 'ASSIGNED VEHICLE'}</span>
            </div>
            <div>
              <span className="text-[9px] text-white/40 block mb-1">CARGO SPECIFICATION</span>
              <span className="text-slate-300 font-bold uppercase">{formatCargo(activeTrip.cargo)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 border-t border-white/5 pt-4">
            <div>
              <span className="text-[9px] text-white/40 block mb-1">TOTAL ROUTE DISTANCE</span>
              <span className="text-white font-bold">{activeTrip.distance.toFixed(1)} MI</span>
            </div>
            <div>
              <span className="text-[9px] text-white/40 block mb-1">ESTIMATED TRAVEL TIME</span>
              <span className="text-white font-bold">{formatEta(activeTrip.eta_seconds)}</span>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col space-y-4">
            <span className="text-[9px] text-white/40 block text-center">// CONSOLE STATUS UPDATES</span>
            
            {activeTrip.status === 'Scheduled' ? (
              <button
                onClick={() => updateTripStatus('In Transit')}
                disabled={isUpdating}
                className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs tracking-wider rounded-xl transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)] uppercase border-none outline-none"
              >
                {isUpdating ? 'Executing Startup Procedures...' : '🚀 Depart Hub & Start Trip'}
              </button>
            ) : (
              <button
                onClick={() => updateTripStatus('Completed')}
                disabled={isUpdating}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs tracking-wider rounded-xl transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)] uppercase border-none outline-none"
              >
                {isUpdating ? 'Finalizing Arrival Status...' : '🏁 Confirm Safe Arrival & Complete Trip'}
              </button>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

export default ActiveTripPanel
