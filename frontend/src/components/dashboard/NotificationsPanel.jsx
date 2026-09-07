import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNotifications } from '../../context/NotificationContext'
import api from '../../api/axios'
import TruckLoader from '../ui/TruckLoader'

function formatTime(timestamp) {
  if (!timestamp) return 'Just now'
  if (typeof timestamp === 'string' && isNaN(Number(timestamp))) return timestamp
  const date = new Date(Number(timestamp))
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getBadgeStyle(type) {
  switch (type) {
    case 'geofence':
      return {
        border: 'border-rose-500/30',
        bg: 'bg-rose-950/20',
        laser: 'bg-rose-500',
        text: 'text-rose-400',
        icon: '🚨'
      }
    case 'reroute':
    case 'warning':
      return {
        border: 'border-amber-500/30',
        bg: 'bg-amber-950/20',
        laser: 'bg-amber-400',
        text: 'text-amber-400',
        icon: '⚠️'
      }
    case 'assignment':
    case 'shipment':
      return {
        border: 'border-indigo-500/30',
        bg: 'bg-indigo-950/20',
        laser: 'bg-indigo-400',
        text: 'text-indigo-400',
        icon: '📦'
      }
    case 'trip':
      return {
        border: 'border-cyan-500/30',
        bg: 'bg-cyan-950/20',
        laser: 'bg-cyan-400',
        text: 'text-cyan-400',
        icon: '🚚'
      }
    case 'success':
      return {
        border: 'border-emerald-500/30',
        bg: 'bg-emerald-950/20',
        laser: 'bg-emerald-400',
        text: 'text-emerald-400',
        icon: '✅'
      }
    default:
      return {
        border: 'border-cyan-500/20',
        bg: 'bg-cyan-950/10',
        laser: 'bg-cyan-400',
        text: 'text-[#00f0ff]',
        icon: '🔔'
      }
  }
}

function NotificationsPanel() {
  const { user } = useAuth()
  const {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll
  } = useNotifications()

  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const syncDriverAssignments = async () => {
    if (!user?.user_id) return
    try {
      const driversRes = await api.get('/drivers')
      const matchedDriver = driversRes.data.find(d => d.user_id === user?.user_id)
      if (!matchedDriver) return

      const shipmentsRes = await api.get('/shipments')
      const assignedShipments = shipmentsRes.data.filter(
        s => s.driver_id === matchedDriver.driver_id && s.status !== 'Delivered' && s.status !== 'Cancelled'
      )

      assignedShipments.forEach(s => {
        const alreadyExists = notifications.some(
          n => n.id === `assignment-${s.shipment_id}` || (n.message && n.message.includes(s.tracking_number))
        )
        if (!alreadyExists) {
          addNotification({
            title: '📋 MANIFEST ASSIGNMENT',
            message: `You have been assigned to Shipment ${s.tracking_number} from ${s.source} to ${s.destination}. Total weight is ${s.shipment_weight?.toLocaleString() || 'N/A'} lbs.`,
            type: 'assignment'
          })
        }
      })
    } catch (err) {
      console.error('Failed to sync driver assignments:', err)
    }
  }

  // Sync any active driver assignments from backend if not already in notifications
  useEffect(() => {
    syncDriverAssignments()
  }, [user])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await syncDriverAssignments()
    setTimeout(() => {
      setIsRefreshing(false)
    }, 400)
  }

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
    <div className="max-w-4xl mx-auto glass-card border border-white/10 p-6 md:p-8 bg-slate-950/40 font-mono text-xs text-white/90 rounded-2xl shadow-2xl">
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-white/10 pb-5 mb-6 gap-4">
        <div>
          <h2 className="text-sm font-bold text-white tracking-wide uppercase m-0 flex items-center gap-2">
            <span>🔔</span>
            <span>[ NOTIFICATION QUEUE ]</span>
          </h2>
          <p className="text-[10px] text-white/40 m-0 mt-1">
            Real-time geofence events, telemetry dispatches, and route deviation alerts.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center space-x-1 disabled:opacity-50"
            title="Refresh notifications queue"
          >
            <span className={`inline-block ${isRefreshing ? 'animate-spin' : ''}`}>🔄</span>
            <span>{isRefreshing ? 'REFRESHING...' : 'REFRESH'}</span>
          </button>

          {unreadCount > 0 && (
            <span className="px-2.5 py-1 bg-cyan-950/80 border border-cyan-500/40 text-[#00f0ff] font-bold rounded-lg text-[9px] uppercase tracking-wider animate-pulse flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.2)]">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              {unreadCount} Unread Alerts
            </span>
          )}

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center space-x-1"
              title="Mark all notifications as read"
            >
              <span>✓</span>
              <span>MARK ALL AS READ</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center space-x-1"
              title="Clear all notifications"
            >
              <span>🗑️</span>
              <span>CLEAR ALL</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="py-20 text-center">
          <div className="text-4xl mb-4 opacity-40">🔔</div>
          <div className="text-white/60 font-bold uppercase tracking-wider mb-2 text-sm">
            NO NEW NOTIFICATIONS
          </div>
          <p className="text-white/30 text-[11px] uppercase tracking-wide max-w-sm mx-auto leading-relaxed">
            Your telemetry alerts, shipment assignments, and geofence queue is currently clear.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {notifications.map((n) => {
            const badge = getBadgeStyle(n.type)
            return (
              <div
                key={n.id}
                className={`p-4 border ${badge.border} ${
                  !n.isRead ? `${badge.bg} shadow-[0_4px_25px_rgba(0,240,255,0.04)]` : 'bg-slate-950/20 opacity-75 hover:opacity-100'
                } rounded-2xl transition-all duration-300 relative overflow-hidden group hover:border-white/20`}
              >
                {/* Laser Accent Glow Line */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-[4px] ${
                    !n.isRead ? badge.laser : 'bg-white/10'
                  } transition-colors`}
                />

                <div className="pl-3 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{badge.icon}</span>
                        <h3 className={`text-xs font-bold ${badge.text} m-0 uppercase tracking-wide flex items-center gap-1.5`}>
                          {!n.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                          )}
                          <span>{n.title}</span>
                        </h3>
                      </div>
                      <span className="text-[9px] text-white/40 whitespace-nowrap font-mono">
                        // {formatTime(n.timestamp)}
                      </span>
                    </div>

                    <p className="text-white/80 leading-relaxed m-0 text-[11px] mt-1">
                      {n.message}
                    </p>
                  </div>

                  {/* Actions (Mark as Read / Delete) */}
                  <div className="flex items-center space-x-2 flex-shrink-0 pt-0.5">
                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => markAsRead(n.id)}
                        className="px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 rounded-lg text-[9px] font-bold transition-all cursor-pointer flex items-center space-x-1"
                        title="Mark as read"
                      >
                        <span>✓</span>
                        <span className="hidden sm:inline">READ</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => deleteNotification(n.id)}
                      className="p-1.5 text-white/30 hover:text-rose-400 hover:bg-rose-500/20 rounded-lg transition-all cursor-pointer"
                      title="Delete notification"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default NotificationsPanel
