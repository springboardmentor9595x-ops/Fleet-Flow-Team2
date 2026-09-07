import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import DayNightToggle from '../components/ui/DayNightToggle'
import AuthHeroBackground from '../components/auth/AuthHeroBackground'
import TruckLoader from '../components/ui/TruckLoader'

function ForgotPassword() {
  const { isDark } = useTheme()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [sentOtp, setSentOtp] = useState('')
  const [otpVerified, setOtpVerified] = useState(false)

  // Reset password states
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Live password diagnostic checks
  const passwordRules = {
    length: newPassword.length >= 8,
    upper: /[A-Z]/.test(newPassword),
    lower: /[a-z]/.test(newPassword),
    digit: /[0-9]/.test(newPassword),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
  }

  const isPasswordValid = passwordRules.length && passwordRules.upper && passwordRules.lower && passwordRules.digit && passwordRules.special

  // 1. Submit email to receive OTP
  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      addToast('❌ INPUT ERROR: Please enter your registered email.', 'error', 'top-right')
      return
    }

    setIsSubmitting(true)
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString()

    try {
      const res = await api.post('/auth/forgot-password', { email: cleanEmail, otp: generatedCode })
      setSentOtp(generatedCode)
      setOtpCode('')
      setOtpSent(true)

      if (res.data?.sent) {
        addToast(`📧 SMTP DISPATCHED: Reset key sent to ${cleanEmail}.`, 'success', 'top-right')
      } else {
        addToast(`⚠️ OFFLINE BYPASS: Reset code is [${generatedCode}]`, 'warning', 'top-right')
      }
    } catch (err) {
      console.error('[ForgotPassword] Error: ', err)
      if (!err.response || err.code === 'ERR_NETWORK') {
        setSentOtp(generatedCode)
        setOtpCode('')
        setOtpSent(true)
        addToast(`⚠️ OFFLINE BYPASS: Reset code is [${generatedCode}]`, 'warning', 'top-right')
      } else {
        const errorMsg = err.response?.data?.detail || 'Operator email verification failed.'
        addToast(`❌ ERROR: ${errorMsg}`, 'error', 'top-right')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // 2. Verify OTP code
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    const enteredOtp = otpCode.trim()

    if (!enteredOtp) {
      addToast('❌ INPUT ERROR: Please enter the 6-digit security code.', 'error', 'top-right')
      return
    }

    if (sentOtp && enteredOtp === sentOtp) {
      setOtpVerified(true)
      addToast('🔒 IDENTIFICATION AUTHORIZED: Create your new password.', 'success', 'top-right')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await api.post('/auth/verify-otp', { email: email.trim().toLowerCase(), otp: enteredOtp })
      if (res.data.valid) {
        setOtpVerified(true)
        addToast('🔒 IDENTIFICATION AUTHORIZED: Create your new password.', 'success', 'top-right')
      } else {
        addToast('❌ VERIFICATION REJECTED: Invalid security key.', 'error', 'top-right')
      }
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Invalid or expired OTP code.'
      addToast(`❌ VERIFICATION REJECTED: ${errorMsg}`, 'error', 'top-right')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 3. Reset password in database
  const handleResetPassword = async (e) => {
    e.preventDefault()

    if (!isPasswordValid) {
      addToast('❌ PASSWORD STRENGTH FAILURE: Please satisfy all rules.', 'error', 'top-right')
      return
    }

    if (newPassword !== confirmPassword) {
      addToast('❌ INTEGRITY CHECK: Passwords do not match.', 'error', 'top-right')
      return
    }

    setIsSubmitting(true)
    const cleanEmail = email.trim().toLowerCase()

    try {
      await api.post('/auth/reset-password', { email: cleanEmail, password: newPassword })
      addToast('✅ PASSWORD UPDATED: Security credentials successfully reset!', 'success', 'top-right')
      navigate('/login')
    } catch (err) {
      console.error('[ForgotPassword] Reset error: ', err)
      const errorMsg = err.response?.data?.detail || 'Password reset failed.'
      addToast(`❌ RESET FAILURE: ${errorMsg}`, 'error', 'top-right')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={`relative min-h-screen w-full ${
      isDark ? 'bg-[#030712] text-white' : 'bg-[#f8fafc] text-slate-900'
    } flex flex-col justify-between overflow-x-hidden font-sans select-none transition-colors duration-300`}>
      
      {/* ========================================================= */}
      {/* 1. CINEMATIC BACKGROUND SCENERY                           */}
      {/* ========================================================= */}
      <AuthHeroBackground isDark={isDark} showRoute={false} />

      {/* ========================================================= */}
      {/* 2. TOP HEADER NAVIGATION                                  */}
      {/* ========================================================= */}
      <header className="auth-header relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-7 flex items-center justify-between gap-4 bg-transparent border-none">
        
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center text-slate-950 font-black text-xl shadow-[0_0_20px_rgba(6,182,212,0.6)] shrink-0">
            F
          </div>
          <div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-wider m-0 leading-none ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              FLEET<span className={isDark ? 'text-cyan-400' : 'text-blue-600'}>FLOW</span>
            </h1>
            <p className={`text-[8.5px] sm:text-[9.5px] tracking-widest uppercase m-0 mt-0.5 font-mono font-bold ${
              isDark ? 'text-cyan-400/90' : 'text-slate-500'
            }`}>
              ENTERPRISE LOGISTICS TELEMETRICS
            </p>
          </div>
        </div>

        {/* Right: Back to Login Button & DayNight Toggle */}
        <div className="flex items-center gap-3">
          <DayNightToggle />

          <Link
            to="/login"
            className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              isDark
                ? 'bg-[#0b162f]/90 border-slate-700 text-slate-300 hover:text-white hover:border-cyan-400'
                : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <span>←</span>
            <span>Back to Login</span>
          </Link>
        </div>

      </header>

      {/* ========================================================= */}
      {/* 3. MAIN HERO GRID: LEFT HEADLINE & RIGHT FORGOT CARD      */}
      {/* ========================================================= */}
      <main className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* --------------------------------------------------------- */}
        {/* LEFT COLUMN: HERO HEADLINE & FLOATING BANNER CARD         */}
        {/* --------------------------------------------------------- */}
        <div className="lg:col-span-6 space-y-6 text-left">
          
          <div className="space-y-1">
            <h2 className="text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight leading-[1.1] m-0">
              <span className={isDark ? 'text-white' : 'text-slate-900'}>Drive</span><br />
              <span className={isDark ? 'text-white' : 'text-slate-900'}>a Safer</span><br />
              <span className={isDark ? 'text-cyan-400 drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]' : 'text-blue-600'}>
                Tomorrow
              </span>
            </h2>
          </div>

          <div className={`text-xs sm:text-sm font-mono font-bold tracking-[0.25em] uppercase ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            TRACK &nbsp;|&nbsp; OPTIMIZE &nbsp;|&nbsp; DELIVER
          </div>

          {/* Bottom Left Accent Card matching Reference Image 2 */}
          <div className="pt-8">
            <div className={`p-4 rounded-2xl border max-w-xs transition-all relative ${
              isDark 
                ? 'bg-[#081228]/85 border-cyan-500/30 text-white shadow-lg' 
                : 'bg-white/95 border-slate-200 text-slate-800 shadow-md'
            }`}>
              <div className={`w-1 h-6 rounded-full absolute left-3 top-4 ${
                isDark ? 'bg-cyan-400' : 'bg-blue-600'
              }`}></div>
              <div className="pl-3.5 space-y-1">
                <div className="text-xs font-bold font-sans leading-snug">
                  {isDark ? 'Smarter Fleets' : 'Moving fleets'}
                </div>
                <div className={`text-xs font-bold font-sans ${isDark ? 'text-cyan-400' : 'text-slate-600'}`}>
                  {isDark ? 'Stronger Tomorrow' : 'for a brighter tomorrow'}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* --------------------------------------------------------- */}
        {/* RIGHT COLUMN: GLASSMORPHIC FORGOT PASSWORD CARD           */}
        {/* --------------------------------------------------------- */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <div className={`p-6 sm:p-8 rounded-[28px] border transition-all duration-300 backdrop-blur-2xl relative ${
            isDark
              ? 'bg-[#081228]/95 border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.25)]'
              : 'bg-white/95 border-slate-200/90 shadow-2xl'
          }`}>
            
            {/* Top Mail Icon Badge */}
            <div className="flex justify-center pb-2">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl border ${
                isDark 
                  ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)]' 
                  : 'bg-blue-50 border-blue-200 text-blue-600 shadow-md'
              }`}>
                ✉️
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="text-center space-y-1 pb-4">
              <h3 className={`text-xl sm:text-2xl font-black tracking-tight m-0 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                {otpVerified ? 'Reset Password' : (otpSent ? 'Verify Security Key' : 'Forgot Password?')}
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} m-0 leading-relaxed px-2`}>
                {otpVerified 
                  ? 'Enter and confirm your new account security password.'
                  : (otpSent 
                    ? `Enter the 6-digit security key sent to ${email}`
                    : 'Enter your email address below to receive an OTP code to reset your password.')
                }
              </p>
            </div>

            {/* Submitting Loader */}
            {isSubmitting ? (
              <div className="min-h-[220px] flex flex-col justify-center items-center font-mono select-none">
                <TruckLoader />
                <span className={`text-[11px] tracking-widest font-black uppercase mt-4 animate-pulse ${
                  isDark ? 'text-cyan-400' : 'text-blue-600'
                }`}>
                  PROCESSING REQUEST...
                </span>
              </div>
            ) : (
              <>
                {/* STEP 1: Enter Email */}
                {!otpSent && !otpVerified && (
                  <form onSubmit={handleEmailSubmit} className="space-y-4 pt-1">
                    <div className="relative">
                      <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-base ${
                        isDark ? 'text-cyan-400' : 'text-slate-400'
                      }`}>
                        ✉️
                      </div>
                      <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value.toLowerCase())}
                        required
                        className={`w-full pl-10 pr-4 py-3 rounded-2xl text-xs sm:text-sm outline-none border transition-all ${
                          isDark
                            ? 'bg-[#060e22]/90 border-slate-700/80 text-white placeholder-slate-500 focus:border-cyan-400'
                            : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 shadow-sm'
                        }`}
                      />
                    </div>

                    <button
                      type="submit"
                      className={`w-full py-3.5 px-5 rounded-2xl font-black text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-lg active:scale-[0.99] ${
                        isDark
                          ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-500 text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.6)] hover:brightness-110'
                          : 'bg-gradient-to-r from-[#00b4d8] to-[#0077b6] text-white shadow-blue-500/25'
                      }`}
                    >
                      <span>Send OTP</span>
                      <span className="text-base font-black">→</span>
                    </button>

                    <div className="text-center pt-1">
                      <Link
                        to="/login"
                        className={`text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                          isDark ? 'text-slate-300 hover:text-cyan-300' : 'text-slate-600 hover:text-blue-700'
                        }`}
                      >
                        <span>←</span>
                        <span>Back to Login</span>
                      </Link>
                    </div>

                    <div className={`text-center pt-3 text-[10px] font-mono flex items-center justify-center gap-1.5 ${
                      isDark ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                      <span>🛡️</span>
                      <span>Your data is secure with us</span>
                    </div>
                  </form>
                )}

                {/* STEP 2: Enter OTP */}
                {otpSent && !otpVerified && (
                  <form onSubmit={handleVerifyOtp} className="space-y-4 pt-1">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="0 0 0 0 0 0"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        required
                        className={`w-full px-4 py-3.5 rounded-2xl text-center tracking-[0.5em] text-xl font-mono font-black outline-none border transition-all ${
                          isDark
                            ? 'bg-[#060e22] border-cyan-500/40 text-cyan-300 focus:border-cyan-400'
                            : 'bg-white border-blue-300 text-blue-900 focus:border-blue-500 shadow-sm'
                        }`}
                      />
                    </div>

                    <button
                      type="submit"
                      className={`w-full py-3.5 px-5 rounded-2xl font-black text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-lg active:scale-[0.99] ${
                        isDark
                          ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-500 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.5)]'
                          : 'bg-gradient-to-r from-[#00b4d8] to-[#0077b6] text-white'
                      }`}
                    >
                      <span>Verify OTP</span>
                      <span className="text-base font-black">→</span>
                    </button>

                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className={`text-xs font-mono font-bold cursor-pointer transition-colors ${
                          isDark ? 'text-cyan-400 hover:underline' : 'text-blue-600 hover:underline'
                        }`}
                      >
                        ← Change email address
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 3: Reset Password */}
                {otpVerified && (
                  <form onSubmit={handleResetPassword} className="space-y-3.5 pt-1">
                    <div className="relative">
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        placeholder="New password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className={`w-full pl-4 pr-10 py-2.5 rounded-2xl text-xs sm:text-sm outline-none border transition-all ${
                          isDark
                            ? 'bg-[#060e22] border-slate-700 text-white placeholder-slate-500 focus:border-cyan-400'
                            : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 shadow-sm'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer text-xs"
                      >
                        {showPasswords ? '🙈' : '👁️'}
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type={showPasswords ? 'text' : 'password'}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className={`w-full pl-4 pr-10 py-2.5 rounded-2xl text-xs sm:text-sm outline-none border transition-all ${
                          isDark
                            ? 'bg-[#060e22] border-slate-700 text-white placeholder-slate-500 focus:border-cyan-400'
                            : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500 shadow-sm'
                        }`}
                      />
                    </div>

                    {/* Password Policy Diagnostics */}
                    <div className={`p-2.5 rounded-2xl border text-[9.5px] font-mono select-none ${
                      isDark ? 'bg-[#060c1a]/90 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                        <div className={passwordRules.length ? 'text-emerald-400' : 'text-rose-400'}>
                          {passwordRules.length ? '🗹' : 'ⓧ'} Min 8 chars
                        </div>
                        <div className={passwordRules.upper ? 'text-emerald-400' : 'text-rose-400'}>
                          {passwordRules.upper ? '🗹' : 'ⓧ'} Uppercase (A-Z)
                        </div>
                        <div className={passwordRules.lower ? 'text-emerald-400' : 'text-rose-400'}>
                          {passwordRules.lower ? '🗹' : 'ⓧ'} Lowercase (a-z)
                        </div>
                        <div className={passwordRules.digit ? 'text-emerald-400' : 'text-rose-400'}>
                          {passwordRules.digit ? '🗹' : 'ⓧ'} Digit (0-9)
                        </div>
                        <div className={`col-span-2 ${passwordRules.special ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {passwordRules.special ? '🗹' : 'ⓧ'} Special char (!@#...)
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className={`w-full py-3 px-4 font-black text-xs sm:text-sm tracking-wider uppercase rounded-2xl transition-all cursor-pointer shadow-lg active:scale-[0.99] ${
                        isDark
                          ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      Update Password & Sign in
                    </button>
                  </form>
                )}
              </>
            )}

          </div>
        </div>

      </main>

      {/* ========================================================= */}
      {/* 4. FOOTER TELEMETRY BAR                                   */}
      {/* ========================================================= */}
      <footer className={`relative z-20 w-full border-t py-3.5 px-4 sm:px-8 text-[10px] sm:text-[11px] font-mono transition-colors ${
        isDark 
          ? 'border-slate-800/80 bg-[#020510]/80 text-slate-400' 
          : 'border-slate-200 bg-white/80 text-slate-600'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-cyan-500">FLEETFLOW</span>
            <span>|</span>
            <span>ENTERPRISE LOGISTICS TELEMETRICS</span>
          </div>

          <div className="flex items-center gap-2 tracking-wider">
            <span>PEOPLE</span>
            <span>|</span>
            <span>TECHNOLOGY</span>
            <span>|</span>
            <span>SAFER ROADS</span>
          </div>
        </div>
      </footer>

    </div>
  )
}

export default ForgotPassword
