import React from 'react'

export function AuthHeroBackground({ isDark }) {
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
          <div className="absolute inset-0 bg-gradient-to-r from-[#030712]/90 via-[#060c1d]/60 to-[#030712]/85"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#02050f]/95 via-transparent to-[#030712]/40"></div>

          {/* Ambient Glowing Cyan Accent Blooms */}
          <div className="absolute top-[20%] left-[25%] w-[35vw] h-[35vw] rounded-full bg-cyan-500/10 blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[10%] w-[50vw] h-[30vw] rounded-full bg-blue-600/15 blur-[100px]"></div>
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
            className="absolute inset-0 w-full h-full object-cover object-center scale-100 transition-all duration-700 brightness-[1.0] contrast-[1.02]"
          />

          {/* Transparent Daylight Scrim: Soft gradient to ensure text readability while keeping truck visible */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/70 via-white/40 to-white/60 lg:from-white/60 lg:via-white/25 lg:to-white/50"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-white/40"></div>
        </div>
      )}
    </div>
  )
}

export default AuthHeroBackground
