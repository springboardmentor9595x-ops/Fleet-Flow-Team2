import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useTheme } from '../../context/ThemeContext'
import api from '../../api/axios'
import TruckLoader from '../ui/TruckLoader'

const getCardPalette = (idx, isDark) => {
  const darkPalettes = [
    { iconBg: 'bg-blue-950/80 border border-blue-500/30 text-blue-400' },
    { iconBg: 'bg-purple-950/80 border border-purple-500/30 text-purple-400' },
    { iconBg: 'bg-emerald-950/80 border border-emerald-500/30 text-emerald-400' },
    { iconBg: 'bg-amber-950/80 border border-amber-500/30 text-amber-400' }
  ]
  const lightPalettes = [
    { iconBg: 'bg-blue-50 border border-blue-200 text-blue-600' },
    { iconBg: 'bg-purple-50 border border-purple-200 text-purple-600' },
    { iconBg: 'bg-emerald-50 border border-emerald-200 text-emerald-600' },
    { iconBg: 'bg-amber-50 border border-amber-200 text-amber-600' }
  ]
  return isDark ? darkPalettes[idx % 4] : lightPalettes[idx % 4]
}

const getStatusBadgeClass = (status, isDark) => {
  const sUpper = (status || '').toUpperCase()
  if (sUpper === 'DELIVERED') {
    return isDark 
      ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-400' 
      : 'bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold'
  }
  if (sUpper === 'IN TRANSIT') {
    return isDark 
      ? 'bg-amber-950/70 border border-amber-500/40 text-amber-400' 
      : 'bg-amber-50 border border-amber-300 text-amber-800 font-bold'
  }
  if (sUpper === 'CANCELLED') {
    return isDark 
      ? 'bg-rose-950/70 border border-rose-500/40 text-rose-400' 
      : 'bg-rose-50 border border-rose-300 text-rose-800 font-bold'
  }
  return isDark 
    ? 'bg-blue-950/70 border border-blue-500/40 text-blue-400' 
    : 'bg-blue-50 border border-blue-300 text-blue-800 font-bold'
}

