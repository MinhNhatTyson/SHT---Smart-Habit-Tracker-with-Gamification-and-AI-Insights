// src/renderer/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom'

// Pages (we'll build these one by one)
import Dashboard   from './pages/Dashboard'
import Habits      from './pages/Habits'
import Gamification from './pages/Gamification'
import Insights    from './pages/Insights'
import Social      from './pages/Social'
import Settings    from './pages/Settings'

// Shared layout
import AppShell from './components/shared/AppShell'

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/"             element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard"    element={<Dashboard />} />
        <Route path="/habits"       element={<Habits />} />
        <Route path="/gamification" element={<Gamification />} />
        <Route path="/insights"     element={<Insights />} />
        <Route path="/social"       element={<Social />} />
        <Route path="/settings"     element={<Settings />} />
      </Routes>
    </AppShell>
  )
}
