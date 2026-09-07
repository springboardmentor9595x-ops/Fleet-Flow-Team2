import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import api from '../../api/axios'

function DriverDutySwitch() {
  const { user } = useAuth()
  const { addToast } = useToast()
  
  const [driverStatus, setDriverStatus] = useState('Available')
  const [isToggling, setIsToggling] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const isDriver = user?.role?.toUpperCase() === 'DRIVER'

  useEffect(() => {
    if (isDriver) {
      fetchDriverStatus()
    }
  }, [isDriver])

  const fetchDriverStatus = async () => {
    try {
      setIsLoading(true)
      const res = await api.get('/drivers/me')
      setDriverStatus(res.data.status || 'Available')
    } catch (err) {
      console.warn('Could not fetch driver profile status:', err)
      setDriverStatus('Available')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = async () => {
    if (isToggling) return
    
    if (driverStatus === 'In Transit') {
      addToast('⚠️ In Transit: Cannot change duty status during an active trip.', 'warning', 'top-right')
      return
    }

    const nextStatus = (driverStatus === 'Available' || driverStatus === 'Assigned') ? 'Inactive' : 'Available'
    
    try {
      setIsToggling(true)
      setDriverStatus(nextStatus)

      const res = await api.put('/drivers/me/status', { status: nextStatus })
      setDriverStatus(res.data.status)

      if (nextStatus === 'Available') {
        addToast('🟢 ON DUTY: You are now Online and ready for dispatch assignments!', 'success', 'top-right')
      } else {
        addToast('🔴 OFF DUTY: You are now Offline. Trip dispatch is paused.', 'info', 'top-right')
      }
    } catch (err) {
      console.error('Failed to toggle driver duty status:', err)
      setDriverStatus(driverStatus)
      const detail = err.response?.data?.detail || 'Failed to update duty status.'
      addToast(`❌ ERROR: ${detail}`, 'error', 'top-right')
    } finally {
      setIsToggling(false)
    }
  }

  if (!isDriver) return null

  const isOnline = driverStatus === 'Available' || driverStatus === 'Assigned'
  const isInTransit = driverStatus === 'In Transit'

  return (
    <div className="flex items-center space-x-2 font-mono select-none">
      <button
        onClick={handleToggle}
        disabled={isToggling || isInTransit}
        className={`group relative flex items-center gap-2.5 px-3 py-1.5 rounded-full border transition-all duration-300 cursor-pointer disabled:cursor-not-allowed ${
          isInTransit
            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
            : isOnline
            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(57,255,20,0.25)] hover:bg-emerald-500/25'
            : 'bg-slate-900/90 border-rose-500/30 text-rose-400/80 shadow-[0_0_10px_rgba(244,63,94,0.15)] hover:bg-slate-900'
        }`}
        title={isInTransit ? 'In Transit — Trip in progress' : isOnline ? 'Click to go Off Duty (Offline)' : 'Click to go On Duty (Online)'}
      >
        {/* Radar pulsing status indicator */}
        <div className="relative flex items-center justify-center w-2.5 h-2.5">
          {isOnline && !isInTransit && (
            <span className="absolute w-3.5 h-3.5 bg-emerald-400 rounded-full animate-ping opacity-60"></span>
          )}
          {isInTransit && (
            <span className="absolute w-3.5 h-3.5 bg-amber-400 rounded-full animate-ping opacity-60"></span>
          )}
          <span
            className={`w-2 h-2 rounded-full relative z-10 ${
              isInTransit ? 'bg-amber-400' : isOnline ? 'bg-emerald-400' : 'bg-rose-500'
            }`}
          ></span>
        </div>

        {/* Status text */}
        <span className="text-[10px] font-bold tracking-wider uppercase">
          {isInTransit ? 'In Transit' : isOnline ? 'On Duty' : 'Off Duty'}
        </span>

        {/* Animated Pill Slider */}
        <div
          className={`w-7 h-3.5 rounded-full p-0.5 transition-colors duration-300 flex items-center ${
            isInTransit
              ? 'bg-amber-500/40'
              : isOnline
              ? 'bg-emerald-500/40 justify-end'
              : 'bg-slate-700/60 justify-start'
          }`}
        >
          <div
            className={`w-2.5 h-2.5 rounded-full transition-transform duration-300 shadow-sm ${
              isInTransit
                ? 'bg-amber-300'
                : isOnline
                ? 'bg-emerald-300'
                : 'bg-rose-400'
            }`}
          />
        </div>
      </button>
    </div>
  )
}

export default DriverDutySwitch