import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import api from '../../api/axios'
import TruckLoader from '../ui/TruckLoader'

const EMPTY_FORM = { full_name: '', email: '', password: '', phone: '', license_number: '', experience_years: '', address: '', status: 'Active' }

function DriversPanel() {
  const { user } = useAuth()
  const { addToast } = useToast()

  const [drivers, setDrivers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingDriver, setEditingDriver] = useState(null)
  
  const [form, setForm] = useState(EMPTY_FORM)

  // Role authorization
  const roleUpper = user?.role?.toUpperCase() || ''
  const canManage = roleUpper === 'ADMIN' || roleUpper === 'FLEETMANAGER'

  useEffect(() => {
    fetchDrivers()
  }, [])

  const fetchDrivers = async () => {
    try {
      setIsLoading(true)
      const res = await api.get('/drivers')
      setDrivers(res.data)
    } catch (err) {
      console.error('Failed to load drivers list:', err)
      if (!err.response || err.code === 'ERR_NETWORK') {
        // Offline Fallback Mock
        setDrivers([
          { driver_id: 'D-01', full_name: 'Rahul Sharma', email: 'rahul@fleetflow.com', phone: '+91-98765-43210', license_number: 'DL-0120180012345', experience_years: 5, address: 'Delhi', status: 'Active' },
          { driver_id: 'D-02', full_name: 'Amit Patel', email: 'amit@fleetflow.com', phone: '+91-98765-43211', license_number: 'GJ-1220190054321', experience_years: 8, address: 'Ahmedabad', status: 'Active' },
          { driver_id: 'D-03', full_name: 'Suresh Kumar', email: 'suresh@fleetflow.com', phone: '+91-98765-43212', license_number: 'KA-0320150098765', experience_years: 12, address: 'Bangalore', status: 'Inactive' }
        ])
      } else {
        addToast('❌ ERROR: Could not retrieve drivers.', 'error', 'top-right')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.full_name || !form.email || !form.password) return

    try {
      const payload = {
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        role: 'DRIVER',
        phone: form.phone || null,
        license_number: form.license_number || null,
        experience_years: form.experience_years ? Number(form.experience_years) : null,
        address: form.address || null,
        status: form.status
      }

      const res = await api.post('/drivers', payload)
      setDrivers(prev => [res.data, ...prev])
      setIsAdding(false)
      setForm(EMPTY_FORM)
      addToast(`👥 Driver ${res.data.full_name} registered successfully.`, 'success', 'top-right')
    } catch (err) {
      console.error('Failed to register driver:', err)
      if (!err.response || err.code === 'ERR_NETWORK') {
        const mock = { ...form, driver_id: `MOCK-DRV-${Math.floor(Math.random() * 899 + 100)}` }
        setDrivers(prev => [mock, ...prev])
        setIsAdding(false)
        setForm(EMPTY_FORM)
        addToast(`⚠️ Offline mode: Created mock driver ${mock.full_name}.`, 'warning', 'top-right')
      } else {
        let errorMsg = 'Registration failed.'
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
        addToast(`❌ ${errorMsg}`, 'error', 'top-right')
      }
    }
  }

  const startEditing = (driver) => {
    setEditingDriver(driver)
    setForm({
      full_name: driver.full_name || '',
      email: driver.email || '',
      phone: driver.phone || '',
      license_number: driver.license_number || '',
      experience_years: driver.experience_years || '',
      address: driver.address || '',
      status: driver.status || 'Active',
      password: '' // not sent on edit
    })
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (!form.full_name) return

    try {
      const payload = {
        full_name: form.full_name,
        phone: form.phone || null,
        license_number: form.license_number || null,
        experience_years: form.experience_years ? Number(form.experience_years) : null,
        address: form.address || null,
        status: form.status
      }

      const res = await api.put(`/drivers/${editingDriver.driver_id}`, payload)
      setDrivers(prev => prev.map(d => d.driver_id === editingDriver.driver_id ? res.data : d))
      setEditingDriver(null)
      setForm(EMPTY_FORM)
      addToast(`✏️ Driver ${res.data.full_name} updated successfully.`, 'success', 'top-right')
    } catch (err) {
      console.error('Failed to update driver details:', err)
      if (!err.response || err.code === 'ERR_NETWORK') {
        const updated = { ...editingDriver, ...form }
        setDrivers(prev => prev.map(d => d.driver_id === editingDriver.driver_id ? updated : d))
        setEditingDriver(null)
        setForm(EMPTY_FORM)
        addToast(`✏️ Offline mode: Updated mock driver ${updated.full_name}.`, 'warning', 'top-right')
      } else {
        let errorMsg = 'Update query rejected.'
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
        addToast(`❌ ${errorMsg}`, 'error', 'top-right')
      }
    }
  }

  const handleDelete = async (id, name) => {
    const confirmed = window.confirm(`⚠️ Delete Driver ${name} and clear association keys?`)
    if (!confirmed) return

    try {
      await api.delete(`/drivers/${id}`)
      setDrivers(prev => prev.filter(d => d.driver_id !== id))
      addToast(`🗑️ Driver ${name} removed from active logs.`, 'success', 'top-right')
    } catch (err) {
      console.error('Failed to delete driver:', err)
      if (!err.response || err.code === 'ERR_NETWORK') {
        setDrivers(prev => prev.filter(d => d.driver_id !== id))
        addToast(`🗑️ Offline: Removed mock driver ${name}.`, 'success', 'top-right')
      } else {
        addToast('❌ Could not delete driver.', 'error', 'top-right')
      }
    }
  }

  const getStatusColor = (status) => {
    if (status === 'Active' || status === 'Available') return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
    if (status === 'Assigned') return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
    if (status === 'In Transit') return 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
    if (status === 'Inactive') return 'bg-slate-500/10 border-slate-500/30 text-slate-400'
    return 'bg-amber-500/10 border-amber-500/30 text-amber-400'
  }

  const filteredDrivers = drivers.filter(d => {
    const q = searchQuery.toLowerCase()
    return (
      d.full_name?.toLowerCase().includes(q) ||
      d.license_number?.toLowerCase().includes(q) ||
      d.status?.toLowerCase().includes(q) ||
      d.address?.toLowerCase().includes(q)
    )
  })

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col justify-center items-center">
        <TruckLoader />
        <div className="text-[10px] text-white/50 uppercase tracking-widest mt-6 animate-pulse">Loading drivers...</div>
      </div>
    )
  }

  const modalForm = (title, onSubmit, onClose, isEdit) => createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md text-white">
      <div className="w-full max-w-lg glass-card border border-white/10 p-6 bg-slate-950/95 relative tech-border-accent max-h-[90vh] overflow-y-auto text-white">
        <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-5 bg-transparent text-white sticky top-0">
          <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono m-0">{title}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white cursor-pointer font-bold text-xs bg-transparent border-none outline-none">[CANCEL]</button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 font-mono text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-white/40 uppercase mb-1 font-mono tracking-wider">[ Full Name * ]</label>
              <input name="full_name" type="text" value={form.full_name} onChange={handleChange} required placeholder="e.g. Rahul Sharma"
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] focus:ring-2 focus:ring-[#00f0ff]/20 rounded-xl focus:outline-none text-white text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-white/40 uppercase mb-1 font-mono tracking-wider">[ Phone ]</label>
              <input name="phone" type="text" value={form.phone} onChange={handleChange} placeholder="+91-XXXXX-XXXXX"
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs" />
            </div>
          </div>
          {!isEdit && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-white/40 uppercase mb-1 font-mono tracking-wider">[ Email * ]</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="driver@example.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-white/40 uppercase mb-1 font-mono tracking-wider">[ Password * ]</label>
                <input name="password" type="password" value={form.password} onChange={handleChange} required placeholder="Min 6 characters"
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs" />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-white/40 uppercase mb-1 font-mono tracking-wider">[ License Number ]</label>
              <input name="license_number" type="text" value={form.license_number} onChange={handleChange} placeholder="e.g. DL-0120180012345"
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-white/40 uppercase mb-1 font-mono tracking-wider">[ Experience (years) ]</label>
              <input name="experience_years" type="number" min="0" value={form.experience_years} onChange={handleChange} placeholder="e.g. 5"
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-white/40 uppercase mb-1 font-mono tracking-wider">[ Address ]</label>
            <input name="address" type="text" value={form.address} onChange={handleChange} placeholder="e.g. Mumbai, Maharashtra"
              className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-white/40 uppercase mb-1 font-mono tracking-wider">[ Status ]</label>
            <select name="status" value={form.status} onChange={handleChange}
              className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-[#00f0ff] rounded-xl focus:outline-none text-white text-xs">
              <option value="Active">Active</option>
              <option value="Available">Available</option>
              <option value="Assigned">Assigned</option>
              <option value="In Transit">In Transit</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <button type="submit"
            className="w-full py-2.5 px-4 bg-[#00f0ff] hover:bg-[#00d2e0] text-[#06070d] rounded-xl font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.35)] mt-2">
            {isEdit ? 'Save Changes' : 'Register Driver'}
          </button>
        </form>
      </div>
    </div>,
    document.body
  )

  return (
    <div className="space-y-6 relative z-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <div className="flex-1 relative max-w-md">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/45 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search by name, license, address, status..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-white/10 bg-white/5 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#00f0ff] focus:ring-2 focus:ring-[#00f0ff]/20 transition-all duration-200 text-xs shadow-sm"
          />
        </div>
        {canManage && !isAdding && !editingDriver && (
          <button onClick={() => { setIsAdding(true); setForm(EMPTY_FORM) }}
            className="py-2 px-4 bg-[#00f0ff] hover:bg-[#00d2e0] text-[#06070d] rounded-xl font-bold text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.35)]">
            + Add Driver
          </button>
        )}
      </div>

      {/* Grid */}
      {filteredDrivers.length === 0 ? (
        <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-12 text-center text-white/40 font-medium">
          No drivers found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDrivers.map((d) => (
            <div
              key={d.driver_id}
              onClick={() => canManage && startEditing(d)}
              className="p-5 rounded-2xl border border-white/5 bg-slate-950/45 shadow-sm hover:shadow-lg hover:border-[#00f0ff]/20 transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[200px] relative group"
            >
              <div>
                {/* Header */}
                <div className="flex justify-between items-center mb-2.5">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-[#00f0ff]/10 border border-[#00f0ff]/20 flex items-center justify-center text-[#00f0ff] font-bold text-xs shadow-[0_0_10px_rgba(0,240,255,0.1)]">
                      {d.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm group-hover:text-[#00f0ff] transition-colors">{d.full_name}</h3>
                      <p className="text-[10px] text-white/45">{d.email}</p>
                    </div>
                  </div>
                  <span className={`inline-block px-2.5 py-0.5 border text-[9px] font-bold rounded-full ${getStatusColor(d.status)}`}>
                    {d.status}
                  </span>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 gap-y-1.5 text-[11px] text-white/70 mt-3">
                  <div className="flex items-center space-x-1.5">
                    <span>🪪</span>
                    <span className="font-mono">{d.license_number || 'No license on file'}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span>⏳</span>
                    <span>{d.experience_years != null ? `${d.experience_years} yrs experience` : 'Experience not set'}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span>📍</span>
                    <span>{d.address || 'No address on file'}</span>
                  </div>
                  {d.phone && (
                    <div className="flex items-center space-x-1.5">
                      <span>📞</span>
                      <span>{d.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center pt-3 border-t border-white/5 mt-3">
                <span className="text-[9px] text-white/60 bg-white/5 border border-white/10 rounded-md px-2 py-0.5 font-semibold">Driver</span>
                {canManage && (
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(d.driver_id, d.full_name) }}
                    className="p-1 hover:bg-rose-950/40 text-rose-400 rounded-lg transition-colors cursor-pointer"
                    title="Delete Driver"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {canManage && isAdding && modalForm('Register New Driver', handleAdd, () => { setIsAdding(false); setForm(EMPTY_FORM) }, false)}

      {/* Edit Modal */}
      {canManage && editingDriver && modalForm(
        `Edit Driver — ${editingDriver.full_name}`,
        handleUpdate,
        () => { setEditingDriver(null); setForm(EMPTY_FORM) },
        true
      )}
    </div>
  )
}

export default DriversPanel
