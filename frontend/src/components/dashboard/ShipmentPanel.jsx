import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import api from '../../api/axios'
import TruckLoader from '../ui/TruckLoader'

const INITIAL_SHIPMENTS = [
  { shipment_id: '1', tracking_number: 'SHP-402941-US', customer_name: 'Alpha Logistics', source: 'SF', destination: 'LA', shipment_weight: 12500, status: 'In Transit', cargo_description: 'Processor Chips & Silicon Wafers', expected_delivery_time: '2026-08-04T12:00:00' },
  { shipment_id: '2', tracking_number: 'SHP-910245-US', customer_name: 'Apex Industrial', source: 'OAKLAND', destination: 'SACRAMENTO', shipment_weight: 8400, status: 'Created', cargo_description: 'Industrial Gearboxes', expected_delivery_time: '2026-08-05T18:00:00' },
  { shipment_id: '3', tracking_number: 'SHP-224198-US', customer_name: 'Omni ColdCorp', source: 'FRESNO', destination: 'SJ', shipment_weight: 18000, status: 'Delivered', cargo_description: 'Vaccines Refrigerated Storage', expected_delivery_time: '2026-08-03T09:00:00' },
  { shipment_id: '4', tracking_number: 'SHP-774902-US', customer_name: 'Beta Retailers', source: 'SJ', destination: 'LA', shipment_weight: 4200, status: 'Delayed', cargo_description: 'Smartphones & Wearables', expected_delivery_time: '2026-08-04T08:00:00' }
]

