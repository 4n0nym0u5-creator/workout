type Props = {
  value: number
  goal?: number
  caption: string
}

export function GoalRing({ value, goal = 250, caption }: Props) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const pct = Math.max(0, Math.min(1, goal === 0 ? 0 : value / goal))
  const full = value >= goal && goal > 0

  return (
    <div className="relative grid h-40 w-40 place-items-center">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" role="img" aria-label={`${value} of ${goal}. ${caption}`}>
        <circle cx="64" cy="64" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke={full ? '#e6a100' : '#b3121b'}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - pct)}
        />
      </svg>
      <div className="absolute text-center">
        <p className="font-display text-5xl leading-none">{value}</p>
        <p className="mt-1 text-[0.65rem] uppercase tracking-[0.16em] text-mute">{caption}</p>
      </div>
    </div>
  )
}
