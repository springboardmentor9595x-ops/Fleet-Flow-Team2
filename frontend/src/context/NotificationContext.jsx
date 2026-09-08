import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/axios'
import { useToast } from './ToastContext'
import { useAuth } from './AuthContext'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const { addToast } = useToast()
  
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)

  // Fetch persisted notifications from Backend API
  const fetchBackendNotifications = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      setLoading(true)
      const res = await api.get('/notifications/')
      if (Array.isArray(res.data)) {
        const formatted = res.data.map(n => ({
          id: n.notification_id,
          title: n.title,
          message: n.message,
          type: n.type,
          timestamp: new Date(n.created_at).getTime(),
          isRead: n.is_read
        }))
        
        // Strict deduplication by ID and title+message
        const unique = []
        const seenKeys = new Set()
        for (const item of formatted) {
          const key = `${item.id}_${item.title}_${item.message}`
          if (!seenKeys.has(key)) {
            seenKeys.add(key)
            unique.push(item)
          }
        }
        setNotifications(unique)
      }
    } catch (err) {
      console.warn('[Notifications] Failed to load from backend API:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Reload when user or token changes, and listen for app-wide data changes
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      fetchBackendNotifications()
    } else {
      setNotifications([])
    }

    const handleDataChanged = () => {
      fetchBackendNotifications()
    }
    window.addEventListener('fleetflow:datachanged', handleDataChanged)

    // Periodic auto-poll every 10s to catch background Celery-triggered alerts
    const intervalId = setInterval(() => {
      const currentToken = localStorage.getItem('token')
      if (currentToken) {
        fetchBackendNotifications()
      }
    }, 10000)

    return () => {
      window.removeEventListener('fleetflow:datachanged', handleDataChanged)
      clearInterval(intervalId)
    }
  }, [user, fetchBackendNotifications])

  // Global WebSocket listener to receive real-time events across the app
  useEffect(() => {
    let ws;
    let reconnectTimeout;
    
    const connect = () => {
      let wsUrl
      const apiUrl = import.meta.env.VITE_API_URL
      if (apiUrl) {
        try {
          const parsed = new URL(apiUrl, window.location.href)
          const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:'
          wsUrl = `${wsProtocol}//${parsed.host}/ws/telemetry`
        } catch (e) {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
          wsUrl = `${protocol}//${window.location.host}/ws/telemetry`
        }
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const host = window.location.hostname === 'localhost' ? '127.0.0.1:8000' : window.location.host
        wsUrl = `${protocol}//${host}/ws/telemetry`
      }

      try {
        ws = new WebSocket(wsUrl)

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)

            if (data.type === 'NOTIFICATION_EVENT') {
              const currentUserId = user?.user_id || user?.id
              const currentRole = (user?.role || '').toUpperCase()

              // Check user-specific target
              if (data.user_id && currentUserId && String(data.user_id) !== String(currentUserId)) {
                return
              }

              // Check role-specific target
              if (data.target_role) {
                const targetRoleUpper = data.target_role.toUpperCase()
                if (['MANAGEMENT', 'FLEETMANAGER', 'FLEET MANAGER'].includes(targetRoleUpper)) {
                  if (!['ADMIN', 'FLEETMANAGER', 'FLEET MANAGER', 'DISPATCHER'].includes(currentRole)) {
                    return
                  }
                } else if (targetRoleUpper === 'DRIVER' && currentRole !== 'DRIVER') {
                  return
                } else if (targetRoleUpper === 'DISPATCHER' && !['ADMIN', 'DISPATCHER'].includes(currentRole)) {
                  return
                }
              }

              const notifObj = {
                id: data.notification_id || ('notif-' + Date.now()),
                title: data.title || '🔔 SYSTEM ALERT',
                message: data.message || '',
                type: data.notif_type || 'info',
                timestamp: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
                isRead: false
              }
              setNotifications((prev) => {
                const filtered = prev.filter(
                  n => n.id !== notifObj.id && !(n.title === notifObj.title && n.message === notifObj.message && Math.abs(n.timestamp - notifObj.timestamp) < 60000)
                )
                return [notifObj, ...filtered]
              })
              if (addToast) {
                const toastType = notifObj.type === 'error' ? 'error' : (notifObj.type === 'warning' ? 'warning' : 'info')
                addToast(`${notifObj.title}: ${notifObj.message}`, toastType, 'top-right')
              }
            } else if (data.type === 'MAINTENANCE_EVENT') {
              // Backward compatibility for telemetry MAINTENANCE_EVENT
              const alertType = data.alert_type || 'INFO'
              const toastType = alertType === 'DUE_HOURLY' ? 'error' : (alertType === '1_DAY' ? 'warning' : 'info')
              const notifId = data.notification_id || ('maint-' + Date.now())
              const notifObj = {
                id: notifId,
                title: data.title || '🔧 FLEET MAINTENANCE ALERT',
                message: data.message,
                type: toastType,
                timestamp: Date.now(),
                isRead: false
              }
              setNotifications((prev) => {
                const filtered = prev.filter(
                  n => n.id !== notifObj.id && !(n.title === notifObj.title && n.message === notifObj.message && Math.abs(n.timestamp - notifObj.timestamp) < 60000)
                )
                return [notifObj, ...filtered]
              })
              if (addToast && alertType !== 'SCHEDULED') {
                addToast(`🔧 ${data.title || 'MAINTENANCE'}: ${data.message}`, toastType, 'top-right')
              }
            } else if (data.type === 'GEOFENCE_EVENT') {
              if (addToast) addToast(`🚨 GEOFENCE: ${data.message}`, 'info', 'top-right')
              setNotifications((prev) => [
                {
                  id: 'geofence-' + Date.now(),
                  title: data.event === 'ENTER' ? '🎉 SHIPMENT ARRIVED' : '🚨 GEOFENCE DEPARTURE',
                  message: data.message,
                  type: 'info',
                  timestamp: Date.now(),
                  isRead: false
                },
                ...prev
              ])
            } else if (data.type === 'STATUS_EVENT') {
              if (addToast) addToast(`📦 ${data.title || 'SHIPMENT UPDATE'}: ${data.message}`, 'info', 'top-right')
              setNotifications((prev) => [
                {
                  id: 'status-' + Date.now(),
                  title: data.title || '📦 SHIPMENT UPDATE',
                  message: data.message,
                  type: 'info',
                  timestamp: Date.now(),
                  isRead: false
                },
                ...prev
              ])
            }
          } catch (err) {
            // Ignore JSON parse errors
          }
        }

        ws.onclose = () => {
          reconnectTimeout = setTimeout(connect, 5000)
        }

        ws.onerror = () => {
          if (ws) ws.close()
        }
      } catch (e) {
        reconnectTimeout = setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      if (ws) ws.close()
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
    }
  }, [addToast])

  const addNotification = useCallback(({ title, message, type = 'info', showToast = false }) => {
    const id = Math.random().toString(36).substr(2, 9) + '-' + Date.now()
    const newNotif = {
      id,
      title: title || 'SYSTEM ALERT',
      message: message || '',
      type,
      timestamp: Date.now(),
      isRead: false
    }

    setNotifications((prev) => [newNotif, ...prev])

    if (showToast && addToast) {
      const toastType = type === 'error' ? 'error' : (type === 'warning' || type === 'reroute' ? 'warning' : (type === 'success' ? 'success' : 'info'))
      addToast(message ? `${title ? title + ': ' : ''}${message}` : title, toastType, 'top-right')
    }

    return id
  }, [addToast])

  const markAsRead = useCallback(async (id) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
    if (typeof id === 'string' && id.includes('-') && id.length > 20) {
      try {
        await api.put(`/notifications/${id}/read`, {})
      } catch (err) {
        // Silent catch for local/mock IDs
      }
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    try {
      await api.put('/notifications/read-all', {})
    } catch (err) {
      // Silent catch
    }
  }, [])

  const deleteNotification = useCallback(async (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    if (typeof id === 'string' && id.includes('-') && id.length > 20) {
      try {
        await api.delete(`/notifications/${id}`)
      } catch (err) {
        // Silent catch
      }
    }
  }, [])

  const clearAll = useCallback(async () => {
    setNotifications([])
    try {
      await api.delete('/notifications/clear/all')
    } catch (err) {
      // Silent catch
    }
  }, [])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchBackendNotifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
