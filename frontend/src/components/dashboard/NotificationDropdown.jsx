import { useState, useRef, useEffect, useCallback } from 'react'
import { useNotifications } from '../../context/NotificationContext'
import { useTheme } from '../../context/ThemeContext'

function formatTimeAgo(timestamp) {
  if (!timestamp) return 'Just now'
  const now = Date.now()
  const time = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime()
  const diffSec = Math.floor((now - time) / 1000)

  if (diffSec < 45) return 'Just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`
  return new Date(time).toLocaleDateString()
}

// Visual category classifier matching Image 1 design
function getNotificationVisuals(title = '', type = '', message = '') {
  const text = `${title} ${type} ${message}`.toUpperCase()

  if (text.includes('5-DAY') || text.includes('5_DAYS') || text.includes('5 DAYS')) {
    return {
      category: '5_DAYS',
      iconText: '⚠️',
      color: 'amber',
      borderLeft: 'border-l-4 border-l-amber-400',
      glowShadow: 'shadow-[inset_4px_0_14px_rgba(245,158,11,0.2)]',
      iconBoxDark: 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]',
      iconBoxLight: 'bg-amber-100 border-amber-300 text-amber-600 shadow-sm',
      dotColor: 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]',
      dateColor: 'text-amber-400 font-bold'
    }
  }

  if (text.includes('OVERDUE') || text.includes('CRITICAL') || type === 'error') {
    return {
      category: 'OVERDUE',
      iconText: '✖',
      color: 'rose',
      borderLeft: 'border-l-4 border-l-rose-500',
      glowShadow: 'shadow-[inset_4px_0_14px_rgba(244,63,94,0.25)]',
      iconBoxDark: 'bg-rose-500/15 border-rose-500/40 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]',
      iconBoxLight: 'bg-rose-100 border-rose-300 text-rose-600 shadow-sm',
      dotColor: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]',
      dateColor: 'text-rose-400 font-bold'
    }
  }

  if (text.includes('TOMORROW') || text.includes('1_DAY') || text.includes('1 DAY')) {
    return {
      category: '1_DAY',
      iconText: '🚨',
      color: 'orange',
      borderLeft: 'border-l-4 border-l-orange-400',
      glowShadow: 'shadow-[inset_4px_0_14px_rgba(251,146,60,0.2)]',
      iconBoxDark: 'bg-orange-500/15 border-orange-500/40 text-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.25)]',
      iconBoxLight: 'bg-orange-100 border-orange-300 text-orange-600 shadow-sm',
      dotColor: 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.8)]',
      dateColor: 'text-orange-400 font-bold'
    }
  }

  if (text.includes('TODAY') || text.includes('DUE_TODAY') || text.includes('RESOLVED') || type === 'success') {
    return {
      category: 'DUE_TODAY',
      iconText: '🔔',
      color: 'emerald',
      borderLeft: 'border-l-4 border-l-emerald-400',
      glowShadow: 'shadow-[inset_4px_0_14px_rgba(16,185,129,0.2)]',
      iconBoxDark: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]',
      iconBoxLight: 'bg-emerald-100 border-emerald-300 text-emerald-600 shadow-sm',
      dotColor: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]',
      dateColor: 'text-emerald-400 font-bold'
    }
  }

  if (text.includes('SHIPMENT') || text.includes('DELIVERY') || type === 'shipment') {
    return {
      category: 'SHIPMENT',
      iconText: '📦',
      color: 'indigo',
      borderLeft: 'border-l-4 border-l-indigo-400',
      glowShadow: 'shadow-[inset_4px_0_14px_rgba(99,102,241,0.2)]',
      iconBoxDark: 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.25)]',
      iconBoxLight: 'bg-indigo-100 border-indigo-300 text-indigo-600 shadow-sm',
      dotColor: 'bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]',
      dateColor: 'text-indigo-400 font-bold'
    }
  }

  if (text.includes('TRIP') || text.includes('TRANSIT')) {
    return {
      category: 'TRIP',
      iconText: '🚚',
      color: 'cyan',
      borderLeft: 'border-l-4 border-l-cyan-400',
      glowShadow: 'shadow-[inset_4px_0_14px_rgba(0,240,255,0.2)]',
      iconBoxDark: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.25)]',
      iconBoxLight: 'bg-cyan-100 border-cyan-300 text-cyan-600 shadow-sm',
      dotColor: 'bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.8)]',
      dateColor: 'text-cyan-400 font-bold'
    }
  }

  return {
    category: 'DEFAULT',
    iconText: '🔔',
    color: 'cyan',
    borderLeft: 'border-l-4 border-l-cyan-400',
    glowShadow: 'shadow-[inset_4px_0_14px_rgba(0,240,255,0.2)]',
    iconBoxDark: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.2)]',
    iconBoxLight: 'bg-cyan-100 border-cyan-300 text-cyan-600 shadow-sm',
    dotColor: 'bg-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.8)]',
    dateColor: 'text-cyan-400 font-bold'
  }
}

