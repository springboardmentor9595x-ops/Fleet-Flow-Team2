import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import api from '../../api/axios'
import TruckLoader from '../ui/TruckLoader'

const INITIAL_LOGS = [
  { maintenance_id: '1', vehicle_id: 'FF-308', maintenance_type: 'Brake Service', remarks: 'Brake pads replacement and rotor check', service_date: '2026-07-28', cost: 450, status: 'Resolved' },
  { maintenance_id: '2', vehicle_id: 'FF-205', maintenance_type: 'Oil Change', remarks: 'Routine full synthetic oil and filter change', service_date: '2026-07-29', cost: 180, status: 'Resolved' },
  { maintenance_id: '3', vehicle_id: 'FF-102', maintenance_type: 'Tire Rotation', remarks: 'All season tire rotation and alignment check', service_date: '2026-07-30', cost: 120, status: 'Scheduled' },
  { maintenance_id: '4', vehicle_id: 'FF-512', maintenance_type: 'Engine Service', remarks: 'Error light code checking and dashboard sync', service_date: '', cost: 0, status: 'Pending' }
]

function MaintenancePanel() {
  const { user } = useAuth()
  const { addToast } = useToast()
  
  const [logs, setLogs] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isReporting, setIsReporting] = useState(false)
  
  const [newLog, setNewLog] = useState({
    vehicle_id: '',
    maintenance_type: 'Oil Change',
    remarks: '',
    cost: '',
    service_date: new Date().toISOString().split('T')[0],
    next_service_date: '',
    status: 'Scheduled'
  })

  const roleUpper = user?.role?.toUpperCase() || ''
  const isDriver = roleUpper === 'DRIVER'
  const canModify = roleUpper === 'ADMIN' || roleUpper === 'FLEETMANAGER'

  useEffect(() => {
    fetchLogsAndVehicles()
  }, [])

  const fetchLogsAndVehicles = async () => {
    try {
      setIsLoading(true)
      // 1. Fetch vehicles list for dropdown selection
      const vRes = await api.get('/vehicles')
      setVehicles(vRes.data)
      if (vRes.data.length > 0) {
        setNewLog(prev => ({ ...prev, vehicle_id: vRes.data[0].vehicle_id }))
      }

      // 2. Fetch maintenance logs
      const mRes = await api.get('/maintenance/')
      setLogs(mRes.data)
    } catch (err) {
      console.error('Failed to load maintenance details:', err)
      if (!err.response || err.code === 'ERR_NETWORK') {
        setLogs(INITIAL_LOGS)
      } else {
        addToast('❌ ERROR: Could not fetch maintenance logs.', 'error', 'top-right')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setNewLog((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newLog.remarks || !newLog.vehicle_id) return

    try {
      const payload = {
        vehicle_id: newLog.vehicle_id,
        maintenance_type: newLog.maintenance_type,
        remarks: newLog.remarks,
        service_date: newLog.service_date || null,
        next_service_date: newLog.next_service_date || null,
        cost: newLog.cost ? Number(newLog.cost) : 0,
        status: isDriver ? 'Pending' : newLog.status
      }

      const res = await api.post('/maintenance/', payload)
      setLogs((prev) => [res.data, ...prev])
      setNewLog({
        vehicle_id: vehicles[0]?.vehicle_id || '',
        maintenance_type: 'Oil Change',
        remarks: '',
        cost: '',
        service_date: new Date().toISOString().split('T')[0],
        next_service_date: '',
        status: 'Scheduled'
      })
      setIsReporting(false)
      addToast(`🔧 MAINTENANCE RECORDED: Log generated successfully.`, 'success', 'top-right')
    } catch (err) {
      console.error('Failed to submit maintenance log:', err)
      if (!err.response || err.code === 'ERR_NETWORK') {
        const mock = {
          maintenance_id: `MOCK-MNT-${Math.floor(Math.random() * 899 + 100)}`,
          vehicle_id: newLog.vehicle_id,
          maintenance_type: newLog.maintenance_type,
          remarks: newLog.remarks,
          service_date: newLog.service_date,
          cost: newLog.cost ? Number(newLog.cost) : 0,
          status: isDriver ? 'Pending' : newLog.status
        }
        setLogs((prev) => [mock, ...prev])
        setIsReporting(false)
        addToast(`⚠️ Offline mode: Created mock log record.`, 'warning', 'top-right')
      } else {
        addToast('❌ ERROR: Could not commit maintenance record.', 'error', 'top-right')
      }
    }
  }

  const handleUpdateStatus = async (logId, currentStatus) => {
    if (!canModify) return
    const nextStatus = currentStatus === 'Scheduled' ? 'Resolved' : 'Scheduled'
    try {
      const res = await api.put(`/maintenance/${logId}`, { status: nextStatus })
      setLogs(prev => prev.map(l => l.maintenance_id === logId ? res.data : l))
      addToast(`🔧 Log status updated to ${nextStatus.toUpperCase()}`, 'success', 'top-right')
    } catch (err) {
      console.error('Failed to update maintenance status:', err)
      addToast('❌ Could not update maintenance record.', 'error', 'top-right')
    }
  }

  const handleDelete = async (logId) => {
    if (!canModify) return
    const confirmed = window.confirm('⚠️ Remove this maintenance record from registry?')
    if (!confirmed) return

    try {
      await api.delete(`/maintenance/${logId}`)
      setLogs(prev => prev.filter(l => l.maintenance_id !== logId))
      addToast('🗑️ Maintenance log removed.', 'success', 'top-right')
    } catch (err) {
      console.error('Delete log failed:', err)
      addToast('❌ Could not delete log.', 'error', 'top-right')
    }
  }

  const getVehicleNumber = (vehicleId) => {
    const matched = vehicles.find(v => v.vehicle_id === vehicleId)
    return matched ? matched.registration_number : vehicleId
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Resolved': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
      case 'Scheduled': return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
      case 'Pending': return 'bg-amber-500/10 border-amber-500/30 text-amber-400'
      default: return 'bg-slate-500/10 border-slate-500/30 text-slate-400'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col justify-center items-center font-mono">
        <TruckLoader />
        <div className="text-[10px] text-white/50 uppercase tracking-widest mt-6 animate-pulse">
          Loading maintenance registry...
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start relative z-10">
      
      {/* Maintenance table list */}
      <div className={`${isReporting ? 'xl:col-span-8' : 'xl:col-span-12'} w-full transition-all duration-300`}>
        <div className="glass-card border border-white/10 p-6 bg-slate-950/40 w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white tracking-wide uppercase font-mono m-0">
              [ MAINTENANCE LOGS ]
            </h2>
            {!isReporting && (
              <button
                onClick={() => setIsReporting(true)}
                className="py-2 px-4 bg-[#00f0ff] hover:bg-[#00d2e0] text-[#06070d] rounded-xl font-bold text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.35)]"
              >
                + Report Issue
              </button>
            )}
          </div>

          {/* Table layout */}
          {logs.length === 0 ? (
            <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-12 text-center text-white/40 font-medium font-mono text-xs">
              No maintenance records registered.
            </div>
          ) : (
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm font-mono border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-white/50 text-[10px] tracking-wider uppercase">
                    <th className="py-3 px-2">VEHICLE ID / REG</th>
                    <th className="py-3 px-2">SERVICE TYPE</th>
                    <th className="py-3 px-2">REMARKS / DETAILS</th>
                    <th className="py-3 px-2">SERVICE DATE</th>
                    <th className="py-3 px-2">COST</th>
                    <th className="py-3 px-2">STATUS</th>
                    {canModify && <th className="py-3 px-2 text-right">ACTIONS</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-white/90">
                  {logs.map((l) => (
                    <tr key={l.maintenance_id} className="hover:bg-white/2 transition-colors">
                      <td className="py-3.5 px-2 font-bold text-cyan-400">{getVehicleNumber(l.vehicle_id)}</td>
                      <td className="py-3.5 px-2 text-white font-medium">{l.maintenance_type}</td>
                      <td className="py-3.5 px-2 text-slate-300 max-w-[220px] truncate" title={l.remarks}>
                        {l.remarks}
                      </td>
                      <td className="py-3.5 px-2 text-slate-400">{l.service_date || 'Pending'}</td>
                      <td className="py-3.5 px-2 text-white font-bold">{l.cost > 0 ? `$${l.cost.toLocaleString()}` : '--'}</td>
                      <td className="py-3.5 px-2">
                        <span 
                          onClick={() => handleUpdateStatus(l.maintenance_id, l.status)}
                          className={`inline-block px-2.5 py-0.5 border text-[9px] font-bold rounded-full cursor-pointer select-none ${getStatusColor(l.status)}`}
                          title={canModify ? "Click to toggle resolve state" : ""}
                        >
                          {l.status.toUpperCase()}
                        </span>
                      </td>
                      {canModify && (
                        <td className="py-3.5 px-2 text-right">
                          <button
                            onClick={() => handleDelete(l.maintenance_id)}
                            className="p-1 hover:bg-rose-950/40 text-rose-400 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                            title="Delete Log"
                          >
                            🗑️
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Card layout for mobile */}
          <div className="md:hidden space-y-4">
            {logs.map((l) => (
              <div key={l.maintenance_id} className="p-4 border border-white/5 bg-slate-950/45 rounded-2xl flex flex-col space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-cyan-400 text-sm">{getVehicleNumber(l.vehicle_id)}</span>
                  <span 
                    onClick={() => handleUpdateStatus(l.maintenance_id, l.status)}
                    className={`inline-block px-2.5 py-0.5 border text-[9px] font-bold rounded-full ${getStatusColor(l.status)}`}
                  >
                    {l.status.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-white/70">
                  <div>
                    <span className="text-[9px] text-white/40 block">SERVICE TYPE</span>
                    <span className="text-white">{l.maintenance_type}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-white/40 block">DATE</span>
                    <span>{l.service_date || 'Pending'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-white/40 block">COST</span>
                    <span className="text-white font-bold">{l.cost > 0 ? `$${l.cost}` : '--'}</span>
                  </div>
                </div>
                <div className="border-t border-white/5 pt-2 flex justify-between items-end">
                  <div className="flex-1">
                    <span className="text-[9px] text-white/40 block">REMARKS</span>
                    <p className="m-0 text-white/80">{l.remarks}</p>
                  </div>
                  {canModify && (
                    <button
                      onClick={() => handleDelete(l.maintenance_id)}
                      className="p-1 hover:bg-rose-950/40 text-rose-400 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Report issue form panel */}
      {isReporting && (
        <div className="xl:col-span-4 glass-card border border-white/10 p-6 bg-slate-950/40 relative">
          <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-5">
            <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono m-0">
              {isDriver ? '[ REPORT FAULT ]' : '[ SCHEDULE SERVICE ]'}
            </h3>
            <button 
              onClick={() => setIsReporting(false)} 
              className="text-white/40 hover:text-white cursor-pointer font-bold text-xs bg-transparent border-none"
            >
              [CANCEL]
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
            <div>
              <label className="text-[9px] text-white/40 block mb-1.5">[ SELECT VEHICLE ]</label>
              <select
                name="vehicle_id"
                value={newLog.vehicle_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs select-none"
              >
                {vehicles.length === 0 ? (
                  <option value="">-- No vehicles registered --</option>
                ) : (
                  vehicles.map(v => (
                    <option key={v.vehicle_id} value={v.vehicle_id}>
                      {v.registration_number} ({v.brand} {v.model})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="text-[9px] text-white/40 block mb-1.5">[ SERVICE TYPE ]</label>
              <select
                name="maintenance_type"
                value={newLog.maintenance_type}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs select-none"
              >
                <option value="Oil Change">Oil Change</option>
                <option value="Tire Replacement">Tire Replacement</option>
                <option value="Engine Service">Engine Service</option>
                <option value="Brake Service">Brake Service</option>
                <option value="General Inspection">General Inspection</option>
              </select>
            </div>

            {!isDriver && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] text-white/40 block mb-1.5">[ SERVICE COST ($) ]</label>
                    <input
                      name="cost"
                      type="number"
                      placeholder="e.g. 150"
                      value={newLog.cost}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-white/40 block mb-1.5">[ STATUS ]</label>
                    <select
                      name="status"
                      value={newLog.status}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs select-none"
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Pending">Pending</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] text-white/40 block mb-1.5">[ SERVICE DATE ]</label>
                    <input
                      name="service_date"
                      type="date"
                      value={newLog.service_date}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-white/40 block mb-1.5">[ NEXT SERVICE DUE ]</label>
                    <input
                      name="next_service_date"
                      type="date"
                      value={newLog.next_service_date}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-[9px] text-white/40 block mb-1.5">
                {isDriver ? '[ FAULT DETAILS & REMARKS ]' : '[ SERVICE REMARKS ]'}
              </label>
              <textarea
                name="remarks"
                placeholder={isDriver ? "e.g. Brakes squeaking on deceleration" : "e.g. Standard engine tuning and brake system check"}
                value={newLog.remarks}
                onChange={handleChange}
                required
                rows="4"
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#00f0ff] hover:bg-[#00d2e0] text-[#06070d] rounded-xl font-bold tracking-wide transition-all cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.35)] mt-4 text-center text-xs border-none"
            >
              {isDriver ? 'SUBMIT FAULT REPORT' : 'SCHEDULE SERVICE'}
            </button>
          </form>
        </div>
      )}

    </div>
  )
}

export default MaintenancePanel
