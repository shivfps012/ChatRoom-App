/**
 * useWebSocket
 * Manages a WebSocket connection for a chat room.
 * Auto-reconnects when the tab regains focus or connection drops.
 *
 * Returns: { messages, connected, usersCount, typingUsers, sendChat, sendTyping, disconnect }
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000'
const RECONNECT_DELAY = 3000

export function useWebSocket({ roomId, token, userId, onError }) {
  const [messages, setMessages] = useState([])
  const [connected, setConnected] = useState(false)
  const [usersCount, setUsersCount] = useState(0)
  const [typingUsers, setTypingUsers] = useState([]) // array of usernames currently typing

  const wsRef = useRef(null)
  const sessionIdRef = useRef(null)
  const reconnectTimer = useRef(null)
  const intentionalClose = useRef(false)

  // ── helpers ────────────────────────────────────────────────────────────────
  const safeSend = useCallback((payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload))
    }
  }, [])

  const joinRoom = useCallback(() => {
    safeSend({ type: 'join', payload: { roomId, token } })
  }, [roomId, token, safeSend])

  // ── connect ────────────────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    if (!token || !roomId) return

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      joinRoom()
    }

    ws.onmessage = (e) => {
      let msg
      try { msg = JSON.parse(e.data) } catch { return }

      switch (msg.type) {
        case 'session':
          sessionIdRef.current = msg.sessionId
          break

        case 'history':
          setMessages(
            msg.messages.map((m) => ({
              id: m.id,
              sender: m.sender,
              senderId: m.senderId,
              isOwn: m.senderId === userId,
              text: m.text,
              image: m.imageUrl,
              timestamp: new Date(m.timestamp),
              isHistory: true,
            }))
          )
          break

        case 'join':
          setUsersCount(msg.usersCount)
          if (msg.userId !== userId) {
            setMessages((prev) => [
              ...prev,
              {
                id: uuidv4(),
                sender: 'System',
                isOwn: false,
                text: `${msg.username} joined the room`,
                timestamp: new Date(msg.timestamp),
              },
            ])
          }
          break

        case 'leave':
          setUsersCount(msg.usersCount)
          if (msg.userId !== userId) {
            setMessages((prev) => [
              ...prev,
              {
                id: uuidv4(),
                sender: 'System',
                isOwn: false,
                text: `${msg.username} left the room`,
                timestamp: new Date(msg.timestamp),
              },
            ])
          }
          break

        case 'chat':
          setMessages((prev) => [
            ...prev,
            {
              id: msg.id || uuidv4(),
              sender: msg.sender,
              senderId: msg.senderId,
              isOwn: msg.senderId === userId,
              text: msg.text,
              image: msg.imageUrl,
              timestamp: new Date(msg.timestamp),
            },
          ])
          break

        case 'typing':
          setTypingUsers((prev) => {
            const without = prev.filter((u) => u !== msg.username)
            return msg.isTyping ? [...without, msg.username] : without
          })
          break

        case 'error':
          onError?.(msg.message)
          break

        default:
          break
      }
    }

    ws.onclose = () => {
      setConnected(false)
      if (!intentionalClose.current) {
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY)
      }
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [token, roomId, userId, joinRoom, onError])

  // ── lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => {
    intentionalClose.current = false
    connect()

    // Reconnect when tab comes back into focus
    const handleFocus = () => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        connect()
      }
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      intentionalClose.current = true
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
      window.removeEventListener('focus', handleFocus)
    }
  }, [connect])

  // ── public API ─────────────────────────────────────────────────────────────
  const sendChat = useCallback(({ message, imageUrl }) => {
    safeSend({
      type: 'chat',
      payload: { roomId, message: message || '', imageUrl: imageUrl || null },
    })
  }, [roomId, safeSend])

  const sendTyping = useCallback((isTyping) => {
    safeSend({ type: 'typing', payload: { isTyping } })
  }, [safeSend])

  const disconnect = useCallback(() => {
    intentionalClose.current = true
    safeSend({ type: 'leave', payload: { roomId } })
    wsRef.current?.close()
    setConnected(false)
  }, [roomId, safeSend])

  return { messages, connected, usersCount, typingUsers, sendChat, sendTyping, disconnect }
}