function formatSubMessage(text = '', isDark = true) {
  const dateRegex = /(\d{4}-\d{2}-\d{2})/g
  const overdueRegex = /(\(\d+\s+days?\s+overdue\))/gi

  const parts = text.split(dateRegex)
  return parts.map((part, idx) => {
    if (dateRegex.test(part)) {
      return (
        <span key={idx} className={isDark ? 'text-amber-400 font-bold' : 'text-amber-600 font-bold'}>
          {part}
        </span>
      )
    }
    if (overdueRegex.test(part)) {
      return (
        <span key={idx} className="text-rose-400 font-bold">
          {part}
        </span>
      )
    }
    return part
  })
}

function formatNotificationMessage(msg = '', isDark = true) {
  if (!msg) return null

  if (msg.includes('CRITICAL:')) {
    const parts = msg.split('CRITICAL:')
    return (
      <span>
        <span className="text-rose-500 font-black tracking-wide mr-1">CRITICAL:</span>
        {formatSubMessage(parts[1] || '', isDark)}
      </span>
    )
  }

  return formatSubMessage(msg, isDark)
}

function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const { isDark } = useTheme()
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    fetchBackendNotifications
  } = useNotifications()

  const dropdownRef = useRef(null)

  // When dropdown opens, refresh from database
  const handleToggle = useCallback(() => {
    setIsOpen(prev => {
      const next = !prev
      if (next) {
        setTimeout(() => {
          if (fetchBackendNotifications) fetchBackendNotifications()
        }, 0)
      }
      return next
    })
  }, [fetchBackendNotifications])

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className="relative font-mono select-none" ref={dropdownRef}>
      {/* 🔔 Main Bell Trigger Button (Matches Image 1) */}
      <button
        type="button"
        onClick={handleToggle}
        className={`relative w-10 h-10 rounded-full border transition-all duration-300 cursor-pointer flex items-center justify-center ${
          isOpen
            ? isDark
              ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.4)]'
              : 'bg-cyan-50 border-cyan-500 text-cyan-700 shadow-md'
            : isDark
              ? 'bg-[#0b1322]/80 border-cyan-500/30 text-white/80 hover:text-cyan-300 hover:border-cyan-400 hover:bg-[#111e35] shadow-[0_0_12px_rgba(0,240,255,0.15)]'
              : 'bg-white border-slate-300 text-slate-700 hover:text-cyan-600 hover:border-cyan-400 hover:bg-slate-50 shadow-sm'
        }`}
        title="Fleet Notifications"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Pulsing Pink/Red Unread Badge (Matches Image 1) */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1.5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-[0_0_12px_rgba(244,63,94,0.9)] animate-pulse border-2 border-slate-950">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 📋 Dropdown Modal Container (Pixel Perfect to Image 1 Layout) */}
      {isOpen && (
        <div
          className={`absolute right-0 top-full mt-3 w-80 sm:w-[460px] max-w-[94vw] rounded-3xl border shadow-[0_25px_70px_rgba(0,0,0,0.95)] z-[9999] overflow-hidden transition-all animate-slide-in-right backdrop-blur-2xl ${
            isDark
              ? 'bg-[#070e1b]/95 border-cyan-500/40 shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_25px_rgba(0,240,255,0.18)]'
              : 'bg-white/95 border-slate-200/90 shadow-[0_20px_60px_rgba(0,0,0,0.15),0_0_20px_rgba(6,182,212,0.12)]'
          }`}
        >
          {/* Header (Squircle Icon + Title + NEW Badge + Read All & Clear All Buttons) */}
          <div
            className={`p-4 px-5 border-b flex items-center justify-between gap-3 ${
              isDark ? 'border-white/10 bg-[#0a1324]/90' : 'border-slate-200 bg-slate-50/90'
            }`}
          >
            {/* Left Header Info */}
            <div className="flex items-center space-x-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border ${
                  isDark
                    ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 shadow-[0_0_18px_rgba(0,240,255,0.35)]'
                    : 'bg-cyan-50 border-cyan-300 text-cyan-600 shadow-sm'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-black tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    NOTIFICATIONS
                  </span>
                  {unreadCount > 0 ? (
                    <span
                      className={`px-2 py-0.5 text-[9px] font-black rounded-lg uppercase tracking-wider border ${
                        isDark
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                          : 'bg-cyan-100 text-cyan-700 border-cyan-300'
                      }`}
                    >
                      {unreadCount} NEW
                    </span>
                  ) : (
                    <span
                      className={`px-2 py-0.5 text-[9px] font-bold rounded-lg uppercase tracking-wider border ${
                        isDark ? 'bg-white/5 text-white/40 border-white/10' : 'bg-slate-200/70 text-slate-500 border-slate-300'
                      }`}
                    >
                      ALL READ
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Action Buttons: Read All & Clear All */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className={`px-2.5 py-1.5 text-[10px] font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 border ${
                    isDark
                      ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/60 hover:border-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                      : 'bg-cyan-50 border-cyan-300 text-cyan-700 hover:bg-cyan-100'
                  }`}
                  title="Mark all notifications as read"
                >
                  <svg className="w-3 h-3 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Read All</span>
                </button>
              )}

              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className={`px-2.5 py-1.5 text-[10px] font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 border ${
                    isDark
                      ? 'bg-rose-950/40 border-rose-500/40 text-rose-300 hover:bg-rose-900/60 hover:border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.15)]'
                      : 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100'
                  }`}
                  title="Clear and delete all notifications from database"
                >
                  <svg className="w-3 h-3 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>

          {/* List of Notification Cards */}
          <div className="max-h-[420px] overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-16 px-4 text-center">
                <div className="text-3xl mb-3 opacity-60">✨</div>
                <div className={`text-xs font-black uppercase tracking-wider mb-1.5 ${isDark ? 'text-white/80' : 'text-slate-800'}`}>
                  NO NOTIFICATIONS IN QUEUE
                </div>
                <p className={`text-[11px] max-w-[240px] mx-auto m-0 leading-relaxed ${isDark ? 'text-white/40' : 'text-slate-500'}`}>
                  All vehicle maintenance schedules, dispatch orders, and driver alerts are currently clear.
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const visuals = getNotificationVisuals(n.title, n.type, n.message)
                return (
                  <div
                    key={n.id}
                    onClick={() => !n.isRead && markAsRead(n.id)}
                    className={`rounded-2xl p-3.5 transition-all duration-200 border relative overflow-hidden flex items-start gap-3.5 cursor-pointer group ${
                      visuals.borderLeft
                    } ${visuals.glowShadow} ${
                      !n.isRead
                        ? isDark
                          ? 'bg-[#0c1628]/90 border-white/10 hover:border-cyan-400/50 hover:bg-[#101d36]'
                          : 'bg-white border-slate-200 shadow-sm hover:border-cyan-400 hover:shadow-md'
                        : isDark
                          ? 'bg-[#080f1d]/50 border-white/5 opacity-60 hover:opacity-100 hover:bg-[#0c1628]/80'
                          : 'bg-slate-50/70 border-slate-200/60 opacity-60 hover:opacity-100 hover:bg-slate-100/90'
                    }`}
                  >
                    {/* Glowing Left Squircle Icon Container (Matches Image 1) */}
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 border transition-transform duration-200 group-hover:scale-105 ${
                        isDark ? visuals.iconBoxDark : visuals.iconBoxLight
                      }`}
                    >
                      {visuals.iconText}
                    </div>

                    {/* Notification Body Content */}
                    <div className="flex-1 min-w-0 pr-1">
                      {/* Top Row: Unread Dot + Title + Timestamp */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {/* Unread Glowing Dot */}
                          {!n.isRead && (
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${visuals.dotColor} animate-pulse`} />
                          )}
                          <h4
                            className={`text-xs font-black tracking-wide truncate m-0 ${
                              !n.isRead
                                ? isDark
                                  ? 'text-white'
                                  : 'text-slate-900 font-black'
                                : isDark
                                  ? 'text-white/70'
                                  : 'text-slate-600'
                            }`}
                          >
                            {n.title.toUpperCase()}
                          </h4>
                        </div>

                        <span className={`text-[9px] font-semibold whitespace-nowrap flex-shrink-0 ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                          {formatTimeAgo(n.timestamp)}
                        </span>
                      </div>

                      {/* Message Body with Highlights */}
                      <p
                        className={`text-[11px] leading-relaxed m-0 break-words line-clamp-3 font-mono ${
                          !n.isRead
                            ? isDark
                              ? 'text-slate-300'
                              : 'text-slate-700'
                            : isDark
                              ? 'text-slate-400'
                              : 'text-slate-500'
                        }`}
                      >
                        {formatNotificationMessage(n.message, isDark)}
                      </p>
                    </div>

                    {/* Right Side Action Buttons (Mark as Read / Delete) */}
                    <div className="flex flex-col items-center space-y-1.5 flex-shrink-0 pt-0.5">
                      {/* Checkmark Button */}
                      {!n.isRead ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(n.id)
                          }}
                          className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                            isDark
                              ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 hover:bg-cyan-500/40 hover:border-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.25)]'
                              : 'bg-cyan-100 border-cyan-300 text-cyan-700 hover:bg-cyan-200 shadow-sm'
                          }`}
                          title="Mark as Seen / Read"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      ) : (
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-cyan-400/30"
                          title="Already Seen / Read"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}

                      {/* Trash Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteNotification(n.id)
                        }}
                        className={`w-7 h-7 rounded-lg border border-transparent flex items-center justify-center transition-all cursor-pointer ${
                          isDark
                            ? 'text-white/30 hover:text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/40'
                            : 'text-slate-400 hover:text-rose-600 hover:bg-rose-100 hover:border-rose-300'
                        }`}
                        title="Delete and remove from database"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer (Queue Count + Database Sync Status) */}
          <div
            className={`p-3 px-5 border-t flex items-center justify-between text-[10px] font-bold ${
              isDark
                ? 'bg-[#060b15]/95 border-white/10 text-white/50'
                : 'bg-slate-100/90 border-slate-200 text-slate-600'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="text-cyan-400">ℹ️</span>
              <span>{notifications.length} Total Alerts in Queue</span>
            </span>

            <span className="flex items-center gap-1.5">
              <span className="text-cyan-400">☁️</span>
              <span>PostgreSQL Synced</span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationDropdown
