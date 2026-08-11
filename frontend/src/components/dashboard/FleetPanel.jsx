import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import api from '../../api/axios'
import TruckLoader from '../ui/TruckLoader'

const INITIAL_VEHICLES = [
  { id: 'FF-102', regNum: 'MH-12-CA-9482', brand: 'Tesla', model: 'Tesla Semi', vehicleType: 'Heavy Truck', status: 'Available', fuel: 'Electric', capacity: 4500, year: 2022, assignedDriver: null },
  { id: 'FF-205', regNum: 'DL-01-TX-5201', brand: 'Freightliner', model: 'Cascadia 126', vehicleType: 'Heavy Truck', status: 'In Transit', fuel: 'Diesel', capacity: 6000, year: 2020, assignedDriver: null },
  { id: 'FF-308', regNum: 'KA-05-NV-8821', brand: 'Volvo', model: 'VNL 860', vehicleType: 'Heavy Truck', status: 'Maintenance', fuel: 'Diesel', capacity: 5500, year: 2019, assignedDriver: null },
  { id: 'FF-410', regNum: 'TN-22-OR-3091', brand: 'Tesla', model: 'Tesla Semi', vehicleType: 'Heavy Truck', status: 'Available', fuel: 'Electric', capacity: 4500, year: 2023, assignedDriver: null },
  { id: 'FF-512', regNum: 'GJ-18-WA-7123', brand: 'Kenworth', model: 'T680', vehicleType: 'Heavy Truck', status: 'Assigned', fuel: 'Diesel', capacity: 5000, year: 2021, assignedDriver: null }
]

