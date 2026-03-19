import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Hash, Plus, LogOut, Wifi, WifiOff } from 'lucide-react'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function LobbyPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('create') // 'create' | 'join'
  const [joinRoomId, setJoinRoomId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/api/rooms/create')
      localStorage.setItem('roomId', data.room.roomId)
      navigate(`/chat/${data.room.roomId}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create room.')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    if (!joinRoomId.trim()) return
    setError('')
    setLoading(true)
    try {
      await api.post('/api/rooms/join', { roomId: joinRoomId.trim() })
      localStorage.setItem('roomId', joinRoomId.trim())
      navigate(`/chat/${joinRoomId.trim()}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Room not found or could not join.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Auto-rejoin last room on load
  const lastRoom = localStorage.getItem('roomId')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">ChatRoom</h1>
          <p className="text-gray-400 mt-1">
            Hello, <span className="text-blue-400 font-semibold">{user?.username}</span> 👋
          </p>
        </div>

        <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700 space-y-6">
          {error && (
            <div className="p-3 bg-red-900/40 border border-red-700 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Rejoin banner */}
          {lastRoom && (
            <button
              onClick={() => navigate(`/chat/${lastRoom}`)}
              className="w-full flex items-center justify-between px-4 py-3 bg-blue-900/30 border border-blue-700 rounded-xl text-blue-300 hover:bg-blue-900/50 transition text-sm"
            >
              <span>🔁 Rejoin last room: <span className="font-mono font-semibold">{lastRoom}</span></span>
              <span>→</span>
            </button>
          )}

          {/* Tabs */}
          <div className="flex bg-gray-700/50 rounded-xl p-1">
            {['create', 'join'].map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {t === 'create' ? '✨ Create Room' : '🔑 Join Room'}
              </button>
            ))}
          </div>

          {/* Create Room */}
          {tab === 'create' && (
            <div className="space-y-4">
              <p className="text-gray-400 text-sm text-center">
                A unique room ID will be generated for you to share with others.
              </p>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full py-3 flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-all transform hover:scale-[1.02]"
              >
                <Plus className="w-5 h-5" />
                <span>{loading ? 'Creating…' : 'Create New Room'}</span>
              </button>
            </div>
          )}

          {/* Join Room */}
          {tab === 'join' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Room ID</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                    placeholder="Paste room ID here…"
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none transition font-mono"
                  />
                </div>
              </div>
              <button
                onClick={handleJoin}
                disabled={loading || !joinRoomId.trim()}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all transform hover:scale-[1.02]"
              >
                {loading ? 'Joining…' : 'Join Room'}
              </button>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 py-2.5 border border-gray-600 rounded-xl text-gray-400 hover:text-red-400 hover:border-red-700 transition text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Created by <span className="font-semibold text-gray-500">Shiv Gupta</span>
        </p>
      </div>
    </div>
  )
}
