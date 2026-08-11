import { useMemo } from 'react'

function MountainBackground() {
  const trees = useMemo(() => {
    const count = 35
    const list = []
    for (let i = 0; i <= count; i++) {
      // Create random scale and height for natural variations
      list.push({
        x: (i * (100 / count)) + (Math.random() - 0.5) * 1.5, // Distribute across width with jitter
        height: Math.random() * 50 + 60, // 60px to 110px tall
        scaleX: Math.random() * 0.3 + 0.85,
        opacity: Math.random() * 0.15 + 0.85
      })
    }
    return list
  }, [])

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden flex items-end">
      {/* Background Mountain silhouettes */}
      <svg 
        className="absolute bottom-0 left-0 w-full h-[35vh] min-h-[220px]" 
        viewBox="0 0 1440 320" 
        preserveAspectRatio="none"
      >
        {/* Distant Ridge (Soft violet) */}
        <path 
          d="M0,320 L0,180 L140,110 L320,200 L560,90 L790,170 L980,80 L1160,190 L1320,100 L1440,170 L1440,320 Z" 
          fill="#441a7d" 
          opacity="0.25"
        />
        
        {/* Mid-ground Ridge (Deep purple) */}
        <path 
          d="M0,320 L0,220 L240,130 L490,230 L690,110 L890,190 L1080,100 L1280,210 L1440,140 L1440,320 Z" 
          fill="#25124c" 
          opacity="0.5"
        />

        {/* Foreground Ridge (Very dark purple) */}
        <path 
          d="M0,320 L0,250 L180,160 L410,240 L590,150 L840,210 L1020,140 L1240,220 L1440,160 L1440,320 Z" 
          fill="#110729" 
        />
      </svg>

      {/* Pine Trees Row overlay in absolute container at bottom */}
      <div className="absolute bottom-0 left-0 w-full h-0 z-10">
        {trees.map((t, i) => (
          <div 
            key={i}
            className="absolute bottom-0"
            style={{
              left: `${t.x}%`,
              transform: `translateX(-50%) scaleX(${t.scaleX})`,
              opacity: t.opacity
            }}
          >
            {/* SVG Pine Tree rendering */}
            <svg 
              width="60" 
              height={t.height} 
              viewBox="0 0 60 110" 
              className="text-[#090317] fill-current drop-shadow-[0_-5px_5px_rgba(9,3,23,0.3)]"
            >
              {/* Pine tree shape triangles stack */}
              <polygon points="30,10 18,35 42,35" />
              <polygon points="30,28 14,58 46,58" />
              <polygon points="30,48 8,88 52,88" />
              {/* Trunk */}
              <rect x="27" y="88" width="6" height="22" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MountainBackground
