import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Kicker, Page } from '../components/ui'
import { useStore } from '../context/Store'

export function Account() {
  const navigate = useNavigate()
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
      navigate('/progress')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  if (user) {
    return (
      <Page title="Account">
        <Kicker>Signed in</Kicker>
        <h1 className="mt-2 font-display text-6xl leading-none">Your account</h1>
        <p className="mt-3 max-w-md text-mute">
          Workouts save to this login so you can open the same log on another phone or browser.
        </p>
        <p className="mt-6 font-display text-4xl leading-none">{user.email}</p>
        <p className="mt-2 text-sm text-mute">{syncLine(syncStatus)}</p>
        <div className="mt-6 grid gap-2">
          <Button
            tone="ghost"
            onClick={() => {
              void logout()
            }}
          >
            Log out
          </Button>
          <Link to="/progress" className="text-center text-sm font-semibold uppercase tracking-[0.16em] text-mute">
            Back to log
          </Link>
        </div>
      </Page>
    )
  }

  return (
    <Page title={mode === 'login' ? 'Log in' : 'Sign up'}>
      <Kicker>Account</Kicker>
      <h1 className="mt-2 font-display text-6xl leading-none">{mode === 'login' ? 'Log in' : 'Create account'}</h1>
      <p className="mt-3 max-w-md text-mute">
        {mode === 'login'
          ? 'Sign in to keep your workouts on your account across devices.'
          : 'Create a login so your progress is not stuck in one browser.'}
      </p>

      <form className="mt-6 grid gap-3" onSubmit={(event) => void submit(event)}>
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
        className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-mute"
        onClick={() => {
          setMode((current) => (current === 'login' ? 'signup' : 'login'))
          setError(null)
        }}
      >
        {mode === 'login' ? 'Need an account? Sign up' : 'Already have one? Log in'}
      </button>
    </Page>
  )
}

function syncLine(status: ReturnType<typeof useStore>['syncStatus']) {
  if (status.state === 'synced') return `Saved to account · ${new Date(status.at).toLocaleString()}`
  if (status.state === 'syncing') return 'Saving to your account…'
  if (status.state === 'local' || status.state === 'error') return status.message
  return 'Ready'
}
