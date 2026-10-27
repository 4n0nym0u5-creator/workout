import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'

export function useTitle(title: string) {
  useEffect(() => {
    document.title = title === 'Home' ? 'Tyson Push-Up' : `${title} · Tyson Push-Up`
  }, [title])
}

export function Page({
  title,
  children,
  wide = false,
}: {
  title: string
  children: ReactNode
  wide?: boolean
}) {
  useTitle(title)
  return (
    <div className={`animate-page mx-auto w-full px-4 pb-28 pt-6 md:px-8 md:pb-16 ${wide ? 'max-w-5xl' : 'max-w-3xl'}`}>
      {children}
    </div>
  )
}

export function Kicker({ children }: { children: ReactNode }) {
  return <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-blood">{children}</p>
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'primary' | 'ghost' | 'good' }

export function Button({ tone = 'primary', className = '', type = 'button', ...props }: ButtonProps) {
  const tones = {
    primary: 'bg-blood text-white shadow-[0_12px_30px_-16px_rgba(179,18,27,0.9)]',
    ghost: 'border border-line bg-white/5 text-cream',
    good: 'bg-cream text-ink',
  }[tone]
  return (
    <button
      type={type}
      className={`inline-flex h-14 items-center justify-center rounded-2xl px-5 font-display text-3xl tracking-wide transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${tones} ${className}`}
      {...props}
    />
  )
}

export function Pill({
  pressed,
  children,
  onClick,
  className = '',
}: {
  pressed: boolean
  children: ReactNode
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`h-10 rounded-full px-3 text-sm font-semibold transition ${pressed ? 'bg-blood text-white' : 'bg-white/5 text-mute'} ${className}`}
    >
      {children}
    </button>
  )
}
