import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute() {
  const { user, loading } = useAuth()

  // Wait for auth initialization if loading state exists
  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-[#06070d] font-mono text-white/50 text-[10px] uppercase tracking-widest">
        Syncing Credentials...
      </div>
    )
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />
}

export default ProtectedRoute
