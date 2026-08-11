import ParticleBackground from '../components/ui/ParticleBackground'
import MountainBackground from '../components/ui/MountainBackground'
import LoginForm from '../components/auth/LoginForm'

const THEME_COLOR = '#00f0ff' // Sleek Cyan theme for login operations

function Login() {
  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-[#0c0f24] via-[#050614] to-[#010207] flex items-center justify-center p-4 overflow-hidden select-none">
      
      {/* Slow-floating Gradient Background Blobs */}
      <div className="cyber-blob-1 top-[-100px] left-[-50px]"></div>
      <div className="cyber-blob-2 bottom-[-150px] right-[-50px]"></div>

      {/* Drifting Stars Background Canvas */}
      <ParticleBackground />
      
      {/* Procedural Mountain Silhouette Overlay */}
      <MountainBackground />

      {/* Responsive Global Brand Header */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center sm:left-8 sm:translate-x-0 sm:text-left sm:top-8 z-20 w-full sm:w-auto px-4 sm:px-0">
        <h1 className="text-2xl font-extrabold tracking-wider text-white m-0 leading-none">
          FLEET<span style={{ color: THEME_COLOR }}>FLOW</span>
        </h1>
        <p className="text-[8px] sm:text-[9px] tracking-widest text-white/50 uppercase m-0 mt-1.5 font-semibold">
          Connecting Fleets. Flowing Logistics.
        </p>
      </div>

      {/* Center Glassmorphism Login Card */}
      <div className="relative w-full max-w-[400px] z-10 mt-12 sm:mt-0">
        
        <div 
          className="w-full p-8 sm:p-10 glass-card tech-border-accent"
        >
          {/* Low-profile Card State Header */}
          <div className="text-center mb-6 border-b border-white/5 pb-5">
            <div className="inline-block px-3 py-1 bg-white/5 border border-white/10 text-[9px] tracking-widest text-[#00f0ff] rounded-full uppercase font-mono font-semibold">
              // OPERATOR_AUTH_GATE
            </div>
          </div>

          {/* Login Form */}
          <LoginForm />

        </div>

        {/* Minimalist System Status Footer */}
        <div className="mt-6 flex justify-between text-white/40 font-mono text-[9px] px-4">
          <span>PORT: SECURE 443</span>
          <span className="flex items-center space-x-1.5">
            <span className="w-1.5 h-1.5 bg-[#39ff14] rounded-full animate-pulse"></span>
            <span>SYSTEM_ONLINE</span>
          </span>
        </div>

      </div>
    </div>
  )
}

export default Login
