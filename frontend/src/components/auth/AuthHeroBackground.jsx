import React from 'react'

export function AuthHeroBackground({ isDark, showRoute = true, isSignup = false }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      {isDark ? (
        /* ========================================================================= */
        /* DARK MODE PHOTOREALISTIC HIGHWAY SCENERY                                  */
        /* ========================================================================= */
        <div className="relative w-full h-full">
          {/* Photorealistic 3D Night Highway Image */}
          <img
            src="/images/fleet_night_highway.jpg"
            alt="FleetFlow Night Highway Telemetrics"
            className="absolute inset-0 w-full h-full object-cover object-center scale-100 transition-all duration-700 brightness-[0.95] contrast-[1.05]"
          />

          {/* Deep Cinematic Atmosphere Overlays (Subtle & Transparent) */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#030712]/85 via-[#060c1d]/45 to-[#030712]/80"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#02050f]/90 via-transparent to-[#030712]/30"></div>

          {/* Ambient Glowing Cyan Accent Blooms */}
          <div className="absolute top-[20%] left-[25%] w-[35vw] h-[35vw] rounded-full bg-cyan-500/10 blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[10%] w-[50vw] h-[30vw] rounded-full bg-blue-600/15 blur-[100px]"></div>

          {/* ========================================================= */}
          {/* DOTTED HIGHWAY ROUTE PATH (Srikakulam -> Vizianagaram)     */}
          {/* ========================================================= */}
          {showRoute && (
            <div className="absolute top-[18%] left-[34%] xl:left-[38%] w-[260px] h-[340px] pointer-events-none hidden md:block">
              {/* Dotted Glowing Curved Path */}
              <svg className="w-full h-full" viewBox="0 0 240 320" fill="none">
                <path
                  d="M 40 20 Q 90 70, 70 120 T 40 200 Q 30 260, 50 300"
                  stroke="#00f0ff"
                  strokeWidth="3.5"
                  strokeDasharray="6 6"
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_10px_rgba(0,240,255,0.9)]"
                />
              </svg>

              {/* Pin 1: SRIKAKULAM (Origin Top) */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 transform -translate-y-2">
                <div className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-[10px] font-black shadow-[0_0_12px_rgba(0,240,255,1)]">
                  📍
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-[#0a1428]/95 border border-cyan-500/50 text-[10px] font-mono font-bold text-cyan-300 shadow-lg tracking-wider backdrop-blur-md">
                  SRIKAKULAM
                </div>
              </div>

              {/* Floating Pill: On the Move (Mid Status) */}
              <div className="absolute top-[38%] left-[-45px] flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#071329]/95 border border-cyan-400 text-[10px] font-mono font-bold text-white shadow-[0_0_15px_rgba(0,240,255,0.5)] backdrop-blur-md animate-pulse">
                <span>🚛</span>
                <span className="text-cyan-300">On the Move</span>
              </div>

              {/* Pin 2: VIZIANAGARAM (Destination Bottom) */}
              <div className="absolute bottom-2 left-6 flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-[10px] font-black shadow-[0_0_12px_rgba(0,240,255,1)]">
                  📍
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-[#0a1428]/95 border border-cyan-500/50 text-[10px] font-mono font-bold text-cyan-300 shadow-lg tracking-wider backdrop-blur-md">
                  VIZIANAGARAM
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* LIGHT MODE PHOTOREALISTIC DAYLIGHT HIGHWAY SCENERY                        */
        /* ========================================================================= */
        <div className="relative w-full h-full">
          {/* Photorealistic 3D Daylight Highway Image */}
          <img
            src="/images/fleet_day_highway.jpg"
            alt="FleetFlow Day Highway Telemetrics"
            className="absolute inset-0 w-full h-full object-cover object-center scale-100 transition-all duration-700 brightness-[1.02] contrast-[1.02]"
          />

          {/* Transparent Daylight Scrim: Keeps the background truck image clear & visible */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/45 via-white/20 to-transparent lg:from-white/35 lg:via-transparent lg:to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-white/25 via-transparent to-transparent"></div>

          {/* ========================================================= */}
          {/* DOTTED BLUE ROUTE LINE & PINS (Light Mode)                */}
          {/* ========================================================= */}
          {showRoute && (
            <div className="absolute top-[6%] left-[30%] xl:left-[33%] w-[180px] h-[210px] pointer-events-none hidden lg:block opacity-90">
              {/* Dotted Blue Curved Path */}
              <svg className="w-full h-full" viewBox="0 0 180 210" fill="none">
                <path
                  d="M 25 15 Q 70 50, 50 90 T 30 150 Q 25 185, 40 200"
                  stroke="#0284c7"
                  strokeWidth="2.5"
                  strokeDasharray="5 5"
                  strokeLinecap="round"
                  className="drop-shadow-sm"
                />
              </svg>

              {/* Pin 1: SRIKAKULAM (Light Mode) */}
              <div className="absolute top-0 left-0 flex items-center gap-1.5 transform -translate-y-2">
                <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-black shadow-md">
                  📍
                </div>
                <div className="px-2 py-0.5 rounded-lg bg-white/95 border border-slate-200/90 text-[9px] font-mono font-black text-slate-800 shadow-sm tracking-wider backdrop-blur-sm">
                  SRIKAKULAM
                </div>
              </div>

              {/* Floating Pill: On the Move (Light Mode) */}
              <div className="absolute top-[40%] left-[-30px] flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/95 border border-blue-200/90 text-[9px] font-mono font-black text-slate-800 shadow-md backdrop-blur-sm">
                <span>🚛</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-slate-700">On the Move</span>
              </div>

              {/* Pin 2: VIZIANAGARAM (Light Mode) */}
              <div className="absolute bottom-0 left-2 flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-black shadow-md">
                  📍
                </div>
                <div className="px-2 py-0.5 rounded-lg bg-white/95 border border-slate-200/90 text-[9px] font-mono font-black text-slate-800 shadow-sm tracking-wider backdrop-blur-sm">
                  VIZIANAGARAM
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AuthHeroBackground
