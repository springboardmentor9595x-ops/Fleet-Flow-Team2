import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import TruckLoader from '../ui/TruckLoader'

function LoginForm() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [focusedField, setFocusedField] = useState(null)
  
  const { login } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
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
      addToast('🔑 ACCESS KEY COMPILED: Secure Link initialized!', 'success', 'top-right')
    } catch (error) {
      console.error('Authentication node error:', error)
      
      // Connection Error / Offline Mode Fallback Bypass
      if (!error.response || error.code === 'ERR_NETWORK') {
        console.warn('Backend server offline. Proceeding with client-side bypass mode.')
        login({ 
          email: form.email, 
          full_name: form.email.split('@')[0].toUpperCase(),
          role: 'OPERATOR' 
        }, 'mock-jwt-token', 'mock-refresh-token')
        navigate('/dashboard')
        addToast('⚠️ OFFLINE BYPASS: Initialized operator mock session.', 'warning', 'top-right')
      } else {
        // Enforce actual credentials validation error if backend is responsive
        const errorMsg = error.response?.data?.detail || 'Secure link validation failure.'
        addToast(`❌ ACCESS REJECTED: ${errorMsg.toUpperCase()}`, 'error', 'top-right')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // If submitting, swap inputs with centered loader, keeping container dimensions fixed
  if (isSubmitting) {
    return (
      <div className="min-h-[295px] flex flex-col justify-center items-center font-mono select-none">
        <TruckLoader />
        <span className="text-[10px] tracking-widest text-[#00f0ff] font-semibold animate-pulse uppercase mt-4">
          VERIFYING ACCESS...
        </span>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-sm">
      
      {/* Username / Email Input */}
      <div className="relative">
        <input
          name="email"
          type="email"
          placeholder="Email address"
          value={form.email}
          onChange={handleChange}
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField(null)}
          required
          disabled={isSubmitting}
          className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-[#00f0ff] focus:ring-2 focus:ring-[#00f0ff]/20 transition-all duration-200 pr-12 text-sm"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 11-8 0 4 4 0 018 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
          </svg>
        </div>
      </div>

      {/* Password Input */}
      <div className="relative">
        <input
          name="password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          onFocus={() => setFocusedField('password')}
          onBlur={() => setFocusedField(null)}
          required
          disabled={isSubmitting}
          className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/40 focus:outline-none focus:border-[#00f0ff] focus:ring-2 focus:ring-[#00f0ff]/20 transition-all duration-200 pr-12 text-sm"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          disabled={isSubmitting}
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

      {/* Forgot Password */}
      <div className="flex justify-end text-xs px-1">
        <Link to="/forgot-password" className="text-[#00f0ff] hover:text-[#00d2e0] hover:underline transition-all font-semibold">
          Forgot password?
        </Link>
      </div>

      {/* Action Button */}
      <div className="pt-2">
        <button
          type="submit"
          className="w-full py-3 px-4 font-bold bg-[#00f0ff] hover:bg-[#00d2e0] text-[#06070d] rounded-xl active:scale-[0.99] transition-all duration-200 cursor-pointer text-sm shadow-[0_0_15px_rgba(0,240,255,0.35)]"
        >
          Sign in →
        </button>
      </div>

      {/* Navigation */}
      <div className="text-center pt-2 text-xs text-white/50">
        <span>Don't have an account? </span>
        <Link 
          to="/signup" 
          className="font-semibold text-[#00f0ff] hover:text-[#00d2e0] hover:underline transition-all ml-1"
        >
          Create one free
        </Link>
      </div>

    </form>
  )
}

export default LoginForm
