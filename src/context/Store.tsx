import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  checkCloudHealth,
  getOrCreateProfileId,
  mergeCloudLocal,
  pullCloud,
  pushCloud,
  setProfileId,
  type CloudStatus,
} from '../lib/cloud'
import { loadDatabase, saveDatabase, type Database } from '../lib/storage'
import type { Session, Settings } from '../lib/types'

type StoreValue = {
  sessions: Session[]
  settings: Settings
  storageWarning: string | null
  cloudStatus: CloudStatus
  profileId: string
  updateSettings: (patch: Partial<Settings>) => void
  saveSession: (session: Session) => void
  deleteSession: (id: string) => void
  replaceAll: (sessions: Session[], settings?: Settings) => void
  mergeSessions: (incoming: Session[], settings?: Settings) => void
  syncNow: () => Promise<void>
  adoptProfile: (profileId: string) => Promise<void>
}

const StoreContext = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database>(() => loadDatabase())
  const [storageWarning, setStorageWarning] = useState<string | null>(null)
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>({ state: 'idle' })
  const [profileId, setProfileIdState] = useState(() => getOrCreateProfileId())
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

  const pushToCloud = useCallback(async (next: Database, id: string) => {
    setCloudStatus({ state: 'syncing' })
    try {
      const result = await pushCloud(id, next)
      if (result.unavailable) {
        setCloudStatus({
          state: 'local',
          message: 'Cloud database is not connected yet. Progress still saves in this browser.',
        })
        return
      }
      setCloudStatus({ state: 'synced', at: new Date().toISOString() })
    } catch (error) {
      setCloudStatus({
        state: 'error',
        message: error instanceof Error ? error.message : 'Cloud sync failed.',
      })
    }
  }, [])

  const schedulePush = useCallback(
    (next: Database, id: string) => {
      if (pushTimer.current !== null) window.clearTimeout(pushTimer.current)
      pushTimer.current = window.setTimeout(() => {
        void pushToCloud(next, id)
      }, 700)
    },
    [pushToCloud],
  )

  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      setCloudStatus({ state: 'syncing' })
      const health = await checkCloudHealth()
      if (cancelled) return
      if (!health.ok) {
        setCloudStatus({ state: 'local', message: health.message })
        hydrated.current = true
        return
      }
      try {
        const cloud = await pullCloud(profileId)
        if (cancelled) return
        if (!cloud) {
          setCloudStatus({
            state: 'local',
            message: 'Cloud database is not connected yet. Progress still saves in this browser.',
          })
          hydrated.current = true
          return
        }
        const merged = mergeCloudLocal(dbRef.current, cloud)
        setDb(merged)
        await pushCloud(profileId, merged)
        if (cancelled) return
        setCloudStatus({ state: 'synced', at: new Date().toISOString() })
      } catch (error) {
        if (cancelled) return
        setCloudStatus({
          state: 'error',
          message: error instanceof Error ? error.message : 'Could not load cloud log.',
        })
      } finally {
        hydrated.current = true
      }
    }
    void hydrate()
    return () => {
      cancelled = true
    }
  }, [profileId])

  useEffect(() => {
    if (!hydrated.current) return
    schedulePush(db, profileId)
  }, [db, profileId, schedulePush])

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

  const syncNow = useCallback(async () => {
    hydrated.current = true
    await pushToCloud(dbRef.current, profileId)
  }, [profileId, pushToCloud])

  const adoptProfile = useCallback(
    async (nextId: string) => {
      setProfileId(nextId)
      setProfileIdState(nextId)
      setCloudStatus({ state: 'syncing' })
      const cloud = await pullCloud(nextId)
      if (!cloud) {
        setCloudStatus({
          state: 'local',
          message: 'Cloud database is not connected yet. Progress still saves in this browser.',
        })
        return
      }
      const merged = mergeCloudLocal(emptyLike(dbRef.current), cloud)
      setDb(merged)
      setCloudStatus({ state: 'synced', at: new Date().toISOString() })
    },
    [],
  )

  const value = useMemo(
    () => ({
      sessions: db.sessions,
      settings: db.settings,
      storageWarning,
      cloudStatus,
      profileId,
      updateSettings,
      saveSession,
      deleteSession,
      replaceAll,
      mergeSessions,
      syncNow,
      adoptProfile,
    }),
    [
      db,
      storageWarning,
      cloudStatus,
      profileId,
      updateSettings,
      saveSession,
      deleteSession,
      replaceAll,
      mergeSessions,
      syncNow,
      adoptProfile,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

function emptyLike(current: Database): Database {
  return { version: 1, sessions: [], settings: current.settings }
}

export function useStore() {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used inside StoreProvider')
  return store
}
