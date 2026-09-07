import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useTheme } from '../../context/ThemeContext'
import TruckLoader from '../ui/TruckLoader'

const ROLE_MAP = {
  'MANAGER': 'FleetManager',
  'DISPATCHER': 'Dispatcher',
  'DRIVER': 'Driver',
  'ADMIN': 'Admin'
}

const ROLES = [
  { id: 'MANAGER', label: 'MANAGER' },
  { id: 'DISPATCHER', label: 'DISPATCHER' },
  { id: 'DRIVER', label: 'DRIVER' },
  { id: 'ADMIN', label: 'ADMIN' },
]

function SignupForm() {
  const { isDark } = useTheme()
  const { login } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const [selectedRole, setSelectedRole] = useState('MANAGER')
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // OTP Verification states
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [sentOtp, setSentOtp] = useState('')
  const [timer, setTimer] = useState(300)

  useEffect(() => {
    if (!otpSent) return
    setTimer(300)
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [otpSent])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  // Password rules validation checklist
  const checks = {
    length: form.password.length >= 8,
    upper: /[A-Z]/.test(form.password),
    lower: /[a-z]/.test(form.password),
    digit: /[0-9]/.test(form.password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(form.password)
  }

  const isPasswordValid = checks.length && checks.upper && checks.lower && checks.digit && checks.special

  // Handle Form Submit -> Request OTP Key
  const handleDetailsSubmit = async (event) => {
    if (event) event.preventDefault()

    if (!isPasswordValid) {
      addToast('❌ PASSWORD POLICY: Please satisfy all password requirements.', 'error', 'top-right')
      return
    }

    if (form.password !== confirmPassword) {
      addToast('❌ PASSWORDS MISMATCH: Please ensure both password fields match.', 'error', 'top-right')
      return
    }

    if (!agreeTerms) {
      addToast('⚠️ COMPLIANCE: You must accept the terms and compliance policy.', 'warning', 'top-right')
      return
    }

    setIsSubmitting(true)
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString()

    try {
      const res = await api.post('/auth/send-otp', { email: form.email, otp: generatedCode })
      setSentOtp(generatedCode)
      setOtpSent(true)
      setOtpCode('')
      if (res.data?.sent) {
        addToast(`📧 SMTP DISPATCHED: Verification security key sent to ${form.email}`, 'success', 'top-right')
      } else {
        addToast(`⚠️ VERIFICATION KEY: ${generatedCode} (Local bypass mode)`, 'warning', 'top-right')
      }
    } catch (err) {
      console.warn('OTP request fallback:', err)
      setSentOtp(generatedCode)
      setOtpSent(true)
      setOtpCode('')
      addToast(`⚠️ OFFLINE MODE: Verification key is [${generatedCode}]`, 'warning', 'top-right')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle OTP Verify -> Complete Registration
  const handleVerifyOtp = async (event) => {
    event.preventDefault()

    if (otpCode.trim() !== sentOtp.trim()) {
      addToast('❌ VERIFICATION FAILED: Invalid security code entered.', 'error', 'top-right')
      return
    }

    setIsSubmitting(true)
    const payload = {
      full_name: form.name,
      email: form.email,
      password: form.password,
      phone: form.phone || null,
      role: ROLE_MAP[selectedRole] || 'Driver'
    }

    try {
      await api.post('/auth/signup', payload)
      addToast('✅ ACCOUNT CREATED: Profile registered successfully! Please log in.', 'success', 'top-right')
      navigate('/login')
    } catch (error) {
      console.error('Registration error:', error)
      if (!error.response || error.code === 'ERR_NETWORK') {
        login({
          email: form.email,
          full_name: form.name.toUpperCase(),
          role: ROLE_MAP[selectedRole] || 'Driver'
        }, 'mock-jwt-token', 'mock-refresh-token')
        navigate('/dashboard')
        addToast('✅ REGISTERED: Offline profile created. Logged in directly!', 'success', 'top-right')
      } else {
        const errorMsg = error.response?.data?.detail || 'Could not register operator account.'
        addToast(`❌ SIGNUP ERROR: ${typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg)}`, 'error', 'top-right')
        setOtpSent(false)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  // Submitting Loader
  if (isSubmitting) {
    return (
      <div className="min-h-[380px] flex flex-col justify-center items-center font-mono select-none">
        <TruckLoader />
        <span className={`text-[10.5px] tracking-widest font-black uppercase mt-4 animate-pulse ${
          isDark ? 'text-cyan-400' : 'text-blue-600'
        }`}>
          PROVISIONING OPERATOR KEY...
        </span>
      </div>
    )
  }

  // OTP Verification Screen
  if (otpSent) {
    return (
      <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs font-sans min-h-[360px] flex flex-col justify-between">
        <div className="space-y-3">
          <div className="text-center pt-1">
            <span className={`text-[11px] font-mono font-black tracking-widest uppercase block mb-1 ${
              isDark ? 'text-cyan-400' : 'text-blue-600'
            }`}>
              [ ENTER 6-DIGIT SECURITY KEY ]
            </span>
            <p className={`text-xs leading-relaxed m-0 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Verification code dispatched to:
            </p>
            <span className={`text-xs font-mono font-black block mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {form.email}
            </span>
          </div>

          <div className="relative pt-1">
            <input
              type="text"
              placeholder="0 0 0 0 0 0"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              required
              className={`w-full px-3 py-2.5 rounded-xl text-center tracking-[0.4em] text-lg font-mono font-black outline-none border transition-all ${
                isDark
                  ? 'bg-[#060e22] border-cyan-500/40 text-cyan-300 focus:border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                  : 'bg-white border-blue-300 text-blue-900 focus:border-blue-500 shadow-sm'
              }`}
            />
          </div>

          <div className="text-center space-y-1 pt-1">
            <p className={`text-[11px] m-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {timer > 0 ? (
                <span>Expires in <span className={isDark ? 'text-cyan-400 font-bold' : 'text-blue-600 font-bold'}>{formatTime(timer)}</span></span>
              ) : (
                <span className="text-rose-500 font-bold">The code has expired.</span>
              )}
            </p>
            {timer === 0 && (
              <button
                type="button"
                onClick={handleDetailsSubmit}
                className="text-xs font-bold text-cyan-400 hover:underline cursor-pointer"
              >
                Resend security code
              </button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <button
            type="submit"
            className={`w-full py-3 px-4 font-black rounded-xl transition-all cursor-pointer shadow-lg active:scale-[0.99] text-xs uppercase tracking-wider ${
              isDark
                ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-500 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.5)]'
                : 'bg-gradient-to-r from-[#00b4d8] to-[#0077b6] text-white'
            }`}
          >
            Verify Security Code & Complete
          </button>
          
          <button
            type="button"
            onClick={() => setOtpSent(false)}
            className={`w-full py-2 px-3 font-mono text-[11px] rounded-lg border transition-colors cursor-pointer ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            ← Modify Registration Info
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="space-y-3">
      
      {/* ========================================================= */}
      {/* 1. HEADER ROW: "// CREATE OPERATOR ACCOUNT" & BACK BUTTON */}
      {/* ========================================================= */}
      <div className={`flex items-center justify-between gap-2 pb-1 border-b ${
        isDark ? 'border-slate-800/60' : 'border-slate-200'
      }`}>
        <span className={`text-[9.5px] font-mono font-black uppercase tracking-wider ${
          isDark ? 'text-cyan-400' : 'text-blue-600'
        }`}>
          // CREATE OPERATOR ACCOUNT
        </span>
        
        <Link
          to="/login"
          className={`px-2.5 py-0.5 rounded-full text-[9.5px] font-mono font-bold border transition-all flex items-center gap-1 cursor-pointer ${
            isDark
              ? 'bg-[#0b162f] border-slate-700 text-slate-300 hover:text-white hover:border-cyan-400'
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>←</span>
          <span>Back to Login</span>
        </Link>
      </div>

      {/* Title & Subtitle */}
      <div className="space-y-0.5">
        <h3 className={`text-lg sm:text-xl font-black tracking-tight m-0 ${
          isDark ? 'text-white' : 'text-slate-900'
        }`}>
          Create Operator Account
        </h3>
        <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'} m-0`}>
          Join FleetFlow and be part of a smarter logistics network.
        </p>
      </div>

      {/* ========================================================= */}
      {/* 2. 4 ROLE SELECTION TABS (Compact)                       */}
      {/* ========================================================= */}
      <div className={`grid grid-cols-4 gap-1 p-1 rounded-xl border transition-all ${
        isDark ? 'bg-[#060c1c] border-slate-800' : 'bg-slate-100 border-slate-200 shadow-inner'
      }`}>
        {ROLES.map((r) => {
          const isSelected = selectedRole === r.id
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedRole(r.id)}
              className={`py-1.5 px-0.5 text-center rounded-lg text-[10px] font-mono font-black transition-all cursor-pointer ${
                isSelected
                  ? isDark 
                    ? 'bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.6)] font-black'
                    : 'bg-[#0095ff] text-white shadow-sm font-black'
                  : isDark
                    ? 'text-slate-400 hover:text-white bg-transparent'
                    : 'text-slate-600 hover:text-slate-900 bg-transparent font-bold'
              }`}
            >
              {r.label}
            </button>
          )
        })}
      </div>

      {/* ========================================================= */}
      {/* 3. COMPACT INPUT FORM FIELDS                              */}
      {/* ========================================================= */}
      <form onSubmit={handleDetailsSubmit} className="space-y-2.5 pt-0.5">
        
        {/* Full Name */}
        <div className="relative">
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-sm ${
            isDark ? 'text-cyan-400' : 'text-slate-400'
          }`}>
            👤
          </div>
          <input
            name="name"
            type="text"
            placeholder="Full name"
            value={form.name}
            onChange={handleChange}
            required
            className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs outline-none border transition-all ${
              isDark
                ? 'bg-[#060e22]/90 border-slate-700/80 text-white placeholder-slate-500 focus:border-cyan-400'
                : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 shadow-sm'
            }`}
          />
        </div>

        {/* Email Address */}
        <div className="relative">
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-sm ${
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
            className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs outline-none border transition-all ${
              isDark
                ? 'bg-[#060e22]/90 border-slate-700/80 text-white placeholder-slate-500 focus:border-cyan-400'
                : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 shadow-sm'
            }`}
          />
        </div>

        {/* Mobile Number */}
        <div className="relative">
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-sm ${
            isDark ? 'text-cyan-400' : 'text-slate-400'
          }`}>
            📞
          </div>
          <input
            name="phone"
            type="tel"
            placeholder="Mobile number (e.g. +91 98765 43210)"
            value={form.phone}
            onChange={handleChange}
            className={`w-full pl-9 pr-3 py-2 rounded-xl text-xs outline-none border transition-all ${
              isDark
                ? 'bg-[#060e22]/90 border-slate-700/80 text-white placeholder-slate-500 focus:border-cyan-400'
                : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 shadow-sm'
            }`}
          />
        </div>

        {/* Password Field */}
        <div className="relative">
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-sm ${
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
            className={`w-full pl-9 pr-9 py-2 rounded-xl text-xs outline-none border transition-all ${
              isDark
                ? 'bg-[#060e22]/90 border-slate-700/80 text-white placeholder-slate-500 focus:border-cyan-400'
                : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 shadow-sm'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer text-xs"
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>

        {/* Confirm Password Field */}
        <div className="relative">
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-sm ${
            isDark ? 'text-cyan-400' : 'text-slate-400'
          }`}>
            🔒
          </div>
          <input
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className={`w-full pl-9 pr-9 py-2 rounded-xl text-xs outline-none border transition-all ${
              isDark
                ? 'bg-[#060e22]/90 border-slate-700/80 text-white placeholder-slate-500 focus:border-cyan-400'
                : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 shadow-sm'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer text-xs"
          >
            {showConfirmPassword ? '🙈' : '👁️'}
          </button>
        </div>

        {/* ========================================================= */}
        {/* 4. REAL-TIME PASSWORD POLICY CHECKLIST (Compact)         */}
        {/* ========================================================= */}
        <div className={`p-2 rounded-xl border text-[9px] font-mono select-none ${
          isDark ? 'bg-[#060c1a]/90 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            <div className={`flex items-center gap-1 ${checks.length ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span>{checks.length ? '🗹' : 'ⓧ'}</span>
              <span>Minimum 8 chars</span>
            </div>

            <div className={`flex items-center gap-1 ${checks.upper ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span>{checks.upper ? '🗹' : 'ⓧ'}</span>
              <span>Uppercase (A-Z)</span>
            </div>

            <div className={`flex items-center gap-1 ${checks.lower ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span>{checks.lower ? '🗹' : 'ⓧ'}</span>
              <span>Lowercase (a-z)</span>
            </div>

            <div className={`flex items-center gap-1 ${checks.digit ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span>{checks.digit ? '🗹' : 'ⓧ'}</span>
              <span>Digit (0-9)</span>
            </div>

            <div className={`flex items-center gap-1 col-span-2 ${checks.special ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span>{checks.special ? '🗹' : 'ⓧ'}</span>
              <span>Special character (!@#....)</span>
            </div>
          </div>
        </div>

        {/* Terms Checkbox */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer select-none text-[11px]">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              required
              className={`w-3.5 h-3.5 rounded cursor-pointer ${
                isDark ? 'accent-cyan-400' : 'accent-blue-600'
              }`}
            />
            <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>
              I agree to the <span className={`${isDark ? 'text-cyan-400' : 'text-blue-600'} underline font-semibold`}>terms and compliance policy</span>
            </span>
          </label>
        </div>

        {/* CTA Button */}
        <div className="pt-0.5">
          <button
            type="submit"
            className={`w-full py-2.5 px-4 rounded-xl font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-lg active:scale-[0.99] ${
              isDark
                ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-500 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.6)] hover:brightness-110'
                : 'bg-gradient-to-r from-[#00b4d8] to-[#0077b6] text-white shadow-blue-500/25'
            }`}
          >
            <span>Create account</span>
            <span className="text-sm font-black">→</span>
          </button>
        </div>

        {/* Sign In Link */}
        <div className={`text-center pt-0.5 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          <span>Already have an account? </span>
          <Link
            to="/login"
            className={`font-bold transition-all ml-1 ${
              isDark ? 'text-cyan-400 hover:underline hover:text-cyan-300' : 'text-blue-600 hover:underline hover:text-blue-700'
            }`}
          >
            Sign in
          </Link>
        </div>

      </form>

    </div>
  )
}

export default SignupForm
