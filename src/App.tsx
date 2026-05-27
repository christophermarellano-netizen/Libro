import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthRedirectHandler } from './components/Auth/AuthRedirectHandler'
import { AppShell } from './components/Layout/AppShell'
import { LibraryPage } from './pages/LibraryPage'
import { ReaderPage } from './pages/ReaderPage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthRedirectHandler>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<LibraryPage />} />
            <Route path="read/:id" element={<ReaderPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </AuthRedirectHandler>
    </BrowserRouter>
  )
}
