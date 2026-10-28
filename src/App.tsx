import { HashRouter, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { StoreProvider } from './context/Store'
import { Home } from './pages/Home'
import { Learn } from './pages/Learn'
import { Progress } from './pages/Progress'
import { Workout } from './pages/Workout'

const rawBase = import.meta.env.BASE_URL.replace(/\/$/, '')
const basename = rawBase.length > 0 ? rawBase : undefined

export function App() {
  return (
    <StoreProvider>
      <HashRouter basename={basename}>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Home />} />
            <Route path="learn" element={<Learn />} />
            <Route path="workout" element={<Workout />} />
            <Route path="progress" element={<Progress />} />
          </Route>
        </Routes>
      </HashRouter>
    </StoreProvider>
  )
}
