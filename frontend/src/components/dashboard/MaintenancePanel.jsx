import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editLog, setEditLog] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  
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
  // Admin and Fleet Manager can edit/create/delete maintenance records (Driver and Dispatcher are View Only)
  const canModify = roleUpper === 'ADMIN' || roleUpper === 'FLEETMANAGER' || roleUpper === 'FLEET MANAGER'
  const canDelete = roleUpper === 'ADMIN' || roleUpper === 'FLEETMANAGER' || roleUpper === 'FLEET MANAGER'

  useEffect(() => {
    fetchLogsAndVehicles()

    const handleDataChanged = () => {
      fetchLogsAndVehicles()
    }
    window.addEventListener('fleetflow:datachanged', handleDataChanged)
    return () => {
      window.removeEventListener('fleetflow:datachanged', handleDataChanged)
    }
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

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)
      const [vRes, mRes] = await Promise.all([
        api.get('/vehicles'),
        api.get('/maintenance/')
      ])
      setVehicles(vRes.data)
      setLogs(mRes.data)
      addToast('🔄 Maintenance registry refreshed.', 'info', 'top-right')
    } catch (err) {
      console.error('Refresh failed:', err)
      addToast('❌ Could not refresh maintenance logs.', 'error', 'top-right')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setNewLog((prev) => {
      const updated = { ...prev, [name]: value }
      
      // Auto-suggest previous service cost if selecting vehicle or service type and cost is empty
      if ((name === 'vehicle_id' || name === 'maintenance_type') && !prev.cost) {
        const targetVehId = name === 'vehicle_id' ? value : prev.vehicle_id
        const targetType = name === 'maintenance_type' ? value : prev.maintenance_type
        const priorRecord = logs.find(
          (l) => l.vehicle_id === targetVehId && l.maintenance_type === targetType && Number(l.cost) > 0
        ) || logs.find(
          (l) => l.vehicle_id === targetVehId && Number(l.cost) > 0
        )
        if (priorRecord && priorRecord.cost) {
          updated.cost = priorRecord.cost
        }
      }

      return updated
    })
  }

  const handleEditChange = (e) => {
    const { name, value } = e.target
    setEditLog((prev) => ({ ...prev, [name]: value }))
  }

  const handleStartEdit = (log) => {
    if (!canModify) return
    setEditLog({
      ...log,
      cost: log.cost !== null && log.cost !== undefined ? log.cost : '',
      service_date: log.service_date ? log.service_date.split('T')[0] : '',
      next_service_date: log.next_service_date ? log.next_service_date.split('T')[0] : ''
    })
    setIsEditing(true)
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    if (!canModify) {
      addToast('🔒 PERMISSION DENIED: Only Fleet Managers and Admins can schedule maintenance.', 'error', 'top-right')
      return
    }
    if (!newLog.vehicle_id) {
      addToast('⚠️ Please select a vehicle.', 'warning', 'top-right')
      return
    }

    try {
      const payload = {
        vehicle_id: newLog.vehicle_id,
        maintenance_type: newLog.maintenance_type,
        remarks: newLog.remarks || '',
        service_date: newLog.service_date || null,
        next_service_date: newLog.next_service_date || null,
        cost: newLog.cost ? Number(newLog.cost) : 0,
        status: newLog.status || 'Scheduled'
      }

      await api.post('/maintenance/', payload)
      // Refresh list to include both the record and any auto-created next-cycle maintenance record
      const mRes = await api.get('/maintenance/')
      setLogs(mRes.data)
      setNewLog({
        vehicle_id: vehicles[0]?.vehicle_id || '',
        maintenance_type: 'Oil Change',
        remarks: '',
        cost: '',
        service_date: new Date().toISOString().split('T')[0],
        next_service_date: '',
        status: 'Scheduled'
      })
      setIsAdding(false)
      window.dispatchEvent(new CustomEvent('fleetflow:datachanged', { detail: { entity: 'maintenance', action: 'create' } }))
      if (payload.next_service_date) {
        addToast(`🔧 Service logged & Next maintenance automatically scheduled for ${payload.next_service_date}!`, 'success', 'top-right')
      } else {
        addToast(`🔧 MAINTENANCE RECORDED: Service scheduled successfully.`, 'success', 'top-right')
      }
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
          status: newLog.status
        }
        setLogs((prev) => [mock, ...prev])
        setIsAdding(false)
        addToast(`⚠️ Offline mode: Created mock log record.`, 'warning', 'top-right')
      } else {
        const detail = err.response?.data?.detail || 'Could not commit maintenance record.'
        addToast(`❌ ERROR: ${detail}`, 'error', 'top-right')
      }
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!canModify || !editLog) return

    try {
      const payload = {
        maintenance_type: editLog.maintenance_type,
        remarks: editLog.remarks,
        service_date: editLog.service_date || null,
        next_service_date: editLog.next_service_date || null,
        cost: editLog.cost ? Number(editLog.cost) : 0,
        status: editLog.status
      }

      await api.put(`/maintenance/${editLog.maintenance_id}`, payload)
      // Refresh list to show updated record and any auto-created next maintenance record
      const mRes = await api.get('/maintenance/')
      setLogs(mRes.data)
      setIsEditing(false)
      setEditLog(null)
      window.dispatchEvent(new CustomEvent('fleetflow:datachanged', { detail: { entity: 'maintenance', action: 'update' } }))
      if (payload.next_service_date) {
        addToast(`🔧 Updated & Next service automatically scheduled for ${payload.next_service_date}!`, 'success', 'top-right')
      } else {
        addToast(`🔧 MAINTENANCE UPDATED: Changes saved successfully.`, 'success', 'top-right')
      }
    } catch (err) {
      console.error('Failed to update maintenance record:', err)
      const detail = err.response?.data?.detail || 'Could not update maintenance record.'
      addToast(`❌ ERROR: ${detail}`, 'error', 'top-right')
    }
  }

  const handleUpdateStatus = async (logId, currentStatus) => {
    if (!canModify) return
    const nextStatus = currentStatus === 'Scheduled' ? 'Resolved' : (currentStatus === 'Pending' ? 'Scheduled' : 'Scheduled')
    try {
      const res = await api.put(`/maintenance/${logId}`, { status: nextStatus })
      setLogs(prev => prev.map(l => l.maintenance_id === logId ? res.data : l))
      window.dispatchEvent(new CustomEvent('fleetflow:datachanged', { detail: { entity: 'maintenance', action: 'update_status' } }))
      addToast(`🔧 Status updated to ${nextStatus.toUpperCase()}`, 'success', 'top-right')
    } catch (err) {
      console.error('Failed to update maintenance status:', err)
      const detail = err.response?.data?.detail || 'Could not update status.'
      addToast(`❌ ERROR: ${detail}`, 'error', 'top-right')
    }
  }

  const handleDelete = async (logId) => {
    if (!canDelete) return
    const confirmed = window.confirm('⚠️ Remove this maintenance record from registry?')
    if (!confirmed) return

    try {
      await api.delete(`/maintenance/${logId}`)
      setLogs(prev => prev.filter(l => l.maintenance_id !== logId))
      window.dispatchEvent(new CustomEvent('fleetflow:datachanged', { detail: { entity: 'maintenance', action: 'delete' } }))
      addToast('🗑️ Maintenance log removed.', 'success', 'top-right')
    } catch (err) {
      console.error('Delete log failed:', err)
      const detail = err.response?.data?.detail || 'Could not delete log.'
      addToast(`❌ ERROR: ${detail}`, 'error', 'top-right')
    }
  }

  const handleMarkResolved = async (logId) => {
    if (!canModify) return
    try {
      const res = await api.put(`/maintenance/${logId}`, { status: 'Resolved' })
      setLogs(prev => prev.map(l => l.maintenance_id === logId ? res.data : l))
      window.dispatchEvent(new CustomEvent('fleetflow:datachanged', { detail: { entity: 'maintenance', action: 'resolve' } }))
      addToast('✅ MAINTENANCE RESOLVED: Service marked as completed. Alerts silenced.', 'success', 'top-right')
    } catch (err) {
      console.error('Failed to mark maintenance as resolved:', err)
      const detail = err.response?.data?.detail || 'Could not update status.'
      addToast(`❌ ERROR: ${detail}`, 'error', 'top-right')
    }
  }

  const getVehicleNumber = (vehicleId) => {
    const matched = vehicles.find(v => v.vehicle_id === vehicleId)
    return matched ? `${matched.registration_number} (${matched.model})` : vehicleId
  }

  const getResolutionStatusBadge = (log) => {
    if (log.status === 'Resolved' || log.status === 'Completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-950 border border-emerald-600 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-400 font-black rounded-full text-[10px] whitespace-nowrap shadow-sm">
          <svg className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Resolved (Ignored)</span>
        </span>
      )
    }

    if (!log.service_date) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800/60 dark:border-white/10 dark:text-slate-300 font-bold rounded-full text-[10px] whitespace-nowrap">
          <span>📅 Scheduled</span>
        </span>
      )
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sDate = new Date(log.service_date)
    sDate.setHours(0, 0, 0, 0)
    const diffTime = sDate - today
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      const overdueDays = Math.abs(diffDays)
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-950 border border-rose-600 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-rose-400 font-black rounded-full text-[10px] whitespace-nowrap animate-pulse shadow-sm">
          <svg className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="9" x2="12" y2="13" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="17" x2="12.01" y2="17" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Overdue by {overdueDays}d (Alerting)</span>
        </span>
      )
    } else if (diffDays === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-950 border border-amber-600 dark:bg-amber-500/15 dark:border-amber-500/40 dark:text-amber-300 font-black rounded-full text-[10px] whitespace-nowrap shadow-sm animate-pulse">
          <svg className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Due Today (Service Alert)</span>
        </span>
      )
    } else if (diffDays === 1) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-950 border border-orange-600 dark:bg-orange-500/15 dark:border-orange-500/30 dark:text-orange-300 font-black rounded-full text-[10px] whitespace-nowrap shadow-sm">
          <svg className="w-3.5 h-3.5 text-orange-700 dark:text-orange-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Due Tomorrow (1-Day Warning)</span>
        </span>
      )
    } else if (diffDays <= 5) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-50 text-cyan-950 border border-cyan-600 dark:bg-cyan-500/15 dark:border-cyan-500/30 dark:text-cyan-300 font-black rounded-full text-[10px] whitespace-nowrap shadow-sm">
          <span>📅 Due in {diffDays}d (5-Day Warning)</span>
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800/60 dark:border-white/10 dark:text-slate-300 font-bold rounded-full text-[10px] whitespace-nowrap">
          <span>📅 Scheduled</span>
        </span>
      )
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Resolved': 
      case 'Completed':
        return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
      case 'Scheduled': 
        return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
      case 'Pending': 
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400'
      default: 
        return 'bg-slate-500/10 border-slate-500/30 text-slate-400'
    }
  }

  // Filter logs by search query and status
  const filteredLogs = logs.filter((l) => {
    const vehName = getVehicleNumber(l.vehicle_id).toLowerCase()
    const type = (l.maintenance_type || '').toLowerCase()
    const remarks = (l.remarks || '').toLowerCase()
    const q = searchQuery.toLowerCase()
    const matchesSearch = !q || vehName.includes(q) || type.includes(q) || remarks.includes(q)
    const matchesStatus = statusFilter === 'ALL' || l.status?.toUpperCase() === statusFilter
    return matchesSearch && matchesStatus
  })

  // Calculate active alerts (records that are NOT resolved and are due within 5 days, due today, or overdue)
  const activeAlerts = logs.filter(l => {
    if (l.status === 'Resolved' || l.status === 'Completed') return false
    if (!l.service_date) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sDate = new Date(l.service_date)
    sDate.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil((sDate - today) / (1000 * 60 * 60 * 24))
    return diffDays <= 5 // 5 days, 1 day, today, or overdue
  }).map(l => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sDate = new Date(l.service_date)
    sDate.setHours(0, 0, 0, 0)
    const diffDays = Math.ceil((sDate - today) / (1000 * 60 * 60 * 24))
    return {
      ...l,
      diffDays,
      isOverdue: diffDays < 0,
      isDueToday: diffDays === 0,
      isDueTomorrow: diffDays === 1,
      isDueSoon: diffDays > 1 && diffDays <= 5
    }
  })

  const overdueCount = activeAlerts.filter(a => a.isOverdue).length
  const dueSoonCount = activeAlerts.filter(a => !a.isOverdue).length

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
    <div className="w-full relative z-10 font-mono text-xs space-y-6">
      
      {/* Active Maintenance Service Alerts Banner (Medium Size & Sleek Layout) */}
      {activeAlerts.length > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 backdrop-blur-md shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-amber-500/15 pb-2.5">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-xs shadow-[0_0_10px_rgba(245,158,11,0.2)] flex-shrink-0">
                🛡️
              </div>
              <div>
                <h3 className="text-xs font-bold text-amber-400 m-0 tracking-wide flex items-center gap-2">
                  <span>Active Maintenance Service Alerts</span>
                  <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded text-[10px]">
                    {activeAlerts.length}
                  </span>
                </h3>
                <p className="text-[9px] text-amber-200/60 m-0 mt-0.5 font-sans">
                  Rules: <span className="text-amber-300 font-semibold">5-Day Email</span> • <span className="text-amber-300 font-semibold">1-Day Email</span> • <span className="text-amber-300 font-semibold">Due Today (Dashboard)</span> • <span className="text-amber-300 font-semibold">Overdue (Dashboard)</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {overdueCount > 0 && (
                <span className="px-2.5 py-0.5 bg-rose-500/20 border border-rose-500/40 text-rose-400 font-bold rounded-full text-[9px] shadow-sm animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  <span>{overdueCount} Overdue</span>
                </span>
              )}
              {dueSoonCount > 0 && (
                <span className="px-2.5 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold rounded-full text-[9px] shadow-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span>{dueSoonCount} Due Soon</span>
                </span>
              )}
            </div>
          </div>

          {/* Medium Sized Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeAlerts.map((a) => (
              <div
                key={a.maintenance_id}
                className="p-3 rounded-lg border border-white/10 bg-slate-950/80 hover:border-amber-500/30 transition-all shadow-md flex flex-col justify-between space-y-2.5"
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="font-bold text-amber-400 text-[11px] truncate" title={getVehicleNumber(a.vehicle_id)}>
                    {getVehicleNumber(a.vehicle_id)}
                  </span>
                  {a.isOverdue ? (
                    <span className="px-2 py-0.5 bg-rose-500/20 border border-rose-500/40 text-rose-400 text-[8px] font-bold rounded uppercase whitespace-nowrap">
                      {Math.abs(a.diffDays)}d Overdue
                    </span>
                  ) : a.isDueTomorrow ? (
                    <span className="px-2 py-0.5 bg-orange-500/20 border border-orange-500/40 text-orange-300 text-[8px] font-bold rounded uppercase whitespace-nowrap">
                      1-Day Warning
                    </span>
                  ) : a.isDueToday ? (
                    <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[8px] font-bold rounded uppercase animate-pulse whitespace-nowrap">
                      Due Today
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[8px] font-bold rounded uppercase whitespace-nowrap">
                      {a.diffDays}d Notice
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-end gap-2 pt-0.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-white font-bold text-xs truncate leading-snug" title={a.maintenance_type}>
                      {a.maintenance_type}
                    </div>
                    <div className="text-[9px] text-white/40 mt-0.5">
                      Scheduled: <span className="text-slate-300 font-semibold">{a.service_date ? a.service_date.split('T')[0] : 'Pending'}</span>
                    </div>
                  </div>

                  {canModify ? (
                    <button
                      onClick={() => handleMarkResolved(a.maintenance_id)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-md transition-all shadow-sm flex items-center gap-1 cursor-pointer flex-shrink-0"
                      title="Mark resolved"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Resolve</span>
                    </button>
                  ) : (
                    <span className="text-amber-400 text-[9px] font-bold flex-shrink-0">Pending</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search by vehicle, service type, remarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-white/10 bg-white/5 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#00f0ff] focus:ring-2 focus:ring-[#00f0ff]/20 transition-all duration-200 text-xs shadow-sm"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-white/10 bg-slate-950 rounded-xl text-white text-xs focus:outline-none focus:border-[#00f0ff] cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="PENDING">Pending</option>
            <option value="RESOLVED">Resolved</option>
          </select>

          {/* Clear Filters Button */}
          {(searchQuery || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('ALL')
              }}
              className="px-3 py-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Clear search query and status filter"
            >
              <span>✕</span>
              <span>Clear</span>
            </button>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="py-2 px-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Refresh maintenance data"
          >
            <span className={`inline-block ${isRefreshing ? 'animate-spin' : ''}`}>🔄</span>
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          {canModify && (
            <button
              onClick={() => setIsAdding(true)}
              className="py-2 px-4 bg-[#00f0ff] hover:bg-[#00d2e0] text-[#06070d] rounded-xl font-bold text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.35)] text-center whitespace-nowrap"
            >
              + Schedule Service
            </button>
          )}
        </div>
      </div>

      {/* Main Table Container */}
      <div className="glass-card border border-white/10 p-6 bg-slate-950/40 w-full">
        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-3">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-bold text-white tracking-wide uppercase font-mono m-0">
              [ FLEET MAINTENANCE LOGS ]
            </h2>
            <span className="text-white/40 text-xs">
              ({filteredLogs.length} records)
            </span>
          </div>
          {canModify && (
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
              ⚡ Manager Clearance Active
            </span>
          )}
        </div>

        {/* Table layout */}
        {filteredLogs.length === 0 ? (
          <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-12 text-center text-white/40 font-medium font-mono text-xs">
            No maintenance records match current query.
          </div>
        ) : (
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm font-mono border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-white/50 text-[10px] tracking-wider uppercase">
                  <th className="py-3 px-3">VEHICLE</th>
                  <th className="py-3 px-3">SERVICE TYPE</th>
                  <th className="py-3 px-3">SERVICE DATE</th>
                  <th className="py-3 px-3">NEXT CYCLE</th>
                  <th className="py-3 px-3">RESOLUTION STATUS</th>
                  <th className="py-3 px-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-white/90">
                {filteredLogs.map((l) => (
                  <tr key={l.maintenance_id} className="hover:bg-white/2 transition-colors">
                    <td className="py-3.5 px-3 font-bold text-cyan-400">
                      <div>{getVehicleNumber(l.vehicle_id)}</div>
                      {l.remarks && <div className="text-[10px] text-slate-400 font-normal truncate max-w-[180px]" title={l.remarks}>{l.remarks}</div>}
                    </td>
                    <td className="py-3.5 px-3 text-white font-medium">
                      {l.maintenance_type}
                      {l.cost > 0 && <div className="text-[10px] text-slate-400 font-normal">Rs {l.cost.toLocaleString()}</div>}
                    </td>
                    <td className="py-3.5 px-3 text-slate-300">
                      {l.service_date ? l.service_date.split('T')[0] : 'Pending'}
                    </td>
                    <td className="py-3.5 px-3 text-slate-400">
                      {l.next_service_date ? l.next_service_date.split('T')[0] : '—'}
                    </td>
                    <td className="py-3.5 px-3">
                      {getResolutionStatusBadge(l)}
                    </td>
                    <td className="py-3.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-2.5">
                        {l.status === 'Resolved' || l.status === 'Completed' ? (
                          <span className="text-emerald-400 font-bold text-xs flex items-center gap-1 select-none px-2 py-1">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span>Completed</span>
                          </span>
                        ) : canModify ? (
                          <button
                            onClick={() => handleMarkResolved(l.maintenance_id)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold text-xs transition-all shadow-[0_0_12px_rgba(16,185,129,0.35)] flex items-center gap-1.5 cursor-pointer"
                            title="Mark as Resolved to silence Celery notification alarms"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round"/>
                              <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span>Mark Resolved</span>
                          </button>
                        ) : (
                          <span className="text-amber-400/80 font-bold text-[11px] px-2 py-1">Pending</span>
                        )}

                        {canModify && (
                          <button
                            onClick={() => handleStartEdit(l)}
                            className="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-600 text-cyan-900 hover:text-white border border-cyan-500 rounded-lg cursor-pointer font-black text-[10px] transition-all dark:bg-cyan-500/20 dark:hover:bg-cyan-500/30 dark:text-cyan-400 dark:border-cyan-500/30 shadow-sm"
                          >
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(l.maintenance_id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-400 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 dark:text-rose-400 dark:border-rose-500/30 rounded-lg transition-all cursor-pointer shadow-sm flex items-center justify-center"
                            title="Delete Log"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Card layout for mobile */}
        <div className="md:hidden space-y-4 mt-4">
          {filteredLogs.map((l) => (
            <div key={l.maintenance_id} className="p-4 border border-white/5 bg-slate-950/45 rounded-2xl flex flex-col space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-cyan-400 text-sm">{getVehicleNumber(l.vehicle_id)}</span>
                <div>{getResolutionStatusBadge(l)}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-white/70">
                <div>
                  <span className="text-[9px] text-white/40 block">SERVICE TYPE</span>
                  <span className="text-white">{l.maintenance_type}</span>
                </div>
                <div>
                  <span className="text-[9px] text-white/40 block">SERVICE DATE</span>
                  <span>{l.service_date ? l.service_date.split('T')[0] : 'Pending'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-white/40 block">NEXT CYCLE</span>
                  <span>{l.next_service_date ? l.next_service_date.split('T')[0] : '—'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-white/40 block">COST</span>
                  <span className="text-white font-bold">{l.cost > 0 ? `Rs ${l.cost}` : '--'}</span>
                </div>
              </div>
              <div className="border-t border-white/5 pt-2 flex justify-between items-center">
                <div>
                  {l.status === 'Resolved' || l.status === 'Completed' ? (
                    <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                      ✓ Completed
                    </span>
                  ) : canModify ? (
                    <button
                      onClick={() => handleMarkResolved(l.maintenance_id)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold text-xs flex items-center gap-1 shadow-sm"
                    >
                      ✓ Mark Resolved
                    </button>
                  ) : (
                    <span className="text-amber-400 font-bold text-xs">Pending</span>
                  )}
                </div>
                {canModify && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleStartEdit(l)}
                      className="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-600 text-cyan-900 hover:text-white border border-cyan-500 rounded-lg cursor-pointer font-black text-[10px] transition-all dark:bg-cyan-500/20 dark:hover:bg-cyan-500/30 dark:text-cyan-400 dark:border-cyan-500/30 shadow-sm"
                    >
                      Edit
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(l.maintenance_id)}
                        className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-400 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 dark:text-rose-400 dark:border-rose-500/30 rounded-lg transition-all cursor-pointer shadow-sm flex items-center justify-center"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Schedule Maintenance Service (Admin & Fleet Manager Only) */}
      {canModify && isAdding && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in text-white">
          <div className="w-full max-w-lg border border-white/15 p-6 bg-slate-950/95 relative rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-5">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono m-0">
                [ SCHEDULE VEHICLE SERVICE ]
              </h3>
              <button 
                onClick={() => setIsAdding(false)} 
                className="text-white/40 hover:text-white cursor-pointer font-bold text-xs bg-transparent border-none outline-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="text-[9px] text-white/40 block mb-1.5">[ SELECT VEHICLE ]</label>
                <select
                  name="vehicle_id"
                  value={newLog.vehicle_id}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs"
                >
                  {vehicles.length === 0 ? (
                    <option value="">-- No vehicles registered --</option>
                  ) : (
                    vehicles.map(v => (
                      <option key={v.vehicle_id} value={v.vehicle_id}>
                        {v.registration_number} ({v.brand} {v.model}) - {v.status}
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
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs"
                >
                  <option value="Oil Change">Oil Change</option>
                  <option value="Tire Replacement">Tire Replacement</option>
                  <option value="Engine Service">Engine Service</option>
                  <option value="Brake Service">Brake Service</option>
                  <option value="General Inspection">General Inspection</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ SERVICE COST (Rs) ]</label>
                  <input
                    name="cost"
                    type="number"
                    placeholder="e.g. 500"
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
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs"
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
                  <span className="text-[8px] text-cyan-400/80 font-sans block mt-1">
                    ⚡ Auto-creates next maintenance record for this date
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[9px] text-white/40 block mb-1.5">[ SERVICE REMARKS &amp; DETAILS (OPTIONAL) ]</label>
                <textarea
                  name="remarks"
                  placeholder="Optional remarks, observations, or service notes..."
                  value={newLog.remarks}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs resize-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold font-mono text-xs cursor-pointer transition-all border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00f0ff] hover:bg-[#00d2e0] text-[#06070d] rounded-xl font-bold font-mono text-xs cursor-pointer shadow-[0_0_12px_rgba(0,240,255,0.35)] transition-all border-none"
                >
                  Schedule Service
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Edit Maintenance Record (Admin & Fleet Manager Only) */}
      {canModify && isEditing && editLog && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in text-white">
          <div className="w-full max-w-lg border border-white/15 p-6 bg-slate-950/95 relative rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.85)] max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-5">
              <div className="flex items-center space-x-3">
                <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono m-0">
                  [ EDIT MAINTENANCE RECORD ]
                </h3>
                <span className="text-cyan-400 font-bold text-xs">
                  {getVehicleNumber(editLog.vehicle_id)}
                </span>
              </div>
              <button 
                onClick={() => { setIsEditing(false); setEditLog(null); }} 
                className="text-white/40 hover:text-white cursor-pointer font-bold text-xs bg-transparent border-none outline-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="text-[9px] text-white/40 block mb-1.5">[ SERVICE TYPE ]</label>
                <select
                  name="maintenance_type"
                  value={editLog.maintenance_type}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs"
                >
                  <option value="Oil Change">Oil Change</option>
                  <option value="Tire Replacement">Tire Replacement</option>
                  <option value="Engine Service">Engine Service</option>
                  <option value="Brake Service">Brake Service</option>
                  <option value="General Inspection">General Inspection</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ SERVICE COST (Rs) ]</label>
                  <input
                    name="cost"
                    type="number"
                    placeholder="e.g. 500"
                    value={editLog.cost}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ STATUS ]</label>
                  <select
                    name="status"
                    value={editLog.status}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs font-bold text-cyan-400"
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
                    value={editLog.service_date}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ NEXT SERVICE DUE ]</label>
                  <input
                    name="next_service_date"
                    type="date"
                    value={editLog.next_service_date}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs"
                  />
                  <span className="text-[8px] text-cyan-400/80 font-sans block mt-1">
                    ⚡ Auto-creates next maintenance record for this date
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[9px] text-white/40 block mb-1.5">[ SERVICE REMARKS &amp; DETAILS (OPTIONAL) ]</label>
                <textarea
                  name="remarks"
                  placeholder="Optional service details and observations..."
                  value={editLog.remarks || ''}
                  onChange={handleEditChange}
                  rows="3"
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs resize-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => { setIsEditing(false); setEditLog(null); }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold font-mono text-xs cursor-pointer transition-all border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00f0ff] hover:bg-[#00d2e0] text-[#06070d] rounded-xl font-bold font-mono text-xs cursor-pointer shadow-[0_0_12px_rgba(0,240,255,0.35)] transition-all border-none"
                >
                  Save Changes
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

export default MaintenancePanel
