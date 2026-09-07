import React, { useEffect, useState } from 'react'

/**
 * TopDriverAchievementModal
 * Celebratory pop-up modal for Drivers who rank in the TOP 3 (#1 Gold, #2 Silver, #3 Bronze).
 * Shows interactive animations, trophy illustration, motivational wishes, and live stats.
 */
export default function TopDriverAchievementModal({
  rankInfo,
  driverName,
  isOpen,
  onClose,
  onOpenTripConsole,
  isDark = true
}) {
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 7000)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isOpen || !rankInfo) return null

  const rank = rankInfo.rank || 1
  const isGold = rank === 1
  const isSilver = rank === 2
  const isBronze = rank === 3

  // Color schemes based on podium rank
  const theme = isGold
    ? {
        name: 'GOLD CHAMPION',
        medal: '🥇',
        trophyColor: 'text-amber-400',
        glowBg: 'rgba(245, 158, 11, 0.25)',
        borderGradient: 'from-amber-400 via-yellow-300 to-amber-600',
        badgeBg: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-slate-950 font-black',
        ringColor: 'ring-amber-400/50',
        btnGradient: 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 shadow-amber-500/30',
        accentText: 'text-amber-400',
        cardBg: 'bg-amber-950/20 border-amber-500/30'
      }
    : isSilver
    ? {
        name: 'SILVER CHAMPION',
        medal: '🥈',
        trophyColor: 'text-slate-200',
        glowBg: 'rgba(226, 232, 240, 0.25)',
        borderGradient: 'from-slate-200 via-white to-slate-400',
        badgeBg: 'bg-gradient-to-r from-slate-200 via-gray-100 to-slate-300 text-slate-900 font-black',
        ringColor: 'ring-slate-300/50',
        btnGradient: 'bg-gradient-to-r from-slate-200 via-gray-100 to-slate-300 text-slate-950 shadow-slate-300/30',
        accentText: 'text-slate-200',
        cardBg: 'bg-slate-800/30 border-slate-400/30'
      }
    : {
        name: 'BRONZE CHAMPION',
        medal: '🥉',
        trophyColor: 'text-amber-600',
        glowBg: 'rgba(217, 119, 6, 0.25)',
        borderGradient: 'from-amber-600 via-yellow-600 to-amber-800',
        badgeBg: 'bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-700 text-white font-black',
        ringColor: 'ring-amber-600/50',
        btnGradient: 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 text-white shadow-amber-700/30',
        accentText: 'text-amber-500',
        cardBg: 'bg-amber-950/30 border-amber-600/30'
      }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      {/* Background Confetti Sparks Particles */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          {Array.from({ length: 36 }).map((_, i) => {
            const left = Math.random() * 100
            const delay = Math.random() * 2
            const duration = 2.5 + Math.random() * 2.5
            const size = 6 + Math.random() * 8
            const colors = ['#f59e0b', '#fbbf24', '#38bdf8', '#a855f7', '#10b981', '#ffffff', '#e2e8f0']
            const bg = colors[i % colors.length]
            return (
              <div
                key={i}
                className="absolute top-0 rounded-sm opacity-80 animate-ping"
                style={{
                  left: `${left}%`,
                  width: `${size}px`,
                  height: `${size * 1.4}px`,
                  backgroundColor: bg,
                  animation: `fallDown ${duration}s linear ${delay}s infinite`,
                  transform: `rotate(${i * 25}deg)`
                }}
              />
            )
          })}
        </div>
      )}

      {/* Main Celebratory Modal Card */}
      <div 
        className={`relative w-full max-w-2xl rounded-3xl p-6 sm:p-8 border shadow-2xl transition-all duration-300 z-20 text-center overflow-hidden ${
          isDark 
            ? 'bg-gradient-to-b from-[#0e1629] via-[#090e1c] to-[#04060c] text-white border-amber-500/30 shadow-[0_0_60px_rgba(245,158,11,0.2)]' 
            : 'bg-gradient-to-b from-white via-slate-50 to-amber-50/40 text-slate-900 border-amber-300 shadow-[0_20px_50px_rgba(217,119,6,0.15)]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Glow Ambient Burst */}
        <div 
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl pointer-events-none"
          style={{ background: theme.glowBg }}
        />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer text-sm font-bold ${
            isDark ? 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900'
          }`}
          title="Dismiss Award Modal"
        >
          ✕
        </button>

        {/* Floating Trophy & Medal Animation */}
        <div className="relative inline-flex items-center justify-center mt-2 mb-3">
          <div className="relative flex items-center justify-center">
            {/* Spinning decorative background ring */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-dashed border-amber-400/40 animate-[spin_12s_linear_infinite] absolute" />
            
            {/* Soft pulsing glow backdrop */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-amber-500/20 via-yellow-400/30 to-amber-600/20 animate-pulse flex items-center justify-center">
              <span className="text-5xl sm:text-6xl drop-shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-bounce">
                {theme.medal}
              </span>
            </div>

            {/* Rank badge overlay */}
            <span className="absolute -bottom-2 px-3 py-0.5 rounded-full text-[10px] sm:text-xs font-black font-mono shadow-md uppercase tracking-wider bg-slate-950 text-amber-400 border border-amber-400">
              RANK #{rank}
            </span>
          </div>
        </div>

        {/* Ribbon Pill */}
        <div className="mt-3 flex items-center justify-center">
          <span className={`px-4 py-1 rounded-full text-[11px] sm:text-xs tracking-widest uppercase shadow-md ${theme.badgeBg}`}>
            {rankInfo.tier_badge || `${theme.medal} TOP 3 FLEET OPERATOR`}
          </span>
        </div>

        {/* Headline & Driver Name */}
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-3 mb-1">
          {rankInfo.headline || `Congratulations, ${driverName || 'Champion'}!`}
        </h2>

        <p className="text-xs sm:text-sm font-mono text-cyan-500 dark:text-cyan-300 font-bold uppercase tracking-wider mb-3">
          // FleetFlow Elite Driver Recognition
        </p>

        {/* Personalized Wish Message Card */}
        <div className={`p-4 sm:p-5 rounded-2xl border text-left my-4 relative shadow-sm ${theme.cardBg}`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl sm:text-3xl mt-0.5 flex-shrink-0">🏆</span>
            <div className="space-y-2 flex-1">
              <p className={`text-xs sm:text-sm leading-relaxed m-0 ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                {rankInfo.message || 'You have achieved a top ranking position across the entire fleet network through outstanding dedication, safe trips, and punctual service.'}
              </p>
              <div className={`pt-2 border-t text-xs sm:text-sm font-medium italic flex items-center gap-1.5 ${
                isDark ? 'border-white/10 text-amber-300' : 'border-amber-300/40 text-amber-800'
              }`}>
                <span>{rankInfo.wish || '🌟 Wishing you continued safe journeys, smooth roads, and phenomenal success! Keep up the brilliant work!'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Performance Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4">
          <div className={`p-3 rounded-xl border text-center ${isDark ? 'bg-slate-950/60 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
            <span className={`text-[10px] font-mono font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Fleet Rank
            </span>
            <div className={`text-xl font-black mt-0.5 ${theme.accentText}`}>
              #{rank} <span className="text-[11px] font-mono font-normal opacity-70">/ {rankInfo.total_drivers || 3}</span>
            </div>
          </div>

          <div className={`p-3 rounded-xl border text-center ${isDark ? 'bg-slate-950/60 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
            <span className={`text-[10px] font-mono font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Rating Score
            </span>
            <div className="text-xl font-black mt-0.5 text-amber-400">
              {Number(rankInfo.rating_score || 5.0).toFixed(1)} <span className="text-[11px] font-mono font-normal text-amber-400/70">/ 5.0</span>
            </div>
          </div>

          <div className={`p-3 rounded-xl border text-center ${isDark ? 'bg-slate-950/60 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
            <span className={`text-[10px] font-mono font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Completed Trips
            </span>
            <div className="text-xl font-black mt-0.5 text-emerald-400">
              {rankInfo.trips_completed || 0}
            </div>
          </div>

          <div className={`p-3 rounded-xl border text-center ${isDark ? 'bg-slate-950/60 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
            <span className={`text-[10px] font-mono font-bold uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              On-Time Rate
            </span>
            <div className="text-xl font-black mt-0.5 text-cyan-400">
              {rankInfo.on_time_rate_pct || 100}%
            </div>
          </div>
        </div>

        {/* Mini Podium Preview */}
        {rankInfo.top_3_podium && rankInfo.top_3_podium.length > 0 && (
          <div className={`p-3 rounded-2xl border mb-5 ${isDark ? 'bg-slate-950/50 border-white/5' : 'bg-slate-100/70 border-slate-200'}`}>
            <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400 dark:text-white/40 mb-2">
              🏆 Current Fleet Top 3 Podium
            </div>
            <div className="flex items-end justify-center gap-2 pt-2">
              {/* 2nd Place */}
              {(() => {
                const p2 = rankInfo.top_3_podium.find(p => p.rank === 2)
                return (
                  <div className={`flex-1 flex flex-col items-center p-2 rounded-xl border text-xs ${
                    p2?.is_me 
                      ? 'bg-slate-700/60 border-slate-300 ring-2 ring-slate-300/40' 
                      : (isDark ? 'bg-slate-900/60 border-white/5' : 'bg-white border-slate-200')
                  }`}>
                    <span className="text-lg">🥈</span>
                    <span className="text-[10px] font-mono font-black text-slate-300">#2 RANK</span>
                    <span className="text-xs font-bold truncate max-w-[100px] mt-0.5 text-slate-200">
                      {p2?.name || 'Driver #2'}
                    </span>
                    <span className="text-[10px] font-mono text-amber-400">
                      {p2?.rating_score ? `${Number(p2.rating_score).toFixed(1)}★` : ''}
                    </span>
                  </div>
                )
              })()}

              {/* 1st Place (Elevated Center) */}
              {(() => {
                const p1 = rankInfo.top_3_podium.find(p => p.rank === 1)
                return (
                  <div className={`flex-1 flex flex-col items-center p-3 rounded-xl border text-xs -translate-y-2 shadow-lg ${
                    p1?.is_me 
                      ? 'bg-amber-950/70 border-amber-400 ring-2 ring-amber-400/50 shadow-amber-500/20' 
                      : (isDark ? 'bg-slate-900/90 border-amber-500/30' : 'bg-amber-50 border-amber-300')
                  }`}>
                    <span className="text-2xl">🥇</span>
                    <span className="text-[10px] font-mono font-black text-amber-400">#1 CHAMPION</span>
                    <span className="text-xs font-black truncate max-w-[120px] mt-0.5 text-amber-300">
                      {p1?.name || 'Driver #1'}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-amber-400">
                      {p1?.rating_score ? `${Number(p1.rating_score).toFixed(1)}★` : ''}
                    </span>
                  </div>
                )
              })()}

              {/* 3rd Place */}
              {(() => {
                const p3 = rankInfo.top_3_podium.find(p => p.rank === 3)
                return (
                  <div className={`flex-1 flex flex-col items-center p-2 rounded-xl border text-xs ${
                    p3?.is_me 
                      ? 'bg-amber-900/50 border-amber-600 ring-2 ring-amber-600/40' 
                      : (isDark ? 'bg-slate-900/60 border-white/5' : 'bg-white border-slate-200')
                  }`}>
                    <span className="text-lg">🥉</span>
                    <span className="text-[10px] font-mono font-black text-amber-600">#3 RANK</span>
                    <span className="text-xs font-bold truncate max-w-[100px] mt-0.5 text-amber-500">
                      {p3?.name || 'Driver #3'}
                    </span>
                    <span className="text-[10px] font-mono text-amber-400">
                      {p3?.rating_score ? `${Number(p3.rating_score).toFixed(1)}★` : ''}
                    </span>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => {
              onClose()
              if (onOpenTripConsole) onOpenTripConsole()
            }}
            className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-mono font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg hover:scale-[1.02] flex items-center justify-center gap-2 ${theme.btnGradient}`}
          >
            <span>⚡</span>
            <span>Let's Roll • Open Active Trip Console</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-mono font-bold text-xs uppercase transition-all cursor-pointer border ${
              isDark 
                ? 'bg-slate-900 hover:bg-slate-800 text-white border-white/20' 
                : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
            }`}
          >
            <span>✓</span> Continue to Dashboard
          </button>
        </div>

      </div>

      {/* Global Particle Fall Animation Keyframe */}
      <style>{`
        @keyframes fallDown {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
