import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import DayNightToggle from '../components/ui/DayNightToggle'

// Small scroll-reveal wrapper: fades + slides content up the first time it enters the viewport.
function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`ff-reveal ${visible ? 'ff-reveal-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

export default function LandingPage() {
  const { isDark } = useTheme()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('dispatcher')
  const [activeTruckIndex, setActiveTruckIndex] = useState(0)

  // Animated KPI numbers state (Low to Target Value)
  const [miles, setMiles] = useState(0)
  const [onTimeRate, setOnTimeRate] = useState(0)
  const [latency, setLatency] = useState(120)
  const [accuracy, setAccuracy] = useState(0)

  // Live Telemetry simulated state
  const [telemetryState, setTelemetryState] = useState({
    speed: 64,
    fuel: 82.4,
    rpm: 1450,
    progress: 68,
    odometer: 148290.5,
    temp: 88,
    lastEvent: 'Passed NH-16 Toll Plaza • Moving at steady speed'
  })

  const isAuthenticated = !!user

  // Sample fleet vehicles for interactive telemetry switch
  const activeFleet = [
    {
      id: 'TRK-9090',
      model: 'Volvo VNL 860',
      plate: 'AP31-TR-9090',
      driver: 'Rajesh Kumar',
      origin: 'Srikakulam Depot',
      destination: 'Vizianagaram Hub',
      distanceRemaining: '38 km',
      eta: '22 mins',
      image: '/vehicles/volvo_vnl_860.png',
      status: 'On Highway NH-16'
    },
    {
      id: 'TRK-4421',
      model: 'Freightliner Cascadia',
      plate: 'TS09-UB-4421',
      driver: 'Elena Rostova',
      origin: 'Visakhapatnam Port',
      destination: 'Vijayawada Cargo Terminal',
      distanceRemaining: '112 km',
      eta: '1 hr 35 mins',
      image: '/vehicles/freightliner_cascadia.png',
      status: 'Cruising at 70 km/h'
    },
    {
      id: 'TRK-7812',
      model: 'Peterbilt 579',
      plate: 'KA04-EX-7812',
      driver: 'Marcus Vance',
      origin: 'Vijayawada Express Hub',
      destination: 'Hyderabad Logistics Park',
      distanceRemaining: '185 km',
      eta: '2 hrs 40 mins',
      image: '/vehicles/peterbilt_579.png',
      status: 'Approaching Outer Ring Road'
    }
  ]

  // KPI count-up animation on page load
  useEffect(() => {
    const duration = 1600
    const interval = 20
    const steps = duration / interval
    let stepCount = 0

    const timer = setInterval(() => {
      stepCount++
      const progress = Math.min(stepCount / steps, 1)
      const ease = 1 - Math.pow(1 - progress, 3)

      setMiles(Math.floor(ease * 52400))
      setOnTimeRate(Number((ease * 99.8).toFixed(1)))
      setLatency(Math.max(24, Math.floor(120 - ease * 96)))
      setAccuracy(Math.floor(ease * 100))

      if (progress >= 1) {
        clearInterval(timer)
      }
    }, interval)

    return () => clearInterval(timer)
  }, [])

  // Live telemetry pulse animation every 2.2 seconds
  useEffect(() => {
    const liveTimer = setInterval(() => {
      setTelemetryState(prev => {
        const nextSpeed = Math.floor(60 + Math.random() * 12)
        const nextRpm = Math.floor(1380 + Math.random() * 140)
        const nextProgress = prev.progress >= 95 ? 20 : prev.progress + 0.4
        const nextFuel = Math.max(20, (prev.fuel - 0.02)).toFixed(1)
        const nextOdo = (prev.odometer + 0.05).toFixed(1)
        const nextTemp = Math.floor(86 + Math.random() * 4)

        const events = [
          'GPS Signal: 5G Satellite Lock • High Precision',
          'NH-16 Highway speed monitored • Cruise Control Active',
          'Engine Diagnostics: 100% Normal • No Fault Codes',
          'Next Delivery Stop: On Schedule • Zero Delay'
        ]
        const randomEvent = events[Math.floor(Math.random() * events.length)]

        return {
          speed: nextSpeed,
          fuel: Number(nextFuel),
          rpm: nextRpm,
          progress: Number(nextProgress.toFixed(1)),
          odometer: Number(nextOdo),
          temp: nextTemp,
          lastEvent: randomEvent
        }
      })
    }, 2200)

    return () => clearInterval(liveTimer)
  }, [])

  const currentTruck = activeFleet[activeTruckIndex]

  const features = [
    {
      icon: '🗺️',
      title: 'Live GPS Map Tracking',
      desc: 'Track all your trucks on real-time maps with accurate turn-by-turn routes and instant arrival times.',
      tag: 'LIVE MAPS'
    },
    {
      icon: '⛽',
      title: 'Fuel & Expense Tracker',
      desc: 'Record diesel fill-ups, calculate mileage automatically, and monitor fuel spending per vehicle with simple charts.',
      tag: 'COST SAVINGS'
    },
    {
      icon: '🔧',
      title: 'Service & Maintenance Alerts',
      desc: 'Receive automatic notifications before vehicle service is due to prevent costly breakdowns on the road.',
      tag: 'ALERTS'
    },
    {
      icon: '📦',
      title: 'Easy Shipment Management',
      desc: 'Assign drivers to trips in one click, generate digital manifests, and keep customers updated at every milestone.',
      tag: 'DISPATCH'
    },
    {
      icon: '🏆',
      title: 'Driver Performance & Roster',
      desc: 'Celebrate top-performing drivers with leaderboard rankings, track daily attendance, and ensure road safety.',
      tag: 'DRIVERS'
    },
    {
      icon: '🛡️',
      title: 'Simple Role-Based Access',
      desc: 'Dedicated and clean dashboards designed specifically for Administrators, Fleet Managers, Dispatchers, and Drivers.',
      tag: 'SECURITY'
    }
  ]

  const workspacePreviews = {
    dispatcher: {
      role: 'DISPATCHER WORKSPACE',
      title: 'Quick Route Planning & One-Click Dispatch',
      desc: 'Book new shipments, choose the best route, and assign available vehicles and drivers without any scheduling clashes.',
      highlights: [
        'Shortest route suggestions',
        'Live highway tracking & trip progress',
        'Automated customer delivery status updates',
        'Instant driver contact and trip notes'
      ]
    },
    fleetManager: {
      role: 'FLEET MANAGER WORKSPACE',
      title: 'Complete Vehicle Health & Fuel Control',
      desc: 'Keep track of all vehicles, audit fuel bills, review odometer readings, and stay ahead of vehicle service dates.',
      highlights: [
        'Automatic service due reminders (7 days, 1 day, today)',
        'Fuel cost vs distance comparison reports',
        'Vehicle status roster (Active, In-Shop, Idle)',
        'Downloadable Excel & PDF maintenance summaries'
      ]
    },
    driver: {
      role: 'DRIVER WORKSPACE',
      title: 'Clear Trip Details & Easy Daily Check-In',
      desc: 'Drivers get a straightforward view of their assigned trips, route directions, daily attendance check-in, and top driver rewards.',
      highlights: [
        'One-tap trip start and milestone completion',
        'Top 3 driver podium awards & safety scorecards',
        'Simple daily attendance check-in button',
        'Quick fuel receipt logging directly from the road'
      ]
    }
  }

  return (
    <div className={`min-h-screen w-full select-none font-sans transition-colors duration-300 overflow-x-hidden ${
      isDark ? 'bg-[#030712] text-white' : 'bg-[#f4f7fb] text-slate-900'
    }`}>

      {/* ========================================================= */}
      {/* GLOBAL ANIMATION STYLES                                   */}
      {/* ========================================================= */}
      <style>{`
        /* Nav-jump offset is handled per-section via Tailwind's scroll-mt-* classes
           (see #telemetry / #features / #workspaces / #architecture below), so the
           fixed navbar clears the top of each section without double-offsetting. */
        html {
          scroll-behavior: smooth;
        }

        @keyframes ffFadeUp { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        .ff-fade-up { opacity: 0; animation: ffFadeUp 0.75s cubic-bezier(0.22, 1, 0.36, 1) both; }

        @keyframes ffShine { to { background-position: 200% center; } }
        .ff-gradient-text { background-size: 200% auto; animation: ffShine 5s linear infinite; }

        @keyframes ffFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .ff-float { animation: ffFloat 4.5s ease-in-out infinite; }

        @keyframes ffDrift { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(24px, -18px); } }
        .ff-drift-a { animation: ffDrift 11s ease-in-out infinite; }
        .ff-drift-b { animation: ffDrift 14s ease-in-out infinite reverse; }

        @keyframes ffDash { to { stroke-dashoffset: -200; } }
        .ff-route-line { animation: ffDash 7s linear infinite; }

        @keyframes ffGlow {
          0%, 100% { box-shadow: 0 0 30px rgba(6,182,212,0.15); }
          50% { box-shadow: 0 0 55px rgba(6,182,212,0.32); }
        }
        .ff-glow { animation: ffGlow 4s ease-in-out infinite; }

        @keyframes ffSweep { from { left: -75%; } to { left: 125%; } }
        .ff-shine { position: relative; overflow: hidden; }
        .ff-shine::after {
          content: '';
          position: absolute;
          top: 0; left: -75%;
          width: 45%; height: 100%;
          background: linear-gradient(120deg, transparent, rgba(255,255,255,0.45), transparent);
          transform: skewX(-20deg);
          pointer-events: none;
        }
        .ff-shine:hover::after { animation: ffSweep 0.85s ease forwards; }

        .ff-nav-link { position: relative; }
        .ff-nav-link::after {
          content: '';
          position: absolute;
          left: 0; bottom: -5px;
          width: 0; height: 2px;
          background: linear-gradient(to right, #22d3ee, #2563eb);
          transition: width 0.3s ease;
        }
        .ff-nav-link:hover::after { width: 100%; }

        @keyframes ffProgressShine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
        .ff-progress-shine {
          position: absolute; inset: 0; overflow: hidden;
        }
        .ff-progress-shine::after {
          content: '';
          position: absolute; top: 0; left: 0;
          width: 30%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent);
          animation: ffProgressShine 2.2s ease-in-out infinite;
        }

        .ff-reveal {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1), transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .ff-reveal-visible { opacity: 1; transform: translateY(0); }

        .ff-card-lift { transition: transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease; }
        .ff-card-lift:hover { transform: translateY(-4px); }

        @media (prefers-reduced-motion: reduce) {
          .ff-fade-up, .ff-gradient-text, .ff-float, .ff-drift-a, .ff-drift-b,
          .ff-route-line, .ff-glow, .ff-shine::after, .ff-progress-shine::after,
          .ff-reveal, .ff-card-lift {
            animation: none !important;
            transition: none !important;
          }
          .ff-reveal { opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      {/* ========================================================= */}
      {/* 1. FIXED TOP NAVBAR                                       */}
      {/* ========================================================= */}
      <header className={`fixed top-0 left-0 right-0 z-50 w-full border-b backdrop-blur-xl transition-colors duration-300 ${
        isDark
          ? 'bg-[#030712]/90 border-slate-800/80 text-white'
          : 'bg-white/90 border-slate-200/90 text-slate-900 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">

          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group text-decoration-none">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 font-black text-xl shadow-[0_0_20px_rgba(6,182,212,0.5)] group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300 shrink-0">
              F
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`text-xl font-black tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  FLEET<span className="text-cyan-500">FLOW</span>
                </span>
                
              </div>
              <p className={`text-[9px] font-mono font-bold tracking-widest uppercase m-0 mt-0.5 ${
                isDark ? 'text-cyan-400/80' : 'text-slate-500'
              }`}>
                Smart Fleet & Logistics Management
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-mono font-bold tracking-wider">
            <a href="#telemetry" className={`ff-nav-link transition-colors hover:text-cyan-400 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Live Telemetry
            </a>
            <a href="#features" className={`ff-nav-link transition-colors hover:text-cyan-400 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Key Features
            </a>
            <a href="#workspaces" className={`ff-nav-link transition-colors hover:text-cyan-400 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Workspaces
            </a>
            <a href="#architecture" className={`ff-nav-link transition-colors hover:text-cyan-400 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Architecture
            </a>
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            <DayNightToggle />

            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="ff-shine px-5 py-2.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
              >
                <span>Dashboard</span>
                <span>→</span>
              </Link>
            ) : (
              <div className="hidden sm:flex items-center gap-2.5">
                <Link
                  to="/login"
                  className={`px-4 py-2 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all border ${
                    isDark
                      ? 'border-slate-800 hover:border-cyan-500/50 text-slate-200 hover:text-white bg-slate-900/60'
                      : 'border-slate-200 hover:border-blue-400 text-slate-700 hover:text-slate-900 bg-white shadow-xs'
                  }`}
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="ff-shine px-4.5 py-2 rounded-xl font-mono font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950 shadow-[0_0_18px_rgba(6,182,212,0.4)] hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <span>Register →</span>
                </Link>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Spacer to offset the fixed header height */}
      <div className="h-16 sm:h-20" />

      {/* ========================================================= */}
      {/* 2. HERO — headline + the live telemetry cockpit           */}
      {/* ========================================================= */}
      <section className="relative w-full pt-10 pb-20 sm:pt-14 sm:pb-24 overflow-hidden">

        {/* Photorealistic Truck Background Image */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <img
            src={isDark ? '/images/fleet_night_highway.jpg' : '/images/fleet_day_highway.jpg'}
            alt="Highway Fleet Background"
            className={`w-full h-full object-cover object-center transition-all duration-700 ${
              isDark ? 'opacity-45 brightness-95' : 'opacity-85 brightness-100 contrast-[1.03]'
            }`}
          />
          <div className={`absolute inset-0 transition-colors duration-500 ${
            isDark
              ? 'bg-gradient-to-b from-[#030712]/90 via-[#030712]/75 to-[#030712]'
              : 'bg-gradient-to-b from-white/65 via-white/40 to-[#f4f7fb]'
          }`}></div>

          {/* Drifting ambient glows */}
          <div className="ff-drift-a absolute top-[10%] left-[15%] w-[45vw] h-[45vw] rounded-full bg-cyan-500/10 blur-[140px]"></div>
          <div className="ff-drift-b absolute top-[35%] right-[10%] w-[40vw] h-[40vw] rounded-full bg-blue-600/15 blur-[130px]"></div>

          {/* Faint animated route line threading through the hero */}
          <svg className="absolute top-[8%] left-0 w-full h-[300px] opacity-40" viewBox="0 0 1400 300" preserveAspectRatio="none">
            <path
              className="ff-route-line"
              d="M -50 220 C 250 140, 450 260, 700 150 S 1150 20, 1450 90"
              fill="none"
              stroke={isDark ? '#22d3ee' : '#2563eb'}
              strokeWidth="2"
              strokeDasharray="3 16"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">

          <div className="max-w-4xl mx-auto space-y-4">
            <h1 className="ff-fade-up text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.12] m-0" style={{ animationDelay: '80ms' }}>
              <span className={isDark ? 'text-white' : 'text-slate-900'}>
                Smart Fleet Management &{' '}
              </span>
              <span
                className="ff-gradient-text text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500"
                style={{ backgroundSize: '200% auto' }}
              >
                Live GPS Tracking.
              </span>
            </h1>
            <p
              className={`ff-fade-up text-base sm:text-xl font-normal max-w-3xl mx-auto leading-relaxed mt-4 ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}
              style={{ animationDelay: '200ms' }}
            >
              Track your trucks in real-time, plan the fastest routes, monitor fuel expenses, and prevent vehicle breakdowns with automated maintenance alerts.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="ff-fade-up flex flex-col sm:flex-row items-center justify-center gap-4 pt-1" style={{ animationDelay: '320ms' }}>
            <Link
              to={isAuthenticated ? '/dashboard' : '/signup'}
              className="ff-shine w-full sm:w-auto px-8 py-4 rounded-2xl font-mono font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-500 text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.45)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>{isAuthenticated ? 'Open Operations Console' : 'Register for Free'}</span>
              <span className="text-lg">→</span>
            </Link>
            <Link
              to="/login"
              className={`w-full sm:w-auto px-7 py-4 rounded-2xl font-mono font-bold text-sm uppercase tracking-wider border transition-all flex items-center justify-center gap-2 ${
                isDark
                  ? 'bg-slate-900/80 border-slate-800 hover:border-cyan-500/50 text-slate-200 hover:text-white backdrop-blur-md'
                  : 'bg-white/95 border-slate-300 hover:border-blue-400 text-slate-800 hover:text-slate-950 shadow-md backdrop-blur-md'
              }`}
            >
              <span>Sign In to Portal →</span>
            </Link>
          </div>

          {/* ========================================================= */}
          {/* LIVE TELEMETRY COCKPIT — styled as a route manifest card   */}
          {/* ========================================================= */}
          <div id="telemetry" className="ff-fade-up scroll-mt-20 sm:scroll-mt-24 pt-6 max-w-5xl mx-auto text-left" style={{ animationDelay: '440ms' }}>

            {/* Vehicle Selection Chips */}
            <div className="flex items-center justify-between gap-2 mb-3 px-1 overflow-x-auto">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-cyan-500 uppercase tracking-wider hidden sm:inline">
                  Select Active Truck:
                </span>
                {activeFleet.map((truck, idx) => (
                  <button
                    key={truck.id}
                    onClick={() => setActiveTruckIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all duration-300 cursor-pointer border ${
                      activeTruckIndex === idx
                        ? isDark
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                          : 'bg-blue-600 border-blue-600 text-white shadow-md'
                        : isDark
                          ? 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                          : 'bg-white/90 border-slate-200 text-slate-700 hover:text-slate-900 shadow-xs'
                    }`}
                  >
                    🚛 {truck.model.split(' ')[0]} ({truck.plate})
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-emerald-500 font-bold hidden sm:inline">LIVE FEED ACTIVE</span>
              </div>
            </div>

            {/* Main Interactive Telemetry Card — manifest / ticket styling */}
            <div className={`relative rounded-3xl border shadow-2xl overflow-hidden backdrop-blur-xl transition-all ${
              isDark
                ? 'bg-[#081228]/95 border-cyan-500/30 ff-glow'
                : 'bg-white/95 border-slate-200 shadow-2xl'
            }`}>

              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-7 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-xl shrink-0">
                    🚚
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black font-mono uppercase tracking-wider m-0">
                        {currentTruck.model}
                      </h3>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                        {currentTruck.plate}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400 m-0 mt-0.5">
                      Driver: <strong className="text-slate-700 dark:text-slate-200">{currentTruck.driver}</strong> • Route: <span className="text-cyan-500 font-bold">{currentTruck.origin} ➔ {currentTruck.destination}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 font-mono text-xs font-bold">
                  <div className={`px-3.5 py-1.5 rounded-xl border transition-colors ${
                    isDark ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-cyan-50 border-cyan-200 text-cyan-700'
                  }`}>
                    SPEED: {telemetryState.speed} KM/H
                  </div>
                  <div className={`px-3.5 py-1.5 rounded-xl border transition-colors ${
                    isDark ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'
                  }`}>
                    RPM: {telemetryState.rpm}
                  </div>
                  <div className={`px-3.5 py-1.5 rounded-xl border transition-colors ${
                    isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}>
                    FUEL: {telemetryState.fuel}%
                  </div>
                </div>
              </div>

              {/* Ticket-stub perforation divider */}
              <div className="relative">
                <div className={`absolute -left-3 top-0 w-6 h-6 rounded-full ${isDark ? 'bg-[#030712]' : 'bg-[#f4f7fb]'}`}></div>
                <div className={`absolute -right-3 top-0 w-6 h-6 rounded-full ${isDark ? 'bg-[#030712]' : 'bg-[#f4f7fb]'}`}></div>
                <div className={`border-t border-dashed ${isDark ? 'border-slate-800' : 'border-slate-200'}`}></div>
              </div>

              <div className="p-5 sm:p-7 pt-6">

                {/* Visual Route Progress */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs font-mono font-bold">
                    <span className="text-cyan-500 flex items-center gap-1">
                      <span>📍</span>
                      <span>{currentTruck.origin}</span>
                    </span>
                    <span className="text-cyan-600 dark:text-cyan-300 font-bold flex items-center gap-1">
                      <span>🚛</span>
                      <span>{currentTruck.status} ({currentTruck.distanceRemaining} left)</span>
                    </span>
                    <span className="text-emerald-500 flex items-center gap-1">
                      <span>🏁</span>
                      <span>{currentTruck.destination}</span>
                    </span>
                  </div>

                  <div className="relative w-full h-4 rounded-full bg-slate-200 dark:bg-slate-800 p-0.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-emerald-400 rounded-full transition-all duration-1000 relative overflow-hidden"
                      style={{ width: `${telemetryState.progress}%` }}
                    >
                      <div className="ff-progress-shine"></div>
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md"></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono pt-1">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 block text-[9px] uppercase font-bold mb-1">Est. Arrival</span>
                      <span className="font-bold text-emerald-500">{currentTruck.eta}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 block text-[9px] uppercase font-bold mb-1">Odometer</span>
                      <span className="font-bold text-slate-800 dark:text-slate-100">{telemetryState.odometer} km</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 block text-[9px] uppercase font-bold mb-1">Engine Temp</span>
                      <span className="font-bold text-cyan-500 dark:text-cyan-400">{telemetryState.temp}°C (Normal)</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 block text-[9px] uppercase font-bold mb-1">Geofence</span>
                      <span className="font-bold text-emerald-500 dark:text-emerald-400">Inside Corridor</span>
                    </div>
                  </div>

                  <div className={`px-3.5 py-2 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                    isDark ? 'bg-cyan-500/5 border-cyan-500/20 text-cyan-200/90' : 'bg-blue-50/70 border-blue-200 text-blue-900'
                  }`}>
                    <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                    <span><strong>Live Event:</strong> {telemetryState.lastEvent}</span>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. PLATFORM KPI STRIP (Animated from Low to Target)         */}
      {/* ========================================================= */}
      <section className={`w-full border-y py-10 transition-colors ${
        isDark ? 'bg-[#050b18] border-slate-800/80 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 divide-y-2 md:divide-y-0 md:divide-x-2 divide-dashed text-center font-mono ${
          isDark ? 'divide-slate-800' : 'divide-slate-200'
        }`}>

          {[
            { value: `${miles.toLocaleString()}+`, label: 'Kilometers Tracked Live', color: 'text-cyan-500' },
            { value: `${onTimeRate}%`, label: 'On-Time Delivery Rate', color: 'text-blue-600 dark:text-blue-500' },
            { value: `< ${latency}ms`, label: 'Live Map Latency', color: 'text-emerald-500 dark:text-emerald-400' },
            { value: `${accuracy}%`, label: 'Zero Schedule Conflicts', color: 'text-indigo-500 dark:text-indigo-400' }
          ].map((kpi, idx) => (
            <Reveal key={idx} delay={idx * 90} className="py-4 md:py-0 space-y-2">
              <div className={`text-3xl sm:text-5xl font-black tracking-tight leading-none ${kpi.color}`}>
                {kpi.value}
              </div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pt-1">
                {kpi.label}
              </div>
            </Reveal>
          ))}

        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. CORE FEATURES & CAPABILITIES                           */}
      {/* ========================================================= */}
      <section id="features" className="scroll-mt-24 sm:scroll-mt-28 py-20 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <Reveal className="text-center space-y-3 mb-14">
          <span className="text-xs font-mono font-bold text-cyan-500 uppercase tracking-widest block">
            Everything You Need
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight m-0 mb-3">
            Built for Smooth Fleet Operations.
          </h2>
          <p className={`text-base max-w-2xl mx-auto leading-relaxed mt-2 ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Simple, powerful tools designed to manage trucks, drivers, fuel, and customer shipments from one screen.
          </p>
        </Reveal>

        <div className={`grid grid-cols-1 md:grid-cols-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          {features.map((f, idx) => (
            <Reveal key={idx} delay={(idx % 2) * 100}>
              <div
                className={`ff-card-lift flex gap-5 p-7 sm:p-8 border-b h-full ${idx % 2 === 0 ? 'md:border-r' : ''} ${
                  isDark ? 'border-slate-800 hover:bg-white/[0.02]' : 'border-slate-200 hover:bg-black/[0.015]'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 border ${
                  isDark ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200'
                }`}>
                  {f.icon}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <h3 className="text-base sm:text-lg font-black tracking-tight m-0">{f.title}</h3>
                    <span className="text-[10px] font-mono font-bold text-cyan-500 uppercase tracking-wide shrink-0">{f.tag}</span>
                  </div>
                  <p className={`text-sm leading-relaxed m-0 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {f.desc}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

      </section>

      {/* ========================================================= */}
      {/* 5. ROLE-SPECIFIC WORKSPACES                               */}
      {/* ========================================================= */}
      <section id="workspaces" className={`scroll-mt-24 sm:scroll-mt-28 py-20 border-t transition-colors ${
        isDark ? 'bg-[#050b18] border-slate-800/80' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <Reveal className="text-center space-y-3 mb-12">
            <span className="text-xs font-mono font-bold text-cyan-500 uppercase tracking-widest block">
              Workspaces by Role
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight m-0 mb-3">
              Designed for Everyone on Your Team.
            </h2>
            <p className={`text-sm sm:text-base max-w-xl mx-auto leading-relaxed ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Each role gets a focused view with only the actions and metrics they need.
            </p>
          </Reveal>

          {/* Workspace Tabs Header */}
          <Reveal delay={100} className="flex justify-center gap-3 mb-8 overflow-x-auto pb-2">
            {[
              { key: 'dispatcher', label: 'Dispatcher Hub', icon: '📦' },
              { key: 'fleetManager', label: 'Fleet & Service', icon: '🚚' },
              { key: 'driver', label: 'Driver Cockpit', icon: '🪪' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3 rounded-2xl font-mono font-bold text-xs uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-2 border ${
                  activeTab === tab.key
                    ? isDark
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                      : 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </Reveal>

          {/* Active Workspace Showcase Card */}
          <Reveal delay={180} className="max-w-4xl mx-auto">
            <div className={`p-8 sm:p-10 rounded-3xl border shadow-xl text-left transition-all duration-500 ${
              isDark ? 'bg-[#081228] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}>
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block mb-2">
                    {workspacePreviews[activeTab].role}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug m-0 mb-3">
                    {workspacePreviews[activeTab].title}
                  </h3>
                  <p className={`text-base leading-relaxed m-0 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {workspacePreviews[activeTab].desc}
                  </p>
                </div>

                <div className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                  {workspacePreviews[activeTab].highlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-3 py-3 text-xs font-mono font-bold">
                      <span className="text-cyan-400 text-sm shrink-0">✓</span>
                      <span>{h}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-5 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                  <Link
                    to="/signup"
                    className="ff-shine px-6 py-3 rounded-xl font-mono font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-cyan-400 to-blue-600 text-slate-950 shadow-md hover:brightness-110 active:scale-95 transition-all"
                  >
                    Register for {workspacePreviews[activeTab].role.split(' ')[0]} Workspace →
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. RELIABLE TECHNOLOGY STACK                              */}
      {/* ========================================================= */}
      <section id="architecture" className="scroll-mt-24 sm:scroll-mt-28 py-20 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center space-y-3 mb-12">
          <span className="text-xs font-mono font-bold text-cyan-500 uppercase tracking-widest block">
            System Infrastructure
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight m-0 mb-3">
            Fast, Reliable & Always Available.
          </h2>
          <p className={`text-sm sm:text-base max-w-lg mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Built on top-tier cloud technologies to guarantee high uptime and instant map response.
          </p>
        </Reveal>

        <div className={`rounded-3xl border overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          {[
            { name: 'FastAPI', role: 'High-Speed API', icon: '⚡' },
            { name: 'PostgreSQL', role: 'Secure Database', icon: '🐘' },
            { name: 'Redis Pub/Sub', role: 'Instant GPS Updates', icon: '🔴' },
            { name: 'Celery & Beat', role: 'Automatic Reminders', icon: '🌿' },
            { name: 'React + Vite', role: 'Fast Web Interface', icon: '⚛️' },
            { name: 'Docker Cloud', role: '24/7 Uptime', icon: '☁️' }
          ].map((tech, idx) => (
            <Reveal key={idx} delay={idx * 60}>
              <div
                className={`flex items-center gap-4 px-6 py-4 font-mono text-xs transition-colors duration-300 hover:bg-cyan-500/5 ${idx !== 5 ? 'border-b' : ''} ${
                  isDark ? 'border-slate-800 even:bg-[#081228]/60' : 'border-slate-200 even:bg-slate-50'
                }`}
              >
                <span className="text-lg">{tech.icon}</span>
                <span className="font-black text-sm w-40 shrink-0">{tech.name}</span>
                <span className="text-slate-500">{tech.role}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 7. BOTTOM CALL TO ACTION BANNER                          */}
      {/* ========================================================= */}
      <section className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className={`p-8 sm:p-14 rounded-[36px] border text-center space-y-6 relative overflow-hidden ${
            isDark
              ? 'bg-gradient-to-r from-blue-950 via-[#0a1b38] to-cyan-950 border-cyan-500/40 ff-glow'
              : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-2xl'
          }`}>
            <div className="max-w-2xl mx-auto space-y-3">
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight m-0 mb-3">
                Ready to simplify your fleet management?
              </h2>
              <p className="text-base text-cyan-100 max-w-xl mx-auto leading-relaxed">
                Create your account in seconds and experience real-time tracking, automated alerts, and effortless dispatching.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-3">
              <Link
                to="/signup"
                className="ff-shine w-full sm:w-auto px-8 py-4 rounded-2xl font-mono font-bold text-sm uppercase tracking-wider bg-white text-slate-950 shadow-xl hover:bg-cyan-50 active:scale-95 transition-all"
              >
                Register Now →
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl font-mono font-bold text-sm uppercase tracking-wider border border-white/50 text-white hover:bg-white/10 active:scale-95 transition-all"
              >
                Sign In →
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ========================================================= */}
      {/* 8. FOOTER                                                 */}
      {/* ========================================================= */}
      <footer className={`border-t py-12 transition-colors ${
        isDark ? 'bg-[#020510] border-slate-800/80 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 font-black text-base shadow-sm">
                F
              </div>
              <span className={`text-lg font-black tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                FLEET<span className={isDark ? 'text-cyan-400' : 'text-blue-600'}>FLOW</span>
              </span>
              <span className="text-xs font-mono text-slate-500">| Smart Logistics Platform</span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-emerald-500 font-bold">ALL SYSTEMS RUNNING NORMALLY</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono pt-6 border-t border-slate-200 dark:border-slate-800/60">
            <div>
              &copy; {new Date().getFullYear()} FleetFlow Logistics. All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login" className="hover:text-cyan-400 transition-colors">Sign In</Link>
              <span>•</span>
              <Link to="/signup" className="hover:text-cyan-400 transition-colors">Register</Link>
              <span>•</span>
              <Link to="/forgot-password" className="hover:text-cyan-400 transition-colors">Reset Password</Link>
            </div>
          </div>

        </div>
      </footer>

    </div>
  )
}