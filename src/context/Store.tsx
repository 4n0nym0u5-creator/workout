import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  fetchMe,
  login as accountLogin,
  logout as accountLogout,
  mergeAccountLocal,
  pullAccount,
  pushAccount,
  signup as accountSignup,
  type AccountUser,
  type SyncState,
} from '../lib/account'
import { loadDatabase, saveDatabase, type Database } from '../lib/storage'
import type { Session, Settings } from '../lib/types'

type StoreValue = {
  sessions: Session[]
  settings: Settings
  storageWarning: string | null
  user: AccountUser | null
  authReady: boolean
  syncStatus: SyncState
  updateSettings: (patch: Partial<Settings>) => void
  saveSession: (session: Session) => void
  deleteSession: (id: string) => void
  replaceAll: (sessions: Session[], settings?: Settings) => void
  mergeSessions: (incoming: Session[], settings?: Settings) => void
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  syncNow: () => Promise<void>
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database>(() => loadDatabase())
  const [storageWarning, setStorageWarning] = useState<string | null>(null)
  const [user, setUser] = useState<AccountUser | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncState>({ state: 'idle' })
  const dbRef = useRef(db)
  const hydrated = useRef(false)
  const pushTimer = useRef<number | null>(null)
  dbRef.current = db

  useEffect(() => {
    try {
      saveDatabase(db)
    } catch {
      setStorageWarning('This browser is not keeping the log. Export a backup before you leave.')
    }
  }, [db])

  const pushToAccount = useCallback(async (next: Database) => {
    setSyncStatus({ state: 'syncing' })
    try {
      const result = await pushAccount(next)
      if (result.unauthorized) {
        setUser(null)
        setSyncStatus({ state: 'idle' })
        return
      }
      if (result.unavailable) {
        setSyncStatus({
          state: 'local',
          message: 'Account storage is offline. Progress still saves in this browser.',
        })
        return
      }
      setSyncStatus({ state: 'synced', at: new Date().toISOString() })
    } catch (error) {
      setSyncStatus({
        state: 'error',
        message: error instanceof Error ? error.message : 'Could not save to your account.',
      })
    }
  }, [])

  const schedulePush = useCallback(
    (next: Database) => {
      if (!user) return
      if (pushTimer.current !== null) window.clearTimeout(pushTimer.current)
      pushTimer.current = window.setTimeout(() => {
        void pushToAccount(next)
      }, 700)
    },
    [pushToAccount, user],
  )

  const hydrateAccount = useCallback(async (nextUser: AccountUser) => {
    setUser(nextUser)
    setSyncStatus({ state: 'syncing' })
    try {
      const remote = await pullAccount()
      if (!remote) {
        setSyncStatus({
          state: 'local',
          message: 'Logged in, but account storage is offline. Progress stays in this browser for now.',
        })
        hydrated.current = true
        return
      }
      const merged = mergeAccountLocal(dbRef.current, remote)
      setDb(merged)
      await pushAccount(merged)
      setSyncStatus({ state: 'synced', at: new Date().toISOString() })
    } catch (error) {
      setSyncStatus({
        state: 'error',
        message: error instanceof Error ? error.message : 'Could not load your account log.',
      })
    } finally {
      hydrated.current = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function boot() {
      const me = await fetchMe()
      if (cancelled) return
      if (!me) {
        setUser(null)
        setSyncStatus({ state: 'idle' })
        setAuthReady(true)
        hydrated.current = true
        return
      }
      await hydrateAccount(me)
      if (!cancelled) setAuthReady(true)
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [hydrateAccount])

  useEffect(() => {
    if (!hydrated.current || !user) return
    schedulePush(db)
  }, [db, schedulePush, user])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setDb((current) => ({ ...current, settings: { ...current.settings, ...patch } }))
  }, [])

  const saveSession = useCallback((session: Session) => {
    setDb((current) => {
      const exists = current.sessions.some((item) => item.id === session.id)
      const sessions = exists
        ? current.sessions.map((item) => (item.id === session.id ? session : item))
        : [...current.sessions, session]
      return { ...current, sessions }
    })
  }, [])

  const deleteSession = useCallback((id: string) => {
    setDb((current) => ({ ...current, sessions: current.sessions.filter((item) => item.id !== id) }))
  }, [])

  const replaceAll = useCallback((sessions: Session[], settings?: Settings) => {
    setDb((current) => ({ ...current, sessions, settings: settings ?? current.settings }))
  }, [])

  const mergeSessions = useCallback((incoming: Session[], settings?: Settings) => {
    setDb((current) => {
      const map = new Map(current.sessions.map((session) => [session.id, session]))
      for (const session of incoming) map.set(session.id, session)
      return { ...current, sessions: [...map.values()], settings: settings ?? current.settings }
    })
  }, [])

  const login = useCallback(
    async (email: string, password: string) => {
      const next = await accountLogin(email, password)
      hydrated.current = false
      await hydrateAccount(next)
    },
    [hydrateAccount],
  )

  const signup = useCallback(
    async (email: string, password: string) => {
      const next = await accountSignup(email, password)
      hydrated.current = false
      await hydrateAccount(next)
    },
    [hydrateAccount],
  )

  const logout = useCallback(async () => {
    if (pushTimer.current !== null) window.clearTimeout(pushTimer.current)
    await accountLogout()
    setUser(null)
    setSyncStatus({ state: 'idle' })
    hydrated.current = true
  }, [])

  const syncNow = useCallback(async () => {
    if (!user) return
    hydrated.current = true
    await pushToAccount(dbRef.current)
  }, [pushToAccount, user])

  const value = useMemo(
    () => ({
      sessions: db.sessions,
      settings: db.settings,
      storageWarning,
      user,
      authReady,
      syncStatus,
      updateSettings,
      saveSession,
      deleteSession,
      replaceAll,
      mergeSessions,
      login,
      signup,
      logout,
      syncNow,
    }),
    [
      db,
      storageWarning,
      user,
      authReady,
      syncStatus,
      updateSettings,
      saveSession,
      deleteSession,
      replaceAll,
      mergeSessions,
      login,
      signup,
      logout,
      syncNow,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used inside StoreProvider')
  return store
}
