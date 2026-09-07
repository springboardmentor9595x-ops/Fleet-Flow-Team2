import React from 'react'

export function Vehicle3DRender({ type = 'white_semi', className = 'w-full h-full' }) {
  // 1. CONTAINER TRUCK (Deep blue intermodal container on carrier chassis)
  if (type === 'container_truck' || type === 'blue_container' || type === 'container') {
    return (
      <svg className={className} viewBox="0 0 240 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="contTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="contSide" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e40af" />
            <stop offset="50%" stopColor="#1d4ed8" />
            <stop offset="100%" stopColor="#172554" />
          </linearGradient>
          <linearGradient id="contFront" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>
          <linearGradient id="chassisGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <radialGradient id="tireGrad" cx="50%" cy="50%" r="50%">
            <stop offset="40%" stopColor="#020617" />
            <stop offset="70%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
          <filter id="shadowFilter" x="-10%" y="-10%" width="130%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000000" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Ground Drop Shadow */}
        <ellipse cx="120" cy="125" rx="100" ry="10" fill="#000000" opacity="0.35" />

        <g filter="url(#shadowFilter)">
          {/* Main Shipping Container Body (Perspective Box) */}
          {/* Container Top Face */}
          <polygon points="45,30 185,15 225,25 85,40" fill="url(#contTop)" />
          
          {/* Container Side Face (Long side) */}
          <polygon points="45,30 85,40 85,95 45,85" fill="url(#contFront)" />

          {/* Container Long Side Face (with corrugations) */}
          <polygon points="85,40 225,25 225,80 85,95" fill="url(#contSide)" />

          {/* Vertical Corrugation Ridges on Container Side */}
          {[98, 110, 122, 134, 146, 158, 170, 182, 194, 206, 218].map((x, i) => {
            const topY = 40 - (i + 1) * 1.25
            const botY = 95 - (i + 1) * 1.25
            return (
              <g key={i}>
                <line x1={x} y1={topY} x2={x} y2={botY} stroke="#172554" strokeWidth="2.5" />
                <line x1={x + 1.5} y1={topY} x2={x + 1.5} y2={botY} stroke="#60a5fa" strokeWidth="1" opacity="0.4" />
              </g>
            )
          })}

          {/* Container Corner Castings */}
          <rect x="83" y="38" width="5" height="6" rx="1" fill="#93c5fd" />
          <rect x="83" y="89" width="5" height="6" rx="1" fill="#60a5fa" />
          <rect x="221" y="23" width="5" height="6" rx="1" fill="#93c5fd" />
          <rect x="221" y="74" width="5" height="6" rx="1" fill="#60a5fa" />

          {/* Container Front Door Hinges & Locking Rods */}
          <line x1="58" y1="34" x2="58" y2="88" stroke="#cbd5e1" strokeWidth="2" />
          <line x1="72" y1="37" x2="72" y2="92" stroke="#cbd5e1" strokeWidth="2" />
          <circle cx="58" cy="60" r="2" fill="#ef4444" />
          <circle cx="72" cy="62" r="2" fill="#ef4444" />

          {/* Container ISO Stencil Details */}
          <text x="105" y="58" fill="#ffffff" opacity="0.85" fontSize="7" fontWeight="bold" fontFamily="monospace" transform="rotate(-6 105 58)">
            FLEETFLOW • 200,000 KG
          </text>
          <text x="105" y="68" fill="#93c5fd" opacity="0.7" fontSize="5.5" fontFamily="monospace" transform="rotate(-6 105 68)">
            ISO CONTAINER #FF-9821
          </text>

          {/* Chassis Frame */}
          <polygon points="35,88 225,78 225,92 35,102" fill="url(#chassisGrad)" />
          <rect x="40" y="98" width="180" height="5" rx="2" fill="#1e293b" />

          {/* Wheels / Tandem Axles */}
          {/* Front Wheels */}
          <circle cx="60" cy="108" r="14" fill="url(#tireGrad)" />
          <circle cx="60" cy="108" r="7" fill="#64748b" />
          <circle cx="60" cy="108" r="3" fill="#cbd5e1" />

          {/* Rear Tandem Wheels */}
          <circle cx="165" cy="102" r="14" fill="url(#tireGrad)" />
          <circle cx="165" cy="102" r="7" fill="#64748b" />
          <circle cx="165" cy="102" r="3" fill="#cbd5e1" />

          <circle cx="195" cy="99" r="14" fill="url(#tireGrad)" />
          <circle cx="195" cy="99" r="7" fill="#64748b" />
          <circle cx="195" cy="99" r="3" fill="#cbd5e1" />
        </g>
      </svg>
    )
  }

  // 2. WHITE HEAVY TRUCK / KENWORTH T680
  if (type === 'white_semi' || type === 'kenworth') {
    return (
      <svg className={className} viewBox="0 0 240 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="whiteCab" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient id="whiteTrailer" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="70%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient id="chromeGrille" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          <radialGradient id="wtire" cx="50%" cy="50%" r="50%">
            <stop offset="40%" stopColor="#020617" />
            <stop offset="70%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
        </defs>

        {/* Shadow */}
        <ellipse cx="120" cy="125" rx="100" ry="10" fill="#000000" opacity="0.35" />

        {/* Trailer */}
        <polygon points="75,28 215,16 215,75 75,88" fill="url(#whiteTrailer)" />
        <polygon points="75,28 215,16 220,17 80,30" fill="#ffffff" />
        <rect x="75" y="80" width="140" height="3" fill="#ef4444" />
        <text x="100" y="52" fill="#64748b" opacity="0.8" fontSize="7" fontWeight="bold" fontFamily="sans-serif" transform="rotate(-5 100 52)">
          KENWORTH FREIGHT
        </text>

        {/* Cab Fairing & Roof */}
        <polygon points="32,45 75,32 75,90 32,95" fill="url(#whiteCab)" />
        
        {/* Cab Nose / Hood */}
        <path d="M 18,72 L 32,58 L 48,58 L 48,94 L 18,92 Z" fill="url(#whiteCab)" />
        
        {/* Windshield */}
        <polygon points="26,60 44,52 46,70 28,70" fill="#0f172a" />
        <polygon points="28,62 42,55 44,68 30,68" fill="#38bdf8" opacity="0.5" />

        {/* Side Window */}
        <polygon points="47,53 68,48 68,68 47,70" fill="#0f172a" />
        <line x1="50" y1="72" x2="65" y2="72" stroke="#64748b" strokeWidth="1.5" />

        {/* Front Grille */}
        <polygon points="17,74 24,71 24,91 17,91" fill="url(#chromeGrille)" />
        {[76, 80, 84, 88].map(y => (
          <line key={y} x1="18" y1={y} x2="23" y2={y - 1} stroke="#f8fafc" strokeWidth="1" />
        ))}

        {/* Headlight */}
        <rect x="18" y="86" width="4" height="4" rx="1" fill="#38bdf8" />
        <rect x="18" y="86" width="4" height="4" rx="1" fill="#fef08a" opacity="0.8" />

        {/* Chrome Bumper */}
        <polygon points="14,92 34,91 34,98 14,98" fill="url(#chromeGrille)" />

        {/* Side Mirror */}
        <rect x="25" y="60" width="3" height="7" rx="1" fill="#0f172a" />
        <line x1="28" y1="62" x2="32" y2="62" stroke="#475569" strokeWidth="1" />

        {/* Wheels */}
        <circle cx="42" cy="104" r="14" fill="url(#wtire)" />
        <circle cx="42" cy="104" r="7" fill="#cbd5e1" />
        <circle cx="42" cy="104" r="3" fill="#475569" />

        <circle cx="160" cy="98" r="14" fill="url(#wtire)" />
        <circle cx="160" cy="98" r="7" fill="#cbd5e1" />
        <circle cx="160" cy="98" r="3" fill="#475569" />

        <circle cx="190" cy="95" r="14" fill="url(#wtire)" />
        <circle cx="190" cy="95" r="7" fill="#cbd5e1" />
        <circle cx="190" cy="95" r="3" fill="#475569" />
      </svg>
    )
  }

  // 3. RED SEMI TRUCK / PETERBILT 579
  if (type === 'red_semi' || type === 'peterbilt') {
    return (
      <svg className={className} viewBox="0 0 240 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="redCab" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="60%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#991b1b" />
          </linearGradient>
          <linearGradient id="whiteTr" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <linearGradient id="redChr" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="50%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <radialGradient id="rtire" cx="50%" cy="50%" r="50%">
            <stop offset="40%" stopColor="#020617" />
            <stop offset="70%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
        </defs>

        <ellipse cx="120" cy="125" rx="100" ry="10" fill="#000000" opacity="0.35" />

        {/* Chrome Vertical Exhaust Stack */}
        <rect x="68" y="16" width="3" height="30" fill="url(#redChr)" />
        <rect x="74" y="14" width="3" height="30" fill="url(#redChr)" />

        {/* Trailer */}
        <polygon points="75,28 215,16 215,75 75,88" fill="url(#whiteTr)" />
        <rect x="75" y="80" width="140" height="3" fill="#dc2626" />
        <text x="100" y="52" fill="#991b1b" opacity="0.85" fontSize="7" fontWeight="bold" fontFamily="sans-serif" transform="rotate(-5 100 52)">
          PETERBILT 579 HAULER
        </text>

        {/* Red Cab */}
        <polygon points="32,45 75,32 75,90 32,95" fill="url(#redCab)" />
        <path d="M 18,72 L 32,58 L 48,58 L 48,94 L 18,92 Z" fill="url(#redCab)" />
        
        {/* Windshield */}
        <polygon points="26,60 44,52 46,70 28,70" fill="#0f172a" />
        <polygon points="28,62 42,55 44,68 30,68" fill="#38bdf8" opacity="0.5" />

        {/* Side Window */}
        <polygon points="47,53 68,48 68,68 47,70" fill="#0f172a" />

        {/* Big Chrome Grille */}
        <polygon points="17,72 24,69 24,91 17,91" fill="url(#redChr)" />
        <circle cx="20" cy="81" r="2" fill="#ef4444" />

        {/* Headlights */}
        <rect x="18" y="86" width="4" height="4" rx="1" fill="#fef08a" />

        {/* Chrome Bumper */}
        <polygon points="14,92 34,91 34,98 14,98" fill="url(#redChr)" />

        {/* Wheels */}
        <circle cx="42" cy="104" r="14" fill="url(#rtire)" />
        <circle cx="42" cy="104" r="7" fill="#cbd5e1" />
        <circle cx="42" cy="104" r="3" fill="#991b1b" />

        <circle cx="160" cy="98" r="14" fill="url(#rtire)" />
        <circle cx="160" cy="98" r="7" fill="#cbd5e1" />
        <circle cx="160" cy="98" r="3" fill="#475569" />

        <circle cx="190" cy="95" r="14" fill="url(#rtire)" />
        <circle cx="190" cy="95" r="7" fill="#cbd5e1" />
        <circle cx="190" cy="95" r="3" fill="#475569" />
      </svg>
    )
  }

  // 4. SILVER / FREIGHTLINER CASCADIA
  if (type === 'silver_semi' || type === 'freightliner') {
    return (
      <svg className={className} viewBox="0 0 240 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="silvCab" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f1f5f9" />
            <stop offset="60%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          <linearGradient id="silvTr" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          <radialGradient id="stire" cx="50%" cy="50%" r="50%">
            <stop offset="40%" stopColor="#020617" />
            <stop offset="70%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
        </defs>

        <ellipse cx="120" cy="125" rx="100" ry="10" fill="#000000" opacity="0.35" />

        {/* Trailer */}
        <polygon points="75,28 215,16 215,75 75,88" fill="url(#silvTr)" />
        <rect x="75" y="80" width="140" height="3" fill="#3b82f6" />
        <text x="100" y="52" fill="#475569" opacity="0.85" fontSize="7" fontWeight="bold" fontFamily="sans-serif" transform="rotate(-5 100 52)">
          FREIGHTLINER CASCADIA
        </text>

        {/* Silver Cab */}
        <polygon points="32,45 75,32 75,90 32,95" fill="url(#silvCab)" />
        <path d="M 18,72 L 32,58 L 48,58 L 48,94 L 18,92 Z" fill="url(#silvCab)" />
        
        {/* Windshield */}
        <polygon points="26,60 44,52 46,70 28,70" fill="#0f172a" />
        <polygon points="28,62 42,55 44,68 30,68" fill="#38bdf8" opacity="0.5" />

        {/* Side Window */}
        <polygon points="47,53 68,48 68,68 47,70" fill="#0f172a" />

        {/* Front Grille */}
        <polygon points="17,74 24,71 24,91 17,91" fill="#334155" />
        <rect x="18" y="86" width="4" height="4" rx="1" fill="#38bdf8" />

        {/* Bumper */}
        <polygon points="14,92 34,91 34,98 14,98" fill="#475569" />

        {/* Wheels */}
        <circle cx="42" cy="104" r="14" fill="url(#stire)" />
        <circle cx="42" cy="104" r="7" fill="#cbd5e1" />
        <circle cx="42" cy="104" r="3" fill="#475569" />

        <circle cx="160" cy="98" r="14" fill="url(#stire)" />
        <circle cx="160" cy="98" r="7" fill="#cbd5e1" />
        <circle cx="160" cy="98" r="3" fill="#475569" />

        <circle cx="190" cy="95" r="14" fill="url(#stire)" />
        <circle cx="190" cy="95" r="7" fill="#cbd5e1" />
        <circle cx="190" cy="95" r="3" fill="#475569" />
      </svg>
    )
  }

  // 5. YELLOW COMMERCIAL BOX TRUCK / RIDER KTM
  if (type === 'yellow_truck' || type === 'rider') {
    return (
      <svg className={className} viewBox="0 0 240 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="yelCab" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="60%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="whiteBox" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>
          <radialGradient id="ytire" cx="50%" cy="50%" r="50%">
            <stop offset="40%" stopColor="#020617" />
            <stop offset="70%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
        </defs>

        <ellipse cx="120" cy="125" rx="100" ry="10" fill="#000000" opacity="0.35" />

        {/* Cargo Box */}
        <polygon points="75,25 215,14 215,80 75,92" fill="url(#whiteBox)" />
        <rect x="75" y="84" width="140" height="3" fill="#f59e0b" />
        <text x="110" y="52" fill="#78350f" opacity="0.85" fontSize="8" fontWeight="bold" fontFamily="sans-serif" transform="rotate(-5 110 52)">
          RIDER EXPRESS
        </text>

        {/* Yellow Cab (Cab-Over Design) */}
        <polygon points="25,50 74,42 74,95 25,98" fill="url(#yelCab)" />
        
        {/* Windshield */}
        <polygon points="28,54 70,47 70,70 28,73" fill="#0f172a" />
        <polygon points="30,56 68,49 68,68 30,71" fill="#38bdf8" opacity="0.5" />

        {/* Front Black Bumper & Grille */}
        <polygon points="23,78 72,74 72,96 23,98" fill="#1e293b" />
        <rect x="26" y="84" width="6" height="4" rx="1" fill="#fef08a" />
        <rect x="62" y="81" width="6" height="4" rx="1" fill="#fef08a" />

        {/* Wheels */}
        <circle cx="48" cy="105" r="14" fill="url(#ytire)" />
        <circle cx="48" cy="105" r="7" fill="#cbd5e1" />
        <circle cx="48" cy="105" r="3" fill="#f59e0b" />

        <circle cx="170" cy="98" r="14" fill="url(#ytire)" />
        <circle cx="170" cy="98" r="7" fill="#cbd5e1" />
        <circle cx="170" cy="98" r="3" fill="#475569" />
      </svg>
    )
  }

  // 6. BLUE HEAVY TRUCK / VOLVO VNL 860 (Default)
  return (
    <svg className={className} viewBox="0 0 240 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="blueCab" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
        <linearGradient id="blueTr" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id="vnlChr" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <radialGradient id="btire" cx="50%" cy="50%" r="50%">
          <stop offset="40%" stopColor="#020617" />
          <stop offset="70%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>
      </defs>

      <ellipse cx="120" cy="125" rx="100" ry="10" fill="#000000" opacity="0.35" />

      {/* Trailer */}
      <polygon points="75,28 215,16 215,75 75,88" fill="url(#blueTr)" />
      <rect x="75" y="80" width="140" height="3" fill="#0284c7" />
      <text x="100" y="52" fill="#0369a1" opacity="0.85" fontSize="7" fontWeight="bold" fontFamily="sans-serif" transform="rotate(-5 100 52)">
        VOLVO VNL 860 FLEET
      </text>

      {/* Blue Cab */}
      <polygon points="32,45 75,32 75,90 32,95" fill="url(#blueCab)" />
      <path d="M 18,72 L 32,58 L 48,58 L 48,94 L 18,92 Z" fill="url(#blueCab)" />
      
      {/* Windshield */}
      <polygon points="26,60 44,52 46,70 28,70" fill="#0f172a" />
      <polygon points="28,62 42,55 44,68 30,68" fill="#38bdf8" opacity="0.5" />

      {/* Side Window */}
      <polygon points="47,53 68,48 68,68 47,70" fill="#0f172a" />

      {/* Front Chrome Grille */}
      <polygon points="17,74 24,71 24,91 17,91" fill="url(#vnlChr)" />
      <line x1="17" y1="78" x2="24" y2={76} stroke="#0284c7" strokeWidth="1.5" />

      {/* Volvo V-Shape Headlight */}
      <polygon points="18,85 23,83 23,89" fill="#38bdf8" />

      {/* Bumper */}
      <polygon points="14,92 34,91 34,98 14,98" fill="url(#vnlChr)" />

      {/* Wheels */}
      <circle cx="42" cy="104" r="14" fill="url(#btire)" />
      <circle cx="42" cy="104" r="7" fill="#cbd5e1" />
      <circle cx="42" cy="104" r="3" fill="#0284c7" />

      <circle cx="160" cy="98" r="14" fill="url(#btire)" />
      <circle cx="160" cy="98" r="7" fill="#cbd5e1" />
      <circle cx="160" cy="98" r="3" fill="#475569" />

      <circle cx="190" cy="95" r="14" fill="url(#btire)" />
      <circle cx="190" cy="95" r="7" fill="#cbd5e1" />
      <circle cx="190" cy="95" r="3" fill="#475569" />
    </svg>
  )
}

export default Vehicle3DRender
