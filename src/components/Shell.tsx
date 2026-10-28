import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useStore } from '../context/Store'
import { currentStreak } from '../lib/stats'
import { Button } from './ui'

type LeaveValue = {
  dirty: boolean
  setDirty: (value: boolean) => void
  requestNav: (to: string) => void
}

const LeaveContext = createContext<LeaveValue | null>(null)

export function useLeaveGuard() {
  const value = useContext(LeaveContext)
  if (!value) throw new Error('useLeaveGuard must be used inside Shell')
  return value
}

const LINKS = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/learn', label: 'Learn', icon: LearnIcon },
  { to: '/workout', label: 'Train', icon: TrainIcon },
  { to: '/progress', label: 'Log', icon: LogIcon },
]

export function Shell() {
  const navigate = useNavigate()
  const { sessions } = useStore()
  const [dirty, setDirty] = useState(false)
  const [pending, setPending] = useState<string | null>(null)
  const streak = currentStreak(sessions, new Date())

  const requestNav = useCallback(
    (to: string) => {
      if (dirty) setPending(to)
      else navigate(to)
    },
    [dirty, navigate],
  )

  const leave = useMemo(() => ({ dirty, setDirty, requestNav }), [dirty, requestNav])

  return (
    <LeaveContext.Provider value={leave}>
      <div className="mx-auto grid min-h-dvh max-w-6xl md:grid-cols-[232px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-dvh flex-col border-r border-white/10 px-5 py-7 md:flex">
          <NavLink to="/" className="block" onClick={(event) => guardClick(event, dirty, () => setPending('/'))}>
            <p className="font-display text-5xl leading-none">TYSON</p>
            <p className="font-display text-2xl leading-none text-blood">PUSH-UP</p>
          </NavLink>
          <nav className="mt-10 grid gap-1" aria-label="Primary">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={(event) => guardClick(event, dirty, () => setPending(link.to))}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold uppercase tracking-[0.16em] ${isActive ? 'bg-blood text-white' : 'text-mute hover:bg-white/5 hover:text-cream'}`
                }
              >
                <link.icon />
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto grid gap-3">
            <NavLink
              to="/"
              end
              onClick={(event) => {
                guardClick(event, dirty, () => setPending('/'))
                window.setTimeout(() => document.getElementById('login')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
              }}
              className="rounded-2xl px-3 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-mute hover:text-cream"
            >
              Account
            </NavLink>
            <p className="text-sm text-mute">
              <span className="font-display text-4xl text-cream">{streak}</span>
              <span className="mt-1 block uppercase tracking-[0.18em]">day streak</span>
            </p>
          </div>
        </aside>
        <main id="main" className="min-w-0">
          <Outlet />
        </main>
      </div>

      {dirty ? null : (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#070708]/92 backdrop-blur-md md:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          aria-label="Primary"
        >
          <div className="mx-auto grid max-w-lg grid-cols-4">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${isActive ? 'text-cream' : 'text-mute'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`h-1 w-5 rounded-full ${isActive ? 'bg-blood' : 'bg-transparent'}`} />
                    <link.icon />
                    {link.label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}

      {pending ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/75 p-4 md:place-items-center">
          <div className="w-full max-w-sm rounded-3xl border border-line bg-panel p-5" role="alertdialog" aria-labelledby="leave-title">
            <h2 id="leave-title" className="font-display text-4xl leading-none">
              Leave this session?
            </h2>
            <p className="mt-3 text-mute">Reps stay off the log until you finish the workout.</p>
            <div className="mt-5 grid gap-2">
              <Button onClick={() => setPending(null)}>Stay</Button>
              <Button
                tone="ghost"
                onClick={() => {
                  const next = pending
                  setPending(null)
                  setDirty(false)
                  navigate(next)
                }}
              >
                Leave
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </LeaveContext.Provider>
  )
}

function guardClick(event: { preventDefault: () => void; metaKey: boolean; altKey: boolean; ctrlKey: boolean; shiftKey: boolean }, dirty: boolean, block: () => void) {
  if (!dirty || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return
  event.preventDefault()
  block()
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="currentColor" d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
    </svg>
  )
}

function LearnIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="currentColor" d="M6 4h11a2 2 0 0 1 2 2v14H8a2 2 0 0 0-2 2V4zm0 16a2 2 0 0 1 2-2h11" />
    </svg>
  )
}

function TrainIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="currentColor" d="M13 2 4 14h7l-1 8 10-14h-7z" />
    </svg>
  )
}

function LogIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="currentColor" d="M5 3h14v18H5zM8 8h8v2H8zm0 4h8v2H8zm0 4h5v2H8z" />
    </svg>
  )
}

export function FocusFrame({ children }: { children: ReactNode }) {
  return <div className="animate-page mx-auto w-full max-w-3xl px-4 pb-28 pt-5 md:px-8 md:pb-12 md:pt-8">{children}</div>
}
