import { useEffect, useRef, useState } from 'react'

import { useNavigate } from 'react-router-dom'

import { motion } from 'framer-motion'

import api from '../../lib/api'



const SUGGESTIONS = [

  'How many points do I have?',

  'Find me a match',

  "What's trending?",

  'When is my next session?',

]



export default function ChatbotWidget() {

  const [open, setOpen] = useState(false)

  const [messages, setMessages] = useState([

    { role: 'assistant', text: "Hi! I'm SkillBot — I answer live from your account. Ask about your points, matches, trending skills, or sessions." },

  ])

  const [input, setInput] = useState('')

  const [loading, setLoading] = useState(false)

  const [mode, setMode] = useState(null)

  const bottomRef = useRef(null)

  const panelRef = useRef(null)

  const buttonRef = useRef(null)

  const navigate = useNavigate()



  useEffect(() => {

    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })

  }, [messages, loading])



  // Close the chat when the user clicks anywhere outside it (but not on the
  // floating toggle button, which manages open/close itself) or presses Escape.

  useEffect(() => {

    if (!open) return

    const onPointerDown = (e) => {

      if (panelRef.current?.contains(e.target) || buttonRef.current?.contains(e.target)) return

      setOpen(false)

    }

    const onKeyDown = (e) => { if (e.key === 'Escape') setOpen(false) }

    document.addEventListener('mousedown', onPointerDown)

    document.addEventListener('keydown', onKeyDown)

    return () => {

      document.removeEventListener('mousedown', onPointerDown)

      document.removeEventListener('keydown', onKeyDown)

    }

  }, [open])



  const send = async (preset) => {

    const userMsg = (preset ?? input).trim()

    if (!userMsg || loading) return

    setInput('')

    setMessages((m) => [...m, { role: 'user', text: userMsg }])

    setLoading(true)

    try {

      const data = await api.aiChat(userMsg)

      setMessages((m) => [...m, { role: 'assistant', text: data.reply, link: data.link }])

      if (data.mode) setMode(data.mode)

    } catch {

      setMessages((m) => [...m, { role: 'assistant', text: 'Sorry, something went wrong.' }])

    } finally {

      setLoading(false)

    }

  }



  const showSuggestions = messages.length === 1 && !loading



  return (

    <>

      <button

        ref={buttonRef}

        type="button"

        onClick={() => setOpen(!open)}

        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent font-display text-2xl text-white shadow-accent-glow transition duration-200 hover:bg-accentBright hover:scale-105 active:scale-95"

        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}

      >

        {open ? '✕' : '✦'}

      </button>



      {open && (

          <motion.div

            ref={panelRef}

            initial={{ opacity: 0, y: 12 }}

            animate={{ opacity: 1, y: 0 }}

            exit={{ opacity: 0, y: 12 }}

            transition={{ duration: 0.15 }}

            className="fixed bottom-24 right-6 z-50 flex h-[440px] w-[340px] flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-backgroundElevated/95 shadow-card backdrop-blur-xl"

          >

            <div className="flex items-start justify-between gap-2 border-b border-white/[0.06] px-4 py-3">

              <div>

                <p className="font-display font-semibold text-foreground">SkillBot</p>

                {mode === 'ai' ? (

                  <p className="font-mono text-[10px] uppercase tracking-widest text-mutedForeground">GPT-powered · knows your account</p>

                ) : (

                  <p className="font-mono text-[10px] uppercase tracking-widest text-mutedForeground">Answers live from your account</p>

                )}

              </div>

              <button

                type="button"

                onClick={() => setOpen(false)}

                aria-label="Minimize chat"

                className="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-mutedForeground transition duration-200 hover:bg-white/[0.08] hover:text-foreground"

              >

                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">

                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />

                </svg>

              </button>

            </div>



            <div className="flex-1 space-y-3 overflow-y-auto p-4">

              {messages.map((m, i) => (

                <div

                  key={i}

                  className={`max-w-[85%] whitespace-pre-line rounded-xl px-3 py-2 text-sm leading-relaxed ${

                    m.role === 'user'

                      ? 'ml-auto border border-accent/30 bg-accent/20 text-foreground'

                      : 'border border-white/[0.06] bg-white/[0.05] text-foreground'

                  }`}

                >

                  {m.text}

                  {m.link && (

                    <button

                      type="button"

                      onClick={() => { setOpen(false); navigate(m.link.to) }}

                      className="mt-2 block rounded-full border border-accent/40 bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent transition duration-200 hover:bg-accent/25"

                    >

                      {m.link.label}

                    </button>

                  )}

                </div>

              ))}

              {loading && <p className="font-mono text-xs text-mutedForeground">Thinking…</p>}

              {showSuggestions && (

                <div className="flex flex-wrap gap-2 pt-1">

                  {SUGGESTIONS.map((s) => (

                    <button

                      key={s}

                      type="button"

                      onClick={() => send(s)}

                      className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs text-accent transition duration-200 hover:bg-accent/20"

                    >

                      {s}

                    </button>

                  ))}

                </div>

              )}

              <div ref={bottomRef} />

            </div>



            <div className="flex gap-2 border-t border-white/[0.06] p-3">

              <input

                value={input}

                onChange={(e) => setInput(e.target.value)}

                onKeyDown={(e) => e.key === 'Enter' && send()}

                placeholder="Ask anything…"

                className="input-field flex-1 py-2 text-sm"

              />

              <button type="button" onClick={() => send()} className="btn-primary px-4 py-2">

                →

              </button>

            </div>

          </motion.div>

        )}

    </>

  )

}
