import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import api from '../lib/api'
import { useAuthStore } from '../store/useAuthStore'
import { useSocket } from '../hooks/useSocket'
import { parseApiDate } from '../lib/dateTime'

const EMOJIS = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😎', '🤔', '😢', '😭', '😡',
  '👍', '👎', '👏', '🙏', '🔥', '✨', '🎉', '💯', '❤️', '💙', '💚', '🧡',
  '🤝', '💪', '📚', '💻', '🎯', '🚀', '⭐', '✅', '🙌', '👋', '💡', '📎',
]

function initials(name = '') {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?'
}

function formatTime(value) {
  if (!value) return ''
  try {
    const date = parseApiDate(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function previewText(msg) {
  if (!msg) return ''
  if (msg.type === 'image') return '📷 Photo'
  if (msg.type === 'video') return '🎬 Video'
  if (msg.type === 'file') return `📎 ${msg.attachment_name || 'File'}`
  return msg.content || ''
}

const MAX_CLIENT_UPLOAD_MB = 50


export default function Messenger() {
  const { user } = useAuthStore()
  const [chats, setChats] = useState([])
  const [active, setActive] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [mobileView, setMobileView] = useState('list')
  const [query, setQuery] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const fileRef = useRef(null)
  const emojiRef = useRef(null)

  const onMessage = useCallback((msg) => {
    if (active && msg.conversation_id === active.id) {
      setMessages((m) => (m.some((x) => x.id === msg.id) ? m : [...m, msg]))
    }
    setChats((prev) =>
      prev.map((c) =>
        c.id === msg.conversation_id
          ? {
              ...c,
              last_message_preview: previewText(msg),
              unread: active?.id === c.id ? 0 : (c.unread || 0) + 1,
            }
          : c,
      ),
    )
  }, [active])

  const { sendMessage, emitTyping, joinConversation, leaveConversation } = useSocket(user?.id, onMessage)

  useEffect(() => {
    api.getConversations().then((d) => {
      setChats(d.conversations || [])
      if (d.conversations?.length) setActive(d.conversations[0])
    })
  }, [])

  useEffect(() => {
    if (!active) return
    api.getMessages(active.id).then((d) => setMessages(d.messages || []))
    joinConversation(active.id)
    setShowEmoji(false)
    return () => leaveConversation(active.id)
  }, [active?.id, joinConversation, leaveConversation])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const onDocClick = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const selectChat = (chat) => {
    setActive(chat)
    setMobileView('chat')
    setChats((prev) => prev.map((c) => (c.id === chat.id ? { ...c, unread: 0 } : c)))
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const send = () => {
    if (!text.trim() || !active) return
    sendMessage(active.id, user.id, text.trim())
    setText('')
    setShowEmoji(false)
    if (inputRef.current) inputRef.current.style.height = 'auto'
  }

  const insertEmoji = (emoji) => {
    setText((t) => t + emoji)
    inputRef.current?.focus()
  }

  const onPickFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !active) return
    setUploadError('')
    if (file.size > MAX_CLIENT_UPLOAD_MB * 1024 * 1024) {
      setUploadError(`File too large (max ${MAX_CLIENT_UPLOAD_MB} MB). Compress the video or send a shorter clip.`)
      return
    }
    setUploading(true)
    try {
      const uploaded = await api.uploadChatFile(file)
      sendMessage(active.id, user.id, text.trim(), {
        type: uploaded.type,
        attachment_url: uploaded.url,
        attachment_name: uploaded.name,
      })
      setText('')
    } catch (err) {
      const status = err?.response?.status
      const msg = err?.response?.data?.error
      if (status === 413) {
        setUploadError(`File too large (max ${MAX_CLIENT_UPLOAD_MB} MB).`)
      } else {
        setUploadError(msg || 'Upload failed. Try a smaller file.')
      }
    } finally {
      setUploading(false)
    }
  }

  const filtered = chats.filter((c) => {
    const name = c.other_user?.name || ''
    return name.toLowerCase().includes(query.trim().toLowerCase())
  })

  return (
    <AppShell title="Chat" subtitle="Message your skill swap partners">
      <div className="flex h-[calc(100vh-11rem)] min-h-[28rem] overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] shadow-card md:h-[calc(100vh-13rem)]">
        <aside
          className={`flex w-full shrink-0 flex-col md:w-[300px] md:border-r md:border-white/[0.06] ${
            mobileView === 'chat' ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="border-b border-white/[0.06] px-4 py-4">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-mutedForeground">Conversations</p>
            <input
              className="input-field py-2.5 text-sm"
              placeholder="Search chats..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.map((c) => {
              const selected = active?.id === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectChat(c)}
                  className={`flex w-full items-center gap-3 border-l-2 px-4 py-3.5 text-left transition-colors duration-200 ${
                    selected
                      ? 'border-accent bg-accent/10'
                      : 'border-transparent hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/15 font-mono text-xs text-accent">
                    {initials(c.other_user?.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`truncate text-sm font-medium ${selected ? 'text-foreground' : 'text-foreground'}`}>
                        {c.other_user?.name || 'User'}
                      </p>
                      {c.unread > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 font-mono text-[10px] font-bold text-white shadow-accent-glow">
                          {c.unread > 9 ? '9+' : c.unread}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate font-mono text-xs text-mutedForeground">
                      {c.last_message_preview || 'No messages yet'}
                    </p>
                  </div>
                </button>
              )
            })}
            {!filtered.length && (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-mutedForeground">
                  {chats.length ? 'No chats match your search' : 'No conversations yet'}
                </p>
                <p className="mt-1 font-mono text-xs text-mutedForeground">Match with someone to start chatting</p>
              </div>
            )}
          </div>
        </aside>

        <section
          className={`flex min-w-0 flex-1 flex-col ${
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {active ? (
            <>
              <header className="flex items-center gap-3 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3 sm:px-5">
                <button
                  type="button"
                  onClick={() => setMobileView('list')}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] font-mono text-sm transition hover:bg-white/[0.08] md:hidden"
                >
                  ←
                </button>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/15 font-mono text-xs text-accent">
                  {initials(active.other_user?.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-semibold text-foreground">{active.other_user?.name}</p>
                  <p className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-mutedForeground">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Online
                  </p>
                </div>
                {active.other_user?.id && (
                  <Link
                    to={`/materials?partner=${active.other_user.id}`}
                    className="btn-outline shrink-0 px-3 py-1.5 text-xs"
                  >
                    Materials
                  </Link>
                )}
              </header>

              <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-5 sm:px-6">
                {messages.length === 0 && (
                  <div className="m-auto max-w-xs text-center">
                    <p className="text-sm text-mutedForeground">Say hello to start the conversation</p>
                  </div>
                )}
                {messages.map((m) => {
                  const mine = m.sender_id === user.id
                  const hasImage = m.type === 'image' && m.attachment_url
                  const hasVideo = m.type === 'video' && m.attachment_url
                  const hasFile = m.type === 'file' && m.attachment_url
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`w-fit max-w-[min(75%,28rem)] overflow-hidden text-sm leading-relaxed ${
                          mine
                            ? 'rounded-2xl rounded-br-md bg-accent text-white shadow-accent-glow'
                            : 'rounded-2xl rounded-bl-md border border-white/[0.08] bg-white/[0.06] text-foreground'
                        } ${hasImage || hasVideo ? 'p-1.5' : 'px-3.5 py-2'}`}
                      >
                        {hasImage && (
                          <a href={m.attachment_url} target="_blank" rel="noreferrer" className="block">
                            <img
                              src={m.attachment_url}
                              alt={m.attachment_name || 'Image'}
                              className="max-h-64 max-w-full rounded-xl object-cover"
                            />
                          </a>
                        )}
                        {hasVideo && (
                          <video
                            src={m.attachment_url}
                            controls
                            className="max-h-64 max-w-full rounded-xl bg-black/40"
                            preload="metadata"
                          >
                            <track kind="captions" />
                          </video>
                        )}
                        {hasFile && (
                          <a
                            href={m.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            download={m.attachment_name}
                            className={`mb-1 flex items-center gap-2 px-2 py-2 text-sm font-medium underline-offset-2 hover:underline ${
                              mine ? 'text-white/90' : 'text-foreground'
                            }`}
                          >
                            <span aria-hidden>📎</span>
                            <span className="truncate">{m.attachment_name || 'Download file'}</span>
                          </a>
                        )}
                        {m.content && m.content !== m.attachment_name && (
                          <p className={`whitespace-pre-wrap break-words ${hasImage || hasVideo ? 'px-2 pt-1.5' : ''}`}>
                            {m.content}
                          </p>
                        )}
                        {m.created_at && (
                          <p
                            className={`mt-1 font-mono text-[10px] ${mine ? 'text-white/60' : 'text-mutedForeground'} ${hasImage || hasVideo ? 'px-2 pb-1' : ''}`}
                          >
                            {formatTime(m.created_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              <footer className="relative border-t border-white/[0.06] bg-white/[0.02] p-3 sm:p-4">
                {showEmoji && (
                  <div
                    ref={emojiRef}
                    className="absolute bottom-full left-3 z-20 mb-2 grid max-h-44 w-[min(100%-1.5rem,20rem)] grid-cols-8 gap-1 overflow-y-auto rounded-xl border border-white/[0.08] bg-backgroundElevated p-2 shadow-card-hover backdrop-blur-xl"
                  >
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => insertEmoji(emoji)}
                        className="rounded-lg p-1.5 text-xl transition-colors duration-200 hover:bg-white/[0.08]"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
                {uploadError && (
                  <p className="mb-2 font-mono text-xs text-red-400">{uploadError}</p>
                )}
                <div className="flex items-end gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] p-2 transition-colors duration-200 focus-within:border-accent/50 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEmoji((v) => !v)}
                    className="shrink-0 rounded-lg px-2.5 py-2.5 text-lg text-mutedForeground transition-colors duration-200 hover:bg-white/[0.08] hover:text-foreground"
                    title="Emoji"
                    aria-label="Insert emoji"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="shrink-0 rounded-lg px-2.5 py-2.5 font-mono text-xs uppercase tracking-widest text-mutedForeground transition-colors duration-200 hover:bg-white/[0.08] hover:text-foreground disabled:opacity-40"
                    title="Attach file"
                    aria-label="Attach file"
                  >
                    File
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept="image/*,video/*,.pdf,.doc,.docx,.txt,.zip,.rar,.ppt,.pptx,.xls,.xlsx,.mp4,.mp3,.webm,.mov,.m4v"
                    onChange={onPickFile}
                  />
                  <textarea
                    ref={inputRef}
                    rows={1}
                    className="max-h-28 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-foreground outline-none placeholder:text-mutedForeground sm:px-3"
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value)
                      emitTyping(active.id, user.id, true)
                      e.target.style.height = 'auto'
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 112)}px`
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        send()
                      }
                    }}
                    placeholder={uploading ? 'Uploading…' : 'Type a message...'}
                    disabled={uploading}
                  />
                  <button
                    type="button"
                    onClick={send}
                    disabled={!text.trim() || uploading}
                    className="btn-primary shrink-0 px-4 py-2.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Send
                  </button>
                </div>
                <p className="mt-1.5 hidden font-mono text-[10px] uppercase tracking-widest text-mutedForeground sm:block">
                  Enter to send · Attachments max 50 MB
                </p>
              </footer>
            </>
          ) : (
            <div className="m-auto max-w-sm px-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-accent/30 bg-accent/15 font-display text-2xl text-accent">
                ✦
              </div>
              <p className="font-display text-lg text-foreground">Select a conversation</p>
              <p className="mt-1 text-sm text-mutedForeground">Choose someone from the left to start messaging</p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}
