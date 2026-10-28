import { useState, type FormEvent } from 'react'
import { useStore } from '../context/Store'
import { Button, Kicker } from './ui'

export function LoginPanel({
  compact = false,
  onAuthed,
}: {
  compact?: boolean
  onAuthed?: () => void
}) {
  const { user, login, signup, logout, syncStatus } = useStore()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'login') await login(email, password)
      else await signup(email, password)
      onAuthed?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  if (user) {
    return (
      <section id="login" className="rounded-[1.7rem] border border-line bg-panel p-5" data-testid="home-account">
        <Kicker>Account</Kicker>
        <p className="mt-2 font-display text-4xl leading-none">{user.email}</p>
        <p className="mt-2 text-sm text-mute">{syncLine(syncStatus)}</p>
        <Button tone="ghost" className="mt-4 w-full" onClick={() => void logout()}>
          Log out
        </Button>
      </section>
    )
  }

  return (
    <section className="rounded-[1.7rem] border border-line bg-panel p-5" data-testid="home-login" id="login">
      <Kicker>Account</Kicker>
      <h2 className={`mt-2 font-display leading-none ${compact ? 'text-4xl' : 'text-5xl'}`}>
        {mode === 'login' ? 'Log in' : 'Create account'}
      </h2>
      <p className="mt-2 max-w-md text-sm text-mute">
        {mode === 'login'
          ? 'Keep your workouts on your account across phones and browsers.'
          : 'Sign up so progress is not stuck in one browser.'}
      </p>

      <form className="mt-4 grid gap-3" onSubmit={(event) => void submit(event)}>
        <label className="block text-sm text-mute">
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 h-12 w-full rounded-xl border border-line bg-ink px-3 text-cream"
          />
        </label>
        <label className="block text-sm text-mute">
          Password
          <input
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 h-12 w-full rounded-xl border border-line bg-ink px-3 text-cream"
          />
        </label>
        {error ? <p className="text-sm text-ember">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={busy} data-testid="account-submit">
          {busy ? 'Working…' : mode === 'login' ? 'Log in' : 'Sign up'}
        </Button>
      </form>

      <button
        type="button"
        className="mt-3 text-sm font-semibold uppercase tracking-[0.16em] text-mute"
        onClick={() => {
          setMode((current) => (current === 'login' ? 'signup' : 'login'))
          setError(null)
        }}
      >
        {mode === 'login' ? 'Need an account? Sign up' : 'Already have one? Log in'}
      </button>
    </section>
  )
}

function syncLine(status: ReturnType<typeof useStore>['syncStatus']) {
  if (status.state === 'synced') return `Saved to account · ${new Date(status.at).toLocaleString()}`
  if (status.state === 'syncing') return 'Saving to your account…'
  if (status.state === 'local' || status.state === 'error') return status.message
  return 'Ready'
}
