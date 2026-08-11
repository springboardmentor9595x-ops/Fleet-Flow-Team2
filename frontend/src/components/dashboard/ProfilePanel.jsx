import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import api from '../../api/axios'
import TruckLoader from '../ui/TruckLoader'

function ProfilePanel() {
  const { user, refreshUser } = useAuth()
  const { addToast } = useToast()

  const roleUpper = user?.role?.toUpperCase() || ''
  const isDriver = roleUpper === 'DRIVER'

  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)

  const getStatusColor = (status) => {
    if (status === 'Active' || status === 'Available') return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
    if (status === 'Assigned') return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
    if (status === 'In Transit') return 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
    if (status === 'Inactive') return 'bg-slate-500/10 border-slate-500/30 text-slate-400'
    return 'bg-amber-500/10 border-amber-500/30 text-amber-400'
  }
  
  // Local form state
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    license_number: '',
    experience_years: '',
    address: ''
  })

  const loadProfile = async () => {
    try {
      setIsLoading(true)
      if (isDriver) {
        // Fetch driver profile fields
        const res = await api.get('/drivers')
        const matched = res.data.find((d) => d.user_id === user?.user_id)
        if (matched) {
          setProfile(matched)
          setForm({
            full_name: matched.full_name || '',
            phone: matched.phone || '',
            license_number: matched.license_number || '',
            experience_years: matched.experience_years !== null ? matched.experience_years : 0,
            address: matched.address || ''
          })
        } else {
          // Fallback if driver record not yet created in db
          setProfile({
            full_name: user.full_name,
            email: user.email,
            phone: user.phone || '',
            role: user.role,
            status: 'Active',
            license_number: '',
            experience_years: 0,
            address: ''
          })
          setForm({
            full_name: user.full_name || '',
            phone: user.phone || '',
            license_number: '',
            experience_years: 0,
            address: ''
          })
        }
      } else {
        // General staff user profile
        setProfile({
          full_name: user.full_name,
          email: user.email,
          phone: user.phone || '',
          role: user.role
        })
        setForm({
          full_name: user.full_name || '',
          phone: user.phone || '',
          license_number: '',
          experience_years: '',
          address: ''
        })
      }
    } catch (err) {
      console.error('Failed to load profile details:', err)
      addToast('❌ ERROR: Could not retrieve profile details.', 'error', 'top-right')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadProfile()
  }, [user, isDriver])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: name === 'experience_years' ? parseInt(value) || 0 : value
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.full_name.trim()) {
      addToast('❌ VALIDATION: Full Name is required.', 'error', 'top-right')
      return
    }

    try {
      if (isDriver && profile?.driver_id) {
        // Update driver table & user table
        const res = await api.put(`/drivers/${profile.driver_id}`, {
          full_name: form.full_name,
          phone: form.phone,
          license_number: form.license_number,
          experience_years: form.experience_years,
          address: form.address
        })
        setProfile(res.data)
      } else {
        // Update user table only via PUT /auth/me
        const res = await api.put('/auth/me', {
          full_name: form.full_name,
          phone: form.phone
        })
        setProfile({
          full_name: res.data.full_name,
          email: res.data.email,
          phone: res.data.phone || '',
          role: res.data.role
        })
      }

      setIsEditing(false)
      addToast('💾 SUCCESS: Settings saved successfully.', 'success', 'top-right')
      
      // Sync global user state in sidebar navigation
      await refreshUser()
    } catch (err) {
      console.error('Failed to save profile changes:', err)
      addToast('❌ ERROR: Could not save profile changes.', 'error', 'top-right')
    }
  }

  const getRoleLabel = (role) => {
    if (!role) return 'OPERATOR'
    return role.replace(/([A-Z])/g, ' $1').trim().toUpperCase()
  }

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col justify-center items-center font-mono">
        <TruckLoader />
        <div className="text-[10px] text-white/50 uppercase tracking-widest mt-6 animate-pulse">
          Retrieving Profile...
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="glass-card border border-white/10 p-6 bg-slate-950/40 text-center font-mono text-xs">
        <div className="text-amber-400 font-bold mb-2">⚠️ PROFILE NOT FOUND</div>
        <p className="text-white/60 mb-0">Could not retrieve account details from the server.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto glass-card border border-white/10 p-6 md:p-8 bg-slate-950/40 font-mono text-xs text-white/90">
      <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6">
        <h2 className="text-sm font-bold text-white tracking-wide uppercase m-0 flex items-center gap-2">
          ⚙️ [ {isDriver ? 'DRIVER PROFILE' : 'ACCOUNT SETTINGS'} MANIFEST ]
        </h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="py-1 px-3 bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/50 rounded-lg font-bold cursor-pointer transition-all uppercase"
          >
            Edit Settings
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] text-white/40 block mb-1.5">[ FULL NAME ]</label>
              <input
                name="full_name"
                type="text"
                value={form.full_name}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs"
                required
              />
            </div>
            <div>
              <label className="text-[9px] text-white/40 block mb-1.5">[ EMAIL (READ-ONLY) ]</label>
              <input
                type="email"
                value={profile.email}
                className="w-full px-3 py-2 bg-slate-950/50 border border-white/5 rounded-xl text-white/40 text-xs cursor-not-allowed"
                disabled
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] text-white/40 block mb-1.5">[ CONTACT PHONE ]</label>
              <input
                name="phone"
                type="text"
                value={form.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs"
              />
            </div>
            {isDriver ? (
              <div>
                <label className="text-[9px] text-white/40 block mb-1.5">[ LICENSE NUMBER ]</label>
                <input
                  name="license_number"
                  type="text"
                  value={form.license_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs"
                />
              </div>
            ) : (
              <div>
                <label className="text-[9px] text-white/40 block mb-1.5">[ ACCESS ROLE (READ-ONLY) ]</label>
                <input
                  type="text"
                  value={getRoleLabel(profile.role)}
                  className="w-full px-3 py-2 bg-slate-950/50 border border-white/5 rounded-xl text-cyan-400/50 text-xs font-bold cursor-not-allowed"
                  disabled
                />
              </div>
            )}
          </div>

          {isDriver && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ EXPERIENCE (YEARS) ]</label>
                  <input
                    name="experience_years"
                    type="number"
                    min="0"
                    value={form.experience_years}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-white/40 block mb-1.5">[ PROFILE STATUS (READ-ONLY) ]</label>
                  <input
                    type="text"
                    value={(profile.status || 'Active').toUpperCase()}
                    className="w-full px-3 py-2 bg-slate-950/50 border border-white/5 rounded-xl text-cyan-400/50 text-xs font-bold cursor-not-allowed"
                    disabled
                  />
                </div>
              </div>

              <div>
                <label className="text-[9px] text-white/40 block mb-1.5">[ RESIDENCE ADDRESS ]</label>
                <textarea
                  name="address"
                  rows="3"
                  value={form.address}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 focus:border-white/40 rounded-xl focus:outline-none text-white text-xs resize-none"
                />
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="py-1.5 px-4 bg-transparent text-white/50 border border-white/10 hover:bg-white/5 rounded-xl font-bold cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="py-1.5 px-4 bg-white text-slate-950 hover:bg-white/95 rounded-xl font-bold cursor-pointer"
            >
              SAVE CHANGES
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <table className="w-full border-collapse">
            <tbody>
              <tr className="border-b border-white/5">
                <td className="py-3 text-white/40 w-1/3">FULL NAME</td>
                <td className="py-3 text-white font-semibold">{profile.full_name}</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 text-white/40">EMAIL ADDRESS</td>
                <td className="py-3 text-slate-300">{profile.email}</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 text-white/40">CONTACT PHONE</td>
                <td className="py-3 text-white font-medium">{profile.phone || 'NOT SET'}</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 text-white/40">ACCESS CLEARANCE</td>
                <td className="py-3 text-cyan-400 font-bold tracking-wider">{getRoleLabel(profile.role)}</td>
              </tr>
              {isDriver && (
                <>
                  <tr className="border-b border-white/5">
                    <td className="py-3 text-white/40">LICENSE NUMBER</td>
                    <td className="py-3 text-slate-200 uppercase font-mono">{profile.license_number || 'NOT SET'}</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 text-white/40">EXPERIENCE CLEARANCE</td>
                    <td className="py-3 text-white font-bold">{profile.experience_years || 0} YEARS</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 text-white/40">RESIDENCE ADDRESS</td>
                    <td className="py-3 text-slate-300">{profile.address || 'NOT SET'}</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-3 text-white/40">SYSTEM STATUS</td>
                    <td className="py-3">
                      <span className={`inline-block px-2.5 py-0.5 border text-[9px] font-bold rounded-full ${getStatusColor(profile.status || 'Active')}`}>
                        {(profile.status || 'Active').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ProfilePanel
