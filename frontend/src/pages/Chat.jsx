import { useEffect, useState, useRef } from 'react'
import AppShell from '../components/layout/AppShell'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Chat() {
  const { user } = useAuth()
  const [chats, setChats] = useState([])
  const [active, setActive] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const bottomRef = useRef()

  useEffect(() => {
    api.getChats().then((d) => {
      setChats(d.chats)
      if (d.chats.length) setActive(d.chats[0])
    })
  }, [])

  useEffect(() => {
    if (!active) return
    api.getMessages(active._id).then((d) => setMessages(d.messages))
    const interval = setInterval(() => {
      api.getMessages(active._id).then((d) => setMessages(d.messages))
    }, 3000)
    return () => clearInterval(interval)
  }, [active])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!text.trim() || !active) return
    await api.sendMessage(active._id, text)
    setText('')
    const d = await api.getMessages(active._id)
    setMessages(d.messages)
  }

  return (
    <AppShell>
      <h1 className="mb-6 text-3xl font-bold text-white">Chat</h1>

      <div className="card flex h-[calc(100vh-220px)] overflow-hidden p-0">
        <div className="w-64 shrink-0 border-r border-white/10 overflow-y-auto">
          {chats.map((c) => (
            <button
              key={c._id}
              type="button"
              onClick={() => setActive(c)}
              className={`w-full px-4 py-3 text-left transition hover:bg-white/5 ${
                active?._id === c._id ? 'bg-brand-600/20' : ''
              }`}
            >
              <p className="font-medium text-white">{c.other_user?.display_name}</p>
              <p className="truncate text-xs text-white/40">{c.last_message_preview}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-1 flex-col">
          {active ? (
            <>
              <div className="border-b border-white/10 px-4 py-3">
                <p className="font-medium text-white">{active.other_user?.display_name}</p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((m) => (
                  <div
                    key={m._id}
                    className={`max-w-[70%] rounded-xl px-4 py-2 text-sm ${
                      m.sender_id === user._id
                        ? 'ml-auto bg-brand-600 text-white'
                        : 'bg-white/10 text-white/80'
                    }`}
                  >
                    {m.text}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <div className="flex gap-2 border-t border-white/10 p-3">
                <input
                  className="input-field flex-1"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="Type a message..."
                />
                <button type="button" onClick={send} className="btn-primary px-5">Send</button>
              </div>
            </>
          ) : (
            <p className="flex flex-1 items-center justify-center text-white/40">Select a chat</p>
          )}
        </div>
      </div>
    </AppShell>
  )
}
