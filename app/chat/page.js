'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2, Code2, Mic, MicOff, Zap, Download, Eye, FolderOpen, X } from 'lucide-react'
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
  const [project, setProject] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [generatingProject, setGeneratingProject] = useState(false)

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

  const handleNewChat = () => { setActiveChatId(null); setMessages([]); setInput(''); setProject(null); inputRef.current?.focus() }
  const handleSelectChat = async (chatId) => { setActiveChatId(chatId); const { data } = await getChatMessages(chatId); setMessages(data || []) }
  const handleDeleteChat = async (chatId) => { await deleteChat(chatId); if (activeChatId === chatId) handleNewChat(); loadChats(user.id) }

  const toggleMic = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) { alert('Chrome use karo mic ke liye.'); return }
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const r = new SR()
    r.lang = 'hi-IN'; r.continuous = false; r.interimResults = false
    r.onresult = (e) => { setInput(prev => prev + ' ' + e.results[0][0].transcript); setIsListening(false) }
    r.onerror = () => setIsListening(false)
    r.onend = () => setIsListening(false)
    recognitionRef.current = r; r.start(); setIsListening(true)
  }

  const generateProject = async (idea) => {
    setGeneratingProject(true)
    setThinking('🏗️ Pura project ban raha hai — thodi der...')
    try {
      const res = await fetch('/api/generate-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setProject(data.project)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ **${data.project.name}** taiyaar hai!\n\n📁 **${data.project.files.length} files** bani hain:\n${data.project.files.map(f => `- \`${f.path}\` — ${f.description}`).join('\n')}\n\n**Tech:** ${data.project.tech_stack?.join(', ')}\n\n👇 Preview dekho ya ZIP download karo!`
      }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ Project generate nahi hua: ${err.message}` }])
    }
    setGeneratingProject(false)
    setThinking('')
  }

  const downloadZip = async () => {
    if (!project) return
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      const folder = zip.folder(project.name || 'my-project')
      project.files.forEach(f => folder.file(f.path, f.content))
      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `${project.name || 'project'}.zip`; a.click()
      URL.revokeObjectURL(url)
    } catch (err) { alert('Download error: ' + err.message) }
  }

  const getPreviewHTML = () => {
    if (!project) return ''
    const htmlFile = project.files.find(f => f.path.endsWith('.html'))
    if (!htmlFile) return '<body style="background:#1a1a27;color:white;padding:20px;font-family:sans-serif"><h2>HTML file nahi mili</h2></body>'
    let html = htmlFile.content
    project.files.filter(f => f.path.endsWith('.css')).forEach(f => {
      html = html.replace(/<link[^>]*\.css[^>]*>/gi, `<style>${f.content}</style>`)
    })
    project.files.filter(f => f.path.endsWith('.js')).forEach(f => {
      html = html.replace(/<script[^>]*src=["'][^"']*\.js["'][^>]*><\/script>/gi, `<script>${f.content}</script>`)
    })
    return html
  }

  const isProjectIdea = (text) => {
    const kw = ['banao', 'bana do', 'build', 'create', 'make', 'todo', 'calculator', 'game', 'portfolio', 'website', 'app', 'landing page']
    return kw.some(k => text.toLowerCase().includes(k)) && text.length > 15
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = { role: 'user', content: input.trim() }
    const currentInput = input.trim()
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    let chatId = activeChatId
    if (!chatId) {
      const { data: newChat } = await createChat(user.id, currentInput.slice(0, 50))
      chatId = newChat?.id; setActiveChatId(chatId); loadChats(user.id)
    }
    if (chatId) await saveMessage(chatId, 'user', currentInput)

    if (isProjectIdea(currentInput)) {
      await generateProject(currentInput)
      setLoading(false)
      return
    }

    setThinking('Coding AI soch raha hai...')
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
        if (messages.length === 0) { await updateChatTitle(chatId, currentInput.slice(0, 50)); loadChats(user.id) }
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ **Error:** ${err.message}` }])
    }
    setLoading(false); setThinking('')
  }

  const adjustHeight = (e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px' }

  return (
    <div className="flex h-screen bg-[#0a0a0f] overflow-hidden">
      <Sidebar chats={chats} activeChatId={activeChatId} onNewChat={handleNewChat} onSelectChat={handleSelectChat} onDeleteChat={handleDeleteChat} user={user} />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#1a1a27] bg-[#0d0d14]/90 backdrop-blur-md">
          <div className="flex items-center gap-3 ml-12 md:ml-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold">Coding AI</span>
          </div>
          <div className="flex bg-[#12121a] rounded-xl p-1 border border-[#1a1a27]">
            {[{ id: 'groq', label: '⚡ Groq' }, { id: 'openrouter', label: '🧠 DeepSeek' }].map(m => (
              <button key={m.id} onClick={() => setModel(m.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${model === m.id ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-white'}`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-2xl shadow-violet-500/30">
                  <Code2 className="w-12 h-12 text-white" />
                </div>
                <div>
                  <h2 className="text-4xl font-bold text-white mb-3">Welcome, Coding AI! 👋</h2>
                  <p className="text-slate-400 text-lg">Error fix karo ya pura app idea do — sab ban jayega!</p>
                  <p className="text-slate-600 text-sm mt-2">Hindi • Hinglish • English</p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                  {['Todo app banao', 'React useEffect fix karo', 'Portfolio website banao', 'Python API banao'].map(s => (
                    <button key={s} onClick={() => { setInput(s); inputRef.current?.focus() }}
                      className="p-3 rounded-xl bg-[#12121a] hover:bg-[#1a1a27] border border-[#1a1a27] hover:border-violet-500/30 text-sm text-slate-400 hover:text-white transition-all text-left">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}

            {(thinking) && (
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

            {project && (
              <div className="bg-[#12121a] border border-violet-500/20 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-violet-400" />
                    <h3 className="text-white font-bold">{project.name}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowPreview(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-semibold">
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </button>
                    <button onClick={downloadZip}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 rounded-lg text-xs font-semibold">
                      <Download className="w-3.5 h-3.5" /> ZIP Download
                    </button>
                  </div>
                </div>
                {project.files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#1a1a27] transition-colors">
                    <span className="text-xs">📄</span>
                    <span className="text-sm text-slate-300 font-mono">{f.path}</span>
                    <span className="text-xs text-slate-600 ml-auto">{f.description}</span>
                  </div>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-[#1a1a27] bg-[#0d0d14]/90 backdrop-blur-md p-4">
          <div className="max-w-3xl mx-auto">
            <div className="relative bg-[#12121a] border border-[#2d2d4a] rounded-2xl focus-within:border-violet-500/50 transition-all shadow-xl">
              <textarea ref={inputRef} value={input}
                onChange={e => { setInput(e.target.value); adjustHeight(e) }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="Error paste karo, app idea do ya sawaal pucho... (Enter = Send, Shift+Enter = New Line)"
                className="w-full bg-transparent text-white placeholder-slate-600 text-sm resize-none outline-none px-5 pt-4 pb-14 leading-relaxed min-h-[56px] max-h-[200px]"
                rows={1} style={{ height: '56px' }} />
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3">
                <span className="text-xs text-slate-600 hidden sm:block">App idea doge to pura project + ZIP banega!</span>
                <div className="flex items-center gap-2 ml-auto">
                  <button onClick={toggleMic}
                    className={`p-2 rounded-xl transition-all ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'text-slate-500 hover:text-slate-300 hover:bg-[#1a1a27]'}`}>
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                  <button onClick={sendMessage} disabled={loading || !input.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-white text-xs font-semibold shadow-lg shadow-violet-500/20">
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Bhejo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPreview && project && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a27] border-b border-[#2d2d4a]">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-violet-400" />
              <span className="text-white font-semibold text-sm">{project.name} — Live Preview</span>
            </div>
            <div className="flex gap-2">
              <button onClick={downloadZip}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 border border-green-500/30 text-green-400 rounded-lg text-xs">
                <Download className="w-3 h-3" /> ZIP
              </button>
              <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-white p-1.5 hover:bg-[#2d2d4a] rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <iframe srcDoc={getPreviewHTML()} className="flex-1 w-full bg-white" title="Live Preview" sandbox="allow-scripts allow-same-origin" />
        </div>
      )}
    </div>
  )
    }
  
