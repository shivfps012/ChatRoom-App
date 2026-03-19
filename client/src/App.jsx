import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import LobbyPage from './pages/LobbyPage'
import ChatPage from './pages/ChatPage'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  return user ? children : <Navigate to="/login" replace />
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  return user ? <Navigate to="/lobby" replace /> : children
}

function FullScreenLoader() {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-900">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/lobby" replace />} />
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/signup" element={<GuestRoute><SignupPage /></GuestRoute>} />
          <Route path="/lobby" element={<PrivateRoute><LobbyPage /></PrivateRoute>} />
          <Route path="/chat/:roomId" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
