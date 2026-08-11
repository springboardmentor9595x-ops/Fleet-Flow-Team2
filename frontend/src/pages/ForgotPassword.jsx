import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import ParticleBackground from '../components/ui/ParticleBackground'
import MountainBackground from '../components/ui/MountainBackground'
import TruckLoader from '../components/ui/TruckLoader'

const THEME_COLOR = '#ff007f' // Pink theme indicating security/override gateway operations

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [sentOtp, setSentOtp] = useState('')
  const [otpVerified, setOtpVerified] = useState(false)

  // Reset password states
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)

  // System states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [focusedField, setFocusedField] = useState(null)

  const { addToast } = useToast()
  const navigate = useNavigate()

  // Live password diagnostic checks
  const passwordRules = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    digit: /[0-9]/.test(newPassword),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
  }

  const validatePassword = (pwd) => {
    return passwordRules.length && passwordRules.upper && passwordRules.lower && passwordRules.digit && passwordRules.special
  }

  // 1. Submit email to receive OTP
  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    if (!email) {
      addToast('❌ INPUT ERROR: Please enter your registered email.', 'error', 'top-right')
      return
    }

    setIsSubmitting(true)
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString()

    try {
      const res = await api.post('/auth/forgot-password', { email, otp: generatedCode })
      
      setSentOtp(generatedCode)
      setOtpCode('')
      setOtpSent(true)

      console.log(`[FleetFlow Terminal] Password reset OTP generated: ${generatedCode}`)

      if (res.data.sent) {
        addToast(`📧 SMTP DISPATCHED: Reset code sent to ${email}.`, 'success', 'top-right')
      } else {
        addToast(`⚠️ OFFLINE BYPASS: Reset code is [${generatedCode}] (Configure SMTP in .env for real email).`, 'warning', 'top-right')
      }
    } catch (err) {
      console.error('[ForgotPassword] Error: ', err)
      
      // Offline network fallback support
      if (!err.response || err.code === 'ERR_NETWORK') {
        setSentOtp(generatedCode)
        setOtpCode('')
        setOtpSent(true)
        addToast(`⚠️ OFFLINE BYPASS: Reset code is [${generatedCode}] (Configure SMTP in .env for real email).`, 'warning', 'top-right')
      } else {
        const errorMsg = err.response?.data?.detail || 'Operator email verification failed.'
        addToast(`❌ ERROR: ${errorMsg}`, 'error', 'top-right')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // 2. Verify OTP code
  const handleVerifyOtp = (e) => {
    e.preventDefault()
    if (otpCode !== sentOtp) {
      addToast('❌ VERIFICATION REJECTED: Invalid security key.', 'error', 'top-right')
      return
    }
    setOtpVerified(true)
    addToast('🔒 IDENTIFICATION AUTHORIZED: Define new security key credentials.', 'success', 'top-right')
  }

  // 3. Reset password in database
  const handleResetPassword = async (e) => {
    e.preventDefault()

    if (!validatePassword(newPassword)) {
      addToast('❌ PASSWORD STRENGTH FAILURE: Key rules not satisfied.', 'error', 'top-right')
      return
    }

    if (newPassword !== confirmPassword) {
      addToast('❌ INTEGRITY CHECK FAILURE: Passwords do not match.', 'error', 'top-right')
      return
    }

    setIsSubmitting(true)

    try {
      await api.post('/auth/reset-password', { email, password: newPassword })
      
      addToast('✅ PASSWORD UPDATED: Security credentials successfully updated.', 'success', 'top-right')
      navigate('/login')
    } catch (err) {
      console.error('[ForgotPassword] Reset error: ', err)
      const errorMsg = err.response?.data?.detail || 'Password reset query failed.'
      addToast(`❌ RESET FAILURE: ${errorMsg}`, 'error', 'top-right')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-[#0c0f24] via-[#050614] to-[#010207] flex items-center justify-center p-4 overflow-hidden select-none">
      
      {/* Slow-floating Gradient Background Blobs */}
      <div className="cyber-blob-1 top-[-100px] left-[-50px]"></div>
      <div className="cyber-blob-2 bottom-[-150px] right-[-50px]"></div>

      {/* Drifting Stars Background Canvas */}
      <ParticleBackground />
      
      {/* Procedural Mountain Silhouette Overlay */}
      <MountainBackground />

      {/* Responsive Global Brand Header */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center sm:left-8 sm:translate-x-0 sm:text-left sm:top-8 z-20 w-full sm:w-auto px-4 sm:px-0">
        <h1 className="text-2xl font-extrabold tracking-wider text-white m-0 leading-none">
          FLEET<span style={{ color: '#00f0ff' }}>FLOW</span>
        </h1>
        <p className="text-[8px] sm:text-[9px] tracking-widest text-white/50 uppercase m-0 mt-1.5 font-semibold">
          Connecting Fleets. Flowing Logistics.
        </p>
      </div>

      {/* Center Glassmorphism Reset Card */}
      <div className="relative w-full max-w-[400px] z-10 mt-12 sm:mt-0">
        
        <div 
          className="w-full p-8 sm:p-10 glass-card tech-border-accent"
        >
          {/* Card State Header */}
          <div className="text-center mb-6 border-b border-white/5 pb-5">
            <div 
              className="inline-block px-3 py-1 bg-white/5 border border-white/10 text-[9px] tracking-widest rounded-full uppercase font-mono font-semibold"
              style={{ color: THEME_COLOR, borderColor: `${THEME_COLOR}30` }}
            >
              {otpVerified 
                ? '// RESET PASSWORD' 
                : otpSent 
                  ? '// VERIFY OTP' 
                  : '// FORGOT PASSWORD'
              }
            </div>
          </div>

          <>
            {/* STEP 1: Enter email */}
            {!otpSent && !otpVerified && (
              <form onSubmit={handleEmailSubmit} className="space-y-5 text-sm font-mono select-none">
                <div className="text-center text-white/60 text-xs px-2 mb-2 leading-relaxed">
                  Enter your email address below to receive an OTP code to reset your password.
                </div>

                <div className="relative">
                  <input
                    type="email"
                    required
                    disabled={isSubmitting}
                    placeholder="EMAIL ADDRESS"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className="w-full py-3.5 pl-5 pr-5 bg-white/5 border border-white/10 rounded-full text-white placeholder-white/40 focus:outline-none focus:border-white/30 text-xs font-semibold tracking-wider uppercase transition-all duration-300 disabled:opacity-50"
                    style={{
                      boxShadow: focusedField === 'email' ? '0 0 10px rgba(255,255,255,0.1)' : 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 font-bold tracking-wide text-white rounded-full bg-transparent border border-white/25 hover:border-white/60 hover:bg-white/5 active:scale-[0.99] transition-all duration-200 cursor-pointer text-xs uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Sending OTP...' : 'Send OTP'}
                </button>

                <div className="text-center pt-2 text-xs text-white/50">
                  <Link to="/login" className="hover:underline text-white font-semibold">
                    Back to Login Portal
                  </Link>
                </div>
              </form>
            )}

            {/* STEP 2: Enter OTP */}
            {otpSent && !otpVerified && (
              <form onSubmit={handleVerifyOtp} className="space-y-5 text-sm font-mono select-none">
                <div className="text-center text-white/60 text-xs px-2 mb-2 leading-relaxed">
                  Enter the 6-digit OTP code sent to <span className="text-white font-semibold">{email}</span>.
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    disabled={isSubmitting}
                    placeholder="ENTER 6-DIGIT OTP"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    onFocus={() => setFocusedField('otp')}
                    onBlur={() => setFocusedField(null)}
                    className="w-full py-3.5 pl-5 pr-5 bg-white/5 border border-white/10 rounded-full text-white placeholder-white/40 focus:outline-none focus:border-white/30 text-center text-sm font-bold tracking-[6px] transition-all duration-300 disabled:opacity-50"
                    style={{
                      boxShadow: focusedField === 'otp' ? '0 0 10px rgba(255,255,255,0.1)' : 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 font-bold tracking-wide text-[#110729] rounded-full bg-white hover:bg-white/90 active:scale-[0.99] transition-all duration-200 cursor-pointer text-xs uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Verify OTP
                </button>

                <div className="text-center pt-2 text-xs text-white/50 space-y-2 flex flex-col">
                  <button 
                    type="button" 
                    disabled={isSubmitting}
                    onClick={() => setOtpSent(false)} 
                    className="hover:underline text-white font-semibold cursor-pointer bg-transparent border-none outline-none text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Change email address
                  </button>
                  <Link to="/login" className="hover:underline text-white/70">
                    Cancel reset
                  </Link>
                </div>
              </form>
            )}

            {/* STEP 3: Reset password details */}
            {otpVerified && (
              <form onSubmit={handleResetPassword} className="space-y-5 text-sm font-mono select-none">
                
                {/* New Password input */}
                <div className="relative">
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    disabled={isSubmitting}
                    placeholder="NEW PASSWORD"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className="w-full py-3.5 pl-5 pr-12 bg-white/5 border border-white/10 rounded-full text-white placeholder-white/40 focus:outline-none focus:border-white/30 text-xs font-semibold tracking-wider transition-all duration-300 disabled:opacity-50"
                    style={{
                      boxShadow: focusedField === 'password' ? '0 0 10px rgba(255,255,255,0.1)' : 'none',
                    }}
                  />
                </div>

                {/* Confirm Password input */}
                <div className="relative">
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    required
                    disabled={isSubmitting}
                    placeholder="CONFIRM NEW PASSWORD"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setFocusedField('confirmPassword')}
                    onBlur={() => setFocusedField(null)}
                    className="w-full py-3.5 pl-5 pr-12 bg-white/5 border border-white/10 rounded-full text-white placeholder-white/40 focus:outline-none focus:border-white/30 text-xs font-semibold tracking-wider transition-all duration-300 disabled:opacity-50"
                    style={{
                      boxShadow: focusedField === 'confirmPassword' ? '0 0 10px rgba(255,255,255,0.1)' : 'none',
                    }}
                  />
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-4.5 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {showPasswords ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Password Rules Diagnostic Indicator */}
                <div className="mt-3 p-3 bg-white/5 border border-white/10 rounded-xl font-mono text-[9.5px] leading-relaxed text-white/70 select-none">
                  <p className="font-semibold text-white/80 uppercase tracking-wider mb-1">[ Password Strength Checks ]</p>
                  <ul className="space-y-0.5 m-0 p-0 list-none font-semibold">
                    <li className={passwordRules.length ? 'text-emerald-400' : 'text-red-400'}>
                      {passwordRules.length ? '✓' : '✗'} Minimum 8 characters
                    </li>
                    <li className={passwordRules.upper ? 'text-emerald-400' : 'text-red-400'}>
                      {passwordRules.upper ? '✓' : '✗'} At least 1 uppercase letter
                    </li>
                    <li className={passwordRules.lower ? 'text-emerald-400' : 'text-red-400'}>
                      {passwordRules.lower ? '✓' : '✗'} At least 1 lowercase letter
                    </li>
                    <li className={passwordRules.digit ? 'text-emerald-400' : 'text-red-400'}>
                      {passwordRules.digit ? '✓' : '✗'} At least 1 numerical digit
                    </li>
                    <li className={passwordRules.special ? 'text-emerald-400' : 'text-red-400'}>
                      {passwordRules.special ? '✓' : '✗'} At least 1 special character
                    </li>
                  </ul>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 font-bold tracking-wide text-[#110729] rounded-full bg-white hover:bg-white/90 active:scale-[0.99] transition-all duration-200 cursor-pointer text-xs uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
                </button>

                <div className="text-center pt-2 text-xs text-white/70">
                  <Link to="/login" className="hover:underline text-white font-semibold">
                    Cancel and Go Back
                  </Link>
                </div>
              </form>
            )}
          </>

        </div>

        {/* Minimalist System Status Footer */}
        <div className="mt-6 flex justify-between text-white/40 font-mono text-[9px] px-4">
          <span>PORT: SECURE 443</span>
          <span className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 bg-[#ff007f] rounded-full animate-pulse"></span>
            <span>SYSTEM_ONLINE</span>
          </span>
        </div>

      </div>
    </div>
  )
}

export default ForgotPassword
