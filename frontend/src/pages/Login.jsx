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
      <AuthHeroBackground isDark={isDark} showRoute={true} />

      {/* ========================================================= */}
      {/* 2. TOP HEADER NAVIGATION BAR (Seamless Transparent Bar)   */}
      {/* ========================================================= */}
      <header className="auth-header relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 flex items-center justify-between gap-4 bg-transparent border-none">
        
        {/* Left: Brand Logo & Tagline */}
        <div className="space-y-1">
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
                isDark ? 'text-cyan-400/90' : 'text-slate-600'
              }`}>
                ENTERPRISE LOGISTICS TELEMETRICS
              </p>
            </div>
          </div>
          
          <div className={`text-[10px] font-mono font-bold tracking-[0.25em] uppercase pl-1 pt-1 ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            DRIVE &nbsp;•&nbsp; CONNECT &nbsp;•&nbsp; DELIVER
          </div>
        </div>

        {/* Right: Theme Toggle & Slogan Accent */}
        <div className="flex items-center gap-4">
          <DayNightToggle />

          {/* Top-Right Accent Text */}
          <div className="hidden md:block text-right transform rotate-[-4deg]">
            <span className={`text-lg sm:text-xl font-black italic block leading-tight tracking-tight ${
              isDark 
                ? 'text-cyan-300 drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]' 
                : 'text-blue-600 drop-shadow-sm'
            }`} style={{ fontFamily: 'cursive, "Brush Script MT", sans-serif' }}>
              Smarter Fleets<br />
              <span className={isDark ? 'text-white' : 'text-slate-900'}>Brighter Tomorrow</span>
            </span>
            <div className={`w-14 h-0.5 rounded-full ml-auto mt-0.5 ${
              isDark ? 'bg-cyan-400 shadow-[0_0_8px_#00f0ff]' : 'bg-blue-600'
            }`}></div>
          </div>
        </div>

      </header>

      {/* ========================================================= */}
      {/* 3. MAIN HERO GRID: PROMINENT TITLE & ENLARGED LOGIN BOX   */}
      {/* ========================================================= */}
      <main className="relative z-20 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8 my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* --------------------------------------------------------- */}
        {/* LEFT COLUMN: HERO BOLD HEADLINE & 4 FEATURE CARDS         */}
        {/* --------------------------------------------------------- */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-6 sm:space-y-8 text-left">
          
          {/* Prominent Large Headline */}
          <div className="space-y-1.5">
            <h2 className="text-5xl sm:text-6xl lg:text-6xl xl:text-7xl 2xl:text-[76px] font-black tracking-tight leading-[1.03] m-0">
              <span className={isDark ? 'text-white' : 'text-slate-900'}>Smarter </span>
              <span className={`block sm:inline ${
                isDark ? 'text-cyan-400 drop-shadow-[0_0_30px_rgba(6,182,212,0.7)]' : 'text-blue-600 drop-shadow-sm'
              }`}>
                Fleets
              </span>
              <br />
              <span className={isDark ? 'text-white' : 'text-slate-900'}>Brighter </span>
              <span className={
                isDark
                  ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500 font-black'
                  : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 font-black'
              }>
                Tomorrow
              </span>
            </h2>

            {/* Cyan/Blue Brush Underline Stroke */}
            <div className={`w-40 sm:w-56 h-2 rounded-full mt-3.5 ${
              isDark
                ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-transparent'
                : 'bg-gradient-to-r from-blue-600 via-cyan-500 to-transparent'
            }`}></div>
          </div>

          {/* Subtitle Slogan */}
          <div className={`text-xs sm:text-sm lg:text-base font-mono font-black tracking-[0.25em] uppercase ${
            isDark ? 'text-slate-400' : 'text-slate-700'
          }`}>
            DRIVE &nbsp;•&nbsp; CONNECT &nbsp;•&nbsp; DELIVER
          </div>

          {/* 4 Bottom-Left Feature Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-2 max-w-xl">
            
            {/* 1. Track */}
            <div className={`p-3.5 sm:p-4 rounded-2xl border text-center space-y-1.5 transition-all duration-300 hover:scale-105 cursor-pointer ${
              isDark 
                ? 'bg-[#081228]/85 border-cyan-500/30 hover:border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.15)]' 
                : 'bg-white/85 hover:bg-white backdrop-blur-md border-white/80 hover:border-blue-400 text-slate-800 shadow-md hover:shadow-lg'
            }`}>
              <div className="text-2xl sm:text-3xl">🚛</div>
              <div className={`text-xs sm:text-sm font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>Track</div>
            </div>

            {/* 2. Optimize */}
            <div className={`p-3.5 sm:p-4 rounded-2xl border text-center space-y-1.5 transition-all duration-300 hover:scale-105 cursor-pointer ${
              isDark 
                ? 'bg-[#081228]/85 border-cyan-500/30 hover:border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.15)]' 
                : 'bg-white/85 hover:bg-white backdrop-blur-md border-white/80 hover:border-blue-400 text-slate-800 shadow-md hover:shadow-lg'
            }`}>
              <div className="text-2xl sm:text-3xl">📊</div>
              <div className={`text-xs sm:text-sm font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>Optimize</div>
            </div>

            {/* 3. Secure */}
            <div className={`p-3.5 sm:p-4 rounded-2xl border text-center space-y-1.5 transition-all duration-300 hover:scale-105 cursor-pointer ${
              isDark 
                ? 'bg-[#081228]/85 border-cyan-500/30 hover:border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.15)]' 
                : 'bg-white/85 hover:bg-white backdrop-blur-md border-white/80 hover:border-blue-400 text-slate-800 shadow-md hover:shadow-lg'
            }`}>
              <div className="text-2xl sm:text-3xl">🛡️</div>
              <div className={`text-xs sm:text-sm font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>Secure</div>
            </div>

            {/* 4. Grow */}
            <div className={`p-3.5 sm:p-4 rounded-2xl border text-center space-y-1.5 transition-all duration-300 hover:scale-105 cursor-pointer ${
              isDark 
                ? 'bg-[#081228]/85 border-cyan-500/30 hover:border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.15)]' 
                : 'bg-white/85 hover:bg-white backdrop-blur-md border-white/80 hover:border-blue-400 text-slate-800 shadow-md hover:shadow-lg'
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
              : 'bg-white/85 border-white/80 shadow-2xl backdrop-blur-xl'
          }`}>
            <LoginForm />
          </div>
        </div>

      </main>

      {/* ========================================================= */}
      {/* 4. BOTTOM FOOTER TELEMETRICS BAR                          */}
      {/* ========================================================= */}
      <footer className={`relative z-20 w-full border-t py-3.5 px-4 sm:px-8 text-[10px] sm:text-[11px] font-mono transition-colors ${
        isDark 
          ? 'border-slate-800/80 bg-[#020510]/80 text-slate-400' 
          : 'border-slate-200/60 bg-white/60 backdrop-blur-md text-slate-600'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          
          <div className="flex items-center gap-2">
            <span className="font-bold text-cyan-500">FLEETFLOW</span>
            <span>|</span>
            <span>ENTERPRISE LOGISTICS TELEMETRICS</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <div className="w-8 h-0.5 bg-cyan-500/50"></div>
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
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

export default Login
