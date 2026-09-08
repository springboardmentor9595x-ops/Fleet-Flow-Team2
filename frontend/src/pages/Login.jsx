import React from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import DayNightToggle from '../components/ui/DayNightToggle'
import AuthHeroBackground from '../components/auth/AuthHeroBackground'
import LoginForm from '../components/auth/LoginForm'

function Login() {
  const { isDark } = useTheme()

  return (
    <div className={`relative min-h-screen w-full ${
      isDark ? 'bg-[#030712] text-white' : 'bg-[#eef5fa] text-slate-900'
    } flex flex-col justify-between overflow-x-hidden font-sans select-none transition-colors duration-300`}>
      
      {/* ========================================================= */}
      {/* 1. CINEMATIC PHOTOREALISTIC BACKGROUND                    */}
      {/* ========================================================= */}
      <AuthHeroBackground isDark={isDark} />

      {/* ========================================================= */}
      {/* 2. TOP HEADER NAVIGATION BAR                              */}
      {/* ========================================================= */}
      <header className="auth-header relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 flex items-center justify-between gap-4 bg-transparent border-none">
        
        {/* Left: Brand Logo & Tagline */}
        <Link to="/" className="flex items-center gap-3 text-decoration-none group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center text-slate-950 font-black text-xl shadow-[0_0_20px_rgba(6,182,212,0.6)] shrink-0 group-hover:scale-105 transition-transform">
            F
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className={`text-xl sm:text-2xl font-black tracking-wider m-0 leading-none ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                FLEET<span className={isDark ? 'text-cyan-400' : 'text-blue-600'}>FLOW</span>
              </h1>
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                isDark ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}>
                PORTAL
              </span>
            </div>
            <p className={`text-[8.5px] sm:text-[9.5px] tracking-widest uppercase m-0 mt-0.5 font-mono font-bold ${
              isDark ? 'text-cyan-400/90' : 'text-slate-600'
            }`}>
              SMART FLEET MANAGEMENT
            </p>
          </div>
        </Link>

        {/* Right: Theme Toggle & Clean Home Link (No Arrow) */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className={`hidden sm:flex items-center px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all border ${
              isDark 
                ? 'bg-slate-900/70 border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500/50 backdrop-blur-md' 
                : 'bg-white/85 border-slate-200 text-slate-700 hover:text-slate-950 shadow-xs backdrop-blur-md'
            }`}
          >
            Home
          </Link>
          <DayNightToggle />
        </div>

      </header>

      {/* ========================================================= */}
      {/* 3. MAIN HERO GRID: PROMINENT TITLE & LOGIN BOX            */}
      {/* ========================================================= */}
      <main className="relative z-20 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* --------------------------------------------------------- */}
        {/* LEFT COLUMN: HERO BOLD HEADLINE (Transparent Background)  */}
        {/* --------------------------------------------------------- */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-6 sm:space-y-8 text-left">
          
          {/* Prominent Large Headline directly over transparent background */}
          <div className="space-y-2.5">
            <h2 className="text-5xl sm:text-6xl lg:text-6xl xl:text-7xl 2xl:text-[76px] font-black tracking-tight leading-[1.05] m-0">
              <span className={`drop-shadow-xs ${isDark ? 'text-white' : 'text-slate-950'}`}>Smarter </span>
              <span className={
                isDark 
                  ? 'text-cyan-400 drop-shadow-[0_0_30px_rgba(6,182,212,0.8)]' 
                  : 'text-blue-700 font-black drop-shadow-sm'
              }>
                Fleets
              </span>
              <br />
              <span className={`drop-shadow-xs ${isDark ? 'text-white' : 'text-slate-950'}`}>Brighter </span>
              <span className={
                isDark
                  ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400 font-black drop-shadow-[0_0_30px_rgba(6,182,212,0.5)]'
                  : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-700 font-black drop-shadow-sm'
              }>
                Tomorrow
              </span>
            </h2>

            {/* Cyan/Blue Brush Underline Stroke */}
            <div className={`w-40 sm:w-56 h-2 rounded-full mt-3 ${
              isDark
                ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-transparent shadow-[0_0_12px_#00f0ff]'
                : 'bg-gradient-to-r from-blue-700 via-cyan-500 to-transparent'
            }`}></div>
          </div>

          {/* Subtitle Slogan */}
          <div className={`text-xs sm:text-sm lg:text-base font-mono font-black tracking-[0.25em] uppercase ${
            isDark 
              ? 'text-slate-300 drop-shadow-sm' 
              : 'text-slate-900 font-black drop-shadow-xs'
          }`}>
            DRIVE &nbsp;•&nbsp; CONNECT &nbsp;•&nbsp; DELIVER
          </div>

          {/* 4 Feature Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2 max-w-xl">
            
            {/* 1. Track */}
            <div className={`p-3.5 sm:p-4 rounded-2xl border text-center space-y-1.5 transition-all duration-300 hover:scale-105 cursor-pointer backdrop-blur-md ${
              isDark 
                ? 'bg-[#081228]/85 border-cyan-500/30 text-white shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:border-cyan-400' 
                : 'bg-white/85 hover:bg-white border-white/90 text-slate-900 shadow-md hover:shadow-lg'
            }`}>
              <div className="text-2xl sm:text-3xl">🚛</div>
              <div className={`text-xs sm:text-sm font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>Track</div>
            </div>

            {/* 2. Optimize */}
            <div className={`p-3.5 sm:p-4 rounded-2xl border text-center space-y-1.5 transition-all duration-300 hover:scale-105 cursor-pointer backdrop-blur-md ${
              isDark 
                ? 'bg-[#081228]/85 border-cyan-500/30 text-white shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:border-cyan-400' 
                : 'bg-white/85 hover:bg-white border-white/90 text-slate-900 shadow-md hover:shadow-lg'
            }`}>
              <div className="text-2xl sm:text-3xl">📊</div>
              <div className={`text-xs sm:text-sm font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>Optimize</div>
            </div>

            {/* 3. Secure */}
            <div className={`p-3.5 sm:p-4 rounded-2xl border text-center space-y-1.5 transition-all duration-300 hover:scale-105 cursor-pointer backdrop-blur-md ${
              isDark 
                ? 'bg-[#081228]/85 border-cyan-500/30 text-white shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:border-cyan-400' 
                : 'bg-white/85 hover:bg-white border-white/90 text-slate-900 shadow-md hover:shadow-lg'
            }`}>
              <div className="text-2xl sm:text-3xl">🛡️</div>
              <div className={`text-xs sm:text-sm font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>Secure</div>
            </div>

            {/* 4. Grow */}
            <div className={`p-3.5 sm:p-4 rounded-2xl border text-center space-y-1.5 transition-all duration-300 hover:scale-105 cursor-pointer backdrop-blur-md ${
              isDark 
                ? 'bg-[#081228]/85 border-cyan-500/30 text-white shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:border-cyan-400' 
                : 'bg-white/85 hover:bg-white border-white/90 text-slate-900 shadow-md hover:shadow-lg'
            }`}>
              <div className="text-2xl sm:text-3xl">👥</div>
              <div className={`text-xs sm:text-sm font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>Grow</div>
            </div>

          </div>

        </div>

        {/* --------------------------------------------------------- */}
        {/* RIGHT COLUMN: ENLARGED PROMINENT LOGIN CARD               */}
        {/* --------------------------------------------------------- */}
        <div className="lg:col-span-5 xl:col-span-5 w-full max-w-md xl:max-w-[450px] mx-auto lg:ml-auto">
          <div className={`p-8 sm:p-10 rounded-[36px] border transition-all duration-300 backdrop-blur-2xl relative ${
            isDark
              ? 'bg-[#081228]/95 border-cyan-500/40 shadow-[0_0_60px_rgba(6,182,212,0.3)]'
              : 'bg-white/90 border-white/90 shadow-2xl backdrop-blur-xl'
          }`}>
            <LoginForm />
          </div>
        </div>

      </main>

    </div>
  )
}

export default Login
