import { useCallback, useEffect, useRef, useState } from 'react'
import AppShell from '../components/layout/AppShell'
import api from '../lib/api'
import { useAuthStore } from '../store/useAuthStore'
import { useSocket } from '../hooks/useSocket'

export default function Messenger() {
  const { user } = useAuthStore()
  const [chats, setChats] = useState([])
  const [active, setActive] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const bottomRef = useRef()

  const onMessage = useCallback((msg) => {
    if (active && msg.conversation_id === active.id) {
      setMessages((m) => (m.some((x) => x.id === msg.id) ? m : [...m, msg]))
    }
  }, [active])

  const { sendMessage, emitTyping, joinConversation, leaveConversation } = useSocket(user?.id, onMessage)

  useEffect(() => {
    api.getConversations().then((d) => {
      setChats(d.conversations)
      if (d.conversations.length) setActive(d.conversations[0])
    })
  }, [])

  useEffect(() => {
    if (!active) return
    api.getMessages(active.id).then((d) => setMessages(d.messages))
    joinConversation(active.id)
    return () => leaveConversation(active.id)
  }, [active, joinConversation, leaveConversation])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = () => {
    if (!text.trim() || !active) return
    // Socket handler persists the message and broadcasts it to the conversation
    // room (including the sender), so we avoid a second REST write here.
    sendMessage(active.id, user.id, text)
    setText('')
  }

  return (
    <AppShell title="Chat" subtitle="Message your skill swap partners">
      <div className="card flex h-[calc(100vh-220px)] overflow-hidden p-0">
        <div className="w-72 shrink-0 overflow-y-auto border-r border-white/10">
          {chats.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActive(c)}
              className={`w-full px-4 py-3 text-left transition hover:bg-white/5 ${
                active?.id === c.id ? 'bg-sky-400/10' : ''
              }`}
            >
              <p className="font-medium text-white">{c.other_user?.name}</p>
              <p className="truncate text-xs text-slate-500">{c.last_message_preview}</p>
              {c.unread > 0 && (
                <span className="mt-1 inline-block rounded-full bg-sky-400 px-2 text-[10px] font-semibold text-[#0a0e17]">
                  {c.unread}
                </span>
              )}
            </button>
          ))}
          {!chats.length && <p className="p-4 text-sm text-slate-500">No conversations yet</p>}
        </div>
        <div className="flex flex-1 flex-col">
          {active ? (
            <>
              <div className="border-b border-white/10 px-4 py-3">
                <p className="font-medium text-white">{active.other_user?.name}</p>
                <p className="text-xs text-sky-400">● Online</p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                      m.sender_id === user.id
                        ? 'ml-auto bg-sky-400 text-[#0a0e17]'
                        : 'bg-white/10 text-slate-200'
                    }`}
                  >
                    {m.content}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="flex gap-2 border-t border-white/10 p-3">
                <input
                  className="input-field flex-1"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value)
                    emitTyping(active.id, user.id, true)
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Type a message..."
                />
                <button type="button" onClick={send} className="btn-primary px-5">
                  Send
                </button>
              </div>
            </>
          ) : (
            <p className="flex flex-1 items-center justify-center text-slate-500">Select a conversation</p>
          )}
        </div>
      </div>
    </AppShell>
  )
}