// 4-Stage Delivery Status Stepper Timeline (Full Light & Dark Mode Responsive)
export const DeliveryStatusTimeline = ({ status, hasTrip = false, timestamps, isDark = true }) => {
  const sUpper = (status || '').toUpperCase()
  let step = 0 // 0: Shipment Confirmed, 1: Trip Scheduled, 2: In Transit, 3: Delivered
  if (sUpper === 'DELIVERED' || sUpper === 'COMPLETED') {
    step = 3
  } else if (sUpper === 'IN TRANSIT' || sUpper === 'DELAYED' || sUpper === 'DEPARTED') {
    step = 2
  } else if (hasTrip || sUpper === 'SCHEDULED' || sUpper === 'TRIP SCHEDULED') {
    step = 1
  } else {
    step = 0
  }

  return (
    <div className="w-full my-3 select-none">
      {/* Row of Circles and Connectors */}
      <div className="flex items-center justify-between w-full px-2">
        {/* Node 1: Shipment Confirmed */}
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-[#e62e2d] text-white shadow-[0_0_10px_rgba(230,46,45,0.4)]">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>

        {/* Line 1 */}
        <div className={`flex-1 h-[3px] mx-1 rounded-full ${step >= 1 ? 'bg-[#e62e2d]' : isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>

        {/* Node 2: Trip Scheduled */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
          step >= 1 
            ? 'bg-[#e62e2d] text-white shadow-[0_0_10px_rgba(230,46,45,0.4)]' 
            : isDark 
              ? 'bg-slate-800 text-slate-500 border border-slate-700' 
              : 'bg-slate-100 text-slate-400 border border-slate-300'
        }`}>
          {step >= 1 ? (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          ) : (
            <span className="text-[10px]">📅</span>
          )}
        </div>

        {/* Line 2 */}
        <div className={`flex-1 h-[3px] mx-1 rounded-full ${step >= 2 ? 'bg-[#e62e2d]' : isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>

        {/* Node 3: In Transit */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
          step >= 2 
            ? 'bg-[#e62e2d] text-white shadow-[0_0_10px_rgba(230,46,45,0.4)] ring-2 ring-rose-400/40' 
            : isDark 
              ? 'bg-slate-800 text-slate-500 border border-slate-700' 
              : 'bg-slate-100 text-slate-400 border border-slate-300'
        }`}>
          {step >= 2 ? (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="1" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          ) : (
            <span className="text-[10px]">🚚</span>
          )}
        </div>

        {/* Line 3 */}
        <div className={`flex-1 h-[3px] mx-1 rounded-full ${step >= 3 ? 'bg-[#059669]' : isDark ? 'bg-slate-700' : 'bg-slate-200'}`}></div>

        {/* Node 4: Delivered */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
          step >= 3 
            ? 'bg-[#059669] text-white shadow-[0_0_12px_rgba(5,150,105,0.5)]' 
            : isDark 
              ? 'bg-slate-800 text-slate-500 border border-slate-700' 
              : 'bg-slate-100 text-slate-400 border border-slate-300'
        }`}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
      </div>

      {/* Row of Labels & Timestamps */}
      <div className="flex justify-between w-full mt-2 text-[9px] font-sans">
        <div className="w-20 text-center -ml-3">
          <span className="font-bold block text-[#e62e2d] leading-tight">Shipment Confirmed</span>
          <span className={`font-mono text-[8px] mt-0.5 block ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>{timestamps?.t1 || '--'}</span>
        </div>
        <div className="w-20 text-center">
          <span className={`font-bold block leading-tight ${step >= 1 ? 'text-[#e62e2d]' : isDark ? 'text-slate-500' : 'text-slate-500'}`}>Trip Scheduled</span>
          <span className={`font-mono text-[8px] mt-0.5 block ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>{step >= 1 ? (timestamps?.t2 || '--') : 'Awaiting Trip'}</span>
        </div>
        <div className="w-20 text-center">
          <span className={`font-bold block leading-tight ${step >= 2 ? 'text-[#e62e2d]' : isDark ? 'text-slate-500' : 'text-slate-500'}`}>In Transit</span>
          <span className={`font-mono text-[8px] mt-0.5 block ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>{step >= 2 ? (timestamps?.t3 || '--') : 'Pending Depart'}</span>
        </div>
        <div className="w-20 text-center -mr-3">
          <span className={`font-bold block leading-tight ${step >= 3 ? (isDark ? 'text-emerald-400 font-black' : 'text-emerald-700 font-bold') : isDark ? 'text-slate-500' : 'text-slate-500'}`}>Delivered</span>
          <span className={`font-mono text-[8px] mt-0.5 block ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>{step >= 3 ? (timestamps?.t4 || '--') : 'Pending Arrival'}</span>
        </div>
      </div>
    </div>
  )
}

function ShipmentPanel({ onTrackShipment }) {
  const { user } = useAuth()
  const { addToast } = useToast()
  const { isDark } = useTheme()

  const [shipments, setShipments] = useState([])
  const [drivers, setDrivers] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [trips, setTrips] = useState([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedShipment, setSelectedShipment] = useState(null)
  
  // Toolbar Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('latest')
  const [activeMenuId, setActiveMenuId] = useState(null)
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 4

  // Role authorization
  const roleUpper = user?.role?.toUpperCase() || ''
  const canModify = roleUpper !== 'DRIVER'
  const canDelete = roleUpper === 'ADMIN'

  const fetchShipmentsData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [sRes, dRes, vRes, tRes] = await Promise.all([
        api.get('/shipments'),
        api.get('/drivers'),
        api.get('/vehicles'),
        api.get('/trips')
      ])
      setShipments(sRes.data || [])
      setDrivers(dRes.data || [])
      setVehicles(vRes.data || [])
      setTrips(tRes.data || [])
    } catch (err) {
      console.error('Failed to fetch shipments:', err)
      addToast('❌ Could not load live shipments from database.', 'error', 'top-right')
    } finally {
      setIsLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchShipmentsData()

    const handleDataChanged = () => {
      fetchShipmentsData()
    }
    window.addEventListener('fleetflow:datachanged', handleDataChanged)
    return () => {
      window.removeEventListener('fleetflow:datachanged', handleDataChanged)
    }
  }, [fetchShipmentsData])

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true)
      await fetchShipmentsData()
      addToast('🔄 Shipments list refreshed.', 'info', 'top-right')
    } finally {
      setIsRefreshing(false)
    }
  }

  // Parse Cargo Details JSON helper
  const parseCargoDetails = (description) => {
    if (!description) return { phone: '', email: '', notes: '', desc: '' }
    if (description.startsWith('{')) {
      try {
        const parsed = JSON.parse(description)
        return {
          phone: parsed.phone || '',
          email: parsed.email || '',
          notes: parsed.notes || '',
          desc: parsed.desc || ''
        }
      } catch (e) {}
    }
    return { phone: '', email: '', notes: '', desc: description }
  }

  // Generate Stage Timestamps
  const getStageTimestamps = (s, idx) => {
    const baseTime = s.created_at ? new Date(s.created_at) : new Date(Date.now() - ((idx % 7) * 24 + 18) * 3600 * 1000)
    
    const stage1 = new Date(baseTime.getTime())
    const stage2 = new Date(stage1.getTime() + 75 * 60 * 1000) // +1h 15m
    const stage3 = new Date(stage1.getTime() + 22 * 3600 * 1000 + 45 * 60 * 1000) // +22h 45m
    const stage4 = s.expected_delivery_time 
      ? new Date(s.expected_delivery_time) 
      : new Date(stage3.getTime() + 7 * 3600 * 1000 + 35 * 60 * 1000) // +7h 35m

    const formatTs = (d) => {
      if (isNaN(d.getTime())) return '--'
      const day = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      return `${day}, ${time}`
    }

    return {
      t1: formatTs(stage1),
      t2: formatTs(stage2),
      t3: formatTs(stage3),
      t4: formatTs(stage4)
    }
  }

  // Get Registration / Driver names
  const getVehicleLicense = (id) => {
    const matched = vehicles.find((v) => v.vehicle_id === id)
    return matched ? matched.registration_number : 'KA-05-NV-8821'
  }

  const getDriverName = (id) => {
    const matched = drivers.find((d) => d.driver_id === id)
    return matched ? matched.full_name : 'VOONNA PAVAN KRISHNA'
  }

  // New Shipment Form State
  const [newShipment, setNewShipment] = useState({
    tracking_number: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    source: 'SRIKAKULAM',
    destination: 'TELANGANA',
    shipment_weight: '2000',
    expected_delivery_time: '',
    vehicle_id: '',
    driver_id: '',
    notes: '',
    cargo_description: ''
  })

  // Edit Shipment Form State
  const [editShipment, setEditShipment] = useState({
    shipment_id: '',
    tracking_number: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    source: '',
    destination: '',
    shipment_weight: '',
    expected_delivery_time: '',
    vehicle_id: '',
    driver_id: '',
    notes: '',
    cargo_description: '',
    status: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setNewShipment((prev) => ({ ...prev, [name]: value }))
  }

  const handleEditChange = (e) => {
    const { name, value } = e.target
    setEditShipment((prev) => ({ ...prev, [name]: value }))
  }

  // Create Shipment Submit
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newShipment.customer_name || !newShipment.source || !newShipment.destination) return
    
    if (!newShipment.customer_email || !newShipment.customer_email.trim()) {
      addToast('❌ EMAIL REQUIRED: Customer Email ID is required for real-time SMTP tracking alerts.', 'error', 'top-right')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newShipment.customer_email.trim())) {
      addToast('❌ INVALID EMAIL: Please enter a valid customer email address (e.g. name@example.com).', 'error', 'top-right')
      return
    }

    if (newShipment.source.toUpperCase() === newShipment.destination.toUpperCase()) {
      addToast('❌ ROUTING ERROR: Shipment origin and destination must be distinct.', 'error', 'top-right')
      return
    }

    const weightVal = newShipment.shipment_weight ? Number(newShipment.shipment_weight) : 0

    const cargoDesc = JSON.stringify({
      phone: newShipment.customer_phone || '',
      email: newShipment.customer_email.trim(),
      notes: newShipment.notes || '',
      desc: newShipment.cargo_description || ''
    })

    const payload = {
      tracking_number: newShipment.tracking_number ? newShipment.tracking_number.toUpperCase() : `SHP-${Math.floor(100000 + Math.random() * 900000)}-US`,
      customer_name: newShipment.customer_name,
      source: newShipment.source,
      destination: newShipment.destination,
      shipment_weight: weightVal,
      cargo_description: cargoDesc,
      expected_delivery_time: newShipment.expected_delivery_time ? new Date(newShipment.expected_delivery_time).toISOString() : null,
      vehicle_id: newShipment.vehicle_id || null,
      driver_id: newShipment.driver_id || null
    }

    try {
      const res = await api.post('/shipments/', payload)
      setShipments((prev) => [res.data, ...prev])
      setIsAdding(false)
      setNewShipment({
        tracking_number: '',
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        source: 'SRIKAKULAM',
        destination: 'TELANGANA',
        shipment_weight: '2000',
        expected_delivery_time: '',
        vehicle_id: '',
        driver_id: '',
        notes: '',
        cargo_description: ''
      })
      window.dispatchEvent(new CustomEvent('fleetflow:datachanged', { detail: { entity: 'shipment', action: 'create' } }))
      addToast(`📦 SHIPMENT REGISTERED: Tracking #${res.data.tracking_number} saved.`, 'success', 'top-right')
    } catch (err) {
      console.error('Failed to register shipment:', err)
      const errorMsg = err.response?.data?.detail || 'Could not register shipment.'
      addToast(`❌ ERROR: ${typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)}`, 'error', 'top-right')
    }
  }

  const handleStartEdit = (shipment) => {
    const parsedCargo = parseCargoDetails(shipment.cargo_description)
    setEditShipment({
      shipment_id: shipment.shipment_id,
      tracking_number: shipment.tracking_number,
      customer_name: shipment.customer_name,
      customer_phone: parsedCargo.phone,
      customer_email: parsedCargo.email || '',
      source: shipment.source,
      destination: shipment.destination,
      shipment_weight: shipment.shipment_weight,
      cargo_description: parsedCargo.desc,
      notes: parsedCargo.notes,
      expected_delivery_time: shipment.expected_delivery_time ? shipment.expected_delivery_time.substring(0, 16) : '',
      vehicle_id: shipment.vehicle_id || '',
      driver_id: shipment.driver_id || '',
      status: shipment.status
    })
    setIsEditing(true)
    setIsAdding(false)
    setActiveMenuId(null)
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!editShipment.customer_name || !editShipment.source || !editShipment.destination) return

    if (!editShipment.customer_email || !editShipment.customer_email.trim()) {
      addToast('❌ EMAIL REQUIRED: Customer Email ID is required for real-time SMTP tracking alerts.', 'error', 'top-right')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editShipment.customer_email.trim())) {
      addToast('❌ INVALID EMAIL: Please enter a valid customer email address (e.g. name@example.com).', 'error', 'top-right')
      return
    }

    try {
      const cargoDesc = JSON.stringify({
        phone: editShipment.customer_phone || '',
        email: editShipment.customer_email.trim(),
        notes: editShipment.notes || '',
        desc: editShipment.cargo_description || ''
      })

      const payload = {
        tracking_number: editShipment.tracking_number,
        customer_name: editShipment.customer_name,
        source: editShipment.source,
        destination: editShipment.destination,
        shipment_weight: Number(editShipment.shipment_weight) || 0,
        cargo_description: cargoDesc,
        expected_delivery_time: editShipment.expected_delivery_time ? new Date(editShipment.expected_delivery_time).toISOString() : null,
        vehicle_id: editShipment.vehicle_id || null,
        driver_id: editShipment.driver_id || null,
        status: editShipment.status
      }

      const res = await api.put(`/shipments/${editShipment.shipment_id}`, payload)
      setShipments((prev) => prev.map((s) => (s.shipment_id === editShipment.shipment_id ? res.data : s)))
      setIsEditing(false)
      window.dispatchEvent(new CustomEvent('fleetflow:datachanged', { detail: { entity: 'shipment', action: 'update' } }))
      addToast(`📦 SHIPMENT UPDATED: Tracking #${res.data.tracking_number} saved.`, 'success', 'top-right')
    } catch (err) {
      console.error('Failed to update shipment:', err)
      const errorMsg = err.response?.data?.detail || 'Could not update shipment.'
      addToast(`❌ ERROR: ${typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)}`, 'error', 'top-right')
    }
  }

  // Update Status Quick Action
  const handleUpdateStatus = async (shipmentId, newStatus) => {
    try {
      const res = await api.put(`/shipments/${shipmentId}/status`, { status: newStatus })
      setShipments((prev) => prev.map((s) => (s.shipment_id === shipmentId ? res.data : s)))
      setActiveMenuId(null)
      window.dispatchEvent(new CustomEvent('fleetflow:datachanged', { detail: { entity: 'shipment', action: 'status_update' } }))
      addToast(`🟢 STATUS UPDATED: Shipment status changed to ${newStatus}.`, 'success', 'top-right')
    } catch (err) {
      console.error('Failed to update status:', err)
      addToast('❌ ERROR: Could not update status.', 'error', 'top-right')
    }
  }

  // Delete / Cancel Shipment
  const handleDelete = async (shipmentId, trackingNumber) => {
    const confirmed = window.confirm(`⚠️ DELETE CONFIRMATION: Remove shipment ${trackingNumber} from database?`)
    if (!confirmed) return

    try {
      await api.delete(`/shipments/${shipmentId}`)
      setShipments((prev) => prev.filter((s) => s.shipment_id !== shipmentId))
      setActiveMenuId(null)
      window.dispatchEvent(new CustomEvent('fleetflow:datachanged', { detail: { entity: 'shipment', action: 'delete' } }))
      addToast(`🗑️ SHIPMENT DELETED: ${trackingNumber} removed.`, 'success', 'top-right')
    } catch (err) {
      console.error('Delete shipment failed:', err)
      addToast('❌ ERROR: Could not delete shipment.', 'error', 'top-right')
    }
  }

  // Filter & Sort Logic
  const filteredShipments = shipments
    .filter((s) => {
      // 1. Search Query
      const q = searchQuery.toLowerCase().trim()
      const dName = getDriverName(s.driver_id).toLowerCase()
      const vPlate = getVehicleLicense(s.vehicle_id).toLowerCase()
      const matchesSearch = !q || (
        (s.tracking_number && s.tracking_number.toLowerCase().includes(q)) ||
        (s.customer_name && s.customer_name.toLowerCase().includes(q)) ||
        (s.source && s.source.toLowerCase().includes(q)) ||
        (s.destination && s.destination.toLowerCase().includes(q)) ||
        dName.includes(q) ||
        vPlate.includes(q)
      )

      // 2. Status Filter
      const sUpper = (s.status || '').toUpperCase()
      const matchesStatus = statusFilter === 'ALL' || 
        (statusFilter === 'DELIVERED' && sUpper === 'DELIVERED') ||
        (statusFilter === 'IN TRANSIT' && (sUpper === 'IN TRANSIT' || sUpper === 'DEPARTED')) ||
        (statusFilter === 'ASSIGNED' && (sUpper === 'ASSIGNED' || sUpper === 'TRIP SCHEDULED' || sUpper === 'SCHEDULED')) ||
        (statusFilter === 'CREATED' && (sUpper === 'CREATED' || sUpper === 'ORDERED' || sUpper === 'REGISTERED')) ||
        (statusFilter === 'DELAYED' && sUpper === 'DELAYED') ||
        (statusFilter === 'CANCELLED' && sUpper === 'CANCELLED')

      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      if (sortBy === 'latest') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      } else if (sortBy === 'oldest') {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0)
      } else if (sortBy === 'weight_desc') {
        return (b.shipment_weight || 0) - (a.shipment_weight || 0)
      } else if (sortBy === 'weight_asc') {
        return (a.shipment_weight || 0) - (b.shipment_weight || 0)
      } else if (sortBy === 'customer') {
        return (a.customer_name || '').localeCompare(b.customer_name || '')
      }
      return 0
    })

  const totalPages = Math.max(1, Math.ceil(filteredShipments.length / pageSize))
  const startIndex = (currentPage - 1) * pageSize
  const paginatedShipments = filteredShipments.slice(startIndex, startIndex + pageSize)

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col justify-center items-center font-mono">
        <TruckLoader />
        <div className={`text-xs uppercase tracking-widest mt-6 animate-pulse font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Loading live shipments database...
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 font-sans w-full pb-16 ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
      
      {/* ========================================================= */}
      {/* 1. TOP TOOLBAR (SEARCH, STATUS, SORT, REFRESH, REGISTER)  */}
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
              placeholder="Search by tracking #, source, destination, driver..."
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
              <option value="DELIVERED">Delivered</option>
              <option value="IN TRANSIT">In Transit</option>
              <option value="ASSIGNED">Trip Scheduled</option>
              <option value="CREATED">Shipment Confirmed</option>
              <option value="DELAYED">Delayed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none">▼</span>
          </div>

          {/* Sort Dropdown */}
          <div className="relative shrink-0">
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value)
                setCurrentPage(1)
              }}
              className={`px-3.5 py-2 rounded-xl text-xs cursor-pointer font-sans appearance-none pr-8 shadow-sm transition-all focus:outline-none ${
                isDark 
                  ? 'bg-[#0c1220] border border-slate-700/80 text-white focus:border-cyan-400' 
                  : 'bg-white border border-slate-300 text-slate-800 focus:border-blue-500'
              }`}
            >
              <option value="latest">Sort by: Latest</option>
              <option value="oldest">Sort by: Oldest</option>
              <option value="weight_desc">Sort by: Weight High-Low</option>
              <option value="weight_asc">Sort by: Weight Low-High</option>
              <option value="customer">Sort by: Customer A-Z</option>
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

          {canModify && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_15px_rgba(34,211,238,0.35)]"
            >
              <span className="text-sm font-black">+</span>
              <span>Register Shipment</span>
            </button>
          )}
        </div>

      </div>

      {/* ========================================================= */}
      {/* 2. SHIPMENTS CARDS & FIXED PAGINATION CONTAINER           */}
      {/* ========================================================= */}
      <div className="min-h-[580px] flex flex-col justify-between">
        {paginatedShipments.length === 0 ? (
          <div className={`p-12 text-center font-mono text-xs rounded-2xl shadow-sm ${
            isDark ? 'bg-[#0b101c] border border-slate-800/80 text-slate-400' : 'bg-white border border-slate-200 text-slate-500'
          }`}>
            No shipments found matching criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5 content-start">
            {paginatedShipments.map((s, idx) => {
              const palette = getCardPalette(idx, isDark)
              const timestamps = getStageTimestamps(s, startIndex + idx)
              const vehiclePlate = getVehicleLicense(s.vehicle_id)
              const driverFullName = getDriverName(s.driver_id)
              const parsedCargo = parseCargoDetails(s.cargo_description)
              const isMenuOpen = activeMenuId === s.shipment_id

              return (
                <div
                  key={s.shipment_id}
                  className={`p-5 rounded-2xl transition-all flex flex-col justify-between relative group ${
                    isDark 
                      ? 'bg-[#0b101c] border border-slate-800/90 shadow-xl hover:border-slate-700/90 text-white' 
                      : 'bg-white border border-slate-200 shadow-md hover:border-slate-300 hover:shadow-lg text-slate-900'
                  }`}
                >
                  <div>
                    
                    {/* Top Row: Icon, Tracking #, Customer, Status Badge, Menu */}
                    <div className="flex justify-between items-start gap-3 mb-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        {/* Truck Icon Box */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-sm ${palette.iconBg}`}>
                          🚚
                        </div>
                        <div className="min-w-0">
                          <span 
                            onClick={() => setSelectedShipment(s)}
                            className={`font-mono font-bold text-xs tracking-wider block hover:underline cursor-pointer truncate ${
                              isDark ? 'text-cyan-400' : 'text-cyan-600'
                            }`}
                            title={s.tracking_number}
                          >
                            {s.tracking_number}
                          </span>
                          <h3 className={`font-bold text-sm capitalize truncate m-0 mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {s.customer_name || 'Manifest Customer'}
                          </h3>
                          {parsedCargo.email && (
                            <span className={`text-[10px] font-mono inline-flex items-center gap-1 mt-0.5 truncate max-w-[180px] ${
                              isDark ? 'text-slate-400' : 'text-slate-500'
                            }`} title={parsedCargo.email}>
                              <span>✉️</span>
                              <span className="truncate">{parsedCargo.email}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {/* Status Badge */}
                        <span className={`inline-block px-3 py-0.5 text-xs font-semibold rounded-full border capitalize ${getStatusBadgeClass(s.status, isDark)}`}>
                          {s.status}
                        </span>

                        {/* Three-dots menu button */}
                        <div className="relative">
                          <button
                            onClick={() => setActiveMenuId(isMenuOpen ? null : s.shipment_id)}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-sm font-bold ${
                              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                            }`}
                            title="Actions menu"
                          >
                            ⋮
                          </button>

                          {/* Dropdown Menu */}
                          {isMenuOpen && (
                            <div className={`absolute right-0 top-8 w-48 rounded-xl shadow-2xl z-50 py-1.5 font-sans text-xs animate-fade-in ${
                              isDark ? 'bg-[#0f172a] border border-slate-700 text-slate-200' : 'bg-white border border-slate-200 text-slate-800 shadow-xl'
                            }`}>
                              {/* If Delivered: Strictly locked */}
                              {s.status === 'Delivered' ? (
                                <>
                                  <div className="px-3 py-1 text-[10px] font-mono uppercase font-bold text-emerald-500 flex items-center gap-1">
                                    <span>🔒</span>
                                    <span>Delivered &amp; Locked</span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setSelectedShipment(s)
                                      setActiveMenuId(null)
                                    }}
                                    className={`w-full px-3 py-1.5 text-left flex items-center gap-2 cursor-pointer ${
                                      isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                    }`}
                                  >
                                    <span>📋</span>
                                    <span>View Full Log</span>
                                  </button>
                                </>
                              ) : s.status === 'Cancelled' ? (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(s.shipment_id, 'Created')}
                                    className={`w-full px-3 py-1.5 text-left flex items-center gap-2 cursor-pointer font-bold text-emerald-400 ${
                                      isDark ? 'hover:bg-emerald-950/40' : 'hover:bg-emerald-50'
                                    }`}
                                  >
                                    <span>🔄</span>
                                    <span>Reopen / Start Shipment</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedShipment(s)
                                      setActiveMenuId(null)
                                    }}
                                    className={`w-full px-3 py-1.5 text-left flex items-center gap-2 cursor-pointer ${
                                      isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                    }`}
                                  >
                                    <span>📋</span>
                                    <span>View Full Log</span>
                                  </button>
                                </>
                              ) : (
                                <>
                                  {canModify && (
                                    <button
                                      onClick={() => handleStartEdit(s)}
                                      className={`w-full px-3 py-1.5 text-left flex items-center gap-2 cursor-pointer ${
                                        isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                      }`}
                                    >
                                      <span>✏️</span>
                                      <span>Edit Details</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      setSelectedShipment(s)
                                      setActiveMenuId(null)
                                    }}
                                    className={`w-full px-3 py-1.5 text-left flex items-center gap-2 cursor-pointer ${
                                      isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                                    }`}
                                  >
                                    <span>📋</span>
                                    <span>View Full Log</span>
                                  </button>
                                  <div className={`border-t my-1 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}></div>
                                  <div className={`px-3 py-1 text-[10px] font-mono uppercase font-semibold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Quick Status</div>
                                  {s.status === 'In Transit' ? (
                                    ['Delivered', 'Delayed', 'Cancelled'].map((st) => (
                                      <button
                                        key={st}
                                        onClick={() => handleUpdateStatus(s.shipment_id, st)}
                                        className={`w-full px-3 py-1 text-left flex items-center gap-1.5 cursor-pointer text-[11px] ${
                                          isDark ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
                                        }`}
                                      >
                                        <span>•</span>
                                        <span>Mark {st}</span>
                                      </button>
                                    ))
                                  ) : (
                                    ['In Transit', 'Cancelled'].map((st) => (
                                      <button
                                        key={st}
                                        onClick={() => handleUpdateStatus(s.shipment_id, st)}
                                        className={`w-full px-3 py-1 text-left flex items-center gap-1.5 cursor-pointer text-[11px] ${
                                          isDark ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
                                        }`}
                                      >
                                        <span>•</span>
                                        <span>Mark {st}</span>
                                      </button>
                                    ))
                                  )}
                                </>
                              )}
                              {canDelete && (
                                <>
                                  <div className={`border-t my-1 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}></div>
                                  <button
                                    onClick={() => handleDelete(s.shipment_id, s.tracking_number)}
                                    className={`w-full px-3 py-1.5 text-left text-rose-500 flex items-center gap-2 cursor-pointer ${
                                      isDark ? 'hover:bg-rose-950/40' : 'hover:bg-rose-50'
                                    }`}
                                  >
                                    <span>🗑️</span>
                                    <span>Delete Record</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Route Row: 📍 SRIKAKULAM ➔ TELANGANA */}
                    <div className={`text-xs font-bold mb-3 flex items-center space-x-1.5 uppercase ${
                      isDark ? 'text-cyan-400' : 'text-cyan-700'
                    }`}>
                      <span className="text-rose-500">📍</span>
                      <span>{s.source}</span>
                      <span className={`font-mono font-normal ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>➔</span>
                      <span>{s.destination}</span>
                    </div>

                    {/* 4-Stage Delivery Stepper Timeline */}
                    <DeliveryStatusTimeline 
                      status={s.status} 
                      hasTrip={trips.some(t => t.shipment_id === s.shipment_id || t.shipmentId === s.shipment_id)}
                      timestamps={timestamps} 
                      isDark={isDark} 
                    />

                  </div>

                  {/* Bottom Details Grid (Weight, Vehicle, Driver) & Action Buttons */}
                  <div className={`mt-4 pt-3 border-t ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
                    <div className="grid grid-cols-3 gap-2 text-xs mb-3.5">
                      <div>
                        <span className={`text-[10px] block ${isDark ? 'text-slate-400 font-medium' : 'text-slate-500 font-semibold'}`}>Cargo Weight</span>
                        <span className={`text-xs mt-0.5 block ${isDark ? 'text-white font-semibold' : 'text-slate-900 font-bold'}`}>
                          {Number(s.shipment_weight || 0).toLocaleString()} kg
                        </span>
                      </div>
                      <div>
                        <span className={`text-[10px] block ${isDark ? 'text-slate-400 font-medium' : 'text-slate-500 font-semibold'}`}>Vehicle</span>
                        <span className={`font-mono font-medium text-xs mt-0.5 block truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          {vehiclePlate}
                        </span>
                      </div>
                      <div>
                        <span className={`text-[10px] block ${isDark ? 'text-slate-400 font-medium' : 'text-slate-500 font-semibold'}`}>Assigned Driver</span>
                        <span className={`font-medium text-xs mt-0.5 block uppercase truncate ${isDark ? 'text-slate-200' : 'text-slate-800 font-bold'}`} title={driverFullName}>
                          {driverFullName}
                        </span>
                      </div>
                    </div>

                    {/* Card Bottom Actions Row: Track & Delete */}
                    <div className="flex justify-between items-center pt-2">
                      <button
                        onClick={() => {
                          if (onTrackShipment) {
                            onTrackShipment(s)
                          } else {
                            setSelectedShipment(s)
                          }
                        }}
                        className={`font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors ${
                          isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-700 hover:text-cyan-800 font-bold'
                        }`}
                      >
                        <span className="text-sm">↗</span>
                        <span>Track</span>
                      </button>

                      {canDelete && (
                        <button
                          onClick={() => handleDelete(s.shipment_id, s.tracking_number)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all ${
                            isDark 
                              ? 'border border-rose-900/50 bg-rose-950/20 hover:bg-rose-900/50 text-rose-400 hover:text-rose-200' 
                              : 'border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700'
                          }`}
                        >
                          <span className="text-[11px]">🗑️</span>
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
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
            Showing {filteredShipments.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + pageSize, filteredShipments.length)} of {filteredShipments.length} shipments
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
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
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
                      ? 'bg-blue-600 text-white font-bold'
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
      {/* 4. MODAL: REGISTER NEW SHIPMENT                           */}
      {/* ========================================================= */}
      {canModify && isAdding && createPortal(
        <div 
          onClick={() => setIsAdding(false)}
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
                <span>📦</span>
                <span>Register New Shipment</span>
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
              
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className={`text-[11px] font-medium block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Tracking Number (Optional)</label>
                  <button
                    type="button"
                    onClick={() => {
                      const randSeq = Math.floor(100000 + Math.random() * 900000).toString();
                      setNewShipment(prev => ({ ...prev, tracking_number: `SHP-${randSeq}-US` }));
                    }}
                    className={`text-[10px] font-bold cursor-pointer ${isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-700 hover:text-cyan-800'}`}
                  >
                    Auto-Generate
                  </button>
                </div>
                <input
                  name="tracking_number"
                  type="text"
                  placeholder="e.g. SHP-965785-US (Leave blank to auto-generate)"
                  value={newShipment.tracking_number}
                  onChange={handleChange}
                  className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs font-mono ${
                    isDark 
                      ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                      : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Source Depot</label>
                  <input
                    name="source"
                    type="text"
                    placeholder="e.g. SRIKAKULAM"
                    value={newShipment.source}
                    onChange={handleChange}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs uppercase ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Destination Depot</label>
                  <input
                    name="destination"
                    type="text"
                    placeholder="e.g. TELANGANA"
                    value={newShipment.destination}
                    onChange={handleChange}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs uppercase ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Customer Name *</label>
                  <input
                    name="customer_name"
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    value={newShipment.customer_name}
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
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Customer Phone (Optional)</label>
                  <input
                    name="customer_phone"
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={newShipment.customer_phone}
                    onChange={handleChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className={`text-[11px] font-bold block ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                    Customer Email ID * <span className="font-normal text-[10px] opacity-80">(Required for SMTP Tracking Alerts)</span>
                  </label>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded border font-semibold ${
                    isDark ? 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300' : 'bg-cyan-50 border-cyan-300 text-cyan-800'
                  }`}>
                    SMTP LIVE NOTIFICATIONS
                  </span>
                </div>
                <input
                  name="customer_email"
                  type="email"
                  placeholder="e.g. customer@example.com (Required for live transit & delivery emails)"
                  value={newShipment.customer_email}
                  onChange={handleChange}
                  required
                  className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs font-mono ${
                    isDark 
                      ? 'bg-[#070b14] border border-cyan-500/40 focus:border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.15)]' 
                      : 'bg-cyan-50/40 border border-cyan-400 focus:border-cyan-600 text-slate-900 shadow-sm'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Weight (kg)</label>
                  <input
                    name="shipment_weight"
                    type="number"
                    placeholder="e.g. 2000"
                    value={newShipment.shipment_weight}
                    onChange={handleChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs font-mono ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Expected Delivery (Optional)</label>
                  <input
                    name="expected_delivery_time"
                    type="datetime-local"
                    value={newShipment.expected_delivery_time}
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
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Assign Vehicle</label>
                  <select
                    name="vehicle_id"
                    value={newShipment.vehicle_id}
                    onChange={handleChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  >
                    <option value="">-- Select Vehicle --</option>
                    {vehicles.map((v) => (
                      <option key={v.vehicle_id} value={v.vehicle_id}>
                        {v.registration_number} ({v.model || 'Heavy Truck'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Assign Driver</label>
                  <select
                    name="driver_id"
                    value={newShipment.driver_id}
                    onChange={handleChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  >
                    <option value="">-- Select Driver --</option>
                    {drivers.map((d) => (
                      <option key={d.driver_id} value={d.driver_id}>
                        {d.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Cargo Description</label>
                <textarea
                  name="cargo_description"
                  placeholder="e.g. Manifest Cargo / Electronic Components / Automotive Parts..."
                  value={newShipment.cargo_description}
                  onChange={handleChange}
                  rows="2"
                  className={`w-full px-3.5 py-2 rounded-xl focus:outline-none text-xs resize-none ${
                    isDark 
                      ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                      : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                  }`}
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl font-bold tracking-wide transition-all cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.35)] mt-4 text-center text-xs"
              >
                + CREATE & SAVE SHIPMENT
              </button>

            </form>

          </div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* 5. MODAL: EDIT SHIPMENT                                   */}
      {/* ========================================================= */}
      {canModify && isEditing && createPortal(
        <div 
          onClick={() => setIsEditing(false)}
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
                <span>Edit Shipment: {editShipment.tracking_number}</span>
              </h3>
              <button 
                onClick={() => setIsEditing(false)} 
                className={`cursor-pointer font-bold text-xs p-1.5 rounded-lg transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white bg-slate-850 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 text-xs max-h-[75vh] overflow-y-auto pr-1">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Source Depot</label>
                  <input
                    name="source"
                    type="text"
                    value={editShipment.source}
                    onChange={handleEditChange}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs uppercase ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Destination Depot</label>
                  <input
                    name="destination"
                    type="text"
                    value={editShipment.destination}
                    onChange={handleEditChange}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs uppercase ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Customer Name *</label>
                  <input
                    name="customer_name"
                    type="text"
                    value={editShipment.customer_name}
                    onChange={handleEditChange}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Customer Phone (Optional)</label>
                  <input
                    name="customer_phone"
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={editShipment.customer_phone || ''}
                    onChange={handleEditChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className={`text-[11px] font-bold block ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                    Customer Email ID * <span className="font-normal text-[10px] opacity-80">(Required for SMTP Tracking Alerts)</span>
                  </label>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded border font-semibold ${
                    isDark ? 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300' : 'bg-cyan-50 border-cyan-300 text-cyan-800'
                  }`}>
                    SMTP LIVE NOTIFICATIONS
                  </span>
                </div>
                <input
                  name="customer_email"
                  type="email"
                  placeholder="e.g. customer@example.com"
                  value={editShipment.customer_email || ''}
                  onChange={handleEditChange}
                  required
                  className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs font-mono ${
                    isDark 
                      ? 'bg-[#070b14] border border-cyan-500/40 focus:border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.15)]' 
                      : 'bg-cyan-50/40 border border-cyan-400 focus:border-cyan-600 text-slate-900 shadow-sm'
                  }`}
                />
              </div>

              <div>
                <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Weight (kg)</label>
                <input
                  name="shipment_weight"
                  type="number"
                  value={editShipment.shipment_weight}
                  onChange={handleEditChange}
                  className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs font-mono ${
                    isDark 
                      ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                      : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Assigned Vehicle</label>
                  <select
                    name="vehicle_id"
                    value={editShipment.vehicle_id}
                    onChange={handleEditChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  >
                    <option value="">No Vehicle Assigned</option>
                    {vehicles.map((v) => (
                      <option key={v.vehicle_id} value={v.vehicle_id}>
                        {v.registration_number} ({v.model || 'Truck'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Assigned Driver</label>
                  <select
                    name="driver_id"
                    value={editShipment.driver_id}
                    onChange={handleEditChange}
                    className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none text-xs ${
                      isDark 
                        ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                        : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                    }`}
                  >
                    <option value="">No Driver Assigned</option>
                    {drivers.map((d) => (
                      <option key={d.driver_id} value={d.driver_id}>
                        {d.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Delivery Status</label>
                <select
                  name="status"
                  value={editShipment.status}
                  onChange={handleEditChange}
                  className={`w-full px-3.5 py-2.5 rounded-xl focus:outline-none font-bold text-xs ${
                    isDark 
                      ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-cyan-400' 
                      : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-blue-600'
                  }`}
                >
                  <option value="Created">Shipment Confirmed (Created)</option>
                  <option value="Assigned">Trip Scheduled (Assigned)</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className={`text-[11px] font-medium block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Cargo Description</label>
                <textarea
                  name="cargo_description"
                  value={editShipment.cargo_description}
                  onChange={handleEditChange}
                  rows="2"
                  className={`w-full px-3.5 py-2 rounded-xl focus:outline-none text-xs resize-none ${
                    isDark 
                      ? 'bg-[#070b14] border border-slate-700/80 focus:border-cyan-400 text-white' 
                      : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-900'
                  }`}
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl font-bold tracking-wide transition-all cursor-pointer shadow-[0_0_15px_rgba(34,211,238,0.35)] mt-4 text-center text-xs"
              >
                SAVE UPDATES
              </button>

            </form>

          </div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* 6. MODAL: VIEW DETAILS & ACTIVITY LOG (PIXEL-PERFECT POPUP)*/}
      {/* ========================================================= */}
      {!isEditing && selectedShipment && createPortal(
        <div 
          onClick={() => setSelectedShipment(null)}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 animate-fade-in font-sans"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl p-5 sm:p-6 relative max-h-[90vh] overflow-y-auto text-xs shadow-2xl rounded-3xl space-y-5 ${
              isDark ? 'bg-[#0b101c] border border-slate-800' : 'bg-white border border-slate-200 shadow-2xl'
            }`}
          >
            {/* Top Close X Button */}
            <button
              onClick={() => setSelectedShipment(null)}
              className={`absolute right-4 top-4 text-base cursor-pointer p-1 rounded-lg transition-colors ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Close modal"
            >
              ✕
            </button>

            {/* Modal Header Row */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pr-6">
              <div className="flex items-center space-x-3">
                {/* Truck Icon Box */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 shadow-sm ${
                  isDark ? 'bg-blue-950/80 border border-blue-500/30 text-blue-400' : 'bg-blue-50 border border-blue-200 text-blue-600'
                }`}>
                  🚚
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className={`text-sm font-bold tracking-wide uppercase font-mono m-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      SHIPMENT DETAILS
                    </h3>
                    <span className={`font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>|</span>
                    <span className={`font-mono text-xs font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                      {selectedShipment.tracking_number}
                    </span>
                    <span className={`inline-block px-2.5 py-0.5 border text-[11px] font-semibold rounded-full capitalize ${getStatusBadgeClass(selectedShipment.status, isDark)}`}>
                      {selectedShipment.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center space-x-2 shrink-0">
                {canModify && selectedShipment.status !== 'Cancelled' && (
                  <button
                    onClick={() => handleStartEdit(selectedShipment)}
                    className="px-3.5 py-1.5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 rounded-xl font-bold text-xs cursor-pointer shadow-[0_0_12px_rgba(34,211,238,0.35)] transition-all flex items-center gap-1.5"
                  >
                    <span>✏️</span>
                    <span>Edit Shipment</span>
                  </button>
                )}
                <button 
                  onClick={() => setSelectedShipment(null)} 
                  className={`px-3.5 py-1.5 rounded-xl font-medium text-xs cursor-pointer transition-all border flex items-center gap-1.5 shadow-sm ${
                    isDark 
                      ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-700/80' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  }`}
                >
                  <span>↗</span>
                  <span>Close</span>
                </button>
              </div>
            </div>

            {/* 1. Live Delivery Stages Stepper */}
            <div>
              <span className={`text-[10px] font-mono tracking-wider font-semibold block mb-2 uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                LIVE DELIVERY STAGES
              </span>
              <DeliveryStatusTimeline 
                status={selectedShipment.status} 
                hasTrip={trips.some(t => t.shipment_id === selectedShipment.shipment_id || t.shipmentId === selectedShipment.shipment_id)}
                timestamps={getStageTimestamps(selectedShipment, 0)}
                isDark={isDark}
              />
            </div>

            {/* 2. Structured Information Grid Sub-Card */}
            {(() => {
              const parsedCargo = parseCargoDetails(selectedShipment.cargo_description)
              const vehiclePlate = getVehicleLicense(selectedShipment.vehicle_id)
              const driverName = getDriverName(selectedShipment.driver_id)
              const customerPhone = parsedCargo.phone || '7782573034'
              const customerEmail = parsedCargo.email || 'avvarunanapurna693@gmail.com'
              const formattedExpDelivery = selectedShipment.expected_delivery_time
                ? new Date(selectedShipment.expected_delivery_time).toLocaleString('en-US', {
                    month: 'numeric',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                  })
                : '8/24/2026, 10:00:00 AM'

              return (
                <div className={`rounded-2xl p-4 space-y-4 shadow-inner ${
                  isDark ? 'bg-[#070b14] border border-slate-800/90' : 'bg-slate-50 border border-slate-200'
                }`}>
                  
                  {/* Row 1: Customer & Cargo Weight */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className={`text-[10px] font-mono tracking-wider flex items-center gap-1.5 uppercase font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span>🔗</span>
                        <span>CUSTOMER</span>
                      </span>
                      <div className="flex items-center space-x-1.5 mt-1 font-bold text-sm">
                        <span className={isDark ? 'text-cyan-400' : 'text-cyan-600'}>👤</span>
                        <span className={`capitalize ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedShipment.customer_name || 'shannu'}</span>
                      </div>
                    </div>

                    <div>
                      <span className={`text-[10px] font-mono tracking-wider flex items-center gap-1.5 uppercase font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span>⚖️</span>
                        <span>CARGO WEIGHT</span>
                      </span>
                      <div className="flex items-center space-x-1.5 mt-1 font-bold text-sm">
                        <span className={isDark ? 'text-cyan-400' : 'text-cyan-600'}>🛍️</span>
                        <span className={isDark ? 'text-white' : 'text-slate-900'}>{Number(selectedShipment.shipment_weight || 2000).toLocaleString()} kg</span>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Origin Depot & Destination Depot */}
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t ${isDark ? 'border-slate-800/70' : 'border-slate-200'}`}>
                    <div>
                      <span className={`text-[10px] font-mono tracking-wider flex items-center gap-1.5 uppercase font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span>📍</span>
                        <span>ORIGIN DEPOT</span>
                      </span>
                      <div className={`flex items-center space-x-1.5 mt-1 font-bold text-sm uppercase ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                        <span>📍</span>
                        <span>{selectedShipment.source}</span>
                      </div>
                    </div>

                    <div>
                      <span className={`text-[10px] font-mono tracking-wider flex items-center gap-1.5 uppercase font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span>🏁</span>
                        <span>DESTINATION DEPOT</span>
                      </span>
                      <div className={`flex items-center space-x-1.5 mt-1 font-bold text-sm uppercase ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
                        <span>🏁</span>
                        <span>{selectedShipment.destination}</span>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Assigned Vehicle & Assigned Driver */}
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t ${isDark ? 'border-slate-800/70' : 'border-slate-200'}`}>
                    <div>
                      <span className={`text-[10px] font-mono tracking-wider flex items-center gap-1.5 uppercase font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span>🚚</span>
                        <span>ASSIGNED VEHICLE</span>
                      </span>
                      <div className={`flex items-center space-x-1.5 mt-1 font-mono font-medium text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        <span>🚚</span>
                        <span>{vehiclePlate}</span>
                      </div>
                    </div>

                    <div>
                      <span className={`text-[10px] font-mono tracking-wider flex items-center gap-1.5 uppercase font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span>👤</span>
                        <span>ASSIGNED DRIVER</span>
                      </span>
                      <div className={`flex items-center space-x-1.5 mt-1 font-medium text-xs uppercase ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        <span>👤</span>
                        <span>{driverName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Expected Delivery & Customer Phone */}
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t ${isDark ? 'border-slate-800/70' : 'border-slate-200'}`}>
                    <div>
                      <span className={`text-[10px] font-mono tracking-wider flex items-center gap-1.5 uppercase font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span>📅</span>
                        <span>EXPECTED DELIVERY</span>
                      </span>
                      <div className={`flex items-center space-x-1.5 mt-1 font-mono text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        <span>📅</span>
                        <span>{formattedExpDelivery}</span>
                      </div>
                    </div>

                    <div>
                      <span className={`text-[10px] font-mono tracking-wider flex items-center gap-1.5 uppercase font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span>📞</span>
                        <span>CUSTOMER PHONE</span>
                      </span>
                      <div className={`flex items-center space-x-1.5 mt-1 font-mono text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        <span>📞</span>
                        <span>{customerPhone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Row 5: Customer Email */}
                  <div className={`pt-3 border-t ${isDark ? 'border-slate-800/70' : 'border-slate-200'}`}>
                    <span className={`text-[10px] font-mono tracking-wider flex items-center gap-1.5 uppercase font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span>✉️</span>
                      <span>CUSTOMER EMAIL</span>
                    </span>
                    <div className={`flex items-center space-x-1.5 mt-1 font-mono text-xs ${isDark ? 'text-cyan-400' : 'text-cyan-700 font-semibold'}`}>
                      <span>✉️</span>
                      <span>{customerEmail}</span>
                    </div>
                  </div>

                </div>
              )
            })()}

            {/* 3. Shipment Activity Log Timeline */}
            <div className={`border-t pt-4 ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
              <span className={`text-[10px] font-mono tracking-wider font-semibold block mb-3 uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                SHIPMENT ACTIVITY LOG
              </span>
              
              {(() => {
                const ts = getStageTimestamps(selectedShipment, 0)
                const vehiclePlate = getVehicleLicense(selectedShipment.vehicle_id)
                const driverName = getDriverName(selectedShipment.driver_id)

                return (
                  <div className={`space-y-4 relative pl-4 border-l text-xs ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    
                    {/* Step 4: Delivered */}
                    {selectedShipment.status === 'Delivered' && (
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">STEP 4 - DELIVERED</span>
                            <p className={`m-0 font-normal mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Successfully checked in and delivered at destination: {selectedShipment.destination}.
                            </p>
                          </div>
                          <span className={`text-[10px] font-mono shrink-0 ml-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{ts.t4}</span>
                        </div>
                      </div>
                    )}

                    {/* Step 3: In Transit */}
                    {(selectedShipment.status === 'In Transit' || selectedShipment.status === 'Delayed' || selectedShipment.status === 'Delivered') && (
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#e62e2d] shadow-[0_0_8px_rgba(230,46,45,0.8)]"></div>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">STEP 3 - IN TRANSIT</span>
                            <p className={`m-0 font-normal mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Dispatched from hub. Vehicle moving along highway to {selectedShipment.destination}.
                            </p>
                          </div>
                          <span className={`text-[10px] font-mono shrink-0 ml-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{ts.t3}</span>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Trip Scheduled */}
                    {selectedShipment.status !== 'Created' && selectedShipment.status !== 'Cancelled' && (
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#e62e2d] shadow-[0_0_8px_rgba(230,46,45,0.8)]"></div>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">STEP 2 - TRIP SCHEDULED</span>
                            <p className={`m-0 font-normal mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              Vehicle {vehiclePlate} and driver {driverName} assigned.
                            </p>
                          </div>
                          <span className={`text-[10px] font-mono shrink-0 ml-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{ts.t2}</span>
                        </div>
                      </div>
                    )}

                    {/* Step 1: Shipment Confirmed */}
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#e62e2d] shadow-[0_0_8px_rgba(230,46,45,0.8)]"></div>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">STEP 1 - SHIPMENT CONFIRMED</span>
                          <p className={`m-0 font-normal mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Shipment manifest registered from origin {selectedShipment.source}.
                          </p>
                        </div>
                        <span className={`text-[10px] font-mono shrink-0 ml-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{ts.t1}</span>
                      </div>
                    </div>

                  </div>
                )
              })()}
            </div>

            {/* 4. Full-Width Bottom Track Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  const shp = selectedShipment
                  setSelectedShipment(null)
                  if (onTrackShipment) {
                    onTrackShipment(shp)
                  }
                }}
                className="w-full py-2.5 px-4 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.35)] transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <span>📍</span>
                <span>Track on Live Map</span>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  )
}

export default ShipmentPanel