function ShipmentPanel() {
  const { user } = useAuth()
  const { addToast } = useToast()

  const [shipments, setShipments] = useState([])
  const [drivers, setDrivers] = useState([])
  const [vehicles, setVehicles] = useState([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedShipment, setSelectedShipment] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  
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
      } catch (e) {
        // fallback
      }
    }
    return { phone: '', email: '', notes: '', desc: description }
  }

  const [newShipment, setNewShipment] = useState({
    tracking_number: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    source: 'KOLLAM',
    destination: 'MUMBAI',
    shipment_weight: '',
    expected_delivery_time: '',
    vehicle_id: '',
    driver_id: '',
    notes: '',
    cargo_description: ''
  })

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

  // Role authorization
  const roleUpper = user?.role?.toUpperCase() || ''
  const canModify = roleUpper !== 'DRIVER'

  useEffect(() => {
    let active = true
    const loadData = async () => {
      try {
        setIsLoading(true)
        const res = await api.get('/shipments')
        if (active) setShipments(res.data)
      } catch (err) {
        console.error('Failed to load shipments list:', err)
        if (!err.response || err.code === 'ERR_NETWORK') {
          if (active) setShipments(INITIAL_SHIPMENTS)
        } else {
          addToast('❌ ERROR: Could not fetch active shipments list.', 'error', 'top-right')
        }
      } finally {
        if (active) setIsLoading(false)
      }

      try {
        const dRes = await api.get('/drivers')
        if (active) setDrivers(dRes.data)
        const vRes = await api.get('/vehicles')
        if (active) setVehicles(vRes.data)
      } catch (err) {
        console.error('Failed to fetch drivers or vehicles:', err)
      }
    }

    loadData()
    return () => {
      active = false
    }
  }, [addToast])

  const handleChange = (e) => {
    const { name, value } = e.target
    setNewShipment((prev) => ({ ...prev, [name]: value }))
  }

  const handleEditChange = (e) => {
    const { name, value } = e.target
    setEditShipment((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newShipment.customer_name || !newShipment.source || !newShipment.destination) return
    
    if (newShipment.source.toUpperCase() === newShipment.destination.toUpperCase()) {
      addToast('❌ ROUTING ERROR: Shipment origin and destination must be distinct.', 'error', 'top-right')
      return
    }

    const weightVal = newShipment.shipment_weight ? Number(newShipment.shipment_weight) : 0
    if (weightVal < 0) {
      addToast('❌ VALIDATION ERROR: Weight cannot be negative.', 'error', 'top-right')
      return
    }

    const cargoDesc = JSON.stringify({
      phone: newShipment.customer_phone || '',
      email: newShipment.customer_email || '',
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
        source: 'KOLLAM',
        destination: 'MUMBAI',
        shipment_weight: '',
        expected_delivery_time: '',
        vehicle_id: '',
        driver_id: '',
        notes: '',
        cargo_description: ''
      })
      addToast(`📦 SHIPMENT ADDED: Tracking key ${res.data.tracking_number} registered.`, 'success', 'top-right')
    } catch (err) {
      console.error('Failed to register shipment:', err)
      let errorMsg = 'Could not add shipment.'
      const detail = err.response?.data?.detail
      if (detail) {
        if (typeof detail === 'string') {
          errorMsg = detail
        } else if (Array.isArray(detail)) {
          errorMsg = detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join(', ')
        } else if (typeof detail === 'object') {
          errorMsg = detail.message || JSON.stringify(detail)
        }
      }
      addToast(`❌ ERROR: ${errorMsg}`, 'error', 'top-right')
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
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!editShipment.customer_name || !editShipment.source || !editShipment.destination) return
    
    if (editShipment.source.toUpperCase() === editShipment.destination.toUpperCase()) {
      addToast('❌ ROUTING ERROR: Shipment origin and destination must be distinct.', 'error', 'top-right')
      return
    }

    const weightVal = editShipment.shipment_weight ? Number(editShipment.shipment_weight) : 0
    if (weightVal < 0) {
      addToast('❌ VALIDATION ERROR: Weight cannot be negative.', 'error', 'top-right')
      return
    }

    try {
      const cargoDesc = JSON.stringify({
        phone: editShipment.customer_phone || '',
        email: editShipment.customer_email || '',
        notes: editShipment.notes || '',
        desc: editShipment.cargo_description || ''
      })

      const payload = {
        tracking_number: editShipment.tracking_number,
        customer_name: editShipment.customer_name,
        source: editShipment.source,
        destination: editShipment.destination,
        shipment_weight: weightVal,
        cargo_description: cargoDesc,
        expected_delivery_time: editShipment.expected_delivery_time ? new Date(editShipment.expected_delivery_time).toISOString() : null,
        vehicle_id: editShipment.vehicle_id || null,
        driver_id: editShipment.driver_id || null,
        status: editShipment.status
      }

      const res = await api.put(`/shipments/${selectedShipment.shipment_id}`, payload)
      setShipments((prev) => prev.map((s) => (s.shipment_id === selectedShipment.shipment_id ? res.data : s)))
      setSelectedShipment(res.data)
      setIsEditing(false)
      addToast(`📦 SHIPMENT UPDATED: Tracking key ${res.data.tracking_number} saved.`, 'success', 'top-right')
    } catch (err) {
      console.error('Failed to update shipment details:', err)
      let errorMsg = 'Could not update shipment.'
      const detail = err.response?.data?.detail
      if (detail) {
        if (typeof detail === 'string') {
          errorMsg = detail
        } else if (Array.isArray(detail)) {
          errorMsg = detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join(', ')
        } else if (typeof detail === 'object') {
          errorMsg = detail.message || JSON.stringify(detail)
        }
      }
      addToast(`❌ ERROR: ${errorMsg}`, 'error', 'top-right')
    }
  }

  const handleDelete = async (shipmentId, trackingNumber) => {
    const confirmed = window.confirm(`⚠️ CANCEL WARNING: Cancel shipment ${trackingNumber}?`)
    if (!confirmed) return

    try {
      await api.delete(`/shipments/${shipmentId}`)
      // Update locally to Cancelled instead of filtering it out, so that we match the soft delete visual status!
      setShipments((prev) => prev.map((s) => s.shipment_id === shipmentId ? { ...s, status: 'Cancelled' } : s))
      if (selectedShipment?.shipment_id === shipmentId) {
        setSelectedShipment((prev) => ({ ...prev, status: 'Cancelled' }))
      }
      addToast(`🗑️ SHIPMENT CANCELLED: Shipment ${trackingNumber} marked Cancelled.`, 'success', 'top-right')
    } catch (err) {
      console.error('Cancel shipment failed:', err)
      addToast('❌ ERROR: Could not cancel shipment.', 'error', 'top-right')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Created': return 'bg-blue-50 border-blue-100 text-blue-600'
      case 'Assigned': return 'bg-amber-50 border-amber-100 text-amber-600'
      case 'In Transit': return 'bg-indigo-50 border-indigo-100 text-indigo-600'
      case 'Delayed': return 'bg-rose-50 border-rose-100 text-rose-600 animate-pulse'
      case 'Delivered': return 'bg-emerald-50 border-emerald-100 text-emerald-600'
      case 'Cancelled': return 'bg-slate-50 border-slate-100 text-slate-400 line-through'
      default: return 'bg-slate-50 border-slate-100 text-slate-400'
    }
  }

  const getStepperPercentage = (status) => {
    switch (status) {
      case 'Created': return 'w-[15%]'
      case 'Assigned': return 'w-[45%]'
      case 'In Transit': return 'w-[75%]'
      case 'Delivered': return 'w-[100%]'
      case 'Delayed': return 'w-[75%] bg-red-500'
      case 'Cancelled': return 'w-[0%] bg-red-950'
      default: return 'w-[0%]'
    }
  }

  const getVehicleLicense = (id) => {
    const matched = vehicles.find((v) => v.vehicle_id === id)
    return matched ? matched.registration_number : 'NOT ASSIGNED'
  }

  const getDriverName = (id) => {
    const matched = drivers.find((d) => d.driver_id === id)
    return matched ? matched.full_name : 'NOT ASSIGNED'
  }

  const filteredShipments = shipments.filter((s) => {
    const query = searchQuery.toLowerCase()
    return (
      s.tracking_number?.toLowerCase().includes(query) ||
      s.customer_name?.toLowerCase().includes(query) ||
      s.source?.toLowerCase().includes(query) ||
      s.destination?.toLowerCase().includes(query)
    )
  })

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col justify-center items-center font-mono">
        <TruckLoader />
        <div className="text-[10px] text-white/50 uppercase tracking-widest mt-6 animate-pulse">
          Loading shipments...
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start relative z-10">
      
      {/* Shipments Manifest list */}
      <div className={`${selectedShipment && !isEditing ? 'xl:col-span-8' : 'xl:col-span-12'} w-full transition-all duration-300`}>
        
        {/* Search header container */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6">
          <div className="flex-1 relative max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search by tracking #, source, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-white/10 bg-white/5 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#00f0ff] focus:ring-2 focus:ring-[#00f0ff]/20 transition-all duration-200 text-xs shadow-sm"
            />
          </div>
          {canModify && !isAdding && !isEditing && (
            <button
              onClick={() => {
                setSelectedShipment(null)
                setIsAdding(true)
              }}
              className="py-2 px-4 bg-[#00f0ff] hover:bg-[#00d2e0] text-[#06070d] rounded-xl font-bold text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.35)] text-center"
            >
              + Register Shipment
            </button>
          )}
        </div>

        {/* Grid cards list */}
        {filteredShipments.length === 0 ? (
          <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-12 text-center text-white/40 font-medium">
            No cargo shipments found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredShipments.map((s) => {
              const isSelected = selectedShipment?.shipment_id === s.shipment_id
              return (
                <div
                  key={s.shipment_id}
                  onClick={() => {
                    setIsAdding(false)
                    setIsEditing(false)
                    setSelectedShipment(s)
                  }}
                  className={`p-5 rounded-2xl border transition-all duration-300 bg-slate-950/45 cursor-pointer hover:shadow-lg flex flex-col justify-between min-h-[220px] ${
                    isSelected 
                      ? 'border-[#00f0ff] ring-2 ring-[#00f0ff]/10 shadow-[0_0_20px_rgba(0,240,255,0.15)]' 
                      : 'border-white/5 shadow-sm'
                  }`}
                >
                  <div>
                    {/* Header Row */}
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="font-bold text-[#00f0ff] text-xs font-mono tracking-wider">{s.tracking_number}</span>
                      <span className={`inline-block px-2.5 py-0.5 border text-[9px] font-bold rounded-full ${getStatusColor(s.status)}`}>
                        {s.status}
                      </span>
                    </div>

                    {/* Customer */}
                    <h3 className="font-bold text-white text-sm mb-2.5">{s.customer_name}</h3>

                    {/* Route path */}
                    <div className="flex items-center space-x-2 text-[11px] text-[#00f0ff] font-bold mb-3.5 bg-white/5 p-2 rounded-xl border border-white/10 uppercase">
                      <span>📍</span>
                      <span>{s.source}</span>
                      <span className="text-white/30">➔</span>
                      <span>{s.destination}</span>
                    </div>
                  </div>

                  <div>
                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] text-white/70 mb-3.5 border-t border-white/5 pt-3">
                      <div>
                        <span className="text-white/45 block text-[8px] uppercase font-bold tracking-wider mb-0.5">Cargo Weight</span>
                        <span className="font-semibold text-white/75">{s.shipment_weight.toLocaleString()} kg</span>
                      </div>
                      <div>
                        <span className="text-white/45 block text-[8px] uppercase font-bold tracking-wider mb-0.5">Vehicle</span>
                        <span className="font-semibold text-white/75">{getVehicleLicense(s.vehicle_id)}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-white/45 block text-[8px] uppercase font-bold tracking-wider mb-0.5">Assigned Driver</span>
                        <span className="font-semibold text-white/75">{getDriverName(s.driver_id)}</span>
                      </div>
                    </div>

                    {/* Actions row */}
                    <div className="flex justify-between items-center gap-2 pt-2 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setIsAdding(false)
                          setIsEditing(false)
                          setSelectedShipment(s)
                        }}
                        className="flex-1 py-1.5 px-3 border border-white/10 hover:bg-slate-900 rounded-xl text-[10px] font-bold text-white transition-all cursor-pointer flex items-center justify-center space-x-1 shadow-sm"
                      >
                        <span>🧭</span>
                        <span>Track</span>
                      </button>
                      {canModify && s.status !== 'Cancelled' && (
                        <button
                          onClick={() => handleDelete(s.shipment_id, s.tracking_number)}
                          className="py-1.5 px-3 border border-rose-500/20 hover:bg-rose-950/40 text-rose-400 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center space-x-1"
                        >
                          <span>🗑️</span>
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

      </div>

      {/* Side Panel / Modal: Create Shipment */}
      {canModify && isAdding && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in text-white">
          <div className="w-full max-w-lg glass-card border border-white/10 p-6 bg-slate-950/95 relative tech-border-accent">
            
            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-5">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono m-0">
                [ ADD NEW SHIPMENT ]
              </h3>
              <button 
                onClick={() => setIsAdding(false)} 
                className="text-white/40 hover:text-white cursor-pointer font-bold text-xs bg-transparent border-none outline-none"
              >
                [CANCEL]
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs max-h-[75vh] overflow-y-auto pr-1">
              
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[9px] text-white/40 block m-0">[ TRACKING NUMBER (OPTIONAL) ]</label>
                  <button
                    type="button"
                    onClick={() => {
                      const randSeq = Math.floor(100000 + Math.random() * 900000).toString();
                      setNewShipment(prev => ({ ...prev, tracking_number: `SHP-${randSeq}-US` }));
                    }}
                    className="text-[9px] text-cyan-400 hover:text-cyan-300 font-bold bg-transparent border-none outline-none cursor-pointer"
                  >
                    AUTO-GENERATE
                  </button>
                </div>
                <input
                  name="tracking_number"
                  type="text"
                  placeholder="Leave blank to auto-generate"
                  value={newShipment.tracking_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ SOURCE / ORIGIN ]</label>
                  <input
                    name="source"
                    type="text"
                    placeholder="e.g. KOLLAM"
                    value={newShipment.source}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs uppercase"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ DESTINATION ]</label>
                  <input
                    name="destination"
                    type="text"
                    placeholder="e.g. MUMBAI"
                    value={newShipment.destination}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ CUSTOMER NAME ]</label>
                  <input
                    name="customer_name"
                    type="text"
                    placeholder="e.g. Acme Corp"
                    value={newShipment.customer_name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ CUSTOMER PHONE (OPTIONAL) ]</label>
                  <input
                    name="customer_phone"
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={newShipment.customer_phone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] text-white/40 block mb-1.5">[ CONTRACTOR / CUSTOMER EMAIL (OPTIONAL) ]</label>
                <input
                  name="customer_email"
                  type="email"
                  placeholder="e.g. contractor@example.com"
                  value={newShipment.customer_email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ WEIGHT (KG) (OPTIONAL) ]</label>
                  <input
                    name="shipment_weight"
                    type="number"
                    placeholder="e.g. 5000"
                    value={newShipment.shipment_weight}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ EXPECTED DELIVERY (OPTIONAL) ]</label>
                  <input
                    name="expected_delivery_time"
                    type="datetime-local"
                    value={newShipment.expected_delivery_time}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ ASSIGN VEHICLE (OPTIONAL) ]</label>
                  <select
                    name="vehicle_id"
                    value={newShipment.vehicle_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs"
                  >
                    <option value="">-- No vehicle assigned --</option>
                    {vehicles
                      .filter((v) => {
                        // Allow both 'Available' and 'Assigned' vehicles (since 'Assigned' just means it has a driver, not that it is busy on a trip)
                        if (v.status !== 'Available' && v.status !== 'Assigned') return false;
                        const isAssigned = shipments.some(s => s.vehicle_id === v.vehicle_id && s.status !== 'Delivered' && s.status !== 'Cancelled');
                        return !isAssigned;
                      })
                      .map((v) => (
                        <option key={v.vehicle_id} value={v.vehicle_id}>
                          {v.registration_number} ({v.model}) - {v.status}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ ASSIGN DRIVER (OPTIONAL) ]</label>
                  <select
                    name="driver_id"
                    value={newShipment.driver_id}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs"
                  >
                    <option value="">-- No driver assigned --</option>
                    {drivers
                      .filter((d) => {
                        // Resilient active status filter (active/available by default if null)
                        if (d.status && d.status !== 'Active' && d.status !== 'Available') return false;
                        const isAssigned = shipments.some(s => s.driver_id === d.driver_id && s.status !== 'Delivered' && s.status !== 'Cancelled');
                        return !isAssigned;
                      })
                      .map((d) => (
                        <option key={d.driver_id} value={d.driver_id}>
                          {d.full_name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] text-white/40 block mb-1.5">[ NOTES (OPTIONAL) ]</label>
                <textarea
                  name="notes"
                  placeholder="Optional notes about this shipment..."
                  value={newShipment.notes}
                  onChange={handleChange}
                  rows="2"
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs resize-none"
                ></textarea>
              </div>

              <div>
                <label className="text-[9px] text-white/40 block mb-1.5">[ CARGO DESCRIPTION ]</label>
                <textarea
                  name="cargo_description"
                  placeholder="Cargo description and specifications..."
                  value={newShipment.cargo_description}
                  onChange={handleChange}
                  rows="2"
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-white hover:bg-white/90 text-slate-950 rounded-xl font-bold tracking-wide transition-all cursor-pointer shadow-md mt-4 text-center text-xs"
              >
                ADD SHIPMENT
              </button>

            </form>

          </div>
        </div>,
        document.body
      )}

      {/* Side Panel / Modal: Edit Shipment */}
      {canModify && isEditing && selectedShipment && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in text-white">
          <div className="w-full max-w-lg glass-card border border-white/10 p-6 bg-slate-950/95 relative tech-border-accent">
            
            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-5">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono m-0">
                [ EDIT SHIPMENT ]
              </h3>
              <button 
                onClick={() => setIsEditing(false)} 
                className="text-white/40 hover:text-white cursor-pointer font-bold text-xs bg-transparent border-none outline-none"
              >
                [CANCEL]
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 font-mono text-xs max-h-[75vh] overflow-y-auto pr-1">
              
              <div>
                <label className="text-[9px] text-white/40 block mb-1.5">[ TRACKING NUMBER ]</label>
                <input
                  name="tracking_number"
                  type="text"
                  value={editShipment.tracking_number}
                  disabled
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-white/50 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ SOURCE / ORIGIN ]</label>
                  <input
                    name="source"
                    type="text"
                    value={editShipment.source}
                    onChange={handleEditChange}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs uppercase"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ DESTINATION ]</label>
                  <input
                    name="destination"
                    type="text"
                    value={editShipment.destination}
                    onChange={handleEditChange}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ CUSTOMER NAME ]</label>
                  <input
                    name="customer_name"
                    type="text"
                    value={editShipment.customer_name}
                    onChange={handleEditChange}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ CUSTOMER PHONE (OPTIONAL) ]</label>
                  <input
                    name="customer_phone"
                    type="text"
                    value={editShipment.customer_phone}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] text-white/40 block mb-1.5">[ CONTRACTOR / CUSTOMER EMAIL (OPTIONAL) ]</label>
                <input
                  name="customer_email"
                  type="email"
                  placeholder="e.g. contractor@example.com"
                  value={editShipment.customer_email}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ WEIGHT (KG) (OPTIONAL) ]</label>
                  <input
                    name="shipment_weight"
                    type="number"
                    value={editShipment.shipment_weight}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ EXPECTED DELIVERY (OPTIONAL) ]</label>
                  <input
                    name="expected_delivery_time"
                    type="datetime-local"
                    value={editShipment.expected_delivery_time}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ ASSIGNED VEHICLE ]</label>
                  <select
                    name="vehicle_id"
                    value={editShipment.vehicle_id}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs"
                  >
                    <option value="">No Vehicle Assigned</option>
                    {vehicles
                      .filter((v) => {
                        if (v.status !== 'Available' && v.status !== 'Assigned' && v.vehicle_id !== editShipment.vehicle_id) return false;
                        const isAssigned = shipments.some(s => s.vehicle_id === v.vehicle_id && s.shipment_id !== editShipment.shipment_id && s.shipment_id !== selectedShipment?.shipment_id && s.status !== 'Delivered' && s.status !== 'Cancelled');
                        return !isAssigned;
                      })
                      .map((v) => (
                        <option key={v.vehicle_id} value={v.vehicle_id}>
                          {v.registration_number} ({v.model}) - {v.status}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ ASSIGNED DRIVER ]</label>
                  <select
                    name="driver_id"
                    value={editShipment.driver_id}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs"
                  >
                    <option value="">No Driver Assigned</option>
                    {drivers
                      .filter((d) => {
                        if (d.status && d.status !== 'Active' && d.status !== 'Available' && d.driver_id !== editShipment.driver_id) return false;
                        const isAssigned = shipments.some(s => s.driver_id === d.driver_id && s.shipment_id !== editShipment.shipment_id && s.shipment_id !== selectedShipment?.shipment_id && s.status !== 'Delivered' && s.status !== 'Cancelled');
                        return !isAssigned;
                      })
                      .map((d) => (
                        <option key={d.driver_id} value={d.driver_id}>
                          {d.full_name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ TRANSIT STATUS ]</label>
                  <select
                    name="status"
                    value={editShipment.status}
                    onChange={handleEditChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs font-bold text-cyan-400"
                  >
                    <option value="Created">Created</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Delayed">Delayed</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] text-white/40 block mb-1.5">[ NOTES (OPTIONAL) ]</label>
                <textarea
                  name="notes"
                  placeholder="Optional notes about this shipment..."
                  value={editShipment.notes}
                  onChange={handleEditChange}
                  rows="2"
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs resize-none"
                ></textarea>
              </div>

              <div>
                <label className="text-[9px] text-white/40 block mb-1.5">[ CARGO DESCRIPTION ]</label>
                <textarea
                  name="cargo_description"
                  placeholder="Cargo description and specifications..."
                  value={editShipment.cargo_description}
                  onChange={handleEditChange}
                  rows="2"
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-white hover:bg-white/90 text-slate-950 rounded-xl font-bold tracking-wide transition-all cursor-pointer shadow-md mt-4 text-center text-xs"
              >
                SAVE UPDATES
              </button>

            </form>

          </div>
        </div>,
        document.body
      )}

      {/* Side Panel: View Shipment Detail Timeline Stepper */}
      {!isEditing && selectedShipment && (
        <div className="xl:col-span-4 glass-card border border-white/10 p-6 bg-slate-950/40 relative animate-slide-in-right text-xs font-mono">
          
          <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-5">
            <h3 className="text-sm font-bold text-white tracking-wide uppercase m-0">
              [ SHIPMENT DETAILS ]
            </h3>
            <div className="space-x-3">
              {canModify && selectedShipment.status !== 'Cancelled' && (
                <button
                  onClick={() => handleStartEdit(selectedShipment)}
                  className="text-cyan-400 hover:text-cyan-300 cursor-pointer font-bold text-xs bg-transparent border-none outline-none"
                >
                  [EDIT]
                </button>
              )}
              <button 
                onClick={() => setSelectedShipment(null)} 
                className="text-white/40 hover:text-white cursor-pointer font-bold text-xs bg-transparent border-none outline-none"
              >
                [CLOSE]
              </button>
            </div>
          </div>

          <div className="space-y-5 text-white/80">
            <div>
              <span className="text-[9px] text-white/40 block">TRACKING ID</span>
              <span className="text-sm font-bold text-cyan-400">{selectedShipment.tracking_number}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-3">
              <div>
                <span className="text-[9px] text-white/40 block">CUSTOMER</span>
                <span className="text-white font-semibold">{selectedShipment.customer_name}</span>
              </div>
              <div>
                <span className="text-[9px] text-white/40 block">TOTAL MASS</span>
                <span className="text-white font-semibold">{selectedShipment.shipment_weight.toLocaleString()} LBS</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-3">
              <div>
                <span className="text-[9px] text-white/40 block">DISPATCH DEPOT</span>
                <span className="text-white font-semibold">{selectedShipment.source}</span>
              </div>
              <div>
                <span className="text-[9px] text-white/40 block">DESTINATION DEPOT</span>
                <span className="text-white font-semibold">{selectedShipment.destination}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-3">
              <div>
                <span className="text-[9px] text-white/40 block">ASSIGNED VEHICLE</span>
                <span className="text-white font-semibold">{getVehicleLicense(selectedShipment.vehicle_id)}</span>
              </div>
              <div>
                <span className="text-[9px] text-white/40 block">ASSIGNED DRIVER</span>
                <span className="text-white font-semibold">{getDriverName(selectedShipment.driver_id)}</span>
              </div>
            </div>

            {selectedShipment.expected_delivery_time && (
              <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-3">
                <div>
                  <span className="text-[9px] text-white/40 block">EXPECTED DELIVERY</span>
                  <span className="text-white font-semibold">
                    {new Date(selectedShipment.expected_delivery_time).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {selectedShipment.cargo_description && (() => {
              const parsedCargo = parseCargoDetails(selectedShipment.cargo_description);
              return (
                <div className="space-y-4">
                  {parsedCargo.phone && (
                    <div className="border-b border-white/5 pb-3">
                      <span className="text-[9px] text-white/40 block">CUSTOMER PHONE</span>
                      <span>{parsedCargo.phone}</span>
                    </div>
                  )}
                  {parsedCargo.notes && (
                    <div className="border-b border-white/5 pb-3">
                      <span className="text-[9px] text-white/40 block">NOTES</span>
                      <span>{parsedCargo.notes}</span>
                    </div>
                  )}
                  {parsedCargo.desc && (
                    <div className="border-b border-white/5 pb-3">
                      <span className="text-[9px] text-white/40 block">CARGO DETAILS</span>
                      <span>{parsedCargo.desc}</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Visual Stepper Stepper */}
            <div>
              <span className="text-[9px] text-white/40 block mb-3">TRANSIT STATUS</span>
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between text-[9px] font-bold">
                  <span className={selectedShipment.status === 'Created' ? 'text-white' : 'text-white/30'}>CREATED</span>
                  <span className={selectedShipment.status === 'Assigned' ? 'text-amber-400' : 'text-white/30'}>ASSIGNED</span>
                  <span className={selectedShipment.status === 'In Transit' ? 'text-cyan-400 animate-pulse' : 'text-white/30'}>IN TRANSIT</span>
                  <span className={selectedShipment.status === 'Delivered' ? 'text-emerald-400' : 'text-white/30'}>DELIVERED</span>
                </div>
                
                <div className="overflow-hidden h-1.5 text-xs flex rounded-full bg-slate-900 border border-white/5">
                  <div 
                    className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-cyan-400 transition-all duration-500 ${getStepperPercentage(selectedShipment.status)}`}
                  ></div>
                </div>
              </div>
            </div>

            {/* Shipment History/Timeline */}
            <div className="border-t border-white/10 pt-4 mt-4">
              <span className="text-[9px] text-white/40 block mb-3">SHIPMENT ACTIVITY LOG</span>
              
              <div className="space-y-4 relative pl-4 border-l border-white/10">
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-500 border border-[#06070d]"></div>
                  <span className="text-[9px] text-white/40 block">STEP 1 - CREATED</span>
                  <p className="m-0 text-white/80">Shipment entry registered from origin {selectedShipment.source}.</p>
                </div>

                {selectedShipment.status !== 'Created' && selectedShipment.status !== 'Cancelled' && (
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-[#06070d] animate-pulse-glow"></div>
                    <span className="text-[9px] text-amber-400 block">STEP 2 - ASSIGNED</span>
                    <p className="m-0 text-white/80">Allocated to vehicle {getVehicleLicense(selectedShipment.vehicle_id)} with driver {getDriverName(selectedShipment.driver_id)}.</p>
                  </div>
                )}

                {(selectedShipment.status === 'In Transit' || selectedShipment.status === 'Delayed' || selectedShipment.status === 'Delivered') && (
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-cyan-400 border border-[#06070d] animate-pulse-glow"></div>
                    <span className="text-[9px] text-cyan-400 block">STEP 3 - IN TRANSIT</span>
                    <p className="m-0 text-white/80">Dispatched from hub. Cargo currently in transit to destination.</p>
                  </div>
                )}

                {selectedShipment.status === 'Delivered' && (
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-[#06070d]"></div>
                    <span className="text-[9px] text-emerald-400 block">STEP 4 - DELIVERED</span>
                    <p className="m-0 text-white/80">Checked in and secured at destination terminal: {selectedShipment.destination}.</p>
                  </div>
                )}

                {selectedShipment.status === 'Cancelled' && (
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-red-600 border border-[#06070d]"></div>
                    <span className="text-[9px] text-red-500 block">CANCELLED</span>
                    <p className="m-0 text-red-400/80">This cargo shipment has been marked Cancelled.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Delayed Alert check */}
            {selectedShipment.status === 'Delayed' && (
              <div className="p-3 bg-red-950/40 border border-red-500/20 rounded-xl text-red-400 font-bold animate-pulse text-center">
                ⚠️ ALERT: Shipment exceeds estimated expected transit deadline!
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  )
}

export default ShipmentPanel
