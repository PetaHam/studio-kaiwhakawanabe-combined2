'use client'

import React, { useEffect, useRef } from 'react'

interface VictoryEffectProps {
  isWinner: boolean
  intensity?: 'low' | 'medium' | 'high'
  enabled?: boolean
}

export function VictoryEffect({ isWinner, intensity = 'high', enabled = true }: VictoryEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!enabled || !isWinner) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particleCount = intensity === 'high' ? 150 : intensity === 'medium' ? 100 : 50
    const particles: Particle[] = []

    class Particle {
      x: number
      y: number
      vx: number
      vy: number
      size: number
      color: string
      gravity: number
      opacity: number
      life: number

      constructor() {
        this.x = canvas!.width / 2
        this.y = canvas!.height / 2
        
        const angle = Math.random() * Math.PI * 2
        const speed = Math.random() * 10 + 5
        this.vx = Math.cos(angle) * speed
        this.vy = Math.sin(angle) * speed - Math.random() * 5
        
        this.size = Math.random() * 8 + 4
        this.color = this.getRandomColor()
        this.gravity = 0.3
        this.opacity = 1
        this.life = 1
      }

      getRandomColor(): string {
        const colors = [
          '#FFD700', // Gold
          '#FFA500', // Orange
          '#FF4500', // OrangeRed (primary)
          '#FF69B4', // Pink
          '#00CED1', // Cyan
          '#9370DB', // Purple
          '#32CD32', // Green
        ]
        return colors[Math.floor(Math.random() * colors.length)]
      }

      update() {
        this.x += this.vx
        this.y += this.vy
        this.vy += this.gravity
        this.vx *= 0.99
        this.life -= 0.01
        this.opacity = this.life
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.save()
        ctx.globalAlpha = this.opacity
        ctx.fillStyle = this.color
        
        // Draw confetti rectangle
        ctx.translate(this.x, this.y)
        ctx.rotate(this.vx * 0.1)
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size * 2)
        
        ctx.restore()
      }
    }

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle())
    }

    let animationId: number

    function animate() {
      if (!ctx || !canvas) return
      
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((particle, index) => {
        particle.update()
        particle.draw(ctx)

        if (particle.life <= 0) {
          particles.splice(index, 1)
        }
      })

      if (particles.length > 0) {
        animationId = requestAnimationFrame(animate)
      }
    }

    animate()

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [isWinner, intensity, enabled])

  if (!enabled || !isWinner) return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ mixBlendMode: 'screen' }}
    />
  )
}