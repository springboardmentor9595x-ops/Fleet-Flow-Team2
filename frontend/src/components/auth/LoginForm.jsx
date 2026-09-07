import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useTheme } from '../../context/ThemeContext'
import TruckLoader from '../ui/TruckLoader'

function LoginForm() {
  const { isDark } = useTheme()
  const { login } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '' })
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load remembered email if previously stored
  useEffect(() => {
    const savedEmail = localStorage.getItem('fleetflow_remember_email')
    if (savedEmail) {
      setForm(prev => ({ ...prev, email: savedEmail }))
      setRememberMe(true)
    }
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      if (rememberMe) {
        localStorage.setItem('fleetflow_remember_email', form.email)
      } else {
        localStorage.removeItem('fleetflow_remember_email')
      }

      // 1. POST credentials to get access token
      const response = await api.post('/auth/login', form)
      const token = response.data.access_token
      const refreshToken = response.data.refresh_token

      // 2. Fetch profile details with the newly acquired token
      const meResponse = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })

      // 3. Commit login profile to AuthContext (saves token to localStorage)
      login(meResponse.data, token, refreshToken)
      navigate('/dashboard')
      addToast('🔑 ACCESS GRANTED: Welcome to FleetFlow Console!', 'success', 'top-right')
    } catch (error) {
      console.error('Authentication node error:', error)
      
      // Connection Error / Offline Mode Fallback Bypass
      if (!error.response || error.code === 'ERR_NETWORK') {
        console.warn('Backend server offline. Proceeding with client-side bypass mode.')
        login({ 
          email: form.email, 
          full_name: form.email.split('@')[0].toUpperCase(),
          role: 'ADMIN' 
        }, 'mock-jwt-token', 'mock-refresh-token')
        navigate('/dashboard')
        addToast('⚠️ OFFLINE MODE: Initialized operator session.', 'warning', 'top-right')
      } else {
        // Enforce actual credentials validation error if backend is responsive
        const errorMsg = error.response?.data?.detail || 'Invalid email or password.'
        addToast(`❌ ACCESS REJECTED: ${errorMsg.toUpperCase()}`, 'error', 'top-right')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // If submitting, swap form with smooth loader
  if (isSubmitting) {
    return (
      <div className="min-h-[380px] flex flex-col justify-center items-center font-mono select-none">
        <TruckLoader />
        <span className={`text-[11px] tracking-widest font-black uppercase mt-5 animate-pulse ${
          isDark ? 'text-cyan-400' : 'text-blue-600'
        }`}>
          AUTHENTICATING OPERATOR ACCESS...
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ========================================================= */}
      {/* 1. CARD TOP: "Welcome to" & FLEETFLOW BRANDING            */}
      {/* ========================================================= */}
      <div className="space-y-2">
        <span className={`text-xs font-sans tracking-wide block ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
          Welcome to
        </span>
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center text-slate-950 font-black text-xl shadow-[0_0_15px_rgba(6,182,212,0.6)] shrink-0">
            F
          </div>
          <div>
            <h2 className={`text-lg sm:text-xl font-black tracking-wider m-0 leading-none ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              FLEET<span className={isDark ? 'text-cyan-400' : 'text-blue-600'}>FLOW</span>
            </h2>
            <p className={`text-[8.5px] tracking-widest uppercase m-0 mt-0.5 font-mono font-bold ${
              isDark ? 'text-cyan-400/80' : 'text-slate-500'
            }`}>
              ENTERPRISE LOGISTICS TELEMETRICS
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. FORM INPUTS & ACTIONS                                  */}
      {/* ========================================================= */}
      <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
        
        {/* Email Address Input with Icon */}
        <div className="relative">
          <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-base ${
            isDark ? 'text-cyan-400' : 'text-slate-400'
          }`}>
            ✉️
          </div>
          <input
            name="email"
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            className={`w-full pl-10 pr-4 py-3 rounded-2xl text-xs sm:text-sm transition-all duration-200 outline-none border ${
              isDark
                ? 'bg-[#060e22]/90 border-slate-700/80 text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20'
                : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-sm'
            }`}
          />
        </div>

        {/* Password Input with Lock Icon & Eye Visibility Toggle */}
        <div className="relative">
          <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-base ${
            isDark ? 'text-cyan-400' : 'text-slate-400'
          }`}>
            🔒
          </div>
          <input
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            disabled={isSubmitting}
            className={`w-full pl-10 pr-11 py-3 rounded-2xl text-xs sm:text-sm transition-all duration-200 outline-none border ${
              isDark
                ? 'bg-[#060e22]/90 border-slate-700/80 text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20'
                : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 shadow-sm'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isSubmitting}
            className={`absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer transition-colors text-sm ${
              isDark ? 'text-slate-400 hover:text-cyan-300' : 'text-slate-400 hover:text-slate-700'
            }`}
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>

        {/* Remember Me Checkbox & Forgot Password Link */}
        <div className="flex items-center justify-between text-xs pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className={`w-4 h-4 rounded cursor-pointer ${
                isDark ? 'accent-cyan-400' : 'accent-blue-600'
              }`}
            />
            <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
              Remember me
            </span>
          </label>

          <Link
            to="/forgot-password"
            className={`font-semibold transition-colors ${
              isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            Forgot password?
          </Link>
        </div>

        {/* Main Sign in CTA Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3.5 px-5 rounded-2xl font-black text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-lg active:scale-[0.99] ${
              isDark
                ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-500 text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.5)] hover:brightness-110'
                : 'bg-gradient-to-r from-[#00b4d8] to-[#0077b6] hover:from-[#0096c7] hover:to-[#023e8a] text-white shadow-blue-500/25'
            }`}
          >
            <span>Sign in</span>
            <span className="text-base font-black">→</span>
          </button>
        </div>

        {/* Sign Up Navigation Link */}
        <div className={`text-center pt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          <span>Don't have an account? </span>
          <Link
            to="/signup"
            className={`font-bold transition-all ml-1 ${
              isDark ? 'text-cyan-400 hover:underline hover:text-cyan-300' : 'text-blue-600 hover:underline hover:text-blue-700'
            }`}
          >
            Sign Up
          </Link>
        </div>

      </form>

      {/* ========================================================= */}
      {/* 3. CARD BOTTOM AESTHETIC BANNER ACCENT                   */}
      {/* ========================================================= */}
      <div className="pt-2">
        {isDark ? (
          /* Dark Mode Wave Accent & "KEEP MOVING FORWARD" */
          <div className="rounded-2xl bg-[#071026]/90 border border-slate-800/80 p-3 flex items-center justify-between relative overflow-hidden">
            <div className="absolute right-0 bottom-0 top-0 w-1/2 bg-[radial-gradient(ellipse_at_bottom_right,rgba(6,182,212,0.15),transparent_70%)] pointer-events-none"></div>
            <div className="text-[9px] font-mono font-black tracking-widest uppercase text-slate-400 leading-tight">
              KEEP<br />
              <span className="text-cyan-400">MOVING</span><br />
              FORWARD
            </div>
            <div className="text-2xl opacity-80 animate-pulse">
              🚛
            </div>
          </div>
        ) : (
          /* Light Mode Scenic Mountain Quote Banner */
          <div className="rounded-2xl bg-gradient-to-r from-blue-50 via-sky-50 to-slate-50 border border-blue-100 p-3 flex items-center gap-3">
            <span className="text-2xl">🚛</span>
            <div className="min-w-0">
              <span className="text-xs font-serif italic font-bold text-slate-700 block truncate">
                "Moving today for a better tomorrow"
              </span>
              <div className="w-10 h-0.5 bg-blue-500 rounded-full mt-0.5"></div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

export default LoginForm
