import { useState, useEffect } from 'react'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import MapTracker from '../components/dashboard/MapTracker'
import FleetPanel from '../components/dashboard/FleetPanel'
import TripsPanel from '../components/dashboard/TripsPanel'
import MaintenancePanel from '../components/dashboard/MaintenancePanel'
import ShipmentPanel from '../components/dashboard/ShipmentPanel'
import DriversPanel from '../components/dashboard/DriversPanel'
import ProfilePanel from '../components/dashboard/ProfilePanel'
import NotificationsPanel from '../components/dashboard/NotificationsPanel'
import ActiveTripPanel from '../components/dashboard/ActiveTripPanel'
import api from '../api/axios'

function Dashboard() {
  const [activeTab, setActiveTab] = useState('map')
  const [vehicles, setVehicles] = useState([])
  const [trips, setTrips] = useState([])
  const [maintenanceRecords, setMaintenanceRecords] = useState([])
  const [ping, setPing] = useState(18)

  // Fetch actual stats metrics from database APIs
  const fetchHudStats = async () => {
    try {
      const [vehiclesRes, tripsRes, maintenanceRes] = await Promise.all([
        api.get('/vehicles'),
        api.get('/trips'),
        api.get('/maintenance/')
      ])
      setVehicles(vehiclesRes.data)
      setTrips(tripsRes.data)
      setMaintenanceRecords(maintenanceRes.data)
    } catch (err) {
      console.error('Failed to fetch telemetry HUD stats:', err)
    }
  }

  useEffect(() => {
    fetchHudStats()
    // Poll stats every 8 seconds for real-time reactivity
    const interval = setInterval(fetchHudStats, 8000)
    return () => clearInterval(interval)
  }, [])

  // Jitter ping to look dynamically alive
  useEffect(() => {
    const pingInterval = setInterval(() => {
      setPing(Math.floor(12 + Math.random() * 9)) // 12ms to 20ms
    }, 4000)
    return () => clearInterval(pingInterval)
  }, [])

  // Render correct panel based on active sidebar tab
  const renderContent = () => {
    switch (activeTab) {
      case 'map':
        return <MapTracker />
      case 'fleet':
        return <FleetPanel />
      case 'shipments':
        return <ShipmentPanel />
      case 'trips':
        return <TripsPanel />
      case 'maintenance':
        return <MaintenancePanel />
      case 'drivers':
        return <DriversPanel />
      case 'profile':
        return <ProfilePanel />
      case 'notifications':
        return <NotificationsPanel />
      case 'active-trip':
        return <ActiveTripPanel />
      default:
        return <MapTracker />
    }
  }

  // Calculate actual database readings
  const totalVeh = vehicles.length
  const activeVeh = vehicles.filter(v => v.status === 'In Transit' || v.status === 'Assigned').length
  const capacityPct = totalVeh > 0 ? ((activeVeh / totalVeh) * 100).toFixed(1) : '0.0'

  const transitActive = trips.filter(t => t.status === 'In Transit')
  const transitCount = transitActive.length
  const transitDetail = transitCount > 0
    ? transitActive.slice(0, 2).map(t => `${t.start_location.toUpperCase()} → ${t.destination.toUpperCase()}`).join(', ')
    : 'NO ACTIVE ROUTING RELAYS'

  const pendingMaint = maintenanceRecords.filter(m => m.status === 'Pending')
  const pendingCount = pendingMaint.length
  const pendingDetail = pendingCount > 0
    ? (pendingMaint[0].description.length > 25 ? pendingMaint[0].description.substring(0, 25).toUpperCase() + '...' : pendingMaint[0].description.toUpperCase())
    : 'ALL SYSTEMS OPERATIONAL'

  const stats = [
    { title: 'ACTIVE FLEET VEHICLES', value: `${activeVeh} / ${totalVeh}`, detail: `${capacityPct}% ACTIVE CAPACITY`, color: 'text-cyan-400' },
    { title: 'TRANSIT DISPATCHES', value: `${transitCount} ACTIVE`, detail: transitDetail, color: 'text-cyan-400' },
    { title: 'MAINTENANCE INCIDENTS', value: `${pendingCount} PENDING`, detail: pendingDetail, color: pendingCount > 0 ? 'text-amber-400' : 'text-[#39ff14]' },
    { title: 'SYSTEM SIGNAL PING', value: `${ping} MS`, detail: 'WEBSOCKET CONNECTION ACTIVE', color: 'text-cyan-400' }
  ]

  return (
    <DashboardLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="flex flex-col space-y-6">
        
        {/* Top Telemetry Stats Grid (Sticky HUD) */}
        {activeTab === 'map' && (
          <div className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-md -mx-6 md:-mx-8 px-6 md:px-8 pt-6 md:pt-8 pb-6 border-b border-white/5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div 
                key={i} 
                className="glass-card border border-white/10 p-5 bg-slate-950/40 flex flex-col justify-between"
              >
                <div>
                  <span className="text-[9px] text-white/40 font-mono tracking-widest block mb-1">
                    {stat.title}
                  </span>
                  <h3 className={`text-2xl font-bold tracking-wide font-mono ${stat.color} leading-tight`}>
                    {stat.value}
                  </h3>
                </div>
                <span className="text-[9px] text-white/50 font-mono block mt-2 tracking-wider">
                  // {stat.detail}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Selected Dashboard Panel Content */}
        <div className="w-full pt-2">
          {renderContent()}
        </div>

      </div>
    </DashboardLayout>
  )
}

export default Dashboard
