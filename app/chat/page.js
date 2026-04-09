'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2, Code2, Mic, MicOff, Zap } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import MessageBubble from '@/components/MessageBubble'
import { getUser, getUserChats, createChat, saveMessage, getChatMessages, deleteChat, updateChatTitle } from '@/lib/supabase'

export default function ChatPage() {
  const router = useRouter()
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)

  const [user, setUser] = useState(null)
  const [chats, setChats] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState('groq')
  const [thinking, setThinking] = useState('')
  const [isListening, setIsListening] = useState(false)

  useEffect(() => { checkAuth() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, thinking])

  const checkAuth = async () => {
    const u = await getUser()
    if (!u) { router.push('/'); return }
    setUser(u)
    loadChats(u.id)
  }

  const loadChats = async (userId) => {
    const { data } = await getUserChats(userId)
    setChats(data || [])
  }

  const handleNewChat = () => { setActiveChatId(null); setMessages([]); setInput(''); inputRef.current?.focus() }

  const handleSelectChat = async (chatId) => {
    setActiveChatId(chatId)
    const { data } = await getChatMessages(chatId)
    setMessages(data || [])
  }

  const handleDeleteChat = async (chatId) => {
    await deleteChat(chatId)
    if (activeChatId === chatId) handleNewChat()
    loadChats(user.id)
  }

  const toggleMic = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Chrome browser use karo mic ke liye.')
      return
    }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const r = new SR()
    r.lang = 'hi-IN'
    r.continuous = false
    r.interimResults = false
    r.onresult = (e) => { setInput(prev => prev + ' ' + e.results[0][0].transcript); setIsListening(false) }
    r.onerror = () => setIsListening(false)
    r.onend = () => setIsListening(false)
    recognitionRef.current = r
    r.start()
    setIsListening(true)
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setThinking('Code-Cure AI soch raha hai...')

    let chatId = activeChatId
    if (!chatId) {
      const { data: newChat } = await createChat(user.id, input.slice(0, 50))
      chatId = newChat?.id
      setActiveChatId(chatId)
      loadChats(user.id)
    }
    if (chatId) await saveMessage(chatId, 'user', userMsg.content)

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, model }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const aiMsg = { role: 'assistant', content: data.content }
      setMessages(prev => [...prev, aiMsg])
      if (chatId) {
        await saveMessage(chatId, 'assistant', data.content)
        if (messages.length === 0) { await updateChatTitle(chatId, userMsg.content.slice(0, 50)); loadChats(user.id) }
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ **Error:** ${err.message}\n\nVercel mein API keys check karo.` }])
    }
    setLoading(false)
    setThinking('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const adjustHeight = (e) => {
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'
  }

  return (
    <div className="flex h-screen bg-[#0a0a0f] overflow-hidden">
      <Sidebar chats={chats} activeChatId={activeChatId} onNewChat={handleNewChat} onSelectChat={handleSelectChat} onDeleteChat={handleDeleteChat} user={user} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#1a1a27] bg-[#0d0d14]/80 backdrop-blur-md">
          <div className="flex items-center gap-3 ml-12 md:ml-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold">Code-Cure AI</span>
          </div>
          <div className="flex bg-[#12121a] rounded-xl p-1 border border-[#1a1a27]">
            {[{ id: 'groq', label: '⚡ Groq' }, { id: 'openrouter', label: '🧠 DeepSeek' }].map(m => (
              <button key={m.id} onClick={() => setModel(m.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${model === m.id ? 'bg-violet-600 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-2xl shadow-violet-500/30">
                  <Code2 className="w-12 h-12 text-white" />
                </div>
                <div>
                  <h2 className="text-4xl font-bold text-white mb-3">Welcome, Coding AI! 👋</h2>
                  <p className="text-slate-400 text-lg">Apna error paste karo ya coding sawaal pucho</p>
                  <p className="text-slate-600 text-sm mt-2">Hindi • Hinglish • English — teeno mein jawab milega</p>
                </div>
              </div>
            )}
            {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}
            {thinking && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-sm bg-[#12121a] rounded-2xl px-4 py-3 border border-[#1a1a27]">
                  <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                  {thinking}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input area - Claude style */}
        <div className="border-t border-[#1a1a27] bg-[#0d0d14]/80 backdrop-blur-md p-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative bg-[#12121a] border border-[#2d2d4a] rounded-2xl focus-within:border-violet-500/50 transition-all duration-200 shadow-xl">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => { setInput(e.target.value); adjustHeight(e) }}
                onKeyDown={handleKeyDown}
                placeholder="Apna error ya sawaal yahan likho... (Enter = Send, Shift+Enter = New Line)"
                className="w-full bg-transparent text-white placeholder-slate-600 text-sm resize-none outline-none px-5 pt-4 pb-14 leading-relaxed min-h-[56px] max-h-[200px]"
                rows={1}
                style={{ height: '56px' }}
              />
              {/* Bottom bar inside input */}
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">
                    {model === 'groq' ? '⚡ Groq — Llama3-70B' : '🧠 DeepSeek'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={toggleMic}
                    className={`p-2 rounded-xl transition-all ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-slate-500 hover:text-slate-300 hover:bg-[#1a1a27]'}`}>
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                  <button onClick={sendMessage} disabled={loading || !input.trim()}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-white text-xs font-semibold shadow-lg shadow-violet-500/20">
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    {loading ? 'Soch raha...' : 'Bhejo'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
      }
      
