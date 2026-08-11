import { useEffect, useRef } from 'react'

function ParticleBackground({ color = '#ffffff' }) {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: null, y: null, active: false })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let animationFrameId
    let stars = []
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initStars()
    }

    const initStars = () => {
      stars = []
      const density = Math.floor((canvas.width * canvas.height) / 9000)
      const count = Math.min(Math.max(density, 60), 180) // 60 to 180 stars

      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.08, // Very slow movement
          vy: (Math.random() - 0.5) * 0.08,
          radius: Math.random() * 1.5 + 0.3,
          alpha: Math.random() * 0.7 + 0.3,
          twinkleSpeed: Math.random() * 0.01 + 0.005,
          twinkleDirection: Math.random() > 0.5 ? 1 : -1,
        })
      }
    }

    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX
      mouseRef.current.y = e.clientY
      mouseRef.current.active = true
    }

    const handleMouseLeave = () => {
      mouseRef.current.active = false
    }

    const handleMouseEnter = () => {
      mouseRef.current.active = true
    }

    window.addEventListener('resize', resizeCanvas)
    window.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('mouseenter', handleMouseEnter)

    resizeCanvas()

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw and update stars
      stars.forEach((s) => {
        // Move stars slowly
        s.x += s.vx
        s.y += s.vy

        // Wrap around screen edges
        if (s.x < 0) s.x = canvas.width
        if (s.x > canvas.width) s.x = 0
        if (s.y < 0) s.y = canvas.height
        if (s.y > canvas.height) s.y = 0

        // Twinkle (oscillate opacity)
        s.alpha += s.twinkleSpeed * s.twinkleDirection
        if (s.alpha >= 1) {
          s.alpha = 1
          s.twinkleDirection = -1
        } else if (s.alpha <= 0.2) {
          s.alpha = 0.2
          s.twinkleDirection = 1
        }

        // Mouse proximity reaction (stars glow and push away slightly)
        let dx = 0
        let dy = 0
        let scale = 1

        if (mouseRef.current.active && mouseRef.current.x !== null) {
          const mx = mouseRef.current.x
          const my = mouseRef.current.y
          const dist = Math.hypot(s.x - mx, s.y - my)

          if (dist < 120) {
            scale = 1 + (1 - dist / 120) * 1.5 // make it look larger
            // Subtle push away from cursor
            const force = (120 - dist) * 0.02
            const angle = Math.atan2(s.y - my, s.x - mx)
            dx = Math.cos(angle) * force
            dy = Math.sin(angle) * force
          }
        }

        // Draw star
        ctx.beginPath()
        ctx.arc(s.x + dx, s.y + dy, s.radius * scale, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`
        ctx.fill()

        // Optional tiny star flare/glow for larger stars
        if (s.radius > 1.2) {
          ctx.beginPath()
          ctx.arc(s.x + dx, s.y + dy, s.radius * scale * 3, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha * 0.15})`
          ctx.fill()
        }
      })

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('mouseenter', handleMouseEnter)
      cancelAnimationFrame(animationFrameId)
    }
  }, [color])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 block pointer-events-none z-0"
    />
  )
}

export default ParticleBackground
