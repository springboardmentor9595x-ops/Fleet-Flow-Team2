import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/axios'
import TruckLoader from '../ui/TruckLoader'

function NotificationsPanel() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const loadNotifications = async () => {
    try {
      setIsLoading(true)
      // 1. Get current driver's profile to find their driver_id
      const driversRes = await api.get('/drivers')
      const matchedDriver = driversRes.data.find(d => d.user_id === user?.user_id)
      
      if (!matchedDriver) {
        setNotifications([])
        return
      }

      // 2. Fetch shipments and filter for those assigned to this driver
      const shipmentsRes = await api.get('/shipments')
      const assignedShipments = shipmentsRes.data.filter(
        s => s.driver_id === matchedDriver.driver_id && s.status !== 'Delivered' && s.status !== 'Cancelled'
      )

      // 3. Map assigned shipments to notification structures
      const notificationsList = assignedShipments.map(s => ({
        id: s.shipment_id,
        title: '📋 NEW MANIFEST ASSIGNMENT',
        message: `You have been assigned to Shipment ${s.tracking_number} from ${s.source} to ${s.destination}. Total weight is ${s.shipment_weight.toLocaleString()} lbs.`,
        time: s.created_at ? new Date(s.created_at).toLocaleString() : new Date().toLocaleString(),
        type: 'assignment',
        trackingNumber: s.tracking_number
      }))

      setNotifications(notificationsList)
    } catch (err) {
      console.error('Failed to load notifications:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [user])

  if (isLoading) {
    return (
      <div className="min-h-[300px] flex flex-col justify-center items-center font-mono">
        <TruckLoader />
        <div className="text-[10px] text-white/50 uppercase tracking-widest mt-6 animate-pulse">
          Syncing Notification Feed...
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto glass-card border border-white/10 p-6 md:p-8 bg-slate-950/40 font-mono text-xs text-white/90">
      <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-6">
        <h2 className="text-sm font-bold text-white tracking-wide uppercase m-0 flex items-center gap-2">
          🔔 [ NOTIFICATION QUEUE ]
        </h2>
        {notifications.length > 0 && (
          <span className="px-2 py-0.5 bg-cyan-950 border border-cyan-500/30 text-[#00f0ff] font-bold rounded text-[9px] uppercase tracking-wider animate-pulse">
            {notifications.length} Active Alerts
          </span>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-3xl mb-4">🔔</div>
          <div className="text-white/40 font-bold uppercase tracking-wider mb-2">NO NEW NOTIFICATIONS</div>
          <p className="text-white/30 text-[10px] uppercase tracking-wide max-w-xs mx-auto">
            Your telemetry alerts and shipment assignments queue is currently empty.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="p-4 border border-cyan-500/10 bg-cyan-950/5 hover:border-cyan-500/30 hover:bg-cyan-950/10 rounded-2xl transition-all duration-300 relative overflow-hidden group shadow-[0_4px_20px_rgba(0,240,255,0.02)]"
            >
              {/* Laser Accent Glow Line */}
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-cyan-400 group-hover:bg-cyan-300 transition-colors" />
              
              <div className="pl-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                  <h3 className="text-xs font-bold text-cyan-400 m-0 uppercase tracking-wide">
                    {n.title}
                  </h3>
                  <span className="text-[9px] text-white/30 whitespace-nowrap">
                    // {n.time}
                  </span>
                </div>
                <p className="text-white/70 leading-relaxed m-0 text-[11px]">
                  {n.message}
                </p>
                <div className="mt-3 flex items-center space-x-2 text-[9px] text-white/40 font-bold">
                  <span>MANIFEST ID:</span>
                  <span className="text-cyan-400/80 uppercase">{n.trackingNumber}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default NotificationsPanel
