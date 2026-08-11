import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'info', position = 'top-right') => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = { id, message, type, position }
    setToasts((prev) => [...prev, newToast])

    setTimeout(() => {
      removeToast(id)
    }, 3000)
  }, [removeToast])

  // Group toasts by position
  const topRightToasts = toasts.filter((t) => t.position === 'top-right')
  const bottomLeftToasts = toasts.filter((t) => t.position === 'bottom-left')

  const getToastStyles = (type) => {
    switch (type) {
      case 'success':
        return {
          border: 'border-emerald-500/30',
          text: 'text-emerald-400',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        }
      case 'error':
        return {
          border: 'border-red-500/30',
          text: 'text-red-400',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )
        }
      case 'warning':
        return {
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )
        }
      case 'info':
      default:
        return {
          border: 'border-cyan-500/30',
          text: 'text-cyan-400',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        }
    }
  }

  const renderToastItem = (toast) => {
    const styles = getToastStyles(toast.type)
    const isTopRight = toast.position === 'top-right'
    return (
      <div
        key={toast.id}
        className={`pointer-events-auto flex items-center justify-between w-72 sm:w-80 min-h-[50px] rounded-xl bg-[#0b0c16]/95 border ${styles.border} px-4 py-3 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-300 font-mono text-xs ${
          isTopRight ? 'animate-slide-in-right' : 'animate-slide-in-left'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`${styles.text} flex items-center justify-center`}>
            {styles.icon}
          </div>
          <div className="text-left text-white/95 leading-normal tracking-wide break-words max-w-[200px]">
            {toast.message}
          </div>
        </div>
        <button
          type="button"
          onClick={() => removeToast(toast.id)}
          className="text-white/40 hover:text-white/80 p-1 rounded-md transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {/* Top-Right Toast Container */}
      <div className="fixed top-6 right-6 z-[99999] flex flex-col gap-3 items-end pointer-events-none w-auto">
        {topRightToasts.map(renderToastItem)}
      </div>

      {/* Bottom-Left Toast Container */}
      <div className="fixed bottom-6 left-6 z-[99999] flex flex-col-reverse gap-3 items-start pointer-events-none w-auto">
        {bottomLeftToasts.map(renderToastItem)}
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
