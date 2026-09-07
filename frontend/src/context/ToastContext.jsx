import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const ToastContext = createContext(null)

// Individual Toast Item with bottom animated progress bar loader
function ToastCard({ toast, onRemove }) {
  const duration = toast.duration || 3500
  const isTopRight = toast.position === 'top-right'

  // Extract leading emoji if present in message
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u
  const match = toast.message?.match?.(emojiRegex)
  const customEmoji = match ? match[0] : null
  const displayMessage = customEmoji 
    ? toast.message.replace(customEmoji, '').trim() 
    : toast.message

  // Determine styles & bottom progress loader bar color
  const getStyleConfig = () => {
    switch (toast.type) {
      case 'success':
        return {
          barColor: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]',
          borderColor: 'border-emerald-500/25',
          icon: customEmoji ? (
            <span className="text-sm">{customEmoji}</span>
          ) : (
            <div className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0 font-black">
              <svg className="w-2.5 h-2.5 text-slate-950 stroke-[3.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          )
        }
      case 'error':
        return {
          barColor: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]',
          borderColor: 'border-rose-500/25',
          icon: customEmoji ? (
            <span className="text-sm">{customEmoji}</span>
          ) : (
            <div className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center flex-shrink-0 font-black text-[10px]">
              !
            </div>
          )
        }
      case 'warning':
        return {
          barColor: 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]',
          borderColor: 'border-amber-500/25',
          icon: customEmoji ? (
            <span className="text-sm">{customEmoji}</span>
          ) : (
            <div className="w-4 h-4 text-amber-400 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L1 21h22L12 2zm0 3.8l8.3 14.2H3.7L12 5.8zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
              </svg>
            </div>
          )
        }
      case 'custom':
        return {
          barColor: 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]',
          borderColor: 'border-purple-500/25',
          icon: customEmoji ? <span className="text-sm">{customEmoji}</span> : null
        }
      case 'info':
      default:
        return {
          barColor: 'bg-[#00f0ff] shadow-[0_0_8px_rgba(0,240,255,0.8)]',
          borderColor: 'border-cyan-500/25',
          icon: customEmoji ? (
            <span className="text-sm">{customEmoji}</span>
          ) : (
            <div className="w-4 h-4 rounded-full bg-[#00f0ff] text-slate-950 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">
              i
            </div>
          )
        }
    }
  }

  const { barColor, borderColor, icon } = getStyleConfig()

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden flex flex-col w-80 sm:w-96 max-w-[440px] rounded-xl bg-[#11121c]/95 border ${borderColor} shadow-[0_12px_40px_rgba(0,0,0,0.75)] backdrop-blur-md transition-all duration-300 font-mono text-xs ${
        isTopRight ? 'animate-slide-in-right' : 'animate-slide-in-left'
      }`}
    >
      {/* Toast Content Area */}
      <div className="flex items-start justify-between px-4 py-3.5 gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {icon && <div className="flex-shrink-0 mt-0.5 flex items-center justify-center">{icon}</div>}
          <div className="text-left text-white/95 text-xs sm:text-[13px] font-sans font-medium leading-relaxed tracking-wide break-words">
            {displayMessage}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRemove(toast.id)}
          className="text-white/40 hover:text-white p-0.5 rounded transition-colors cursor-pointer flex-shrink-0 mt-0.5"
          title="Dismiss"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Bottom Animated Progress Bar ("Toaster Loader") */}
      <div className="w-full h-[3px] bg-white/5 overflow-hidden">
        <div
          className={`h-full ${barColor}`}
          style={{
            animation: `toastLoaderProgress ${duration}ms linear forwards`
          }}
        />
      </div>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'info', position = 'top-right', duration = 3800) => {
    if (!message) return
    const id = Math.random().toString(36).substr(2, 9)
    const createdAt = Date.now()

    setToasts((prev) => {
      // Prevent spamming identical duplicate toast messages within 1.5s
      const isDuplicate = prev.some(
        (t) => t.message === message && createdAt - (t.createdAt || 0) < 1500
      )
      if (isDuplicate) return prev

      const newToast = { id, message, type, position, duration, createdAt }
      setTimeout(() => {
        removeToast(id)
      }, duration)

      return [...prev, newToast]
    })
  }, [removeToast])

  // Group toasts by position
  const topRightToasts = toasts.filter((t) => t.position === 'top-right')
  const bottomLeftToasts = toasts.filter((t) => t.position === 'bottom-left')

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {/* Top-Right Toast Container */}
      <div className="fixed top-6 right-6 z-[99999] flex flex-col gap-3 items-end pointer-events-none w-auto max-w-[92vw]">
        {topRightToasts.map((t) => (
          <ToastCard key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>

      {/* Bottom-Left Toast Container */}
      <div className="fixed bottom-6 left-6 z-[99999] flex flex-col-reverse gap-3 items-start pointer-events-none w-auto max-w-[92vw]">
        {bottomLeftToasts.map((t) => (
          <ToastCard key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
