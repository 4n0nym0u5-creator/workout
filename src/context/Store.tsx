import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadDatabase, saveDatabase, type Database } from '../lib/storage'
import type { Session, Settings } from '../lib/types'

type StoreValue = {
  sessions: Session[]
  settings: Settings
  storageWarning: string | null
  updateSettings: (patch: Partial<Settings>) => void
  saveSession: (session: Session) => void
  deleteSession: (id: string) => void
  replaceAll: (sessions: Session[], settings?: Settings) => void
  mergeSessions: (incoming: Session[], settings?: Settings) => void
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database>(() => loadDatabase())
  const [storageWarning, setStorageWarning] = useState<string | null>(null)

  useEffect(() => {
    try {
      saveDatabase(db)
    } catch {
      setStorageWarning('This browser is not keeping the log. Export a backup before you leave.')
    }
  }, [db])

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

  const value = useMemo(
    () => ({
      sessions: db.sessions,
      settings: db.settings,
      storageWarning,
      updateSettings,
      saveSession,
      deleteSession,
      replaceAll,
      mergeSessions,
    }),
    [db, storageWarning, updateSettings, saveSession, deleteSession, replaceAll, mergeSessions],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used inside StoreProvider')
  return store
}
