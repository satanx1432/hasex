'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'

export default function LandingPage() {
  const router = useRouter()
  const { enterGuestMode, loading } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isEntering, setIsEntering] = useState(false)
  const [pointerActive, setPointerActive] = useState(false)
  const [pointerPos, setPointerPos] = useState({ x: -1000, y: -1000 })
  const particlesRef = useRef<any[]>([])
  const animationRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = window.innerWidth
    let height = window.innerHeight
    canvas.width = width
    canvas.height = height

    // Initialize particles
    const initParticles = () => {
      const count = 1800
      const particles = []
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          originX: Math.random() * width,
          originY: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          dx: 0,
          dy: 0,
          size: Math.random() * 2 + 0.2,
          baseOpacity: Math.random() * 0.6 + 0.2,
          opacity: Math.random() * 0.6 + 0.2,
          color: 255,
          tension: 0.02 + Math.random() * 0.03
        })
      }
      particlesRef.current = particles
      
      // Initial render to show particles immediately
      ctx.fillStyle = '#0e0e0e'
      ctx.fillRect(0, 0, width, height)
      
      for (const particle of particles) {
        ctx.fillStyle = `rgba(${particle.color}, ${particle.color}, ${particle.color}, ${particle.opacity})`
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    initParticles()

    // Animation loop
    const animate = () => {
      if (isEntering) {
        ctx.fillStyle = 'rgba(14, 14, 14, 0.25)'
      } else {
        ctx.fillStyle = '#0e0e0e'
      }
      ctx.fillRect(0, 0, width, height)

      for (const particle of particlesRef.current) {
        if (isEntering) {
          // Warp speed logic
          const dx = width / 2 - particle.x
          const dy = height / 2 - particle.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const angle = Math.atan2(dy, dx)
          const speed = 15 + (1200 / (dist + 50))
          
          particle.x += Math.cos(angle) * speed
          particle.y += Math.sin(angle) * speed
          
          if (dist < 10) {
            const edgeAngle = Math.random() * Math.PI * 2
            const radius = Math.max(width, height) * 0.8
            particle.x = width/2 + Math.cos(edgeAngle) * radius
            particle.y = height/2 + Math.sin(edgeAngle) * radius
          }
        } else {
          // Normal drift behavior
          particle.originX += particle.vx
          particle.originY += particle.vy

          // Wrap origins
          if (particle.originX < 0) particle.originX = width
          if (particle.originX > width) particle.originX = 0
          if (particle.originY < 0) particle.originY = height
          if (particle.originY > height) particle.originY = 0

          // Tension toward origin
          particle.dx = (particle.originX - particle.x) * particle.tension
          particle.dy = (particle.originY - particle.y) * particle.tension
          
          particle.x += particle.dx
          particle.y += particle.dy

          // Pointer interaction
          if (pointerActive) {
            const distDX = particle.x - pointerPos.x
            const distDY = particle.y - pointerPos.y
            const distSq = distDX * distDX + distDY * distDY
            
            const influenceRadius = 250
            const influenceRadiusSq = influenceRadius * influenceRadius

            if (distSq < influenceRadiusSq) {
              const dist = Math.sqrt(distSq)
              const force = (influenceRadius - dist) / influenceRadius
              const strength = 12.0
              
              particle.x += (distDX / dist) * force * strength
              particle.y += (distDY / dist) * force * strength
              particle.opacity = Math.min(1, particle.baseOpacity + force * 0.5)
            } else {
              particle.opacity += (particle.baseOpacity - particle.opacity) * 0.05
            }
          } else {
            particle.opacity += (particle.baseOpacity - particle.opacity) * 0.05
          }

          // Screen wrapping
          const buffer = 100
          if (particle.x < -buffer) { particle.x = width + buffer; particle.originX = particle.x }
          if (particle.x > width + buffer) { particle.x = -buffer; particle.originX = particle.x }
          if (particle.y < -buffer) { particle.y = height + buffer; particle.originY = particle.y }
          if (particle.y > height + buffer) { particle.y = -buffer; particle.originY = particle.y }
        }

        // Draw particle
        ctx.fillStyle = `rgba(${particle.color}, ${particle.color}, ${particle.color}, ${particle.opacity})`
        
        if (isEntering) {
          const dx = width / 2 - particle.x
          const dy = height / 2 - particle.y
          const angle = Math.atan2(dy, dx)
          ctx.lineWidth = particle.size
          ctx.strokeStyle = `rgba(255, 255, 255, ${particle.opacity * 0.4})`
          ctx.beginPath()
          ctx.moveTo(particle.x, particle.y)
          ctx.lineTo(particle.x - Math.cos(angle) * 40, particle.y - Math.sin(angle) * 40)
          ctx.stroke()
        } else {
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    // Event listeners
    const handleResize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
      initParticles()
    }

    const handleMouseMove = (e: MouseEvent) => {
      setPointerActive(true)
      setPointerPos({ x: e.clientX, y: e.clientY })
    }

    const handleTouchStart = (e: TouchEvent) => {
      setPointerActive(true)
      setPointerPos({ x: e.touches[0].clientX, y: e.touches[0].clientY })
    }

    const handleTouchMove = (e: TouchEvent) => {
      setPointerActive(true)
      setPointerPos({ x: e.touches[0].clientX, y: e.touches[0].clientY })
    }

    const handlePointerEnd = () => setPointerActive(false)

    window.addEventListener('resize', handleResize)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('touchstart', handleTouchStart)
    window.addEventListener('touchmove', handleTouchMove)
    window.addEventListener('mouseleave', handlePointerEnd)
    window.addEventListener('touchend', handlePointerEnd)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('mouseleave', handlePointerEnd)
      window.removeEventListener('touchend', handlePointerEnd)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isEntering, pointerActive, pointerPos])

  const handleEnterSystem = () => {
    if (isEntering) return
    setIsEntering(true)
    
    // Glitch effect
    const canvas = canvasRef.current
    if (canvas) {
      let glitchCount = 0
      const glitchInterval = setInterval(() => {
        canvas.style.filter = `invert(${Math.random() > 0.95 ? 1 : 0}) brightness(${1 + Math.random() * 0.5})`
        canvas.style.transform = `translate(${Math.random() * 10 - 5}px, ${Math.random() * 10 - 5}px)`
        glitchCount++
        if (glitchCount > 15) {
          clearInterval(glitchInterval)
          canvas.style.filter = ''
          canvas.style.transform = ''
        }
      }, 50)
    }

    // Enter guest mode and redirect to onboarding
    setTimeout(() => {
      enterGuestMode()
    }, 2500)
  }

  const handleSignIn = () => {
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-[#0e0e0e] flex flex-col items-center justify-center overflow-hidden font-mono">
      {/* Particle Canvas */}
      <canvas 
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-auto"
      />
      
      {/* Scan Line */}
      <div className="fixed top-0 left-0 w-full h-[2px] bg-white/[0.05] animate-scan z-50 pointer-events-none" />
      
      {/* HUD Top */}
      <header className="fixed top-0 left-0 w-full flex justify-between items-center px-4 md:px-8 py-4 z-40 pointer-events-none">
        <div className="flex items-center space-x-2 pointer-events-auto">
          <div className="w-2 h-2 bg-white animate-pulse" />
          <span className="text-xs font-bold text-white tracking-widest uppercase">HX-SIGNAL: SEARCHING...</span>
        </div>
        <div className="hidden md:flex pointer-events-auto">
          <span className="material-symbols-outlined text-gray-500">terminal</span>
        </div>
      </header>

      {/* Main Content */}
      <main 
        className={`relative z-10 flex flex-col items-center justify-center w-full max-w-[1440px] px-4 md:px-8 transition-all duration-1000 ${
          isEntering ? 'opacity-0 scale-110' : 'opacity-100 scale-100'
        }`}
      >
        {/* Singularity Core */}
        <div 
          className="relative w-48 h-48 md:w-64 md:h-64 mb-12 flex items-center justify-center cursor-pointer group"
          onClick={handleEnterSystem}
        >
          <div className="absolute inset-0 rounded-full border border-gray-600 opacity-20 group-hover:scale-110 transition-transform duration-700" />
          <div className="absolute inset-4 rounded-full border border-gray-600 opacity-40 group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute inset-10 rounded-full border border-gray-500 opacity-60 group-hover:scale-95 transition-transform duration-500" />
          
          {/* Dark Void Core */}
          <div className="absolute inset-16 rounded-full bg-[#141313] border border-gray-600 shadow-[inset_0_0_40px_rgba(0,0,0,1)] animate-breathe group-hover:border-gray-500 group-hover:shadow-[inset_0_0_60px_rgba(0,0,0,1)] transition-all duration-500 flex items-center justify-center overflow-hidden">
            <div className="absolute w-full h-full bg-[radial-gradient(circle,transparent_40%,rgba(0,0,0,0.8)_100%)]" />
          </div>
        </div>

        {/* Mission Statement */}
        <div className="text-center mb-12 max-w-3xl px-4">
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-[0.2em] uppercase leading-relaxed glitch-text" data-text="THE STRUCTURE WAS ALWAYS THERE—HIDDEN BENEATH THE NOISE.">
            THE STRUCTURE WAS ALWAYS<br className="hidden md:block"/>
            THERE—HIDDEN BENEATH THE<br className="hidden md:block"/>
            NOISE.
          </h1>
        </div>

        {/* Action Area */}
        <div className="flex flex-col items-center space-y-6">
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => router.push('/auth/signup')}
              className="text-gray-400 uppercase tracking-widest hover:text-white transition-colors duration-300"
            >
              Sign Up
            </button>
            <span className="text-gray-600">|</span>
            <button
              onClick={() => router.push('/auth/login')}
              className="text-gray-400 uppercase tracking-widest hover:text-white transition-colors duration-300"
            >
              Sign In
            </button>
          </div>
          
          <button 
            onClick={handleEnterSystem}
            className="group relative flex items-center justify-center px-8 py-4 border border-gray-600 bg-transparent hover:bg-[#141313] hover:border-white transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 h-[4px] bg-white/15 blur-[2px] animate-btn-scan" />
            <span className="text-xs text-white tracking-widest uppercase mr-3 relative z-10">Enter as Guest</span>
            <span className="material-symbols-outlined text-white text-[16px] group-hover:rotate-180 transition-transform duration-700 relative z-10">data_usage</span>
          </button>
        </div>
      </main>

      {/* HUD Bottom */}
      <footer className="fixed bottom-0 left-0 w-full flex justify-between items-end p-4 md:p-8 z-40 pointer-events-none">
        <div className="flex items-center pointer-events-auto">
          <div className="w-10 h-10 rounded-full border border-gray-600 flex items-center justify-center hover:border-white transition-all cursor-pointer">
            <span className="text-white font-bold text-sm">K</span>
          </div>
        </div>
        <div className="flex flex-col items-end text-right space-y-1 pointer-events-auto">
          <span className="text-xs text-gray-500 uppercase tracking-tighter">COORDS // 40.4462 N, -92.5892 W</span>
          <span className="text-xs text-gray-500 uppercase tracking-tighter">V_01.8.9_STABLE</span>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes scan {
          0% { transform: translateY(-10vh); }
          100% { transform: translateY(110vh); }
        }
        
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.02); opacity: 1; }
        }
        
        @keyframes btn-scan {
          0% { top: -20%; opacity: 0; }
          10% { opacity: 0.5; }
          90% { opacity: 0.5; }
          100% { top: 120%; opacity: 0; }
        }
        
        .animate-scan {
          animation: scan 8s linear infinite;
        }
        
        .animate-breathe {
          animation: breathe 4s ease-in-out infinite;
        }
        
        .animate-btn-scan {
          animation: btn-scan 0.8s linear infinite;
        }
        
        .glitch-text {
          position: relative;
        }
        
        .glitch-text::before,
        .glitch-text::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0.8;
          background: transparent;
        }
        
        .glitch-text::before {
          left: 2px;
          text-shadow: -2px 0 #ffffff;
          animation: glitch-anim-1 2s infinite linear alternate-reverse;
        }
        
        .glitch-text::after {
          left: -2px;
          text-shadow: -2px 0 #ffffff;
          animation: glitch-anim-2 3s infinite linear alternate-reverse;
        }
        
        @keyframes glitch-anim-1 {
          0% { clip: rect(20px, 9999px, 85px, 0); }
          20% { clip: rect(5px, 9999px, 15px, 0); }
          40% { clip: rect(60px, 9999px, 70px, 0); }
          60% { clip: rect(30px, 9999px, 40px, 0); }
          80% { clip: rect(80px, 9999px, 95px, 0); }
          100% { clip: rect(10px, 9999px, 50px, 0); }
        }
        
        @keyframes glitch-anim-2 {
          0% { clip: rect(10px, 9999px, 40px, 0); }
          20% { clip: rect(70px, 9999px, 90px, 0); }
          40% { clip: rect(20px, 9999px, 30px, 0); }
          60% { clip: rect(50px, 9999px, 60px, 0); }
          80% { clip: rect(80px, 9999px, 95px, 0); }
          100% { clip: rect(5px, 9999px, 15px, 0); }
        }
      `}</style>
    </div>
  )
}