import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { getToken } from '../lib/authToken'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

export function useSocket(userId, onMessage) {
  const socketRef = useRef(null)

  useEffect(() => {
    if (!userId) return

    const token = getToken()
    if (!token) return

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token },
    })
    socketRef.current = socket

    socket.emit('presence:join')
    socket.on('message:receive', onMessage)

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [userId, onMessage])

  const sendMessage = (conversationId, _senderId, content) => {
    socketRef.current?.emit('message:send', {
      conversation_id: conversationId,
      content,
    })
  }

  const emitTyping = (conversationId, uid, typing) => {
    socketRef.current?.emit(typing ? 'typing:start' : 'typing:stop', {
      conversation_id: conversationId,
      user_id: uid,
    })
  }

  const joinConversation = (conversationId) => {
    if (conversationId) socketRef.current?.emit('conversation:join', { conversation_id: conversationId })
  }

  const leaveConversation = (conversationId) => {
    if (conversationId) socketRef.current?.emit('conversation:leave', { conversation_id: conversationId })
  }

  return { sendMessage, emitTyping, joinConversation, leaveConversation }
}
