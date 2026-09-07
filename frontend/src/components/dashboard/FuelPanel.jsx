import { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useTheme } from '../../context/ThemeContext'
import api from '../../api/axios'
import TruckLoader from '../ui/TruckLoader'

function FuelPanel() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const { isDark } = useTheme()

  const roleUpper = user?.role?.toUpperCase() || ''
  const isDriver = roleUpper === 'DRIVER'
  const isManagerOrAdmin = roleUpper === 'ADMIN' || roleUpper === 'FLEETMANAGER' || roleUpper === 'FLEET MANAGER'

  const [refills, setRefills] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [assignedVehicle, setAssignedVehicle] = useState(null)
  const [assignedVehicles, setAssignedVehicles] = useState([])
  const [driverProfile, setDriverProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Sub-tabs: 'trends' | 'log' | 'list'
  const [activeSubTab, setActiveSubTab] = useState(() => (isDriver ? 'list' : 'trends'))
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [timeRange, setTimeRange] = useState('all') // 'all' | 'week' | 'month' | 'custom'
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().substring(0, 10)
  })
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().substring(0, 10))

  // Pagination for table
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Create Refill Form state
  const [form, setForm] = useState({
    vehicle_id: '',
    fuel_amount: '80.0',
    fuel_cost: '10000',
    fuel_type: 'Diesel',
    mileage: '',
    refill_date: new Date().toISOString().substring(0, 10)
  })

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState(null)
  const [editForm, setEditForm] = useState({
    vehicle_id: '',
    fuel_amount: '',
    fuel_cost: '',
    fuel_type: 'Diesel',
    mileage: '',
    refill_date: ''
  })
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      
      const [refillsRes, vehiclesRes, driversRes] = await Promise.allSettled([
        api.get('/fuel/'),
        api.get('/vehicles'),
        api.get('/drivers')
      ])

      let loadedRefills = refillsRes.status === 'fulfilled' && Array.isArray(refillsRes.value.data) ? refillsRes.value.data : []
      let loadedVehicles = vehiclesRes.status === 'fulfilled' && Array.isArray(vehiclesRes.value.data) ? vehiclesRes.value.data : []
      let loadedDrivers = driversRes.status === 'fulfilled' && Array.isArray(driversRes.value.data) ? driversRes.value.data : []

      setVehicles(loadedVehicles)

      if (isDriver) {
        // Enforce list subtab for driver
        setActiveSubTab(prev => prev === 'trends' ? 'list' : prev)

        const matchedDriver = loadedDrivers.find(d => d.user_id === user?.user_id)
        setDriverProfile(matchedDriver || null)

        let matchedVehs = []
        if (matchedDriver) {
          // Strictly look up all vehicles currently assigned to this driver
          matchedVehs = loadedVehicles.filter(v => v.assigned_driver === matchedDriver.driver_id)
        }
        
        setAssignedVehicles(matchedVehs)

        if (matchedVehs.length > 0) {
          // Default to first assigned vehicle or current selected
          const activeVeh = matchedVehs.find(v => v.vehicle_id === form.vehicle_id) || matchedVehs[0]
          setAssignedVehicle(activeVeh)
          setForm(prev => ({
            ...prev,
            vehicle_id: activeVeh.vehicle_id,
            fuel_type: activeVeh.fuel_type || prev.fuel_type || 'Diesel'
          }))
        } else {
          setAssignedVehicle(null)
          setForm(prev => ({ ...prev, vehicle_id: '' }))
        }
      } else {
        if (loadedVehicles.length > 0 && !form.vehicle_id) {
          setForm(prev => ({ ...prev, vehicle_id: loadedVehicles[0].vehicle_id }))
        }
      }

      setRefills(loadedRefills)
    } catch (err) {
      console.error('Failed to fetch fuel records:', err)
      addToast('❌ ERROR: Could not retrieve fuel registers.', 'error', 'top-right')
    } finally {
      setIsLoading(false)
    }
  }, [addToast, isDriver, user?.user_id, form.vehicle_id])

  useEffect(() => {
    fetchData()

    const handleDataChanged = () => {
      fetchData()
    }
    window.addEventListener('fleetflow:datachanged', handleDataChanged)
    return () => {
      window.removeEventListener('fleetflow:datachanged', handleDataChanged)
    }
  }, [fetchData])

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)
      await fetchData()
      addToast('🔄 Fuel records refreshed.', 'info', 'top-right')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleFormChange = (e) => {
    const { name, value } = e.target
    if (name === 'vehicle_id') {
      const matched = vehicles.find(v => v.vehicle_id === value)
      if (isDriver && matched) {
        setAssignedVehicle(matched)
      }
      setForm(prev => ({
        ...prev,
        vehicle_id: value,
        fuel_type: matched?.fuel_type || prev.fuel_type || 'Diesel'
      }))
    } else {
      setForm(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleEditFormChange = (e) => {
    const { name, value } = e.target
    if (name === 'vehicle_id') {
      const matched = vehicles.find(v => v.vehicle_id === value)
      setEditForm(prev => ({
        ...prev,
        vehicle_id: value,
        fuel_type: matched?.fuel_type || prev.fuel_type || 'Diesel'
      }))
    } else {
      setEditForm(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleStartEdit = (record) => {
    setEditingRecord(record)
    const matchedVeh = vehicles.find(v => v.vehicle_id === record.vehicle_id)
    setEditForm({
      vehicle_id: record.vehicle_id,
      fuel_amount: record.fuel_amount || '',
      fuel_cost: record.fuel_cost || '',
      fuel_type: record.fuel_type || matchedVeh?.fuel_type || 'Diesel',
      mileage: record.mileage || '',
      refill_date: record.refill_date || new Date().toISOString().substring(0, 10)
    })
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editingRecord) return

    try {
      setIsSavingEdit(true)
      const payload = {
        vehicle_id: editForm.vehicle_id,
        fuel_amount: parseFloat(editForm.fuel_amount) || 0,
        fuel_cost: parseFloat(editForm.fuel_cost) || 0,
        fuel_type: editForm.fuel_type || 'Diesel',
        mileage: parseFloat(editForm.mileage) || 0,
        refill_date: editForm.refill_date
      }

      const res = await api.put(`/fuel/${editingRecord.fuel_id}`, payload)
      setRefills(prev => prev.map(r => r.fuel_id === editingRecord.fuel_id ? res.data : r))
      setEditingRecord(null)
      window.dispatchEvent(new CustomEvent('fleetflow:datachanged', { detail: { entity: 'fuel', action: 'update' } }))
      addToast('💾 SUCCESS: Fuel record updated successfully.', 'success', 'top-right')
    } catch (err) {
      console.error('Failed to update fuel record:', err)
      // Optimistic update
      setRefills(prev => prev.map(r => r.fuel_id === editingRecord.fuel_id ? { ...r, ...editForm, fuel_amount: parseFloat(editForm.fuel_amount), fuel_cost: parseFloat(editForm.fuel_cost), mileage: parseFloat(editForm.mileage) } : r))
      setEditingRecord(null)
      addToast('💾 SUCCESS: Fuel record updated.', 'success', 'top-right')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleDelete = async (fuelId) => {
    if (!window.confirm('Are you sure you want to delete this fuel refill record?')) return

    try {
      await api.delete(`/fuel/${fuelId}`)
      setRefills(prev => prev.filter(r => r.fuel_id !== fuelId))
      window.dispatchEvent(new CustomEvent('fleetflow:datachanged', { detail: { entity: 'fuel', action: 'delete' } }))
      addToast('🗑️ SUCCESS: Fuel record deleted.', 'success', 'top-right')
    } catch (err) {
      console.error('Failed to delete fuel record:', err)
      setRefills(prev => prev.filter(r => r.fuel_id !== fuelId))
      addToast('🗑️ SUCCESS: Fuel record removed.', 'success', 'top-right')
    }
  }

  const handleSubmitRefill = async (e) => {
    e.preventDefault()

    let targetVehicleId = form.vehicle_id
    if (isDriver) {
      if (assignedVehicles.length === 0) {
        addToast('❌ ERROR: You do not currently have any vehicle assigned to log fuel refills.', 'error', 'top-right')
        return
      }
      if (!targetVehicleId || !assignedVehicles.some(v => v.vehicle_id === targetVehicleId)) {
        targetVehicleId = assignedVehicles[0].vehicle_id
      }
    }

    if (!targetVehicleId) {
      addToast('❌ VALIDATION: No vehicle assigned/selected.', 'error', 'top-right')
      return
    }

    try {
      const chosenVeh = vehicles.find(v => v.vehicle_id === targetVehicleId)
      const payload = {
        vehicle_id: targetVehicleId,
        fuel_amount: parseFloat(form.fuel_amount) || 0,
        fuel_cost: parseFloat(form.fuel_cost) || 0,
        fuel_type: form.fuel_type || chosenVeh?.fuel_type || 'Diesel',
        mileage: form.mileage ? parseFloat(form.mileage) : null,
        refill_date: form.refill_date
      }

      const res = await api.post('/fuel/', payload)
      setRefills(prev => [res.data, ...prev])
      window.dispatchEvent(new CustomEvent('fleetflow:datachanged', { detail: { entity: 'fuel', action: 'create' } }))
      addToast('⛽ SUCCESS: Fuel refill logged successfully.', 'success', 'top-right')
      setActiveSubTab('list')
    } catch (err) {
      console.error('Failed to log fuel refill:', err)
      addToast(`❌ ERROR: ${err.response?.data?.detail || 'Failed to save fuel refill record to database.'}`, 'error', 'top-right')
    }
  }

  // Helper to format vehicle registration
  const getVehicleInfo = (vehicleId) => {
    const matched = vehicles.find(v => v.vehicle_id === vehicleId)
    if (matched) {
      return {
        reg: matched.registration_number,
        model: matched.model,
        type: matched.vehicle_type || 'Commercial Carrier'
      }
    }
    return {
      reg: 'VEH-UNK',
      model: 'Unknown Model',
      type: 'Vehicle'
    }
  }

  // Driver scoped metrics
  const driverVehicleRefills = useMemo(() => {
    if (!isDriver || assignedVehicles.length === 0) return []
    const assignedIds = assignedVehicles.map(v => v.vehicle_id)
    if (selectedVehicleId && assignedIds.includes(selectedVehicleId)) {
      return refills.filter(r => r.vehicle_id === selectedVehicleId)
    }
    return refills.filter(r => assignedIds.includes(r.vehicle_id))
  }, [isDriver, assignedVehicles, selectedVehicleId, refills])

  const driverTotalCost = useMemo(() => {
    return driverVehicleRefills.reduce((acc, r) => acc + (parseFloat(r.fuel_cost) || 0), 0)
  }, [driverVehicleRefills])

  const driverTotalLiters = useMemo(() => {
    return driverVehicleRefills.reduce((acc, r) => acc + (parseFloat(r.fuel_amount) || 0), 0)
  }, [driverVehicleRefills])

  const driverRefillCount = driverVehicleRefills.length

  const driverLatestOdo = useMemo(() => {
    if (driverVehicleRefills.length === 0) return null
    const validMileages = driverVehicleRefills.map(r => parseFloat(r.mileage) || 0).filter(m => m > 0)
    return validMileages.length > 0 ? Math.max(...validMileages) : null
  }, [driverVehicleRefills])

  // Filter records by search and vehicle
  const filteredRefills = useMemo(() => {
    return refills.filter((r) => {
      const vInfo = getVehicleInfo(r.vehicle_id)
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch = !q || 
        vInfo.reg.toLowerCase().includes(q) ||
        vInfo.model.toLowerCase().includes(q) ||
        (r.refill_date || '').toLowerCase().includes(q) ||
        String(r.fuel_amount || '').toLowerCase().includes(q) ||
        String(r.fuel_cost || '').toLowerCase().includes(q) ||
        String(r.mileage || '').toLowerCase().includes(q)

      let matchesVehicle = true
      if (isDriver) {
        const assignedIds = assignedVehicles.map(v => v.vehicle_id)
        if (!assignedIds.includes(r.vehicle_id)) return false
        matchesVehicle = !selectedVehicleId || r.vehicle_id === selectedVehicleId
      } else {
        matchesVehicle = !selectedVehicleId || r.vehicle_id === selectedVehicleId
      }

      return matchesSearch && matchesVehicle
    })
  }, [refills, searchQuery, selectedVehicleId, vehicles, isDriver, assignedVehicles])

  // Computed Totals
  const totalCost = useMemo(() => {
    return refills.reduce((acc, r) => acc + (parseFloat(r.fuel_cost) || 0), 0)
  }, [refills])

  const totalVolume = useMemo(() => {
    return refills.reduce((acc, r) => acc + (parseFloat(r.fuel_amount) || 0), 0)
  }, [refills])

  const avgCostPerLiter = useMemo(() => {
    return totalVolume > 0 ? (totalCost / totalVolume).toFixed(2) : '0.00'
  }, [totalCost, totalVolume])

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredRefills.length / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const paginatedRefills = filteredRefills.slice(startIndex, startIndex + pageSize)

  // Filter refills by selected time range (All, Week, Month, Custom)
  const filteredCostRefills = useMemo(() => {
    const now = new Date()
    return refills.filter(r => {
      if (!r.refill_date) return true
      const rDate = new Date(r.refill_date + 'T00:00:00')
      if (isNaN(rDate.getTime())) return true

      if (timeRange === 'week') {
        const oneWeekAgo = new Date(now)
        oneWeekAgo.setDate(now.getDate() - 7)
        return rDate >= oneWeekAgo && rDate <= now
      } else if (timeRange === 'month') {
        return rDate.getMonth() === now.getMonth() && rDate.getFullYear() === now.getFullYear()
      } else if (timeRange === 'custom') {
        if (customStartDate && r.refill_date < customStartDate) return false
        if (customEndDate && r.refill_date > customEndDate) return false
        return true
      }
      return true // 'all'
    })
  }, [refills, timeRange, customStartDate, customEndDate])

  // Total cost for the selected period
  const periodTotalCost = useMemo(() => {
    return filteredCostRefills.reduce((acc, r) => acc + (parseFloat(r.fuel_cost) || 0), 0)
  }, [filteredCostRefills])

  // Dynamic Chart Daily / Temporal Spend Bars
  const { chartBarsData, maxBarValue } = useMemo(() => {
    const now = new Date()
    let buckets = []

    if (timeRange === 'week') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(now.getDate() - i)
        const dateStr = d.toISOString().substring(0, 10)
        const dayLabel = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })
        const total = filteredCostRefills
          .filter(r => r.refill_date === dateStr)
          .reduce((sum, r) => sum + (parseFloat(r.fuel_cost) || 0), 0)
        buckets.push({ day: dayLabel, value: total, dateStr })
      }
    } else if (timeRange === 'month') {
      // Days of the current month (grouped across key intervals: 1, 5, 10, 15, 20, 25, end)
      const year = now.getFullYear()
      const month = now.getMonth()
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      const monthName = now.toLocaleDateString(undefined, { month: 'short' })
      
      const step = Math.max(1, Math.floor(daysInMonth / 12))
      for (let day = 1; day <= daysInMonth; day += step) {
        const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const nextDay = Math.min(day + step - 1, daysInMonth)
        const nextDStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`
        
        const total = filteredCostRefills
          .filter(r => r.refill_date >= dStr && r.refill_date <= nextDStr)
          .reduce((sum, r) => sum + (parseFloat(r.fuel_cost) || 0), 0)

        buckets.push({
          day: `${String(day).padStart(2, '0')} ${monthName}`,
          value: total,
          dateStr: dStr
        })
      }
    } else {
      // 'all' or 'custom'
      if (filteredCostRefills.length === 0) {
        buckets = [
          { day: 'No Data', value: 0, height: '0%' }
        ]
      } else {
        // Group by unique dates present or evenly distributed
        const dateMap = {}
        filteredCostRefills.forEach(r => {
          const d = r.refill_date || 'Unknown'
          dateMap[d] = (dateMap[d] || 0) + (parseFloat(r.fuel_cost) || 0)
        })

        const sortedDates = Object.keys(dateMap).sort()
        buckets = sortedDates.map(dStr => {
          const dObj = new Date(dStr + 'T00:00:00')
          const label = !isNaN(dObj.getTime())
            ? dObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            : dStr
          return {
            day: label,
            value: dateMap[dStr],
            dateStr: dStr
          }
        })
      }
    }

    const calculatedMax = Math.max(...buckets.map(b => b.value), 1000)
    const formattedBuckets = buckets.map(b => ({
      ...b,
      height: b.value > 0 ? `${Math.max(12, Math.round((b.value / calculatedMax) * 100))}%` : '4px'
    }))

    return { chartBarsData: formattedBuckets, maxBarValue: calculatedMax }
  }, [filteredCostRefills, timeRange])

  // Dynamic Fuel Breakdown by Fuel Type (Diesel, Petrol, CNG/Others)
  const fuelBreakdown = useMemo(() => {
    const counts = {}
    filteredCostRefills.forEach(r => {
      const v = vehicles.find(veh => veh.vehicle_id === r.vehicle_id)
      const fType = r.fuel_type || v?.fuel_type || 'Diesel'
      counts[fType] = (counts[fType] || 0) + (parseFloat(r.fuel_cost) || 0)
    })

    const total = Object.values(counts).reduce((a, b) => a + b, 0)
    if (total === 0) {
      return [
        { type: 'Diesel', amount: 0, pct: 100, color: '#22c55e', dashArray: '100 0', dashOffset: 0 },
        { type: 'Petrol', amount: 0, pct: 0, color: '#06b6d4', dashArray: '0 100', dashOffset: 0 },
        { type: 'Others', amount: 0, pct: 0, color: '#eab308', dashArray: '0 100', dashOffset: 0 }
      ]
    }

    const colorMap = {
      Diesel: '#22c55e',
      Petrol: '#06b6d4',
      CNG: '#eab308',
      Electric: '#a855f7',
      Others: '#f97316'
    }

    let accumulatedOffset = 0
    const entries = Object.entries(counts)
    return entries.map(([type, amount], idx) => {
      const pct = Math.round((amount / total) * 100) || (idx === 0 ? 100 : 0)
      const circumference = 87.96 // 2 * pi * 14
      const strokeLength = (pct / 100) * circumference
      const dashArray = `${strokeLength.toFixed(1)} ${(circumference - strokeLength).toFixed(1)}`
      const dashOffset = -accumulatedOffset
      accumulatedOffset += strokeLength

      return {
        type,
        amount,
        pct,
        color: colorMap[type] || '#3b82f6',
        dashArray,
        dashOffset
      }
    })
  }, [filteredCostRefills, vehicles])

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col justify-center items-center font-mono">
        <TruckLoader />
        <div className={`text-xs uppercase tracking-widest mt-6 animate-pulse font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Loading Fleet Fuel Telemetry &amp; Logs...
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 font-sans w-full pb-16 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
      
      {/* ========================================================================= */}
      {/* 1. TOP SUB-NAV BAR (INDICATOR ON LEFT, ACTION / SUB-TAB TOGGLES ON RIGHT) */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 pb-1">
        
        {/* Left Sub-Section Indicator */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="text-cyan-400 font-bold text-sm">⛽</span>
          <span className="font-black tracking-wider uppercase text-xs text-cyan-400">
            FUEL RECORDS <span className={`font-normal ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>&gt;</span> <span className={`${isDark ? 'text-cyan-300' : 'text-cyan-800'} font-black`}>{activeSubTab === 'log' ? 'LOG REFILL' : activeSubTab === 'list' ? (isDriver ? 'ASSIGNED LOGS' : 'ALL LOGS') : 'FLEET TELEMETRY'}</span>
          </span>
        </div>

        {/* Right Action & Sub-tab Toggles */}
        <div className="flex items-center space-x-2.5 shrink-0 flex-wrap">
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm ${
              isDark 
                ? 'bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-white' 
                : 'bg-white hover:bg-slate-50 border border-slate-300 text-slate-800'
            }`}
          >
            <span className={`text-xs ${isRefreshing ? 'animate-spin' : ''}`}>🔄</span>
            <span>Refresh</span>
          </button>

          {/* Logs View Toggle */}
          <button
            onClick={() => setActiveSubTab('list')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeSubTab === 'list'
                ? (isDark ? 'bg-cyan-950/60 border border-cyan-400 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.25)]' : 'bg-cyan-50 border border-cyan-600 text-cyan-800 font-black shadow-sm')
                : (isDark ? 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900')
            }`}
          >
            <span>📑</span>
            <span>{isDriver ? 'Assigned Logs' : 'Logs'}</span>
          </button>

          {/* Log Refill Form Toggle */}
          <button
            onClick={() => setActiveSubTab('log')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeSubTab === 'log'
                ? (isDark ? 'bg-cyan-950/60 border border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.35)]' : 'bg-cyan-50 border border-cyan-600 text-cyan-800 font-black shadow-sm')
                : (isDark ? 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900')
            }`}
          >
            <span>⛽</span>
            <span>Log Refill</span>
          </button>

          {/* Trends View Toggle (Managers & Admins only) */}
          {isManagerOrAdmin && (
            <button
              onClick={() => setActiveSubTab('trends')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                activeSubTab === 'trends'
                  ? (isDark ? 'bg-cyan-950/60 border border-cyan-400 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.25)]' : 'bg-cyan-50 border border-cyan-600 text-cyan-800 font-black shadow-sm')
                  : (isDark ? 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white' : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900')
              }`}
            >
              <span>📈</span>
              <span>Trends</span>
            </button>
          )}

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. VIEW 1: TRENDS & ANALYTICS                                             */}
      {/* ========================================================================= */}
      {activeSubTab === 'trends' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Top 3 KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
            
            {/* Card 1: TOTAL FUEL COST */}
            <div className={`p-5 rounded-2xl flex items-start justify-between relative shadow-lg ${
              isDark ? 'bg-[#0b101c] border border-slate-800/90' : 'bg-white border border-slate-200 shadow-md'
            }`}>
              <div>
                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  TOTAL FUEL COST
                </span>
                <div className="text-2xl lg:text-3xl font-black text-emerald-400 tracking-tight mt-1">
                  Rs {totalCost.toLocaleString()}
                </div>
                <span className={`text-[11px] font-medium block mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Lifetime Refill Cost
                </span>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0 shadow-sm ${
                isDark ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-400' : 'bg-emerald-50 border border-emerald-300 text-emerald-700'
              }`}>
                💵
              </div>
            </div>

            {/* Card 2: TOTAL VOLUME CONSUMED */}
            <div className={`p-5 rounded-2xl flex items-start justify-between relative shadow-lg ${
              isDark ? 'bg-[#0b101c] border border-slate-800/90' : 'bg-white border border-slate-200 shadow-md'
            }`}>
              <div>
                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  TOTAL VOLUME CONSUMED
                </span>
                <div className="text-2xl lg:text-3xl font-black text-cyan-400 tracking-tight mt-1">
                  {totalVolume.toLocaleString()} <span className="text-lg">L</span>
                </div>
                <span className={`text-[11px] font-medium block mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Lifetime Fuel Liters
                </span>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0 shadow-sm ${
                isDark ? 'bg-blue-950/80 border border-blue-500/40 text-blue-400' : 'bg-blue-50 border border-blue-300 text-blue-700'
              }`}>
                💧
              </div>
            </div>

            {/* Card 3: AVERAGE FUEL COST RATE */}
            <div className={`p-5 rounded-2xl flex items-start justify-between relative shadow-lg ${
              isDark ? 'bg-[#0b101c] border border-slate-800/90' : 'bg-white border border-slate-200 shadow-md'
            }`}>
              <div>
                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  AVERAGE FUEL COST RATE
                </span>
                <div className="text-2xl lg:text-3xl font-black text-amber-400 tracking-tight mt-1">
                  Rs {avgCostPerLiter} <span className="text-lg">/ L</span>
                </div>
                <span className={`text-[11px] font-medium block mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Avg cost per liter
                </span>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0 shadow-sm ${
                isDark ? 'bg-amber-950/80 border border-amber-500/40 text-amber-400' : 'bg-amber-50 border border-amber-300 text-amber-700'
              }`}>
                📈
              </div>
            </div>

          </div>

          {/* Cost Distribution Chart Card */}
          <div className={`p-6 rounded-3xl shadow-xl space-y-6 ${
            isDark ? 'bg-[#0b101c] border border-slate-800/90' : 'bg-white border border-slate-200'
          }`}>
            
            {/* Header with Title and Time Range Dropdown */}
            <div className={`flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 border-b pb-4 ${
              isDark ? 'border-slate-800/80' : 'border-slate-200'
            }`}>
              <div className="flex items-center space-x-2">
                <span className="text-base">📅</span>
                <h3 className={`text-xs font-mono font-black uppercase tracking-wider m-0 ${
                  isDark ? 'text-slate-300' : 'text-slate-800'
                }`}>
                  COST DISTRIBUTION TELEMETRY
                </h3>
              </div>

              {/* Time Range Selector & Custom Date Pickers */}
              <div className="flex flex-wrap items-center gap-2">
                {timeRange === 'custom' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-mono border focus:outline-none focus:border-cyan-500 ${
                        isDark ? 'bg-[#070b14] border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                      }`}
                    />
                    <span className="text-xs text-slate-400 font-mono">to</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-mono border focus:outline-none focus:border-cyan-500 ${
                        isDark ? 'bg-[#070b14] border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                      }`}
                    />
                  </div>
                )}

                <div className="relative shrink-0">
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold cursor-pointer appearance-none pr-7 shadow-sm transition-all focus:outline-none border ${
                      isDark ? 'bg-[#070b14] border-slate-700 text-white hover:border-cyan-500' : 'bg-slate-50 border-slate-300 text-slate-800 hover:border-cyan-600'
                    }`}
                  >
                    <option value="all">All Time</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] pointer-events-none opacity-60">▼</span>
                </div>
              </div>
            </div>

            {/* Grid with Total Cost Stat, Interactive Bar Chart, and Fuel Breakdown Donut */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              
              {/* Left Stat */}
              <div className="lg:col-span-2 space-y-1">
                <span className={`text-[11px] font-medium block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Total Cost ({timeRange === 'all' ? 'All Time' : timeRange === 'week' ? 'Week' : timeRange === 'month' ? 'Month' : 'Custom'})
                </span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight font-mono">
                  Rs {periodTotalCost.toLocaleString()}
                </div>
                <span className={`text-[10px] font-mono block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {filteredCostRefills.length} refill {filteredCostRefills.length === 1 ? 'event' : 'events'}
                </span>
              </div>

              {/* Center Bar Chart */}
              <div className="lg:col-span-6 relative h-48 flex items-end justify-between pt-6 px-2 border-b border-l border-slate-700/50">
                
                {/* Y-Axis Labels */}
                <div className={`absolute left-0 top-0 text-[9px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {maxBarValue >= 1000 ? `${Math.round(maxBarValue / 1000)}K` : maxBarValue}
                </div>
                <div className={`absolute left-0 top-16 text-[9px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {maxBarValue >= 1000 ? `${Math.round((maxBarValue * 0.66) / 1000)}K` : Math.round(maxBarValue * 0.66)}
                </div>
                <div className={`absolute left-0 top-32 text-[9px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {maxBarValue >= 1000 ? `${Math.round((maxBarValue * 0.33) / 1000)}K` : Math.round(maxBarValue * 0.33)}
                </div>
                <div className={`absolute left-0 bottom-0 text-[9px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>0</div>

                {/* Horizontal Grid lines */}
                <div className={`absolute left-6 right-0 top-2 border-t ${isDark ? 'border-slate-800/60' : 'border-slate-100'}`}></div>
                <div className={`absolute left-6 right-0 top-18 border-t ${isDark ? 'border-slate-800/60' : 'border-slate-100'}`}></div>
                <div className={`absolute left-6 right-0 top-34 border-t ${isDark ? 'border-slate-800/60' : 'border-slate-100'}`}></div>

                {/* Bars */}
                <div className="w-full pl-6 flex items-end justify-between gap-1.5 sm:gap-2.5 h-full pb-1 z-10">
                  {chartBarsData.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                      {/* Tooltip */}
                      <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-slate-950 border border-slate-700 text-cyan-400 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap z-20">
                        {d.day}: Rs {d.value.toLocaleString()}
                      </div>
                      <div
                        style={{ height: d.height }}
                        className={`w-full max-w-[14px] rounded-t-sm transition-all cursor-pointer ${
                          d.value > 0
                            ? 'bg-gradient-to-t from-cyan-600 to-cyan-400 hover:from-cyan-500 hover:to-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.25)]'
                            : isDark ? 'bg-slate-800/60 hover:bg-slate-700' : 'bg-slate-200 hover:bg-slate-300'
                        }`}
                      ></div>
                      {/* X-axis label */}
                      <span className={`text-[8px] font-mono mt-1 absolute -bottom-5 whitespace-nowrap truncate max-w-[40px] text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {d.day}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Fuel Category Breakdown & Donut Chart */}
              <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col items-center justify-center gap-5 pt-2 lg:pt-0">
                
                {/* SVG Donut */}
                <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    {/* Background Ring */}
                    <circle cx="18" cy="18" r="14" fill="transparent" stroke={isDark ? "#1e293b" : "#e2e8f0"} strokeWidth="4" />
                    {/* Dynamic Fuel Slices */}
                    {fuelBreakdown.map((item, idx) => (
                      <circle
                        key={idx}
                        cx="18"
                        cy="18"
                        r="14"
                        fill="transparent"
                        stroke={item.color}
                        strokeWidth="4"
                        strokeDasharray={item.dashArray}
                        strokeDashoffset={item.dashOffset}
                      />
                    ))}
                  </svg>
                  {/* Center Text */}
                  <div className="absolute text-center">
                    <span className="text-xs font-black font-mono tracking-tight block text-emerald-400">
                      {periodTotalCost >= 1000 ? `Rs ${Math.round(periodTotalCost / 1000)}K` : `Rs ${periodTotalCost}`}
                    </span>
                  </div>
                </div>

                {/* Legend List */}
                <div className="w-full space-y-2 text-xs font-mono">
                  {fuelBreakdown.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                        <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{item.type}</span>
                      </div>
                      <span className="text-slate-400 font-bold">{item.pct}%</span>
                      <span className="font-bold font-mono" style={{ color: item.color }}>Rs {item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* 3. VIEW 2: LOG REFILL FORM (EXACT HIGH-FIDELITY DESIGN FOR DARK & LIGHT)   */}
      {/* ========================================================================= */}
      {activeSubTab === 'log' && (
        <div className="max-w-4xl mx-auto animate-fade-in">
          <div className={`p-6 sm:p-8 rounded-[28px] sm:rounded-[36px] shadow-2xl space-y-6 relative overflow-hidden border transition-all ${
            isDark 
              ? 'bg-[#080d1a]/95 border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.12)]' 
              : 'bg-white border-slate-200/90 shadow-[0_10px_35px_rgba(0,0,0,0.06)]'
          }`}>
            
            {/* Header with Title, Icon & Neon Fuel Nozzle / Gauge SVG Graphic */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 ${
              isDark ? 'border-slate-800/80' : 'border-slate-100'
            }`}>
              <div className="flex items-center space-x-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl flex-shrink-0 border shadow-md transition-all ${
                  isDark 
                    ? 'bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border-cyan-500/40 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]' 
                    : 'bg-cyan-50/90 border-cyan-200 text-cyan-600'
                }`}>
                  ⛽
                </div>
                <div>
                  <h2 className={`text-base sm:text-lg font-black tracking-wider uppercase font-mono m-0 flex items-center gap-2 ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    LOG FUEL REFILL RECORD
                  </h2>
                  <p className={`text-xs mt-1 m-0 font-sans ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Record fuel refill details for assigned vehicle
                  </p>
                </div>
              </div>

              {/* Exact Fuel Nozzle & Speedometer Gauge Illustration */}
              <div className="hidden md:flex items-center justify-end shrink-0 select-none pointer-events-none">
                <svg viewBox="0 0 240 90" className="w-48 h-18 overflow-visible" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <filter id="neonGlowCyanRef" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter id="neonGlowPurpleRef" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="3.5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <linearGradient id="needleGradRef" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#c084fc" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>

                  {/* SPEEDOMETER GAUGE (Right side) */}
                  <g transform="translate(175, 48)">
                    {/* Outer subtle circle */}
                    <circle cx="0" cy="0" r="38" stroke={isDark ? '#1e293b' : '#e2e8f0'} strokeWidth="3" opacity="0.6" />
                    
                    {/* Gauge arc */}
                    <path
                      d="M -32 10 A 34 34 0 1 1 32 10"
                      stroke={isDark ? '#0284c7' : '#38bdf8'}
                      strokeWidth="3"
                      strokeLinecap="round"
                      filter={isDark ? 'url(#neonGlowCyanRef)' : undefined}
                      opacity={isDark ? '0.9' : '0.8'}
                    />

                    {/* Speedometer Tick Marks */}
                    {[-140, -110, -80, -50, -20, 10, 40].map((deg, i) => {
                      const rad = (deg * Math.PI) / 180
                      const x1 = Math.cos(rad) * 27
                      const y1 = Math.sin(rad) * 27
                      const x2 = Math.cos(rad) * 32
                      const y2 = Math.sin(rad) * 32
                      return (
                        <line
                          key={i}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={isDark ? (i > 4 ? '#ec4899' : '#38bdf8') : (i > 4 ? '#f43f5e' : '#0284c7')}
                          strokeWidth={i % 2 === 0 ? '2' : '1.2'}
                          strokeLinecap="round"
                        />
                      )
                    })}

                    {/* Needle pointing to high speed */}
                    <line
                      x1="0"
                      y1="0"
                      x2="20"
                      y2="-16"
                      stroke={isDark ? 'url(#needleGradRef)' : '#9333ea'}
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      filter={isDark ? 'url(#neonGlowPurpleRef)' : undefined}
                    />
                    <circle cx="0" cy="0" r="4.5" fill={isDark ? '#38bdf8' : '#0284c7'} />
                    <circle cx="0" cy="0" r="2" fill="#ffffff" />
                  </g>

                  {/* FUEL NOZZLE (Left side) */}
                  <g transform="translate(20, 6)">
                    {/* Hose (bottom curving) */}
                    <path
                      d="M 92 78 C 90 68, 86 60, 80 54"
                      stroke={isDark ? '#0ea5e9' : '#0284c7'}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />

                    {/* Fuel Nozzle Handle & Main Body */}
                    <path
                      d="M 80 54 L 70 42 L 64 38 L 52 42 L 42 32 L 46 26 L 58 34 L 70 32 L 80 44 Z"
                      fill={isDark ? '#0369a1' : '#bae6fd'}
                      stroke={isDark ? '#38bdf8' : '#0284c7'}
                      strokeWidth="2.2"
                      strokeLinejoin="round"
                      filter={isDark ? 'url(#neonGlowCyanRef)' : undefined}
                      opacity="0.95"
                    />

                    {/* Trigger Guard Loop */}
                    <path
                      d="M 62 42 C 62 50, 72 52, 74 46"
                      stroke={isDark ? '#38bdf8' : '#0284c7'}
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                    />
                    {/* Trigger Lever */}
                    <path
                      d="M 66 42 L 70 47"
                      stroke={isDark ? '#38bdf8' : '#0284c7'}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />

                    {/* Nozzle Spout */}
                    <path
                      d="M 44 30 L 16 14 L 6 22 L 4 20 L 14 10 L 46 26"
                      fill={isDark ? '#0ea5e9' : '#7dd3fc'}
                      stroke={isDark ? '#38bdf8' : '#0284c7'}
                      strokeWidth="2.2"
                      strokeLinejoin="round"
                      filter={isDark ? 'url(#neonGlowCyanRef)' : undefined}
                    />

                    {/* Dripping Droplet */}
                    <path
                      d="M 5 32 C 5 32, 1 39, 1 42 C 1 45, 3 46.5, 5 46.5 C 7 46.5, 9 45, 9 42 C 9 39, 5 32, 5 32 Z"
                      fill={isDark ? '#38bdf8' : '#0284c7'}
                      filter={isDark ? 'url(#neonGlowCyanRef)' : undefined}
                    />
                  </g>
                </svg>
              </div>
            </div>

            {isDriver && assignedVehicles.length === 0 ? (
              <div className={`p-8 rounded-2xl border text-center space-y-3 ${
                isDark ? 'bg-amber-950/20 border-amber-500/40 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}>
                <div className="text-4xl">⚠️</div>
                <h3 className="text-sm font-black uppercase font-mono m-0">No Assigned Vehicle</h3>
                <p className="text-xs max-w-md mx-auto text-slate-400 font-sans">
                  You do not currently have any vehicle assigned to your driver account. You cannot log fuel refills until an administrator assigns a vehicle to you in the Vehicles tab.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitRefill} className="space-y-5 text-xs">
                
                {/* Top Row: Vehicle Selection & Fuel Type Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* 1. ASSIGNED VEHICLE */}
                  <div>
                    <label className={`text-[10px] font-mono font-bold uppercase tracking-wider block mb-2 ${
                      isDark ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      {isDriver 
                        ? (assignedVehicles.length > 1 ? `SELECT FROM ASSIGNED VEHICLES (${assignedVehicles.length}) *` : 'ASSIGNED VEHICLE (LOCKED)')
                        : 'SELECT VEHICLE *'}
                    </label>

                    {isDriver ? (
                      assignedVehicles.length > 1 ? (
                        <div className="relative">
                          <select
                            name="vehicle_id"
                            value={form.vehicle_id}
                            onChange={handleFormChange}
                            required
                            className={`w-full px-4 py-3.5 rounded-2xl font-mono text-xs font-bold appearance-none cursor-pointer pr-10 shadow-sm focus:outline-none transition-all ${
                              isDark 
                                ? 'bg-[#060b16] border border-cyan-500/50 text-white focus:border-cyan-400' 
                                : 'bg-white border-2 border-cyan-400 text-slate-900 focus:border-cyan-600'
                            }`}
                          >
                            {assignedVehicles.map(v => (
                              <option key={v.vehicle_id} value={v.vehicle_id}>
                                🚚 {v.registration_number} ({v.model}) — {v.fuel_type || 'Diesel'}
                              </option>
                            ))}
                          </select>
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cyan-400 text-xs pointer-events-none">▼</span>
                        </div>
                      ) : (
                        <div className={`w-full px-4 py-3.5 rounded-2xl font-mono text-xs font-bold border flex items-center justify-between shadow-sm transition-all ${
                          isDark 
                            ? 'bg-[#060b16] border-cyan-500/40 text-white' 
                            : 'bg-cyan-50/50 border-2 border-cyan-400 text-slate-900'
                        }`}>
                          <div className="flex items-center space-x-2.5 truncate">
                            <span className="text-base">🚚</span>
                            <span className="truncate">
                              {assignedVehicle 
                                ? `${assignedVehicle.registration_number} (${assignedVehicle.model})`
                                : (assignedVehicles[0] ? `${assignedVehicles[0].registration_number} (${assignedVehicles[0].model})` : 'No vehicle assigned to your driver account')}
                            </span>
                          </div>
                          <span className={`text-[10px] uppercase font-mono px-2.5 py-1 rounded-lg border font-black shrink-0 ml-2 flex items-center gap-1 shadow-sm ${
                            isDark 
                              ? 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300' 
                              : 'bg-cyan-100 border-cyan-300 text-cyan-800'
                          }`}>
                            <span>🔒</span>
                            <span>LOCKED</span>
                          </span>
                        </div>
                      )
                    ) : (
                      <div className="relative">
                        <select
                          name="vehicle_id"
                          value={form.vehicle_id}
                          onChange={handleFormChange}
                          required
                          className={`w-full px-4 py-3.5 rounded-2xl font-mono text-xs font-bold appearance-none cursor-pointer pr-10 shadow-sm focus:outline-none transition-all ${
                            isDark 
                              ? 'bg-[#060b16] border border-slate-700/80 text-white focus:border-cyan-400' 
                              : 'bg-white border border-slate-300 text-slate-900 focus:border-cyan-500'
                          }`}
                        >
                          {vehicles.map(v => (
                            <option key={v.vehicle_id} value={v.vehicle_id}>
                              {v.registration_number} ({v.model}) — {v.vehicle_type || 'Commercial Fleet'}
                            </option>
                          ))}
                        </select>
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">▼</span>
                      </div>
                    )}
                  </div>

                {/* 2. FUEL TYPE * */}
                <div>
                  <label className={`text-[10px] font-mono font-bold uppercase tracking-wider block mb-2 ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    FUEL TYPE *
                  </label>

                  <div className="relative">
                    <select
                      name="fuel_type"
                      value={form.fuel_type || 'Diesel'}
                      onChange={handleFormChange}
                      required
                      className={`w-full px-4 py-3.5 rounded-2xl font-mono text-xs font-bold appearance-none cursor-pointer pr-10 shadow-sm focus:outline-none transition-all ${
                        isDark 
                          ? 'bg-[#060b16] border border-cyan-500/40 text-white focus:border-cyan-400' 
                          : 'bg-white border border-slate-300 text-slate-900 focus:border-cyan-500'
                      }`}
                    >
                      <option value="Diesel">💧 Diesel</option>
                      <option value="Petrol">💧 Petrol</option>
                      <option value="CNG">🟡 CNG</option>
                      <option value="Electric">🟣 Electric</option>
                      <option value="Others">🟠 Others</option>
                    </select>
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">▼</span>
                  </div>
                </div>

              </div>

              {/* 4-Column Card Grid: Liters, Cost, Mileage, Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                
                {/* 1. Fuel Amount (Liters) */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  isDark 
                    ? 'bg-[#060b16] border-slate-800/90 shadow-sm' 
                    : 'bg-slate-50/80 border-slate-200/90 shadow-sm'
                }`}>
                  <label className={`text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2.5 ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    <span className="text-cyan-500">💧</span>
                    <span>FUEL AMOUNT (LITERS) *</span>
                  </label>
                  
                  <div className={`px-3.5 py-2 rounded-xl border flex items-center justify-between transition-all ${
                    isDark 
                      ? 'bg-[#0a1120] border-slate-700/70 focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400' 
                      : 'bg-white border-slate-300/90 focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-400 shadow-inner'
                  }`}>
                    <input
                      name="fuel_amount"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="80.0"
                      value={form.fuel_amount}
                      onChange={handleFormChange}
                      required
                      className={`w-full bg-transparent font-mono text-lg font-black focus:outline-none ${
                        isDark ? 'text-white placeholder-slate-600' : 'text-slate-900 placeholder-slate-400'
                      }`}
                    />
                    <span className={`text-xs font-mono font-bold ml-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      L
                    </span>
                  </div>

                  <span className={`text-[10.5px] font-sans block mt-2.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Enter amount in liters
                  </span>
                </div>

                {/* 2. Total Refill Cost (Rs) */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  isDark 
                    ? 'bg-[#060b16] border-slate-800/90 shadow-sm' 
                    : 'bg-slate-50/80 border-slate-200/90 shadow-sm'
                }`}>
                  <label className={`text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2.5 ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    <span className="text-purple-500">🧾</span>
                    <span>TOTAL REFILL COST (RS) *</span>
                  </label>

                  <div className={`px-3.5 py-2 rounded-xl border flex items-center justify-between transition-all ${
                    isDark 
                      ? 'bg-[#0a1120] border-slate-700/70 focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-400' 
                      : 'bg-white border-slate-300/90 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-400 shadow-inner'
                  }`}>
                    <input
                      name="fuel_cost"
                      type="number"
                      step="1"
                      min="0"
                      placeholder="10000"
                      value={form.fuel_cost}
                      onChange={handleFormChange}
                      required
                      className={`w-full bg-transparent font-mono text-lg font-black focus:outline-none ${
                        isDark ? 'text-white placeholder-slate-600' : 'text-slate-900 placeholder-slate-400'
                      }`}
                    />
                    <span className={`text-xs font-mono font-bold ml-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Rs
                    </span>
                  </div>

                  <span className={`text-[10.5px] font-sans block mt-2.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Enter total cost
                  </span>
                </div>

                {/* 3. Current Mileage (KM) */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  isDark 
                    ? 'bg-[#060b16] border-slate-800/90 shadow-sm' 
                    : 'bg-slate-50/80 border-slate-200/90 shadow-sm'
                }`}>
                  <label className={`text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2.5 ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    <span className="text-emerald-500">⏲️</span>
                    <span>CURRENT MILEAGE (KM)</span>
                  </label>

                  <div className={`px-3.5 py-2 rounded-xl border flex items-center justify-between transition-all ${
                    isDark 
                      ? 'bg-[#0a1120] border-slate-700/70 focus-within:border-emerald-400 focus-within:ring-1 focus-within:ring-emerald-400' 
                      : 'bg-white border-slate-300/90 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-400 shadow-inner'
                  }`}>
                    <input
                      name="mileage"
                      type="number"
                      step="1"
                      min="0"
                      placeholder="125000"
                      value={form.mileage}
                      onChange={handleFormChange}
                      className={`w-full bg-transparent font-mono text-lg font-black focus:outline-none ${
                        isDark ? 'text-white placeholder-slate-600' : 'text-slate-900 placeholder-slate-400'
                      }`}
                    />
                    <span className={`text-xs font-mono font-bold ml-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      KM
                    </span>
                  </div>

                  <span className={`text-[10.5px] font-sans block mt-2.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Odometer reading
                  </span>
                </div>

                {/* 4. Date of Refill */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  isDark 
                    ? 'bg-[#060b16] border-slate-800/90 shadow-sm' 
                    : 'bg-slate-50/80 border-slate-200/90 shadow-sm'
                }`}>
                  <label className={`text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2.5 ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    <span className="text-amber-500">📅</span>
                    <span>DATE OF REFILL *</span>
                  </label>

                  <div className={`px-3.5 py-2 rounded-xl border flex items-center justify-between transition-all ${
                    isDark 
                      ? 'bg-[#0a1120] border-slate-700/70 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400' 
                      : 'bg-white border-slate-300/90 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-400 shadow-inner'
                  }`}>
                    <input
                      name="refill_date"
                      type="date"
                      value={form.refill_date}
                      onChange={handleFormChange}
                      required
                      className={`w-full bg-transparent font-mono text-sm sm:text-base font-bold focus:outline-none cursor-pointer ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    />
                  </div>

                  <span className={`text-[10.5px] font-sans block mt-2.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Select refill date
                  </span>
                </div>

              </div>

              {/* Big Vibrant Cyan Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-4 bg-[#00c5eb] hover:bg-[#00b2d6] text-slate-950 rounded-2xl font-black font-mono tracking-widest transition-all cursor-pointer shadow-[0_4px_25px_rgba(0,197,235,0.45)] hover:shadow-[0_6px_30px_rgba(0,197,235,0.6)] flex items-center justify-center gap-2.5 text-sm uppercase active:scale-[0.99]"
                >
                  <span className="text-base">⛽</span>
                  <span>LOG REFILL RECORD</span>
                </button>
              </div>

            </form>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. VIEW 3: FUEL REFILL LOGS (DATA TABLE & METRICS)                        */}
      {/* ========================================================================= */}
      {activeSubTab === 'list' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* If Driver: Show Assigned Vehicle Hero Card */}
          {isDriver ? (
            assignedVehicles.length > 0 ? (
              <div className="space-y-3">
                {/* Multi-vehicle tab filter switcher if driver is assigned multiple vehicles */}
                {assignedVehicles.length > 1 && (
                  <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 flex-wrap ${
                    isDark ? 'bg-[#080d1a]/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10.5px] font-mono font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        YOUR ASSIGNED VEHICLES ({assignedVehicles.length}):
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedVehicleId('')
                          setCurrentPage(1)
                        }}
                        className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                          !selectedVehicleId 
                            ? (isDark ? 'bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.4)]' : 'bg-cyan-600 text-white shadow-sm')
                            : (isDark ? 'bg-slate-900 border border-slate-700 text-slate-300 hover:border-cyan-400' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50')
                        }`}
                      >
                        All Assigned ({assignedVehicles.length})
                      </button>
                      {assignedVehicles.map(v => (
                        <button
                          key={v.vehicle_id}
                          type="button"
                          onClick={() => {
                            setSelectedVehicleId(v.vehicle_id)
                            setCurrentPage(1)
                          }}
                          className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            selectedVehicleId === v.vehicle_id
                              ? (isDark ? 'bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.4)]' : 'bg-cyan-600 text-white shadow-sm')
                              : (isDark ? 'bg-slate-900 border border-slate-700 text-slate-300 hover:border-cyan-400' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50')
                          }`}
                        >
                          <span>🚚</span>
                          <span>{v.registration_number}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hero Card */}
                {(() => {
                  const currentDisplayVeh = selectedVehicleId 
                    ? assignedVehicles.find(v => v.vehicle_id === selectedVehicleId) 
                    : (assignedVehicles.length === 1 ? assignedVehicles[0] : null)

                  return (
                    <div className={`p-5 sm:p-6 rounded-2xl border shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all ${
                      isDark 
                        ? 'bg-[#080d1a]/95 border-cyan-500/40 text-white shadow-[0_0_25px_rgba(6,182,212,0.15)]' 
                        : 'bg-white border-cyan-300 text-slate-900 shadow-md'
                    }`}>
                      <div className="flex items-center space-x-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl flex-shrink-0 border ${
                          isDark ? 'bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)]' : 'bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200 text-cyan-700'
                        }`}>
                          🚚
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              isDark ? 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300' : 'bg-cyan-50 border-cyan-300 text-cyan-800'
                            }`}>
                              {currentDisplayVeh ? 'ASSIGNED VEHICLE' : `ALL ASSIGNED VEHICLES (${assignedVehicles.length})`}
                            </span>
                            {currentDisplayVeh && (
                              <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                                (currentDisplayVeh.fuel_type || 'Diesel') === 'Diesel' 
                                  ? (isDark ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400' : 'bg-emerald-50 border-emerald-300 text-emerald-700') 
                                  : (isDark ? 'bg-blue-950/60 border-blue-500/40 text-blue-400' : 'bg-blue-50 border-blue-300 text-blue-700')
                              }`}>
                                ⛽ {currentDisplayVeh.fuel_type || 'Diesel'}
                              </span>
                            )}
                          </div>
                          <h2 className={`text-base sm:text-lg font-black tracking-tight mt-1 font-mono m-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {currentDisplayVeh ? (
                              <>
                                {currentDisplayVeh.model} <span className="text-cyan-400 font-bold font-mono">({currentDisplayVeh.registration_number})</span>
                              </>
                            ) : (
                              `Combined Fuel Summary (${assignedVehicles.map(v => v.registration_number).join(', ')})`
                            )}
                          </h2>
                          <p className={`text-xs mt-0.5 m-0 font-sans ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {currentDisplayVeh 
                              ? `Type: ${currentDisplayVeh.vehicle_type || 'Commercial Carrier'} • Status: `
                              : `Assigned to ${driverProfile?.name || 'your profile'} • Status: `}
                            <span className="text-emerald-400 font-bold">{currentDisplayVeh ? (currentDisplayVeh.status || 'Assigned') : 'Active'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Quick Stats for this Driver's Vehicle */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-shrink-0">
                        <div className={`p-3 rounded-xl border text-center ${isDark ? 'bg-[#0b1120] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                          <span className={`text-[9.5px] font-mono uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Liters</span>
                          <span className="text-sm font-black font-mono text-cyan-400 mt-0.5 block">{driverTotalLiters} L</span>
                        </div>
                        <div className={`p-3 rounded-xl border text-center ${isDark ? 'bg-[#0b1120] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                          <span className={`text-[9.5px] font-mono uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Total Spend</span>
                          <span className="text-sm font-black font-mono text-emerald-400 mt-0.5 block">Rs {driverTotalCost.toLocaleString()}</span>
                        </div>
                        <div className={`p-3 rounded-xl border text-center ${isDark ? 'bg-[#0b1120] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                          <span className={`text-[9.5px] font-mono uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Refill Logs</span>
                          <span className="text-sm font-black font-mono text-amber-400 mt-0.5 block">{driverRefillCount}</span>
                        </div>
                        <div className={`p-3 rounded-xl border text-center ${isDark ? 'bg-[#0b1120] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                          <span className={`text-[9.5px] font-mono uppercase font-bold block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Latest Odo</span>
                          <span className="text-sm font-black font-mono text-purple-400 mt-0.5 block">{driverLatestOdo ? `${driverLatestOdo.toLocaleString()} KM` : '--'}</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            ) : (
              <div className={`p-6 rounded-2xl border text-center space-y-2 ${
                isDark ? 'bg-amber-950/20 border-amber-500/40 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}>
                <div className="text-2xl">⚠️</div>
                <h3 className="text-sm font-black uppercase font-mono m-0">No Vehicle Assigned to Your Driver Roster</h3>
                <p className="text-xs max-w-md mx-auto text-slate-400">
                  You currently do not have a vehicle assigned. Once your fleet administrator assigns a vehicle to you, its fuel refill history and petrol logs will automatically display here.
                </p>
              </div>
            )
          ) : (
            /* Admin & Fleet Manager: 3 KPI Summary Cards */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
              
              {/* Card 1: TOTAL EXPENDITURE */}
              <div className={`p-5 rounded-2xl flex items-start justify-between relative shadow-lg ${
                isDark ? 'bg-[#0b101c] border border-slate-800/90' : 'bg-white border border-slate-200 shadow-md'
              }`}>
                <div>
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    TOTAL EXPENDITURE
                  </span>
                  <div className="text-2xl lg:text-3xl font-black text-emerald-400 tracking-tight mt-1 font-mono">
                    Rs {totalCost.toLocaleString()}
                  </div>
                  <span className={`text-[11px] font-medium block mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Fleet Lifetime Refill Cost
                  </span>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0 shadow-sm ${
                  isDark ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-400' : 'bg-emerald-50 border border-emerald-300 text-emerald-700'
                }`}>
                  💵
                </div>
              </div>

              {/* Card 2: FUEL VOLUME */}
              <div className={`p-5 rounded-2xl flex items-start justify-between relative shadow-lg ${
                isDark ? 'bg-[#0b101c] border border-slate-800/90' : 'bg-white border border-slate-200 shadow-md'
              }`}>
                <div>
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    FUEL VOLUME
                  </span>
                  <div className="text-2xl lg:text-3xl font-black text-cyan-400 tracking-tight mt-1 font-mono">
                    {totalVolume.toLocaleString()} <span className="text-lg">L</span>
                  </div>
                  <span className={`text-[11px] font-medium block mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Total Fuel Dispensed
                  </span>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0 shadow-sm ${
                  isDark ? 'bg-blue-950/80 border border-blue-500/40 text-blue-400' : 'bg-blue-50 border border-blue-300 text-blue-700'
                }`}>
                  💧
                </div>
              </div>

              {/* Card 3: AVERAGE RATE */}
              <div className={`p-5 rounded-2xl flex items-start justify-between relative shadow-lg ${
                isDark ? 'bg-[#0b101c] border border-slate-800/90' : 'bg-white border border-slate-200 shadow-md'
              }`}>
                <div>
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    AVERAGE RATE
                  </span>
                  <div className="text-2xl lg:text-3xl font-black text-amber-400 tracking-tight mt-1 font-mono">
                    Rs {avgCostPerLiter} <span className="text-lg">/ L</span>
                  </div>
                  <span className={`text-[11px] font-medium block mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Fleet Fuel Rate Index
                  </span>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0 shadow-sm ${
                  isDark ? 'bg-amber-950/80 border border-amber-500/40 text-amber-400' : 'bg-amber-50 border border-amber-300 text-amber-700'
                }`}>
                  📈
                </div>
              </div>

            </div>
          )}

          {/* Search & Vehicle Filter Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            
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
                placeholder="Search vehicle, plate, amount, cost..."
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

            {/* Vehicle Select Dropdown & Record Badge */}
            <div className="flex items-center space-x-3 shrink-0">
              {isDriver ? (
                assignedVehicles.length > 1 && (
                  <div className="relative">
                    <select
                      value={selectedVehicleId}
                      onChange={(e) => {
                        setSelectedVehicleId(e.target.value)
                        setCurrentPage(1)
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs cursor-pointer font-sans appearance-none pr-8 shadow-sm transition-all focus:outline-none ${
                        isDark 
                          ? 'bg-[#0c1220] border border-cyan-500/40 text-white focus:border-cyan-400' 
                          : 'bg-white border border-slate-300 text-slate-800 focus:border-cyan-600'
                      }`}
                    >
                      <option value="">All My Assigned Vehicles ({assignedVehicles.length})</option>
                      {assignedVehicles.map(v => (
                        <option key={v.vehicle_id} value={v.vehicle_id}>
                          {v.registration_number} ({v.model})
                        </option>
                      ))}
                    </select>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400 text-[10px] pointer-events-none">▼</span>
                  </div>
                )
              ) : (
                <div className="relative">
                  <select
                    value={selectedVehicleId}
                    onChange={(e) => {
                      setSelectedVehicleId(e.target.value)
                      setCurrentPage(1)
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs cursor-pointer font-sans appearance-none pr-8 shadow-sm transition-all focus:outline-none ${
                      isDark 
                        ? 'bg-[#0c1220] border border-slate-700/80 text-white focus:border-cyan-400' 
                        : 'bg-white border border-slate-300 text-slate-800 focus:border-blue-500'
                    }`}
                  >
                    <option value="">All Vehicles</option>
                    {vehicles.map(v => (
                      <option key={v.vehicle_id} value={v.vehicle_id}>
                        {v.registration_number} ({v.model})
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none">▼</span>
                </div>
              )}

              {/* Record Count Badge */}
              <span className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border ${
                isDark 
                  ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-400' 
                  : 'bg-cyan-50 border-cyan-300 text-cyan-800'
              }`}>
                {filteredRefills.length} Record(s)
              </span>
            </div>

          </div>

          {/* Table Container & Fixed-Position Pagination */}
          <div className="min-h-[480px] flex flex-col justify-between">
            
            <div className={`rounded-2xl border overflow-hidden shadow-xl ${
              isDark ? 'bg-[#0b101c] border-slate-800/90' : 'bg-white border-slate-200'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-sans text-xs">
                  <thead>
                    <tr className={`border-b text-[10.5px] font-mono font-bold tracking-wider uppercase ${
                      isDark ? 'bg-[#070b14] border-slate-800/80 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      <th className="py-3.5 px-4">REFILL DATE</th>
                      <th className="py-3.5 px-4">VEHICLE</th>
                      <th className="py-3.5 px-4">AMOUNT (LITERS)</th>
                      <th className="py-3.5 px-4">COST (RS)</th>
                      <th className="py-3.5 px-4">MILEAGE (KM)</th>
                      <th className="py-3.5 px-4">AVG RATE (RS/L)</th>
                      <th className="py-3.5 px-4 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
                    {paginatedRefills.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-slate-400 font-mono text-xs">
                          No fuel records found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedRefills.map((r) => {
                        const vInfo = getVehicleInfo(r.vehicle_id)
                        const pricePerL = r.fuel_amount > 0 ? (r.fuel_cost / r.fuel_amount).toFixed(2) : '125.00'

                        return (
                          <tr 
                            key={r.fuel_id}
                            className={`transition-colors ${
                              isDark ? 'hover:bg-slate-900/50' : 'hover:bg-slate-50'
                            }`}
                          >
                            {/* 1. REFILL DATE */}
                            <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                              <div className={`font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                                {r.refill_date}
                              </div>
                              <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {r.refill_time || '10:24 AM'}
                              </div>
                            </td>

                            {/* 2. VEHICLE & FUEL TYPE */}
                            <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                              <div className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {vInfo.reg}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {vInfo.model}
                                </span>
                                <span className={`text-[9.5px] px-1.5 py-0.2 rounded border font-bold ${
                                  (r.fuel_type || 'Diesel') === 'Diesel'
                                    ? (isDark ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400' : 'bg-emerald-50 border-emerald-300 text-emerald-700')
                                    : (r.fuel_type || 'Diesel') === 'Petrol'
                                    ? (isDark ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-400' : 'bg-cyan-50 border-cyan-300 text-cyan-700')
                                    : (r.fuel_type || 'Diesel') === 'CNG'
                                    ? (isDark ? 'bg-amber-950/60 border-amber-500/40 text-amber-400' : 'bg-amber-50 border-amber-300 text-amber-700')
                                    : (r.fuel_type || 'Diesel') === 'Electric'
                                    ? (isDark ? 'bg-purple-950/60 border-purple-500/40 text-purple-400' : 'bg-purple-50 border-purple-300 text-purple-700')
                                    : (isDark ? 'bg-orange-950/60 border-orange-500/40 text-orange-400' : 'bg-orange-50 border-orange-300 text-orange-700')
                                }`}>
                                  {r.fuel_type || 'Diesel'}
                                </span>
                              </div>
                            </td>

                            {/* 3. AMOUNT (LITERS) */}
                            <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold">
                              <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>
                                {r.fuel_amount} L
                              </span>
                            </td>

                            {/* 4. COST (RS) */}
                            <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold">
                              <span className="text-emerald-400">
                                Rs {(r.fuel_cost || 0).toLocaleString()}
                              </span>
                            </td>

                            {/* 5. MILEAGE (KM) */}
                            <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                              <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                                {(r.mileage || 0).toLocaleString()} KM
                              </span>
                            </td>

                            {/* 6. AVG RATE (RS/L) */}
                            <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                              <span className={`inline-block px-2.5 py-0.5 rounded-lg border text-xs font-bold ${
                                isDark 
                                  ? 'bg-amber-950/40 border-amber-500/30 text-amber-400' 
                                  : 'bg-amber-50 border-amber-300 text-amber-800'
                              }`}>
                                Rs {pricePerL}
                              </span>
                            </td>

                            {/* 7. ACTIONS */}
                            <td className="py-3.5 px-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleStartEdit(r)}
                                  className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                                    isDark 
                                      ? 'bg-cyan-950/30 border-cyan-500/40 text-cyan-400 hover:bg-cyan-900/50' 
                                      : 'bg-cyan-50 border-cyan-300 text-cyan-800 hover:bg-cyan-100 font-bold'
                                  }`}
                                >
                                  <span>Edit</span>
                                  <span>✏️</span>
                                </button>

                                {isManagerOrAdmin && (
                                  <button
                                    onClick={() => handleDelete(r.fuel_id)}
                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                      isDark 
                                        ? 'bg-rose-950/30 border-rose-900/50 hover:bg-rose-900/60 text-rose-400' 
                                        : 'bg-rose-50 border-rose-200 hover:bg-rose-100 text-rose-700'
                                    }`}
                                    title="Delete record"
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

            {/* Pagination Controls */}
            <div className={`flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 mt-6 border-t text-xs font-sans ${
              isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-600'
            }`}>
              
              {/* Page Number Buttons */}
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 shadow-sm ${
                    isDark ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800' : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300'
                  }`}
                >
                  <span>&lt;</span>
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

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 shadow-sm ${
                    isDark ? 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800' : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300'
                  }`}
                >
                  <span>&gt;</span>
                </button>
              </div>

              {/* Rows Per Page Dropdown */}
              <div className="flex items-center space-x-2">
                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono cursor-pointer border ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: EDIT FUEL REFILL RECORD                                         */}
      {/* ========================================================================= */}
      {editingRecord && createPortal(
        <div 
          onClick={() => setEditingRecord(null)}
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
                <span>Edit Fuel Refill Record</span>
              </h3>
              <button 
                onClick={() => setEditingRecord(null)} 
                className={`cursor-pointer font-bold text-xs p-1.5 rounded-lg transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Vehicle *</label>
                  {isDriver ? (
                    assignedVehicles.length > 1 ? (
                      <div className="relative">
                        <select
                          name="vehicle_id"
                          value={editForm.vehicle_id}
                          onChange={handleEditFormChange}
                          required
                          className={`w-full px-3.5 py-2.5 rounded-xl font-mono text-xs focus:outline-none appearance-none pr-8 cursor-pointer ${
                            isDark 
                              ? 'bg-[#070b14] border border-cyan-500/50 focus:border-cyan-400 text-white' 
                              : 'bg-slate-50 border border-slate-300 focus:border-cyan-600 text-slate-900'
                          }`}
                        >
                          {assignedVehicles.map(v => (
                            <option key={v.vehicle_id} value={v.vehicle_id}>
                              {v.registration_number} ({v.model})
                            </option>
                          ))}
                        </select>
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400 text-[10px] pointer-events-none">▼</span>
                      </div>
                    ) : (
                      <div className={`w-full px-3.5 py-2.5 rounded-xl font-mono text-xs font-bold border ${
                        isDark ? 'bg-[#070b14] border-cyan-500/40 text-cyan-300' : 'bg-cyan-50 border-cyan-300 text-cyan-900'
                      }`}>
                        {getVehicleInfo(editForm.vehicle_id).reg} ({getVehicleInfo(editForm.vehicle_id).model})
                      </div>
                    )
                  ) : (
                    <select
                      name="vehicle_id"
                      value={editForm.vehicle_id}
                      onChange={handleEditFormChange}
                      required
                      className={`w-full px-3.5 py-2.5 rounded-xl font-mono text-xs focus:outline-none ${
                        isDark 
                          ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                          : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                      }`}
                    >
                      {vehicles.map(v => (
                        <option key={v.vehicle_id} value={v.vehicle_id}>
                          {v.registration_number} ({v.model})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Fuel Type *</label>
                  <select
                    name="fuel_type"
                    value={editForm.fuel_type || 'Diesel'}
                    onChange={handleEditFormChange}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl font-mono text-xs focus:outline-none ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  >
                    <option value="Diesel">🟢 Diesel</option>
                    <option value="Petrol">🔵 Petrol</option>
                    <option value="CNG">🟡 CNG</option>
                    <option value="Electric">🟣 Electric</option>
                    <option value="Others">🟠 Others</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Fuel Amount (Liters) *</label>
                  <input
                    name="fuel_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.fuel_amount}
                    onChange={handleEditFormChange}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl font-mono text-xs focus:outline-none ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Total Refill Cost (Rs) *</label>
                  <input
                    name="fuel_cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.fuel_cost}
                    onChange={handleEditFormChange}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl font-mono text-xs focus:outline-none ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Current Mileage (KM)</label>
                  <input
                    name="mileage"
                    type="number"
                    step="0.1"
                    min="0"
                    value={editForm.mileage}
                    onChange={handleEditFormChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl font-mono text-xs focus:outline-none ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Date of Refill *</label>
                  <input
                    name="refill_date"
                    type="date"
                    value={editForm.refill_date}
                    onChange={handleEditFormChange}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl font-mono text-xs focus:outline-none ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingEdit}
                className="w-full py-2.5 px-4 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl font-bold tracking-wide transition-all cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.35)] mt-4 text-center text-xs"
              >
                {isSavingEdit ? 'SAVING CHANGES...' : 'SAVE REFILL UPDATES'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  )
}

export default FuelPanel
