import { useState } from 'react'
import ParticleBackground from '../components/ui/ParticleBackground'
import MountainBackground from '../components/ui/MountainBackground'
import SignupForm from '../components/auth/SignupForm'

const THEME_COLOR = '#00f0ff' // Constant branding color (Cyan)

const ROLES = [
  { id: 'FLEET_MANAGER', label: 'MANAGER', color: '#00f0ff', desc: 'Depot & vehicle clearance.' },
  { id: 'DISPATCHER', label: 'DISPATCHER', color: '#ff007f', desc: 'Routing & trip coordination.' },
  { id: 'DRIVER', label: 'DRIVER', color: '#39ff14', desc: 'Logbook & driver portal.' },
  { id: 'ADMIN', label: 'ADMIN', color: '#ffaa00', desc: 'System override clearance.' },
]

function Signup() {
  const [selectedRole, setSelectedRole] = useState(ROLES[0])
  const [otpSent, setOtpSent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Hide selector both during loader check and after OTP dispatch
  const hideSelector = otpSent || isSubmitting

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-[#0c0f24] via-[#050614] to-[#010207] flex items-center justify-center p-4 overflow-hidden select-none">
      
      {/* Slow-floating Gradient Background Blobs */}
      <div className="cyber-blob-1 top-[-100px] left-[-50px]"></div>
      <div className="cyber-blob-2 bottom-[-150px] right-[-50px]"></div>

      {/* Drifting Stars Background Canvas */}
      <ParticleBackground />
      
      {/* Procedural Mountain Silhouette Overlay */}
      <MountainBackground />

      {/* Responsive Global Brand Header (Fixed Brand Color) */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center sm:left-8 sm:translate-x-0 sm:text-left sm:top-8 z-20 w-full sm:w-auto px-4 sm:px-0">
        <h1 className="text-2xl font-extrabold tracking-wider text-white m-0 leading-none">
          FLEET<span style={{ color: THEME_COLOR }}>FLOW</span>
        </h1>
        <p className="text-[8px] sm:text-[9px] tracking-widest text-white/50 uppercase m-0 mt-1.5 font-semibold">
          Connecting Fleets. Flowing Logistics.
        </p>
      </div>

      {/* Center Glassmorphism Signup Card */}
      <div className="relative w-full max-w-[400px] z-10 mt-12 sm:mt-0">
        
        <div 
          className="w-full p-8 sm:p-10 glass-card tech-border-accent"
        >
          {/* Low-profile Card State Header (Dynamic role indicator) */}
          <div className="text-center mb-5 border-b border-white/5 pb-4">
            <div 
              className="inline-block px-3 py-1 bg-white/5 border text-[9px] tracking-widest rounded-full uppercase font-mono font-semibold transition-all duration-300"
              style={{ borderColor: `${selectedRole.color}25`, color: selectedRole.color }}
            >
              {hideSelector ? '// SECURE_VERIFICATION_CHECK' : '// OPERATOR_PROVISION_PORTAL'}
            </div>
          </div>

          {/* Access Level Selector (Only show if OTP has not been sent and form is not submitting) */}
          {!hideSelector && (
            <div className="mb-5 animate-slide-up-right">
              <div className="text-[10px] text-white/60 font-semibold mb-2 uppercase tracking-widest text-center">[ ACCESS LEVEL CLEARANCE ]</div>
              <div className="grid grid-cols-4 gap-1 text-[9px] font-semibold">
                {ROLES.map((role) => {
                  const isSelected = selectedRole.id === role.id
                  return (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRole(role)}
                      type="button"
                      className="py-2 px-1 text-center rounded-full border transition-all duration-300 cursor-pointer"
                      style={{
                        backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                        borderColor: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.08)',
                        color: isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                        textShadow: isSelected ? '0 0 5px rgba(255, 255, 255, 0.5)' : 'none',
                      }}
                    >
                      <span className="tracking-tight">{role.label}</span>
                    </button>
                  )
                })}
              </div>
              
              {/* Clearance Description */}
              <div className="mt-2 text-center text-[10px] text-white/50 italic">
                clearance: {selectedRole.desc}
              </div>
            </div>
          )}

          {/* Signup Form */}
          <SignupForm 
            roleName={selectedRole.label} 
            otpSent={otpSent} 
            setOtpSent={setOtpSent} 
            isSubmitting={isSubmitting}
            setIsSubmitting={setIsSubmitting}
          />

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

export default Signup
