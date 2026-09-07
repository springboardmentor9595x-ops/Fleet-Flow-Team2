import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useTheme } from '../../context/ThemeContext'
import api from '../../api/axios'
import TruckLoader from '../ui/TruckLoader'

function ProfilePanel() {
  const { user, refreshUser } = useAuth()
  const { addToast } = useToast()
  const { isDark } = useTheme()

  const roleUpper = user?.role?.toUpperCase() || ''
  const isDriver = roleUpper === 'DRIVER'

  const [profile, setProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false)

  // Password Change Form State
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false)

  const getStatusColor = (status) => {
    if (status === 'Active' || status === 'Available') return isDark ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
    if (status === 'Assigned') return isDark ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400' : 'bg-cyan-50 text-cyan-800 border-cyan-300 font-bold'
    if (status === 'In Transit') return isDark ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400' : 'bg-indigo-50 text-indigo-800 border-indigo-300 font-bold'
    if (status === 'Inactive') return isDark ? 'bg-slate-800 border-white/10 text-slate-400' : 'bg-slate-100 text-slate-700 border-slate-300 font-bold'
    return isDark ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
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

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordForm((prev) => ({
      ...prev,
      [name]: value
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

  // Handle Submit Change Password
  const handleSubmitPasswordChange = async (e) => {
    e.preventDefault()
    if (!passwordForm.old_password) {
      addToast('❌ VALIDATION: Current Password is required.', 'error', 'top-right')
      return
    }
    if (!passwordForm.new_password) {
      addToast('❌ VALIDATION: New Password is required.', 'error', 'top-right')
      return
    }
    if (passwordForm.new_password.length < 6) {
      addToast('❌ VALIDATION: New Password must be at least 6 characters.', 'error', 'top-right')
      return
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      addToast('❌ VALIDATION: New Password and Confirm Password do not match.', 'error', 'top-right')
      return
    }

    try {
      setIsSubmittingPassword(true)
      const res = await api.post('/auth/change-password', {
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
        confirm_password: passwordForm.confirm_password
      })

      addToast('🔒 SUCCESS: Password changed successfully and updated in DB!', 'success', 'top-right')
      setPasswordForm({
        old_password: '',
        new_password: '',
        confirm_password: ''
      })
      setIsPasswordModalOpen(false)
    } catch (err) {
      console.error('Password change error:', err)
      const errorMsg = err.response?.data?.detail || 'Failed to change password. Please check your current password.'
      addToast(`❌ ERROR: ${errorMsg}`, 'error', 'top-right')
    } finally {
      setIsSubmittingPassword(false)
    }
  }

  // Handle Account Deletion Request
  const handleRequestDeletion = async (e) => {
    if (e) e.preventDefault()
    try {
      setIsSubmittingDelete(true)
      const res = await api.post('/auth/request-deletion', {
        reason: deleteReason.trim() || 'User submitted an account deletion request from the Profile panel.'
      })
      addToast('⚠️ SUCCESS: Account deletion request transmitted to all Administrators!', 'warning', 'top-right')
      setIsDeleteModalOpen(false)
      setDeleteReason('')
    } catch (err) {
      console.error('Account deletion request error:', err)
      const errorMsg = err.response?.data?.detail || 'Failed to submit account deletion request. Please try again later.'
      addToast(`❌ ERROR: ${errorMsg}`, 'error', 'top-right')
    } finally {
      setIsSubmittingDelete(false)
    }
  }

  const getRoleLabel = (role) => {
    if (!role) return 'OPERATOR'
    return role.replace(/([A-Z])/g, ' $1').trim().toUpperCase()
  }

  const getInitials = (name) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col justify-center items-center font-mono">
        <TruckLoader />
        <div className={`text-[10px] uppercase tracking-widest mt-6 animate-pulse ${isDark ? 'text-slate-400' : 'text-slate-500 font-bold'}`}>
          Retrieving Profile Manifest...
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className={`p-8 rounded-2xl border text-center font-mono text-xs shadow-md ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="text-amber-500 font-bold mb-2">⚠️ PROFILE NOT FOUND</div>
        <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} mb-0`}>Could not retrieve account details from the server.</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 font-mono pb-12">
      
      {/* ========================================================= */}
      {/* 1. HERO PROFILE IDENTITY HEADER CARD                      */}
      {/* ========================================================= */}
      <div className={`p-6 md:p-8 rounded-3xl border shadow-xl relative overflow-hidden backdrop-blur-md transition-all ${
        isDark 
          ? 'bg-[#0f172a]/95 border-slate-800 text-white shadow-2xl' 
          : 'bg-white border-slate-200/90 text-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
      }`}>
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center space-x-5">
            {/* Avatar with high-tech ring */}
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-lg shadow-cyan-500/25 border-2 border-white dark:border-slate-800">
                {getInitials(profile.full_name)}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-xs" title="Online & Verified">
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              </div>
            </div>

            {/* Name, Role & Status */}
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className={`text-xl sm:text-2xl font-black tracking-tight m-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {profile.full_name}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  isDark 
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' 
                    : 'bg-cyan-50 text-cyan-800 border border-cyan-200 shadow-xs font-bold'
                }`}>
                  🛡️ {getRoleLabel(profile.role)}
                </span>
              </div>
              <p className={`text-xs font-sans mt-1.5 m-0 ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>
                {profile.email} • ID: <span className={`font-mono font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>{user?.user_id?.substring(0, 8) || 'USR-01'}</span>
              </p>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Edit Profile Button */}
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className={`px-5 py-2.5 rounded-xl font-bold font-mono text-xs cursor-pointer shadow-md transition-all flex items-center gap-2 ${
                  isDark
                    ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                    : 'bg-cyan-600 hover:bg-cyan-700 text-white border border-cyan-700 shadow-sm'
                }`}
              >
                <span>⚙️</span>
                <span>EDIT PROFILE</span>
              </button>
            ) : (
              <span className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                isDark 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                  : 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
              }`}>
                EDITING ACTIVE
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. MAIN MANIFEST / EDIT FORM                              */}
      {/* ========================================================= */}
      {isEditing ? (
        <div className={`p-6 md:p-8 rounded-3xl border shadow-xl ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-md'
        }`}>
          <div className={`border-b pb-3 mb-6 flex justify-between items-center ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <h2 className={`text-sm font-black uppercase tracking-wider m-0 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <span>✏️</span> Edit Account Specifications
            </h2>
            <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Press Save Changes to sync profile</span>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={`text-[10px] font-bold block mb-1.5 uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>[ FULL NAME ]</label>
                <input
                  name="full_name"
                  type="text"
                  value={form.full_name}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none text-xs font-bold shadow-inner ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 focus:border-cyan-500 text-white' 
                      : 'bg-slate-50 border-slate-300 focus:border-cyan-600 text-slate-900'
                  }`}
                  required
                />
              </div>
              <div>
                <label className={`text-[10px] font-bold block mb-1.5 uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>[ EMAIL ADDRESS (LOCKED) ]</label>
                <input
                  type="email"
                  value={profile.email}
                  className={`w-full px-4 py-2.5 border rounded-xl text-xs font-bold cursor-not-allowed ${
                    isDark ? 'bg-slate-950/50 border-slate-800/80 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'
                  }`}
                  disabled
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={`text-[10px] font-bold block mb-1.5 uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>[ CONTACT PHONE ]</label>
                <input
                  name="phone"
                  type="text"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                  className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none text-xs font-bold shadow-inner ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 focus:border-cyan-500 text-white' 
                      : 'bg-slate-50 border-slate-300 focus:border-cyan-600 text-slate-900'
                  }`}
                />
              </div>
              {isDriver ? (
                <div>
                  <label className={`text-[10px] font-bold block mb-1.5 uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>[ DRIVER LICENSE NUMBER ]</label>
                  <input
                    name="license_number"
                    type="text"
                    value={form.license_number}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none text-xs font-bold shadow-inner ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 focus:border-cyan-500 text-white' 
                        : 'bg-slate-50 border-slate-300 focus:border-cyan-600 text-slate-900'
                    }`}
                  />
                </div>
              ) : (
                <div>
                  <label className={`text-[10px] font-bold block mb-1.5 uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>[ ACCESS ROLE (LOCKED) ]</label>
                  <input
                    type="text"
                    value={getRoleLabel(profile.role)}
                    className={`w-full px-4 py-2.5 border rounded-xl text-xs font-bold cursor-not-allowed ${
                      isDark ? 'bg-slate-950/50 border-slate-800/80 text-cyan-400' : 'bg-slate-100 border-slate-200 text-cyan-800'
                    }`}
                    disabled
                  />
                </div>
              )}
            </div>

            {isDriver && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={`text-[10px] font-bold block mb-1.5 uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>[ DRIVING EXPERIENCE (YEARS) ]</label>
                    <input
                      name="experience_years"
                      type="number"
                      min="0"
                      value={form.experience_years}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none text-xs font-bold shadow-inner ${
                        isDark 
                          ? 'bg-slate-950 border-slate-800 focus:border-cyan-500 text-white' 
                          : 'bg-slate-50 border-slate-300 focus:border-cyan-600 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`text-[10px] font-bold block mb-1.5 uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>[ ROSTER STATUS (LOCKED) ]</label>
                    <input
                      type="text"
                      value={(profile.status || 'Active').toUpperCase()}
                      className={`w-full px-4 py-2.5 border rounded-xl text-xs font-bold cursor-not-allowed ${
                        isDark ? 'bg-slate-950/50 border-slate-800/80 text-emerald-400' : 'bg-slate-100 border-slate-200 text-emerald-800 font-bold'
                      }`}
                      disabled
                    />
                  </div>
                </div>

                <div>
                  <label className={`text-[10px] font-bold block mb-1.5 uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>[ RESIDENTIAL ADDRESS ]</label>
                  <textarea
                    name="address"
                    rows="3"
                    value={form.address}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none text-xs font-bold shadow-inner resize-none ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 focus:border-cyan-500 text-white' 
                        : 'bg-slate-50 border-slate-300 focus:border-cyan-600 text-slate-900'
                    }`}
                  />
                </div>
              </>
            )}

            <div className={`flex justify-end space-x-3 pt-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className={`py-2 px-5 rounded-xl font-bold cursor-pointer transition-all text-xs ${
                  isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                CANCEL
              </button>
              <button
                type="submit"
                className={`py-2 px-6 rounded-xl font-black cursor-pointer shadow-md transition-all text-xs uppercase ${
                  isDark ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                }`}
              >
                SAVE CHANGES
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Card 1: Account & Profile Specifications */}
          <div className={`lg:col-span-7 p-6 md:p-7 rounded-3xl border shadow-xl space-y-4 ${
            isDark ? 'bg-[#0f172a]/95 border-slate-800 text-white' : 'bg-white border-slate-200/90 text-slate-900 shadow-md'
          }`}>
            <div className={`border-b pb-3 flex justify-between items-center ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <h2 className={`text-xs font-black uppercase tracking-wider m-0 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span>📋</span> [ ACCOUNT SPECIFICATIONS ]
              </h2>
              <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold border ${
                isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200 font-bold'
              }`}>
                VERIFIED
              </span>
            </div>

            <div className={`divide-y text-xs ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
              <div className="py-3 flex justify-between items-center">
                <span className={`flex items-center gap-2 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>👤</span> FULL NAME
                </span>
                <span className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{profile.full_name}</span>
              </div>

              <div className="py-3 flex justify-between items-center">
                <span className={`flex items-center gap-2 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>✉️</span> EMAIL ADDRESS
                </span>
                <span className={`font-bold ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>{profile.email}</span>
              </div>

              <div className="py-3 flex justify-between items-center">
                <span className={`flex items-center gap-2 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>📞</span> CONTACT PHONE
                </span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{profile.phone || 'Not Registered'}</span>
              </div>

              <div className="py-3 flex justify-between items-center">
                <span className={`flex items-center gap-2 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>🛡️</span> ACCESS CLEARANCE
                </span>
                <span className={`font-black tracking-wider px-2.5 py-1 rounded-lg border ${
                  isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-cyan-50 text-cyan-800 border-cyan-200 font-bold'
                }`}>
                  {getRoleLabel(profile.role)}
                </span>
              </div>

              {isDriver && (
                <>
                  <div className="py-3 flex justify-between items-center">
                    <span className={`flex items-center gap-2 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span>🪪</span> LICENSE NUMBER
                    </span>
                    <span className={`font-black uppercase px-2.5 py-0.5 rounded border ${
                      isDark ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-100 text-slate-800 border-slate-200'
                    }`}>
                      {profile.license_number || 'NOT SET'}
                    </span>
                  </div>

                  <div className="py-3 flex justify-between items-center">
                    <span className={`flex items-center gap-2 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span>⭐</span> EXPERIENCE
                    </span>
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{profile.experience_years || 0} YEARS</span>
                  </div>

                  <div className="py-3 flex justify-between items-center">
                    <span className={`flex items-center gap-2 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span>🏠</span> RESIDENCE ADDRESS
                    </span>
                    <span className={`text-right truncate max-w-[220px] font-sans ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {profile.address || 'Not Configured'}
                    </span>
                  </div>

                  <div className="py-3 flex justify-between items-center">
                    <span className={`flex items-center gap-2 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span>●</span> ROSTER STATUS
                    </span>
                    <span className={`px-2.5 py-0.5 border text-[9px] font-black rounded-full ${getStatusColor(profile.status || 'Active')}`}>
                      {(profile.status || 'Active').toUpperCase()}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Card 2: Security & System Telemetry */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Security & Access */}
            <div className={`p-6 rounded-3xl border shadow-xl space-y-4 ${
              isDark ? 'bg-[#0f172a]/95 border-slate-800 text-white' : 'bg-white border-slate-200/90 text-slate-900 shadow-md'
            }`}>
              <div className={`border-b pb-3 flex justify-between items-center ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <h2 className={`text-xs font-black uppercase tracking-wider m-0 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>🔒</span> [ SECURITY & IAM ]
                </h2>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-xs"></span>
              </div>

              <div className="space-y-3 text-xs">
                <div className={`p-3 rounded-2xl border flex justify-between items-center ${
                  isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200'
                }`}>
                  <div>
                    <div className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Encryption Protocol</div>
                    <div className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>TLS 1.3 / AES-256</div>
                  </div>
                  <span className={`font-black text-[10px] ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>SECURED</span>
                </div>

                <div className={`p-3 rounded-2xl border flex justify-between items-center ${
                  isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200'
                }`}>
                  <div>
                    <div className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Session Authentication</div>
                    <div className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>JWT Signed Token</div>
                  </div>
                  <span className={`font-black text-[10px] ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>ACTIVE</span>
                </div>

                <div className={`p-3 rounded-2xl border flex justify-between items-center ${
                  isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/80 border-slate-200'
                }`}>
                  <div>
                    <div className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Gateway Connectivity</div>
                    <div className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>FastAPI WebSocket Hub</div>
                  </div>
                  <span className={`font-black text-[10px] ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>● ONLINE</span>
                </div>

                {/* Password Change Quick CTA Button */}
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(true)}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold font-mono text-xs cursor-pointer shadow-sm transition-all flex items-center justify-center gap-2 mt-2 ${
                    isDark
                      ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 font-bold'
                  }`}
                >
                  <span>🔑</span>
                  <span>CHANGE ACCOUNT PASSWORD</span>
                </button>

                {/* Request Account Deletion CTA Button */}
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold font-mono text-xs cursor-pointer shadow-sm transition-all flex items-center justify-center gap-2 mt-1.5 ${
                    isDark
                      ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold'
                  }`}
                >
                  <span>🗑️</span>
                  <span>REQUEST ACCOUNT DELETION</span>
                </button>
              </div>
            </div>

            {/* Preferences / Quick Notice */}
            <div className={`p-5 rounded-3xl border text-xs ${
              isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50/90 border-slate-200/90 shadow-xs'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span>💡</span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>Profile Synchronisation</span>
              </div>
              <p className={`text-[11px] font-sans leading-relaxed m-0 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Any modifications made to your contact phone or account credentials are automatically propagated to assigned fleet dispatches and delivery manifests.
              </p>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* 3. CHANGE PASSWORD MODAL (PORTAL)                         */}
      {/* ========================================================= */}
      {isPasswordModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-mono">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden p-6 sm:p-7 relative transition-all ${
            isDark ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
          }`}>
            
            {/* Modal Header */}
            <div className={`flex justify-between items-center border-b pb-4 mb-5 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${
                  isDark ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                }`}>
                  🔒
                </div>
                <div>
                  <h3 className={`text-base font-black tracking-tight m-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Change Password
                  </h3>
                  <span className={`text-[11px] block font-sans ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>
                    Verify old password to update credentials in DB
                  </span>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  setIsPasswordModalOpen(false)
                  setPasswordForm({ old_password: '', new_password: '', confirm_password: '' })
                }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-sm font-bold ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitPasswordChange} className="space-y-4">
              
              {/* Old / Current Password */}
              <div>
                <label className={`text-[11px] font-bold block mb-1.5 uppercase ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  [ 1. Current (Old) Password ]
                </label>
                <div className="relative">
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    name="old_password"
                    value={passwordForm.old_password}
                    onChange={handlePasswordChange}
                    placeholder="Enter current password..."
                    className={`w-full px-4 py-2.5 pr-10 border rounded-xl focus:outline-none text-xs font-mono font-bold shadow-inner ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 focus:border-cyan-500 text-white' 
                        : 'bg-slate-50 border-slate-300 focus:border-cyan-600 text-slate-900'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-2.5 text-xs opacity-60 hover:opacity-100 cursor-pointer"
                    title={showOldPassword ? 'Hide password' : 'Show password'}
                  >
                    {showOldPassword ? '👁️' : '🙈'}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className={`text-[11px] font-bold block mb-1.5 uppercase ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  [ 2. New Password ]
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    name="new_password"
                    value={passwordForm.new_password}
                    onChange={handlePasswordChange}
                    placeholder="Min. 6 characters..."
                    className={`w-full px-4 py-2.5 pr-10 border rounded-xl focus:outline-none text-xs font-mono font-bold shadow-inner ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 focus:border-cyan-500 text-white' 
                        : 'bg-slate-50 border-slate-300 focus:border-cyan-600 text-slate-900'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-xs opacity-60 hover:opacity-100 cursor-pointer"
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? '👁️' : '🙈'}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className={`text-[11px] font-bold block mb-1.5 uppercase ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  [ 3. Confirm New Password ]
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirm_password"
                    value={passwordForm.confirm_password}
                    onChange={handlePasswordChange}
                    placeholder="Re-enter new password..."
                    className={`w-full px-4 py-2.5 pr-10 border rounded-xl focus:outline-none text-xs font-mono font-bold shadow-inner ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 focus:border-cyan-500 text-white' 
                        : 'bg-slate-50 border-slate-300 focus:border-cyan-600 text-slate-900'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-xs opacity-60 hover:opacity-100 cursor-pointer"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? '👁️' : '🙈'}
                  </button>
                </div>
              </div>

              {/* Password Match Status Pill */}
              {passwordForm.new_password && passwordForm.confirm_password && (
                <div className="pt-1">
                  {passwordForm.new_password === passwordForm.confirm_password ? (
                    <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1">
                      <span>✓</span> Passwords match
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                      <span>✕</span> Passwords do not match
                    </span>
                  )}
                </div>
              )}

              {/* Buttons */}
              <div className={`flex justify-end space-x-3 pt-4 border-t mt-5 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <button
                  type="button"
                  onClick={() => {
                    setIsPasswordModalOpen(false)
                    setPasswordForm({ old_password: '', new_password: '', confirm_password: '' })
                  }}
                  className={`py-2 px-5 rounded-xl font-bold cursor-pointer transition-all text-xs ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                  disabled={isSubmittingPassword}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPassword}
                  className={`py-2.5 px-6 rounded-xl font-black cursor-pointer shadow-md transition-all text-xs uppercase flex items-center gap-2 ${
                    isDark ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                  }`}
                >
                  {isSubmittingPassword ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>UPDATING DB...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>UPDATE PASSWORD</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>,
        document.body
      )}

      {/* ========================================================= */}
      {/* 4. REQUEST ACCOUNT DELETION MODAL (PORTAL)                */}
      {/* ========================================================= */}
      {isDeleteModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in font-mono">
          <div className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden p-6 sm:p-7 relative transition-all ${
            isDark ? 'bg-[#0f172a] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
          }`}>
            
            {/* Modal Header */}
            <div className={`flex justify-between items-center border-b pb-4 mb-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base ${
                  isDark ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  ⚠️
                </div>
                <div>
                  <h3 className={`text-base font-black tracking-tight m-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Request Deletion
                  </h3>
                  <span className={`text-[11px] block font-sans ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>
                    Forward account removal notice to Admin team
                  </span>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false)
                  setDeleteReason('')
                }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer text-sm font-bold ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleRequestDeletion} className="space-y-4">
              
              {/* Notice Banner */}
              <div className={`p-3.5 rounded-2xl border text-xs ${
                isDark ? 'bg-rose-950/30 border-rose-900/50 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <div className="flex items-start gap-2.5">
                  <span className="text-base leading-none">📢</span>
                  <p className="m-0 text-[11px] font-sans leading-relaxed">
                    Submitting this request will send an immediate high-priority notification to <strong className="font-bold">all Administrators</strong>. An administrator will review your account, remove your assigned fleet privileges, and delete your profile.
                  </p>
                </div>
              </div>

              {/* User Identity Details */}
              <div className={`p-3 rounded-xl border text-[11px] space-y-1.5 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Target Account:</span>
                  <span className="font-bold">{profile?.full_name || user?.full_name || 'User'}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Email:</span>
                  <span className="font-bold text-cyan-400">{profile?.email || user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Role:</span>
                  <span className="font-black text-amber-400">{getRoleLabel(profile?.role || user?.role)}</span>
                </div>
              </div>

              {/* Optional Reason Field */}
              <div>
                <label className={`text-[11px] font-bold block mb-1.5 uppercase ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  [ Reason for Deletion (Optional) ]
                </label>
                <textarea
                  rows="3"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="e.g. Leaving company roster, role change, no longer operating..."
                  className={`w-full px-4 py-2.5 border rounded-xl focus:outline-none text-xs font-sans font-medium shadow-inner resize-none ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 focus:border-rose-500 text-white placeholder-slate-600' 
                      : 'bg-slate-50 border-slate-300 focus:border-rose-600 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              {/* Actions */}
              <div className={`flex justify-end space-x-3 pt-4 border-t mt-5 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false)
                    setDeleteReason('')
                  }}
                  className={`py-2 px-5 rounded-xl font-bold cursor-pointer transition-all text-xs ${
                    isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                  disabled={isSubmittingDelete}
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDelete}
                  className={`py-2.5 px-6 rounded-xl font-black cursor-pointer shadow-md transition-all text-xs uppercase flex items-center gap-2 ${
                    isDark 
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30' 
                      : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200'
                  }`}
                >
                  {isSubmittingDelete ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>NOTIFYING ADMINS...</span>
                    </>
                  ) : (
                    <>
                      <span>📨</span>
                      <span>SEND DELETION REQUEST</span>
                    </>
                  )}
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

export default ProfilePanel
