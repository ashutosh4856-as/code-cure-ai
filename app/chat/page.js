'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2, Code2, Mic, MicOff, Zap, Download, Eye, FolderOpen, X, Square, Plus, ImageIcon, Camera } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import MessageBubble from '@/components/MessageBubble'
import { getUser, getUserChats, createChat, saveMessage, getChatMessages, deleteChat, updateChatTitle } from '@/lib/supabase'

const MODELS = [
  { id: 'deepseek', label: '🧠 DeepSeek R1' },
  { id: 'llama', label: '🦙 Llama 3.3' },
  { id: 'gemini', label: '✨ Gemini Flash' },
]

export default function ChatPage() {
  const router = useRouter()
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)
  const abortRef = useRef(null)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  const [user, setUser] = useState(null)
  const [chats, setChats] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState('deepseek')
  const [isListening, setIsListening] = useState(false)
  const [project, setProject] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const [attachedImage, setAttachedImage] = useState(null)
  const [attachedImageBase64, setAttachedImageBase64] = useState(null)

  useEffect(() => { checkAuth() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, streamingText])

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

  const handleNewChat = () => { setActiveChatId(null); setMessages([]); setInput(''); setProject(null); setStreamingText(''); setAttachedImage(null); setAttachedImageBase64(null) }
  const handleSelectChat = async (chatId) => { setActiveChatId(chatId); const { data } = await getChatMessages(chatId); setMessages(data || []) }
  const handleDeleteChat = async (chatId) => { await deleteChat(chatId); if (activeChatId === chatId) handleNewChat(); loadChats(user.id) }

  const stopGeneration = () => {
    abortRef.current?.abort()
    setLoading(false)
    if (streamingText) { setMessages(prev => [...prev, { role: 'assistant', content: streamingText }]); setStreamingText('') }
  }

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

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAttachedImage(file)
    const reader = new FileReader()
    reader.onload = (ev) => setAttachedImageBase64(ev.target.result)
    reader.readAsDataURL(file)
    setShowPlusMenu(false)
  }

  const generateProject = async (idea, chatId) => {
    setStreamingText('🏗️ Pura project ban raha hai...')
    try {
      const res = await fetch('/api/generate-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setProject(data.project)
      const msg = `✅ **${data.project.name}** taiyaar!\n\n📁 ${data.project.files.length} files:\n${data.project.files.map(f => `- \`${f.path}\``).join('\n')}\n\n👇 Preview ya ZIP download karo!`
      setMessages(prev => [...prev, { role: 'assistant', content: msg }])
      if (chatId) await saveMessage(chatId, 'assistant', msg)
    } catch (err) {
      const msg = `❌ Project generate nahi hua: ${err.message}`
      setMessages(prev => [...prev, { role: 'assistant', content: msg }])
    }
    setStreamingText('')
  }

  const isProjectIdea = (text) => {
    const kw = ['banao', 'bana do', 'build', 'create', 'todo', 'calculator', 'game', 'portfolio', 'website', 'app banao', 'landing page']
    return kw.some(k => text.toLowerCase().includes(k)) && text.length > 15
  }

  const sendMessage = async () => {
    if (!input.trim() && !attachedImage || loading) return
    const currentInput = input.trim() || 'Is image mein kya error hai? Fix karo.'
    const userMsg = {
      role: 'user',
      content: currentInput,
      image: attachedImage ? attachedImageBase64 : null
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setAttachedImage(null)
    setAttachedImageBase64(null)
    setLoading(true)
    setStreamingText('')

    let chatId = activeChatId
    if (!chatId) {
      const { data: newChat } = await createChat(user.id, currentInput.slice(0, 50))
      chatId = newChat?.id; setActiveChatId(chatId); loadChats(user.id)
    }
    if (chatId) await saveMessage(chatId, 'user', currentInput)

    if (!attachedImage && isProjectIdea(currentInput)) {
      await generateProject(currentInput, chatId)
      setLoading(false)
      return
    }

    setStreamingText('...')
    try {
      const controller = new AbortController()
      abortRef.current = controller

      const apiMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.image
          ? [{ type: 'text', text: m.content }, { type: 'image_url', image_url: { url: m.image } }]
          : m.content
      }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, model }),
        signal: controller.signal,
      })

      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'API error') }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        fullText += chunk
        setStreamingText(fullText)
      }

      setMessages(prev => [...prev, { role: 'assistant', content: fullText }])
      setStreamingText('')
      if (chatId) {
        await saveMessage(chatId, 'assistant', fullText)
        if (messages.length === 0) { await updateChatTitle(chatId, currentInput.slice(0, 50)); loadChats(user.id) }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages(prev => [...prev, { role: 'assistant', content: `❌ **Error:** ${err.message}` }])
        setStreamingText('')
      }
    }
    setLoading(false)
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
      const a = document.createElement('a'); a.href = url; a.download = `${project.name}.zip`; a.click()
      URL.revokeObjectURL(url)
    } catch (err) { alert('Download error: ' + err.message) }
  }

  const getPreviewHTML = () => {
    if (!project) return ''
    const htmlFile = project.files.find(f => f.path.endsWith('.html'))
    if (!htmlFile) return '<body style="background:#1a1a27;color:white;padding:20px"><h2>HTML file nahi mili</h2></body>'
    let html = htmlFile.content
    project.files.filter(f => f.path.endsWith('.css')).forEach(f => { html = html.replace(/<link[^>]*\.css[^>]*>/gi, `<style>${f.content}</style>`) })
    project.files.filter(f => f.path.endsWith('.js')).forEach(f => { html = html.replace(/<script[^>]*src=["'][^"']*\.js["'][^>]*><\/script>/gi, `<script>${f.content}</script>`) })
    return html
  }

  const adjustHeight = (e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px' }

  return (
    <div className="flex h-screen bg-[#0a0a0f] overflow-hidden">
      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />

      <Sidebar chats={chats} activeChatId={activeChatId} onNewChat={handleNewChat} onSelectChat={handleSelectChat} onDeleteChat={handleDeleteChat} user={user} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a27] bg-[#0d0d14]/90 backdrop-blur-md">
          <div className="flex items-center gap-2 ml-12 md:ml-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold">Coding AI</span>
          </div>
          <div className="flex bg-[#12121a] rounded-xl p-1 border border-[#1a1a27] gap-1">
            {MODELS.map(m => (
              <button key={m.id} onClick={() => setModel(m.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${model === m.id ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-white'}`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
            {messages.length === 0 && !streamingText && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shadow-2xl shadow-violet-500/30">
                  <Code2 className="w-12 h-12 text-white" />
                </div>
                <div>
                  <h2 className="text-4xl font-bold text-white mb-3">Welcome, Coding AI! 👋</h2>
                  <p className="text-slate-400 text-lg">Error fix karo ya pura app idea do!</p>
                  <p className="text-slate-600 text-sm mt-1">Hindi • Hinglish • English • Screenshot bhi bhej sakte ho!</p>
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

            {messages.map((msg, i) => (
              <div key={i}>
                {msg.image && msg.role === 'user' && (
                  <div className="flex justify-end mb-2">
                    <img src={msg.image} alt="uploaded" className="max-w-[200px] rounded-xl border border-[#2d2d4a]" />
                  </div>
                )}
                <MessageBubble message={msg} />
              </div>
            ))}

            {streamingText && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 max-w-[85%]">
                  <MessageBubble message={{ role: 'assistant', content: streamingText }} />
                  <span className="inline-block w-2 h-4 bg-violet-400 ml-1 animate-pulse rounded-sm" />
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
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-semibold">
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </button>
                    <button onClick={downloadZip}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 border border-green-500/30 text-green-400 rounded-lg text-xs font-semibold">
                      <Download className="w-3.5 h-3.5" /> ZIP
                    </button>
                  </div>
                </div>
                {project.files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#1a1a27]">
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

        {/* Input Area — White Box */}
        <div className="border-t border-[#1a1a27] bg-[#0d0d14]/90 backdrop-blur-md p-4">
          <div className="max-w-3xl mx-auto">
            {/* Attached image preview */}
            {attachedImage && (
              <div className="mb-2 flex items-center gap-2 bg-[#12121a] border border-[#2d2d4a] rounded-xl px-3 py-2">
                <ImageIcon className="w-4 h-4 text-violet-400" />
                <span className="text-xs text-slate-300 truncate">{attachedImage.name}</span>
                <button onClick={() => { setAttachedImage(null); setAttachedImageBase64(null) }} className="ml-auto text-slate-500 hover:text-red-400">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* White chatbox */}
            <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 focus-within:border-violet-400 transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => { setInput(e.target.value); adjustHeight(e) }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder=""
                className="w-full bg-transparent text-gray-900 text-sm resize-none outline-none px-4 pt-4 pb-14 leading-relaxed min-h-[56px] max-h-[200px]"
                rows={1}
                style={{ height: '56px' }}
              />

              {/* Bottom bar */}
              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2.5 border-t border-gray-100">

                {/* Plus button — left side */}
                <div className="relative">
                  <button
                    onClick={() => setShowPlusMenu(!showPlusMenu)}
                    className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all">
                    <Plus className="w-4 h-4" />
                  </button>

                  {/* Plus dropdown menu */}
                  {showPlusMenu && (
                    <div className="absolute bottom-12 left-0 bg-white border border-gray-200 rounded-2xl shadow-2xl py-2 min-w-[180px] z-20">
                      <button
                        onClick={() => { fileInputRef.current?.click(); setShowPlusMenu(false) }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm transition-colors">
                        <ImageIcon className="w-4 h-4 text-violet-500" />
                        Gallery se photo
                      </button>
                      <button
                        onClick={() => { cameraInputRef.current?.click(); setShowPlusMenu(false) }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm transition-colors">
                        <Camera className="w-4 h-4 text-violet-500" />
                        Camera se photo
                      </button>
                      <button
                        onClick={() => { fileInputRef.current?.click(); setShowPlusMenu(false) }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 text-sm transition-colors">
                        <FolderOpen className="w-4 h-4 text-violet-500" />
                        File upload
                      </button>
                    </div>
                  )}
                </div>

                {/* Right buttons */}
                <div className="flex items-center gap-2">
                  {/* Orange Mic */}
                  <button onClick={toggleMic}
                    className={`p-2 rounded-xl transition-all ${isListening ? 'bg-orange-100 animate-pulse' : 'hover:bg-gray-100'}`}>
                    {isListening
                      ? <MicOff className="w-4 h-4 text-orange-500" />
                      : <Mic className="w-4 h-4 text-orange-500" />
                    }
                  </button>

                  {/* Send / Stop */}
                  {loading ? (
                    <button onClick={stopGeneration}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-all">
                      <Square className="w-3.5 h-3.5" /> Roko
                    </button>
                  ) : (
                    <button onClick={sendMessage} disabled={!input.trim() && !attachedImage}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-white text-xs font-semibold shadow-lg shadow-violet-500/20">
                      <Send className="w-3.5 h-3.5" /> Bhejo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close plus menu */}
      {showPlusMenu && <div className="fixed inset-0 z-10" onClick={() => setShowPlusMenu(false)} />}

      {/* Live Preview */}
      {showPreview && project && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a27] border-b border-[#2d2d4a]">
       
