import { useNavigate } from 'react-router-dom'
import { LoginPanel } from '../components/LoginPanel'
import { Kicker, Page } from '../components/ui'

/** Kept as a deep link; the same login UI also lives on Home. */
export function Account() {
  const navigate = useNavigate()

  return (
    <Page title="Account">
      <Kicker>Account</Kicker>
      <h1 className="mt-2 font-display text-6xl leading-none">Your login</h1>
      <p className="mt-3 max-w-md text-mute">Sign in here or from the home page. Same account either way.</p>
      <div className="mt-6">
        <LoginPanel onAuthed={() => navigate('/')} />
      </div>
    </Page>
  )
}
