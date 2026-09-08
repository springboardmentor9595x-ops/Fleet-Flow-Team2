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
      <AuthHeroBackground isDark={isDark} />

      {/* ========================================================= */}
      {/* 2. TOP HEADER NAVIGATION                                  */}
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
                REGISTER
              </span>
            </div>
            <p className={`text-[8.5px] sm:text-[9.5px] tracking-widest uppercase m-0 mt-0.5 font-mono font-bold ${
              isDark ? 'text-cyan-400/90' : 'text-slate-600'
            }`}>
              ENTERPRISE LOGISTICS OS
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
      {/* 3. MAIN HERO GRID: LEFT OVERVIEW & RIGHT SIGNUP CARD      */}
      {/* ========================================================= */}
      <main className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        
        {/* --------------------------------------------------------- */}
        {/* LEFT COLUMN: ENTERPRISE OVERVIEW (Transparent Background) */}
        {/* --------------------------------------------------------- */}
        <div className="lg:col-span-6 xl:col-span-7 space-y-5 text-left">
          
          {/* Pill Badge */}
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-mono font-bold shadow-xs backdrop-blur-md ${
            isDark 
              ? 'bg-[#08142a]/90 border-cyan-500/40 text-cyan-300' 
              : 'bg-white/90 border-blue-200 text-blue-800 shadow-xs'
          }`}>
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
            <span>ENTERPRISE FLEET NETWORK</span>
          </div>

          {/* Headline directly over transparent background */}
          <h2 className="text-3xl sm:text-4xl xl:text-5xl font-black tracking-tight leading-[1.12] m-0">
            <span className={`drop-shadow-xs ${isDark ? 'text-white' : 'text-slate-950'}`}>
              The comprehensive{' '}
            </span>
            <span className={
              isDark
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 font-black drop-shadow-[0_0_20px_rgba(6,182,212,0.6)]'
                : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-700 to-cyan-700 font-black drop-shadow-sm'
            }>
              fleet management
            </span>{' '}
            <span className={`drop-shadow-xs ${isDark ? 'text-white' : 'text-slate-950'}`}>
              solution.
            </span>
          </h2>

          {/* Feature Bullets List */}
          <div className="space-y-2.5 pt-1">
            
            {/* 1. Real-time tracking */}
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-xs shrink-0 ${
                isDark ? 'bg-cyan-500/15 border border-cyan-400/40 text-cyan-400' : 'bg-white/90 border border-blue-200 text-blue-700 shadow-xs'
              }`}>
                ⚡
              </div>
              <span className={`text-sm sm:text-base font-bold drop-shadow-xs ${isDark ? 'text-slate-200' : 'text-slate-950 font-black'}`}>
                Real-time GPS map tracking & shortest routes
              </span>
            </div>

            {/* 2. Smarter operations */}
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-xs shrink-0 ${
                isDark ? 'bg-blue-500/15 border border-blue-400/40 text-blue-400' : 'bg-white/90 border border-blue-200 text-blue-700 shadow-xs'
              }`}>
                📊
              </div>
              <span className={`text-sm sm:text-base font-bold drop-shadow-xs ${isDark ? 'text-slate-200' : 'text-slate-950 font-black'}`}>
                Automated fuel logging & maintenance alerts
              </span>
            </div>

            {/* 3. Safer & efficient fleets */}
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-xs shrink-0 ${
                isDark ? 'bg-purple-500/15 border border-purple-400/40 text-purple-400' : 'bg-white/90 border border-blue-200 text-blue-700 shadow-xs'
              }`}>
                🛡️
              </div>
              <span className={`text-sm sm:text-base font-bold drop-shadow-xs ${isDark ? 'text-slate-200' : 'text-slate-950 font-black'}`}>
                Role-based dashboards & driver recognition
              </span>
            </div>

          </div>

          {/* 3 KPI Statistics Cards */}
          <div className="grid grid-cols-3 gap-3 pt-2 max-w-md">
            
            {/* KPI 1: 99.8% Uptime */}
            <div className={`p-3 rounded-2xl border text-center transition-all backdrop-blur-md ${
              isDark 
                ? 'bg-[#081228]/85 border-cyan-500/30 text-white' 
                : 'bg-white/90 border-slate-200/90 text-slate-900 shadow-md'
            }`}>
              <div className="text-lg sm:text-xl font-black font-mono text-cyan-500">
                99.8%
              </div>
              <div className={`text-[8.5px] font-mono font-bold uppercase mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                UPTIME
              </div>
            </div>

            {/* KPI 2: 100+ Live Hubs */}
            <div className={`p-3 rounded-2xl border text-center transition-all backdrop-blur-md ${
              isDark 
                ? 'bg-[#081228]/85 border-cyan-500/30 text-white' 
                : 'bg-white/90 border-slate-200/90 text-slate-900 shadow-md'
            }`}>
              <div className="text-lg sm:text-xl font-black font-mono text-blue-600">
                100+
              </div>
              <div className={`text-[8.5px] font-mono font-bold uppercase mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                LIVE HUBS
              </div>
            </div>

            {/* KPI 3: 24/7 Monitoring */}
            <div className={`p-3 rounded-2xl border text-center transition-all backdrop-blur-md ${
              isDark 
                ? 'bg-[#081228]/85 border-cyan-500/30 text-white' 
                : 'bg-white/90 border-slate-200/90 text-slate-900 shadow-md'
            }`}>
              <div className="text-lg sm:text-xl font-black font-mono text-emerald-500">
                24/7
              </div>
              <div className={`text-[8.5px] font-mono font-bold uppercase mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                MONITORING
              </div>
            </div>

          </div>

          {/* Subtitle Slogan */}
          <div className={`text-xs font-mono font-black tracking-[0.25em] uppercase pt-1 ${
            isDark ? 'text-slate-300 drop-shadow-sm' : 'text-slate-900 drop-shadow-xs'
          }`}>
            DRIVE &nbsp;•&nbsp; CONNECT &nbsp;•&nbsp; DELIVER
          </div>

        </div>

        {/* --------------------------------------------------------- */}
        {/* RIGHT COLUMN: COMPACT REGISTRATION CARD                   */}
        {/* --------------------------------------------------------- */}
        <div className="lg:col-span-6 xl:col-span-5 w-full max-w-md mx-auto">
          
          <div className={`p-6 sm:p-7 rounded-[32px] border transition-all duration-300 backdrop-blur-2xl relative ${
            isDark
              ? 'bg-[#081228]/95 border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.25)]'
              : 'bg-white/90 border-white/90 shadow-2xl backdrop-blur-xl'
          }`}>
            <SignupForm />
          </div>

        </div>

      </main>

    </div>
  )
}

export default Signup
