type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  gravity: number
  size: number
  rotation: number
  spin: number
  color: string
}

const COLORS = ['#b3121b', '#ff3140', '#f4efe6', '#e6a100', '#ffffff', '#6e0c12']

export function runConfetti(canvas: HTMLCanvasElement) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}

  const draw = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    canvas.width = Math.max(1, Math.floor(width * dpr))
    canvas.height = Math.max(1, Math.floor(height * dpr))
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    return { width, height }
  }

  let { width, height } = draw()
  const particles: Particle[] = Array.from({ length: 150 }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.35
    const speed = 7 + Math.random() * 9
    return {
      x: width * (0.32 + Math.random() * 0.36),
      y: height * 0.32,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      gravity: 0.16 + Math.random() * 0.1,
      size: 4 + (index % 5),
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.28,
      color: COLORS[index % COLORS.length],
    }
  })

  let frame = 0
  const started = performance.now()
  const tick = (now: number) => {
    const elapsed = now - started
    ;({ width, height } = draw())
    ctx.clearRect(0, 0, width, height)
    const life = Math.max(0, 1 - elapsed / 2300)
    for (const particle of particles) {
      particle.vy += particle.gravity
      particle.x += particle.vx
      particle.y += particle.vy
      particle.vx *= 0.992
      particle.rotation += particle.spin
      ctx.save()
      ctx.translate(particle.x, particle.y)
      ctx.rotate(particle.rotation)
      ctx.globalAlpha = life
      ctx.fillStyle = particle.color
      ctx.fillRect(-particle.size / 2, -particle.size / 5, particle.size, particle.size / 2.4)
      ctx.restore()
    }
    if (elapsed < 2400) frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(frame)
}
