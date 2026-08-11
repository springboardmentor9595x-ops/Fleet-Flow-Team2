import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import TruckLoader from '../ui/TruckLoader'

const ROLE_MAP = {
  'MANAGER': 'FleetManager',
  'DISPATCHER': 'Dispatcher',
  'DRIVER': 'Driver',
  'ADMIN': 'Admin'
}

function SignupForm({ roleName = 'DRIVER', otpSent, setOtpSent, isSubmitting, setIsSubmitting }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // OTP Verification states
  const [otpCode, setOtpCode] = useState('')
  const [sentOtp, setSentOtp] = useState('')

  const { login } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  // OTP Verification view panel timer hooks
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

  // Password rules validation
  const validatePassword = (pwd) => {
    const minLength = pwd.length >= 8
    const hasUpper = /[A-Z]/.test(pwd)
    const hasLower = /[a-z]/.test(pwd)
    const hasDigit = /[0-9]/.test(pwd)
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    return minLength && hasUpper && hasLower && hasDigit && hasSpecial
  }

  const checks = {
    length: form.password.length >= 8,
    upper: /[A-Z]/.test(form.password),
    lower: /[a-z]/.test(form.password),
    digit: /[0-9]/.test(form.password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(form.password)
  }

  // Details form submit -> trigger verification OTP
  const handleDetailsSubmit = (event) => {
    if (event) event.preventDefault()

    if (!validatePassword(form.password)) {
      addToast('❌ PASSWORD STRENGTH FAILURE: Key rules not satisfied.', 'error', 'top-right')
      return
    }

    if (form.password !== confirmPassword) {
      addToast('❌ INTEGRITY CHECK FAILURE: Passwords do not match.', 'error', 'top-right')
      return
    }

    // Generate random 6-digit OTP
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Dispatch real email via SMTP
    api.post('/auth/send-otp', { email: form.email, otp: generatedCode })
      .then((res) => {
        setSentOtp(generatedCode)
        setOtpSent(true)
        setOtpCode('')
        if (res.data.sent) {
          addToast(`📧 SMTP DISPATCHED: Verification key sent to your inbox.`, 'success', 'top-right')
        } else {
          addToast(`⚠️ OFFLINE BYPASS: Verification key is [${generatedCode}] (Set SMTP credentials in .env for real email).`, 'warning', 'top-right')
        }
      })
      .catch((err) => {
        console.error('[FleetFlow Mailer] OTP request failed: ', err)
        // If it is a network error (server is offline), we fallback to offline bypass
        if (!err.response || err.code === 'ERR_NETWORK') {
          setSentOtp(generatedCode)
          setOtpSent(true)
          setOtpCode('')
          addToast(`⚠️ OFFLINE BYPASS: Verification key is [${generatedCode}] (Set SMTP credentials in .env for real email).`, 'warning', 'top-right')
        } else {
          // If the server is online but returned an error (e.g. Email already registered)
          const errorMsg = err.response?.data?.detail || 'Could not send verification key.'
          addToast(`❌ ERROR: ${errorMsg}`, 'error', 'top-right')
        }
      })
  }

  // OTP verify -> execute actual database write
  const handleVerifyOtp = async (event) => {
    event.preventDefault()

    if (otpCode !== sentOtp) {
      addToast('❌ VERIFICATION REJECTED: Invalid security key entered.', 'error', 'top-right')
      return
    }

    setIsSubmitting(true)
    const payload = {
      full_name: form.name,
      email: form.email,
      password: form.password,
      phone: form.phone || null,
      role: ROLE_MAP[roleName] || 'Driver'
    }

    try {
      // 1. Sign up the user
      await api.post('/auth/signup', payload)

      // 2. Redirect to login page for manual login verification
      addToast('✅ ACCOUNT CREATED: Your profile has been registered. Please log in with your email and password.', 'success', 'top-right')
      navigate('/login')
    } catch (error) {
      console.error('Registration failed:', error)
      if (!error.response || error.code === 'ERR_NETWORK') {
        console.warn('Backend server offline. Proceeding with client-side signup bypass.')
        login({ 
          email: form.email, 
          full_name: form.name.toUpperCase(),
          role: ROLE_MAP[roleName] || 'Driver'
        }, 'mock-jwt-token', 'mock-refresh-token')
        navigate('/dashboard')
        addToast('✅ REGISTERED SUCCESSFULLY: Mock operator profile initialized. Logged in directly!', 'success', 'top-right')
      } else {
        let errorMsg = 'Could not register account.'
        const detail = error.response?.data?.detail
        if (detail) {
          if (typeof detail === 'string') {
            errorMsg = detail
          } else if (Array.isArray(detail)) {
            errorMsg = detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join(', ')
          }
        }
        addToast(`❌ SIGNUP ERROR: ${errorMsg}`, 'error', 'top-right')
        setOtpSent(false)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // If submitting, swap inputs with centered loader
  if (isSubmitting) {
    return (
      <div className="min-h-[440px] flex flex-col justify-center items-center font-mono select-none">
        <TruckLoader />
        <span className="text-[10px] tracking-widest font-semibold animate-pulse uppercase mt-4 text-center text-indigo-600">
          PROVISIONING OPERATOR KEY...
        </span>
      </div>
    )
  }



  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  if (otpSent) {
    return (
      <form onSubmit={handleVerifyOtp} className="space-y-6 text-sm font-sans select-none min-h-[440px] flex flex-col justify-between">
        <div className="space-y-4">
          <div className="text-center pt-2">
            <span className="text-[#00f0ff] text-xs font-bold tracking-widest uppercase block mb-1">
              [ ENTER VERIFICATION CODE ]
            </span>
            <p className="text-white/50 text-[11px] leading-relaxed m-0">
              We have dispatched a 6-digit verification key to your email address:
            </p>
            <span className="text-white text-xs font-bold block mt-1">{form.email}</span>
          </div>

          <div className="relative pt-2">
            <input
              type="text"
              placeholder="0 0 0 0 0 0"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              required
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:border-[#00f0ff] focus:ring-2 focus:ring-[#00f0ff]/20 transition-all duration-200 text-center tracking-[0.5em] text-lg font-bold"
            />
          </div>

          <div className="text-center space-y-1 pt-2">
            <p className="text-[11px] text-white/50 m-0">
              {timer > 0 ? (
                <span>The code will expire in <span className="text-[#00f0ff] font-bold">{formatTime(timer)}</span></span>
              ) : (
                <span className="text-rose-400 font-semibold">The verification code has expired.</span>
              )}
            </p>
            <p className="text-[11px] text-white/50 m-0">
              {timer > 0 ? (
                <span>Resend code in {formatTime(timer)}</span>
              ) : (
                <button
                  type="button"
                  onClick={handleDetailsSubmit}
                  className="text-[#00f0ff] hover:text-[#00d2e0] hover:underline bg-transparent border-none cursor-pointer text-[11px]"
                >
                  Didn't receive the code? Resend code
                </button>
              )}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <button
            type="submit"
            className="w-full py-3 px-4 font-bold bg-[#00f0ff] hover:bg-[#00d2e0] text-[#06070d] rounded-xl active:scale-[0.99] transition-all duration-200 cursor-pointer text-sm shadow-[0_0_15px_rgba(0,240,255,0.35)]"
          >
            Verify & Proceed
          </button>
          <button
            type="button"
            onClick={() => setOtpSent(false)}
            className="w-full py-2.5 px-4 font-semibold bg-slate-900/60 border border-white/10 text-white hover:bg-slate-800 rounded-xl transition-all duration-200 cursor-pointer text-xs"
          >
            Back to Details
          </button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleDetailsSubmit} className="space-y-4 text-sm min-h-[440px] flex flex-col justify-between">
      <div className="space-y-3.5">
        
        {/* Full Name Input */}
        <div className="relative">
          <input
            name="name"
            type="text"
            placeholder="Full name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-[#00f0ff] focus:ring-2 focus:ring-[#00f0ff]/20 transition-all duration-200 text-sm"
          />
        </div>

        {/* Email Input */}
        <div className="relative">
          <input
            name="email"
            type="email"
            placeholder="Email address"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-[#00f0ff] focus:ring-2 focus:ring-[#00f0ff]/20 transition-all duration-200 text-sm"
          />
        </div>

        {/* Mobile Number Input */}
        <div className="relative">
          <input
            name="phone"
            type="tel"
            placeholder="Mobile number (e.g. +91 98765 43210)"
            value={form.phone}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-[#00f0ff] focus:ring-2 focus:ring-[#00f0ff]/20 transition-all duration-200 text-sm"
          />
        </div>

        {/* Password Input */}
        <div className="relative">
          <input
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-[#00f0ff] focus:ring-2 focus:ring-[#00f0ff]/20 transition-all duration-200 pr-12 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>

        {/* Confirm Password Input */}
        <div className="relative">
          <input
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-[#00f0ff] focus:ring-2 focus:ring-[#00f0ff]/20 transition-all duration-200 pr-12 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            {showConfirmPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>

        {/* Password Requirements Diagnostic */}
        <div className="text-left text-white/70 text-[10px] space-y-1 bg-white/5 border border-white/10 rounded-xl p-3 select-none">
          <div className="font-semibold text-white/80 uppercase tracking-wider text-[8px] mb-1">
            [ Password Diagnostics ]
          </div>
          <ul className="space-y-0.5 pl-0 m-0 list-none font-mono">
            <li className={`flex items-center space-x-1.5 ${checks.length ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span>{checks.length ? '✓' : '✗'}</span>
              <span>Min 8 characters</span>
            </li>
            <li className={`flex items-center space-x-1.5 ${checks.upper ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span>{checks.upper ? '✓' : '✗'}</span>
              <span>One uppercase letter (A-Z)</span>
            </li>
            <li className={`flex items-center space-x-1.5 ${checks.lower ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span>{checks.lower ? '✓' : '✗'}</span>
              <span>One lowercase letter (a-z)</span>
            </li>
            <li className={`flex items-center space-x-1.5 ${checks.digit ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span>{checks.digit ? '✓' : '✗'}</span>
              <span>One digit (0-9)</span>
            </li>
            <li className={`flex items-center space-x-1.5 ${checks.special ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span>{checks.special ? '✓' : '✗'}</span>
              <span>One special character (!@#...)</span>
            </li>
          </ul>
        </div>

        {/* Compliance check */}
        <div className="flex items-center space-x-2 text-xs text-white/50 px-1">
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="rounded border-white/15 bg-white/5 text-[#00f0ff] focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
              required
            />
            <span>I agree to compliance policy regulations</span>
          </label>
        </div>
      </div>

      <div className="space-y-4">
        {/* Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-3 px-4 font-bold bg-[#00f0ff] hover:bg-[#00d2e0] text-[#06070d] rounded-xl active:scale-[0.99] transition-all duration-200 cursor-pointer text-sm shadow-[0_0_15px_rgba(0,240,255,0.35)]"
          >
            Create account
          </button>
        </div>

        {/* Navigation */}
        <div className="text-center text-xs text-white/50">
          <span>Already have an account? </span>
          <Link 
            to="/login" 
            className="font-semibold text-[#00f0ff] hover:text-[#00d2e0] hover:underline transition-all ml-1"
          >
            Login
          </Link>
        </div>
      </div>

    </form>
  )
}

export default SignupForm