function FleetPanel() {
  const { user } = useAuth()
  const { addToast } = useToast()
  
  const [vehicles, setVehicles] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState(null)

  const [drivers, setDrivers] = useState([])
  const [newVehicle, setNewVehicle] = useState({
    regNum: '', brand: '', vehicleType: 'Heavy Truck', model: '', year: new Date().getFullYear(),
    fuel: 'Diesel', capacity: '', assignedDriver: '', status: 'Available'
  })

  // Role authorization
  const roleUpper = user?.role?.toUpperCase() || ''
  const canAddVehicle = roleUpper === 'ADMIN' || roleUpper === 'FLEETMANAGER'

  useEffect(() => {
    fetchVehicles()
    fetchDrivers()
  }, [])

  const fetchDrivers = async () => {
    try {
      const res = await api.get('/drivers')
      setDrivers(res.data)
    } catch (err) {
      console.error('Failed to fetch drivers:', err)
    }
  }

  const fetchVehicles = async () => {
    try {
      setIsLoading(true)
      const res = await api.get('/vehicles')
      const mapped = res.data.map((v) => ({
        id: v.vehicle_id,
        regNum: v.registration_number,
        brand: v.brand || '',
        vehicleType: v.vehicle_type || 'Heavy Truck',
        model: v.model,
        year: v.manufacture_year || '',
        fuel: v.fuel_type,
        capacity: v.capacity || '',
        assignedDriver: v.assigned_driver || '',
        status: v.status
      }))
      setVehicles(mapped)
    } catch (err) {
      console.error('Failed to fetch vehicles:', err)
      if (!err.response || err.code === 'ERR_NETWORK') {
        setVehicles(INITIAL_VEHICLES)
      } else {
        addToast('❌ ERROR: Could not retrieve vehicles list.', 'error', 'top-right')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    if (editingVehicle) {
      setEditingVehicle((prev) => ({ ...prev, [name]: value }))
    } else {
      setNewVehicle((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newVehicle.regNum || !newVehicle.model) return

    try {
      const payload = {
        registration_number: newVehicle.regNum.toUpperCase(),
        brand: newVehicle.brand || null,
        vehicle_type: newVehicle.vehicleType || null,
        model: newVehicle.model,
        manufacture_year: newVehicle.year ? Number(newVehicle.year) : null,
        fuel_type: newVehicle.fuel,
        capacity: newVehicle.capacity ? Number(newVehicle.capacity) : null,
        assigned_driver: newVehicle.assignedDriver || null,
        status: newVehicle.status,
      }
      const res = await api.post('/vehicles', payload)
      const created = {
        id: res.data.vehicle_id,
        regNum: res.data.registration_number,
        brand: res.data.brand || '',
        vehicleType: res.data.vehicle_type || '',
        model: res.data.model,
        year: res.data.manufacture_year || '',
        fuel: res.data.fuel_type,
        capacity: res.data.capacity || '',
        assignedDriver: res.data.assigned_driver || '',
        status: res.data.status
      }
      setVehicles((prev) => [created, ...prev])
      setNewVehicle({ regNum: '', brand: '', vehicleType: 'Heavy Truck', model: '', year: new Date().getFullYear(), fuel: 'Diesel', capacity: '', assignedDriver: '', status: 'Available' })
      setIsAdding(false)
      addToast(`🚛 Vehicle ${created.regNum} registered successfully.`, 'success', 'top-right')
    } catch (err) {
      console.error('Failed to add vehicle:', err)
      if (!err.response || err.code === 'ERR_NETWORK') {
        const mock = {
          id: `MOCK-${Math.floor(Math.random() * 899 + 100)}`,
          regNum: newVehicle.regNum.toUpperCase(),
          brand: newVehicle.brand,
          vehicleType: newVehicle.vehicleType,
          model: newVehicle.model,
          year: newVehicle.year,
          fuel: newVehicle.fuel,
          capacity: newVehicle.capacity,
          status: newVehicle.status
        }
        setVehicles((prev) => [mock, ...prev])
        setNewVehicle({ regNum: '', brand: '', vehicleType: 'Heavy Truck', model: '', year: new Date().getFullYear(), fuel: 'Diesel', capacity: '', assignedDriver: '', status: 'Available' })
        setIsAdding(false)
        addToast(`⚠️ Offline mode: Added mock vehicle ${mock.regNum}.`, 'warning', 'top-right')
      } else {
        const errorMsg = err.response?.data?.detail || 'Could not register vehicle.'
        addToast(`❌ ${errorMsg}`, 'error', 'top-right')
      }
    }
  }

  const handleUpdateSubmit = async (e) => {
    e.preventDefault()
    if (!editingVehicle.regNum || !editingVehicle.model) return

    try {
      const payload = {
        registration_number: editingVehicle.regNum.toUpperCase(),
        brand: editingVehicle.brand || null,
        vehicle_type: editingVehicle.vehicleType || null,
        model: editingVehicle.model,
        manufacture_year: editingVehicle.year ? Number(editingVehicle.year) : null,
        fuel_type: editingVehicle.fuel,
        capacity: editingVehicle.capacity ? Number(editingVehicle.capacity) : null,
        assigned_driver: editingVehicle.assignedDriver || null,
        status: editingVehicle.status,
      }
      const res = await api.put(`/vehicles/${editingVehicle.id}`, payload)
      const updated = {
        id: res.data.vehicle_id,
        regNum: res.data.registration_number,
        brand: res.data.brand || '',
        vehicleType: res.data.vehicle_type || '',
        model: res.data.model,
        year: res.data.manufacture_year || '',
        fuel: res.data.fuel_type,
        capacity: res.data.capacity || '',
        assignedDriver: res.data.assigned_driver || '',
        status: res.data.status
      }
      setVehicles((prev) => prev.map((v) => (v.id === editingVehicle.id ? updated : v)))
      setEditingVehicle(null)
      addToast(`✏️ Vehicle ${updated.regNum} updated successfully.`, 'success', 'top-right')
    } catch (err) {
      console.error('Failed to update vehicle:', err)
      if (!err.response || err.code === 'ERR_NETWORK') {
        const updated = { ...editingVehicle }
        setVehicles((prev) => prev.map((v) => (v.id === editingVehicle.id ? updated : v)))
        setEditingVehicle(null)
        addToast(`✏️ Offline mode: Updated mock vehicle ${updated.regNum}.`, 'warning', 'top-right')
      } else {
        const errorMsg = err.response?.data?.detail || 'Could not update vehicle.'
        addToast(`❌ ${errorMsg}`, 'error', 'top-right')
      }
    }
  }

  const handleDelete = async (id, regNum) => {
    const confirmed = window.confirm(`⚠️ Delete Vehicle ${regNum} from registry?`)
    if (!confirmed) return

    try {
      await api.delete(`/vehicles/${id}`)
      setVehicles((prev) => prev.filter((v) => v.id !== id))
      addToast(`🗑️ Vehicle ${regNum} removed from registry.`, 'success', 'top-right')
    } catch (err) {
      console.error('Failed to delete vehicle:', err)
      if (!err.response || err.code === 'ERR_NETWORK') {
        setVehicles((prev) => prev.filter((v) => v.id !== id))
        addToast(`🗑️ Offline mode: Removed mock vehicle ${regNum}.`, 'warning', 'top-right')
      } else {
        addToast('❌ Could not remove vehicle.', 'error', 'top-right')
      }
    }
  }

  const startEditing = (vehicle) => {
    setEditingVehicle({ ...vehicle })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Available': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
      case 'In Transit': return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
      case 'Maintenance': return 'bg-rose-500/10 border-rose-500/30 text-rose-400'
      default: return 'bg-amber-500/10 border-amber-500/30 text-amber-400'
    }
  }

  const filteredVehicles = vehicles.filter((v) => {
    const q = searchQuery.toLowerCase()
    return (
      v.regNum?.toLowerCase().includes(q) ||
      v.model?.toLowerCase().includes(q) ||
      v.brand?.toLowerCase().includes(q) ||
      v.vehicleType?.toLowerCase().includes(q)
    )
  })

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col justify-center items-center font-mono">
        <TruckLoader />
        <div className="text-[10px] text-white/50 uppercase tracking-widest mt-6 animate-pulse">
          Loading fleet registry...
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start relative z-10">
      
      {/* Fleet table list */}
      <div className="xl:col-span-12 w-full transition-all duration-300">
        
        {/* Search header container */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-6">
          <div className="flex-1 relative max-w-md">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search by registration number, model, brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-white/10 bg-white/5 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#00f0ff] focus:ring-2 focus:ring-[#00f0ff]/20 transition-all duration-200 text-xs shadow-sm"
            />
          </div>
          {canAddVehicle && !isAdding && !editingVehicle && (
            <button
              onClick={() => setIsAdding(true)}
              className="py-2 px-4 bg-[#00f0ff] hover:bg-[#00d2e0] text-[#06070d] rounded-xl font-bold text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.35)] text-center"
            >
              + Add Vehicle
            </button>
          )}
        </div>

        {/* Grid cards list */}
        {filteredVehicles.length === 0 ? (
          <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-12 text-center text-white/40 font-medium">
            No active vehicles found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVehicles.map((v) => {
              const assignedDriverName = v.assignedDriver
                ? drivers.find(d => d.driver_id === v.assignedDriver)?.full_name || 'Assigned'
                : 'Unassigned'
              return (
                <div
                  key={v.id}
                  onClick={() => { if (canAddVehicle) startEditing(v) }}
                  className="p-5 rounded-2xl border border-white/5 bg-slate-950/45 shadow-sm hover:shadow-lg hover:border-[#00f0ff]/20 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[190px] relative group"
                >
                  <div>
                    {/* Header: Reg Number and Status */}
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="font-mono font-bold text-[#00f0ff] text-[11px] bg-white/5 border border-white/10 rounded px-2 py-0.5 tracking-wider">
                        {v.regNum}
                      </span>
                      <span className={`inline-block px-2.5 py-0.5 border text-[9px] font-bold rounded-full ${getStatusColor(v.status)}`}>
                        {v.status}
                      </span>
                    </div>

                    {/* Brand + Model */}
                    <h3 className="font-bold text-white text-sm mb-1 group-hover:text-[#00f0ff] transition-colors">
                      {v.brand ? `${v.brand} ` : ''}{v.model}
                    </h3>
                    <p className="text-[10px] text-white/45 mb-3">{v.vehicleType}{v.year ? ` · ${v.year}` : ''}</p>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-y-2 text-[11px] text-white/70 mb-2">
                      <div className="flex items-center space-x-1.5">
                        <span>⛽</span>
                        <span>{v.fuel}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span>📦</span>
                        <span>{v.capacity ? `${v.capacity} kg` : 'N/A'}</span>
                      </div>
                      <div className="col-span-2 flex items-center space-x-1.5 text-white/45">
                        <span>👤</span>
                        <span>Driver: <span className="font-semibold text-[#00f0ff]">{assignedDriverName}</span></span>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-between items-center pt-3 border-t border-white/5 mt-2">
                    <span className="text-[9px] text-white/60 bg-white/5 border border-white/10 rounded-md px-2 py-0.5 font-semibold">
                      {v.vehicleType || 'Cargo Truck'}
                    </span>
                    {canAddVehicle && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(v.id, v.regNum) }}
                        className="p-1 hover:bg-rose-950/40 text-rose-400 rounded-lg transition-colors cursor-pointer"
                        title="Delete Vehicle"
                      >
                        🗑️
                      </button>
                    )}
                  </div>

                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* Modal: Create Vehicle */}
      {canAddVehicle && isAdding && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in text-white">
          <div className="w-full max-w-lg glass-card border border-white/10 p-6 bg-slate-950/95 relative tech-border-accent">
            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-5">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono m-0">[ Add New Vehicle ]</h3>
              <button onClick={() => setIsAdding(false)} className="text-white/40 hover:text-white cursor-pointer font-bold text-xs bg-transparent border-none outline-none">[CANCEL]</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ Registration Number * ]</label>
                  <input name="regNum" type="text" placeholder="e.g. MH-12-AB-1234" value={newVehicle.regNum} onChange={handleChange} required
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] focus:ring-2 focus:ring-[#00f0ff]/20 rounded-xl focus:outline-none text-white text-xs uppercase" />
                </div>
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ Brand ]</label>
                  <input name="brand" type="text" placeholder="e.g. Tata Motors" value={newVehicle.brand} onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] focus:ring-2 focus:ring-[#00f0ff]/20 rounded-xl focus:outline-none text-white text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ Model * ]</label>
                  <input name="model" type="text" placeholder="e.g. LPT 2518" value={newVehicle.model} onChange={handleChange} required
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] focus:ring-2 focus:ring-[#00f0ff]/20 rounded-xl focus:outline-none text-white text-xs" />
                </div>
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ Vehicle Type ]</label>
                  <select name="vehicleType" value={newVehicle.vehicleType} onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs">
                    <option>Heavy Truck</option>
                    <option>Light Truck</option>
                    <option>Container</option>
                    <option>Refrigerated</option>
                    <option>Tanker</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ Manufacture Year ]</label>
                  <input name="year" type="number" placeholder="e.g. 2021" value={newVehicle.year} onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs" />
                </div>
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ Capacity (kg) ]</label>
                  <input name="capacity" type="number" placeholder="e.g. 5000" value={newVehicle.capacity} onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ Fuel Type ]</label>
                  <select name="fuel" value={newVehicle.fuel} onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs">
                    <option>Diesel</option>
                    <option>Electric</option>
                    <option>CNG</option>
                    <option>Petrol</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ Status ]</label>
                  <select name="status" value={newVehicle.status} onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs">
                    <option value="Available">Available</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="In Transit">In Transit</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[9px] text-white/40 block mb-1.5">[ Assign Driver ]</label>
                <select name="assignedDriver" value={newVehicle.assignedDriver} onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs">
                  <option value="">— None —</option>
                  {drivers
                    .filter(d => {
                      if (d.status !== 'Active') return false;
                      const isAssigned = vehicles.some(v => v.assignedDriver === d.driver_id);
                      return !isAssigned;
                    })
                    .map(d => <option key={d.driver_id} value={d.driver_id}>{d.full_name}</option>)}
                </select>
              </div>
              <button type="submit"
                className="w-full py-2.5 px-4 bg-[#00f0ff] hover:bg-[#00d2e0] text-[#06070d] rounded-xl font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.35)] mt-2">
                Register Vehicle
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Vehicle Modal */}
      {canAddVehicle && editingVehicle && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in text-white">
          <div className="w-full max-w-lg glass-card border border-white/10 p-6 bg-slate-950/95 relative tech-border-accent">
            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-5">
              <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono m-0">Edit Vehicle — <span className="text-[#00f0ff]">{editingVehicle.regNum}</span></h3>
              <button onClick={() => setEditingVehicle(null)} className="text-white/40 hover:text-white cursor-pointer font-bold text-xs bg-transparent border-none outline-none">[CANCEL]</button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ Registration Number * ]</label>
                  <input name="regNum" type="text" value={editingVehicle.regNum} onChange={handleChange} required
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs uppercase" />
                </div>
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ Brand ]</label>
                  <input name="brand" type="text" value={editingVehicle.brand || ''} onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ Model * ]</label>
                  <input name="model" type="text" value={editingVehicle.model} onChange={handleChange} required
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs" />
                </div>
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ Vehicle Type ]</label>
                  <select name="vehicleType" value={editingVehicle.vehicleType || ''} onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs">
                    <option>Heavy Truck</option>
                    <option>Light Truck</option>
                    <option>Container</option>
                    <option>Refrigerated</option>
                    <option>Tanker</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ Manufacture Year ]</label>
                  <input name="year" type="number" value={editingVehicle.year || ''} onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs" />
                </div>
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ Capacity (kg) ]</label>
                  <input name="capacity" type="number" value={editingVehicle.capacity || ''} onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ Fuel Type ]</label>
                  <select name="fuel" value={editingVehicle.fuel} onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs">
                    <option>Diesel</option>
                    <option>Electric</option>
                    <option>CNG</option>
                    <option>Petrol</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ Status ]</label>
                  <select name="status" value={editingVehicle.status} onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs">
                    <option value="Available">Available</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="In Transit">In Transit</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[9px] text-white/40 block mb-1.5">[ Assign Driver ]</label>
                <select name="assignedDriver" value={editingVehicle.assignedDriver || ''} onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-[#00f0ff]">
                  <option value="">— None —</option>
                  {drivers
                    .filter(d => {
                      if (d.status !== 'Active') return false;
                      const isAssigned = vehicles.some(v => v.assignedDriver === d.driver_id && v.id !== editingVehicle.id);
                      return !isAssigned;
                    })
                    .map(d => <option key={d.driver_id} value={d.driver_id}>{d.full_name}</option>)}
                </select>
              </div>
              <button type="submit"
                className="w-full py-2.5 px-4 bg-[#00f0ff] hover:bg-[#00d2e0] text-[#06070d] rounded-xl font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.35)] mt-2">
                Save Changes
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  )
}

export default FleetPanel
