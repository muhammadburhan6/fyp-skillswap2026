import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../services/api'

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi! I can help with skill recommendations, scheduling, and heart tokens.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState(null)

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: userMsg }])
    setLoading(true)
    try {
      const data = await api.aiChat(userMsg)
      setMessages((m) => [...m, { role: 'assistant', text: data.reply }])
      if (data.mode) setMode(data.mode)
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: 'Sorry, something went wrong.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-2xl shadow-glow transition hover:bg-brand-500"
      >
        ✦
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 flex h-[420px] w-[340px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/90 shadow-card backdrop-blur-xl"
          >
            <div className="border-b border-white/10 px-4 py-3">
              <p className="font-semibold text-white">AI Assistant</p>
              {mode === 'fallback' ? (
                <p className="text-xs text-amber-400/80">Basic mode — full AI unavailable</p>
              ) : mode === 'ai' ? (
                <p className="text-xs text-emerald-400/80">Powered by SkillSwap AI</p>
              ) : (
                <p className="text-xs text-white/40">Powered by SkillSwap AI</p>
              )}
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'ml-auto bg-brand-600 text-white'
                      : 'bg-white/10 text-white/80'
                  }`}
                >
                  {m.text}
                </div>
              ))}
              {loading && <p className="text-xs text-white/40">Thinking...</p>}
            </div>

            <div className="flex gap-2 border-t border-white/10 p-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Ask anything..."
                className="input-field flex-1 py-2 text-sm"
              />
              <button type="button" onClick={send} className="btn-primary px-4 py-2">
                →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
