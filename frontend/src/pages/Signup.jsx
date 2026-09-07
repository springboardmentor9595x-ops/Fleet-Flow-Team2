import React from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import DayNightToggle from '../components/ui/DayNightToggle'
import AuthHeroBackground from '../components/auth/AuthHeroBackground'
import SignupForm from '../components/auth/SignupForm'

function Signup() {
  const { isDark } = useTheme()

  return (
    <div className={`relative min-h-screen w-full ${
      isDark ? 'bg-[#030712] text-white' : 'bg-[#eef5fa] text-slate-900'
    } flex flex-col justify-between overflow-x-hidden font-sans select-none transition-colors duration-300`}>
      
      {/* ========================================================= */}
      {/* 1. CINEMATIC PHOTOREALISTIC BACKGROUND                    */}
      {/* ========================================================= */}
      <AuthHeroBackground isDark={isDark} showRoute={false} isSignup={true} />

      {/* ========================================================= */}
      {/* 2. TOP HEADER NAVIGATION (Identical to Login)             */}
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
      {/* 3. MAIN HERO GRID: LEFT OVERVIEW & RIGHT COMPACT CARD     */}
      {/* ========================================================= */}
      <main className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        
        {/* --------------------------------------------------------- */}
        {/* LEFT COLUMN: ENTERPRISE OVERVIEW & 3 KPI CARDS            */}
        {/* --------------------------------------------------------- */}
        <div className="lg:col-span-6 xl:col-span-7 space-y-5 text-left">
          
          {/* Pill Badge */}
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-mono font-black shadow-sm ${
            isDark 
              ? 'bg-[#08142a]/90 border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.25)]' 
              : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>NEXT-GEN AUTONOMOUS FLEET OS</span>
          </div>

          {/* Headline */}
          <h2 className="text-3xl sm:text-4xl xl:text-5xl font-black tracking-tight leading-[1.12] m-0">
            <span className={isDark ? 'text-white' : 'text-slate-900'}>
              The comprehensive{' '}
            </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 font-black">
              fleet management
            </span>{' '}
            <span className={isDark ? 'text-white' : 'text-slate-900'}>
              solution.
            </span>
          </h2>

          {/* Feature Bullets List */}
          <div className="space-y-2.5 pt-1">
            
            {/* 1. Real-time tracking */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-400 flex items-center justify-center text-sm shadow-[0_0_10px_rgba(6,182,212,0.3)] shrink-0">
                ⚡
              </div>
              <span className={`text-sm sm:text-base font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Real-time tracking
              </span>
            </div>

            {/* 2. Smarter operations */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-400/40 text-blue-400 flex items-center justify-center text-sm shadow-[0_0_10px_rgba(59,130,246,0.3)] shrink-0">
                📊
              </div>
              <span className={`text-sm sm:text-base font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Smarter operations
              </span>
            </div>

            {/* 3. Safer & efficient fleets */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-400/40 text-purple-400 flex items-center justify-center text-sm shadow-[0_0_10px_rgba(168,85,247,0.3)] shrink-0">
                🛡️
              </div>
              <span className={`text-sm sm:text-base font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                Safer & efficient fleets
              </span>
            </div>

          </div>

          {/* 3 KPI Statistics Cards */}
          <div className="grid grid-cols-3 gap-3 pt-2 max-w-md">
            
            {/* KPI 1: 99.8% Uptime */}
            <div className={`p-3 rounded-2xl border text-center transition-all ${
              isDark 
                ? 'bg-[#081228]/85 border-cyan-500/30 text-white shadow-[0_0_15px_rgba(6,182,212,0.12)]' 
                : 'bg-white border-slate-200 text-slate-900 shadow-sm'
            }`}>
              <div className="text-lg sm:text-xl font-black font-mono text-cyan-400">
                99.8%
              </div>
              <div className={`text-[8.5px] font-mono font-black uppercase mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                UPTIME
              </div>
            </div>

            {/* KPI 2: 100+ Live Hubs */}
            <div className={`p-3 rounded-2xl border text-center transition-all ${
              isDark 
                ? 'bg-[#081228]/85 border-cyan-500/30 text-white shadow-[0_0_15px_rgba(6,182,212,0.12)]' 
                : 'bg-white border-slate-200 text-slate-900 shadow-sm'
            }`}>
              <div className="text-lg sm:text-xl font-black font-mono text-cyan-400">
                100+
              </div>
              <div className={`text-[8.5px] font-mono font-black uppercase mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                LIVE HUBS
              </div>
            </div>

            {/* KPI 3: 24/7 Monitoring */}
            <div className={`p-3 rounded-2xl border text-center transition-all ${
              isDark 
                ? 'bg-[#081228]/85 border-cyan-500/30 text-white shadow-[0_0_15px_rgba(6,182,212,0.12)]' 
                : 'bg-white border-slate-200 text-slate-900 shadow-sm'
            }`}>
              <div className="text-lg sm:text-xl font-black font-mono text-cyan-400">
                24/7
              </div>
              <div className={`text-[8.5px] font-mono font-black uppercase mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                MONITORING
              </div>
            </div>

          </div>

          {/* Subtitle Slogan */}
          <div className={`text-xs font-mono font-bold tracking-[0.25em] uppercase pt-1 ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            DRIVE &nbsp;•&nbsp; CONNECT &nbsp;•&nbsp; DELIVER
          </div>

        </div>

        {/* --------------------------------------------------------- */}
        {/* RIGHT COLUMN: COMPACT REGISTRATION CARD                   */}
        {/* --------------------------------------------------------- */}
        <div className="lg:col-span-6 xl:col-span-5 w-full max-w-md mx-auto">
          
          <div className={`p-5 sm:p-6 rounded-[26px] border transition-all duration-300 backdrop-blur-2xl relative ${
            isDark
              ? 'bg-[#081228]/95 border-cyan-500/40 shadow-[0_0_40px_rgba(6,182,212,0.22)]'
              : 'bg-white/95 border-slate-200/90 shadow-xl'
          }`}>
            <SignupForm />
          </div>

        </div>

      </main>

      {/* ========================================================= */}
      {/* 4. FOOTER TELEMETRY BAR                                   */}
      {/* ========================================================= */}
      <footer className={`relative z-20 w-full border-t py-3 px-4 sm:px-8 text-[10px] sm:text-[11px] font-mono transition-colors ${
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

export default Signup
