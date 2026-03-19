import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Send, Users, Wifi, WifiOff, MessageCircle,
  Moon, Sun, Smile, ImageIcon, LogOut, Copy, Check,
} from 'lucide-react'
import EmojiPicker from 'emoji-picker-react'
import { v4 as uuidv4 } from 'uuid'
import { useAuth } from '../context/AuthContext'
import { useWebSocket } from '../hooks/useWebSocket'
import api from '../api/axios'

// ── Emoji helper ──────────────────────────────────────────────────────────────
function wrapEmojis(text) {
  return text.replace(
    /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Extended_Pictographic})/gu,
    (emoji) => `<span class="emoji">${emoji}</span>`
  )
}

// ── Typing indicator component ────────────────────────────────────────────────
function TypingIndicator({ users }) {
  if (!users.length) return null
  const label =
    users.length === 1
      ? `${users[0]} is typing…`
      : `${users.slice(0, 2).join(', ')} are typing…`
  return (
    <div className="flex items-center space-x-2 px-4 py-1 text-sm text-gray-400">
      <span className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
      <span>{label}</span>
    </div>
  )
}

export default function ChatPage() {
  const { roomId } = useParams()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const token = localStorage.getItem('token')
  const [darkMode, setDarkMode] = useState(true)
  const [message, setMessage] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [zoomImage, setZoomImage] = useState(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [wsError, setWsError] = useState('')

  const messagesEndRef = useRef(null)
  const emojiPickerRef = useRef(null)
  const typingTimer = useRef(null)
  const isTypingRef = useRef(false)

  const { messages, connected, usersCount, typingUsers, sendChat, sendTyping, disconnect } =
    useWebSocket({
      roomId,
      token,
      userId: user?.id,
      onError: setWsError,
    })

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingUsers])

  // Close emoji picker on outside click
  useEffect(() => {
    const handle = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSend = () => {
    if (!message.trim() || !connected) return
    sendChat({ message: message.trim() })
    setMessage('')
    handleStopTyping()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTyping = (e) => {
    setMessage(e.target.value)
    if (!isTypingRef.current) {
      isTypingRef.current = true
      sendTyping(true)
    }
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(handleStopTyping, 2000)
  }

  const handleStopTyping = () => {
    if (isTypingRef.current) {
      isTypingRef.current = false
      sendTyping(false)
    }
    clearTimeout(typingTimer.current)
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !connected) return
    e.target.value = null
    setImageUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const { data } = await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      sendChat({ imageUrl: data.url })
    } catch {
      setWsError('Image upload failed.')
    } finally {
      setImageUploading(false)
    }
  }

  const handleLeave = () => {
    disconnect()
    localStorage.removeItem('roomId')
    navigate('/lobby')
  }

  const handleLogout = async () => {
    disconnect()
    await logout()
    navigate('/login')
  }

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const dm = darkMode
  const bgPage = dm ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' : 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'
  const bgPanel = dm ? 'bg-gray-800/80 border-gray-700/20' : 'bg-white/80 border-white/20'
  const textPrimary = dm ? 'text-white' : 'text-gray-800'
  const textSecondary = dm ? 'text-gray-300' : 'text-gray-600'

  return (
    <div className={`h-screen flex flex-col ${bgPage}`}>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className={`fixed top-0 w-full z-50 ${bgPanel} backdrop-blur-sm border-b px-4 sm:px-6 py-3`}>
        <div className="flex items-center justify-between gap-2">
          {/* Left: room info */}
          <div className="flex items-center space-x-3 min-w-0">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full w-9 h-9 flex-shrink-0 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h1 className={`text-base font-bold truncate ${textPrimary}`}>
                  #{roomId}
                </h1>
                <button
                  onClick={copyRoomId}
                  className={`flex-shrink-0 flex items-center space-x-1 text-xs px-2 py-0.5 rounded-lg transition ${dm ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className={`text-xs ${textSecondary}`}>Hi, {user?.username}</p>
            </div>
          </div>

          {/* Right: status + actions */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            <div className="hidden sm:flex items-center space-x-1">
              <Users className={`w-4 h-4 ${dm ? 'text-gray-500' : 'text-gray-400'}`} />
              <span className={`text-sm ${textSecondary}`}>{usersCount}</span>
            </div>
            <div className="flex items-center space-x-1">
              {connected
                ? <><Wifi className="w-4 h-4 text-green-500" /><span className="hidden sm:block text-sm text-green-500">Live</span></>
                : <><WifiOff className="w-4 h-4 text-red-500" /><span className="hidden sm:block text-sm text-red-500">Offline</span></>
              }
            </div>
            <button onClick={() => setDarkMode(!dm)} className={`p-1.5 rounded-lg ${dm ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} transition`}>
              {dm ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={handleLeave} className={`text-xs font-medium px-2.5 py-1.5 rounded-lg text-red-400 border border-red-800 hover:bg-red-900/30 transition`}>
              Leave
            </button>
            <button onClick={handleLogout} className={`hidden sm:flex items-center text-xs text-gray-400 hover:text-gray-200 transition`}>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Messages ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-[72px] pb-[88px] space-y-3">
        {wsError && (
          <div className="sticky top-1 z-10 mx-auto w-fit px-4 py-2 bg-red-900/80 border border-red-700 rounded-xl text-red-300 text-sm">
            ⚠️ {wsError}
          </div>
        )}

        {messages.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle className={`w-14 h-14 ${dm ? 'text-gray-700' : 'text-gray-300'} mx-auto mb-3`} />
            <p className={`${dm ? 'text-gray-500' : 'text-gray-400'} text-base`}>No messages yet</p>
            <p className={`${dm ? 'text-gray-600' : 'text-gray-400'} text-sm mt-1`}>Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.sender === 'System') {
              return (
                <div key={msg.id} className="flex justify-center">
                  <span className={`text-xs px-3 py-1 rounded-full ${dm ? 'bg-gray-700/70 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>
                    {msg.text}
                  </span>
                </div>
              )
            }
            return (
              <div key={msg.id} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                <div className={`max-w-[75%] sm:max-w-md px-4 py-2.5 rounded-2xl shadow-sm ${
                  msg.isOwn
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : dm
                    ? 'bg-gray-700 text-gray-200 border border-gray-600'
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}>
                  {!msg.isOwn && (
                    <p className="text-xs font-semibold mb-1 opacity-70">{msg.sender}</p>
                  )}
                  {msg.image && (
                    <img
                      src={msg.image}
                      alt="Sent"
                      className="max-w-full rounded-xl cursor-zoom-in hover:opacity-90 transition mb-1"
                      onClick={() => setZoomImage(msg.image)}
                    />
                  )}
                  {msg.text && (
                    <p
                      className={`leading-relaxed break-words ${/^[\p{Emoji}\s]+$/u.test(msg.text) ? 'text-3xl' : 'emoji-size-fix'}`}
                      dangerouslySetInnerHTML={{
                        __html: /^[\p{Emoji}\s]+$/u.test(msg.text) ? msg.text : wrapEmojis(msg.text),
                      }}
                    />
                  )}
                  <p className={`text-xs mt-1 ${msg.isOwn ? 'text-white/60' : dm ? 'text-gray-500' : 'text-gray-400'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })
        )}

        <TypingIndicator users={typingUsers} />
        <div ref={messagesEndRef} />
      </div>

      {/* Sending image toast */}
      {imageUploading && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-xl z-50 flex items-center space-x-2 text-sm">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Uploading image…</span>
        </div>
      )}

      {/* ── Input bar ────────────────────────────────────────────────────────── */}
      <div className={`fixed bottom-0 w-full z-50 ${bgPanel} backdrop-blur-sm border-t px-4 sm:px-6 py-3`}>
        <div className="flex items-center space-x-3">
          <div className="flex-1 relative" ref={emojiPickerRef}>
            {/* Emoji trigger */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker((p) => !p)}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10"
            >
              <Smile className="w-5 h-5 text-yellow-400 hover:text-yellow-300 transition" />
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-14 left-0 z-50">
                <EmojiPicker
                  onEmojiClick={(d) => setMessage((p) => p + d.emoji)}
                  theme={dm ? 'dark' : 'light'}
                />
              </div>
            )}

            {/* Image upload */}
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="img-upload" />
            <label htmlFor="img-upload" className="absolute left-10 top-1/2 -translate-y-1/2 z-10 cursor-pointer">
              <ImageIcon className="w-5 h-5 text-pink-400 hover:text-pink-300 transition" />
            </label>

            {/* Text input */}
            <input
              type="text"
              value={message}
              onChange={handleTyping}
              onKeyDown={handleKeyDown}
              onBlur={handleStopTyping}
              placeholder="Type a message…"
              className={`w-full pl-20 pr-12 py-3 border rounded-xl outline-none transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                dm
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
            />

            {/* Send */}
            <button
              onClick={handleSend}
              disabled={!message.trim() || !connected}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 text-white p-2 rounded-lg transition-all transform hover:scale-105"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Image lightbox ───────────────────────────────────────────────────── */}
      {zoomImage && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[999]" onClick={() => setZoomImage(null)}>
          <img src={zoomImage} alt="Zoomed" className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setZoomImage(null)} className="absolute top-4 right-4 text-white text-2xl bg-black/50 hover:bg-black/80 px-4 py-2 rounded-full">
            &times;
          </button>
        </div>
      )}
    </div>
  )
}
