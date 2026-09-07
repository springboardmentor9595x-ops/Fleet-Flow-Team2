import React from 'react'
import { useTheme } from '../../context/ThemeContext'

function DayNightToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      onClick={toggleTheme}
      className={`relative inline-flex items-center w-[78px] h-[32px] rounded-full p-1 cursor-pointer transition-all duration-500 overflow-hidden select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 border ${
        isDark
          ? 'bg-[#020617] border-cyan-500/40 shadow-[inset_0_2px_8px_rgba(0,0,0,0.9),0_0_15px_rgba(6,182,212,0.25)] hover:border-cyan-400/70 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]'
          : 'bg-[#1e88e5] border-sky-400/80 shadow-[inset_0_2px_6px_rgba(0,0,0,0.25),0_0_15px_rgba(30,136,229,0.25)] hover:border-sky-300'
      } ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {/* ========================================================= */}
      {/* 1. SKY BACKGROUND WITH RIPPLE RINGS                       */}
      {/* ========================================================= */}
      
      {/* DAY SKY (Light Mode) */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${
          isDark ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Day sky gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0284c7] via-[#38bdf8] to-[#93c5fd]"></div>
        
        {/* Concentric ripples around sun */}
        <div className="absolute -left-2 -top-4 w-16 h-16 rounded-full bg-white/15 pointer-events-none"></div>
        <div className="absolute -left-5 -top-7 w-22 h-22 rounded-full bg-white/10 pointer-events-none"></div>
        <div className="absolute -left-8 -top-10 w-28 h-28 rounded-full bg-white/10 pointer-events-none"></div>

        {/* Fluffy White Clouds */}
        <div className="absolute right-0 bottom-0 flex items-end pointer-events-none transform translate-y-0.5 transition-transform duration-500">
          <div className="w-5 h-5 rounded-full bg-white/85 -mr-2 mb-[-2px]"></div>
          <div className="w-7 h-7 rounded-full bg-white -mr-1.5 mb-[-4px]"></div>
          <div className="w-8 h-8 rounded-full bg-white mb-[-6px]"></div>
          <div className="w-6 h-6 rounded-full bg-[#e0f2fe] -ml-2 mb-[-3px]"></div>
          <div className="w-4 h-4 rounded-full bg-white -ml-1 mb-[-1px]"></div>
        </div>
      </div>

      {/* NIGHT SKY (Dark Mode) */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${
          isDark ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Deep Midnight Space Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-[#081a33] to-[#042c4c]"></div>

        {/* Luminous concentric cyber ripples behind blue moon */}
        <div className="absolute -right-2 -top-4 w-16 h-16 rounded-full bg-cyan-400/15 pointer-events-none"></div>
        <div className="absolute -right-5 -top-7 w-22 h-22 rounded-full bg-cyan-500/10 pointer-events-none"></div>
        <div className="absolute -right-8 -top-10 w-28 h-28 rounded-full bg-blue-600/10 pointer-events-none"></div>

        {/* Twinkling Cyan & White Diamond Stars (Left side) */}
        <div className="absolute left-2.5 top-1.5 flex flex-col gap-1 pointer-events-none">
          <svg className="w-2.5 h-2.5 text-cyan-300 drop-shadow-[0_0_6px_#00f0ff] animate-pulse" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
          </svg>
        </div>
        <div className="absolute left-6 top-3 pointer-events-none">
          <svg className="w-2 h-2 text-white drop-shadow-[0_0_4px_#ffffff]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
          </svg>
        </div>
        <div className="absolute left-4 bottom-1.5 pointer-events-none">
          <span className="block w-1 h-1 rounded-full bg-cyan-200 drop-shadow-[0_0_3px_#38bdf8]"></span>
        </div>
        <div className="absolute left-8 bottom-2 pointer-events-none">
          <span className="block w-0.5 h-0.5 rounded-full bg-white"></span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. SLIDING CELESTIAL BODY (SUN <---> BLUE MOON)           */}
      {/* ========================================================= */}
      <div
        className={`relative z-10 w-[24px] h-[24px] rounded-full transition-transform duration-500 ease-in-out transform flex items-center justify-center ${
          isDark ? 'translate-x-[44px]' : 'translate-x-0'
        }`}
      >
        {/* SUN (Light Mode) */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-br from-[#ffe600] via-[#ffc700] to-[#ff9100] shadow-[0_0_12px_rgba(255,200,0,0.9),inset_0_-1px_2px_rgba(0,0,0,0.2)] border border-[#fff59d] transition-all duration-500 ${
            isDark ? 'opacity-0 scale-50 rotate-90' : 'opacity-100 scale-100 rotate-0'
          }`}
        ></div>

        {/* BLUE MOON (Dark Mode) */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-br from-[#e0f7fa] via-[#7dd3fc] to-[#0284c7] shadow-[0_0_14px_rgba(6,182,212,0.9),0_0_5px_rgba(56,189,248,1),inset_0_-1px_3px_rgba(2,132,199,0.8)] border border-[#e0f2fe] transition-all duration-500 overflow-hidden ${
            isDark ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-50 -rotate-90'
          }`}
        >
          {/* Blue Moon Craters */}
          <div className="absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full bg-[#0369a1]/55 shadow-inner"></div>
          <div className="absolute bottom-1 left-2.5 w-2 h-2 rounded-full bg-[#0284c7]/45 shadow-inner"></div>
          <div className="absolute top-2.5 right-1 w-1.5 h-1.5 rounded-full bg-[#0369a1]/50 shadow-inner"></div>
        </div>
      </div>
    </button>
  )
}

export default DayNightToggle

