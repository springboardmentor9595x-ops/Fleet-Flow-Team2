import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * PublicRoute Guard:
 * - If user IS authenticated (logged in / signed up): redirect directly to /dashboard.
 * - If user IS NOT authenticated: allow access to login / signup / forgot-password.
 */
function PublicRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060713] flex items-center justify-center font-mono text-cyan-400 text-xs tracking-widest uppercase animate-pulse select-none">
        Authenticating Session...
      </div>
    )
  }

  return user ? <Navigate to="/dashboard" replace /> : <Outlet />
}

export default PublicRoute
