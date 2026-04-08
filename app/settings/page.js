'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, Key, Github, Save, Check, Eye, EyeOff, Loader2 } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import { getUser, getUserChats, deleteChat } from '@/lib/supabase'
import { getGitHubUser } from '@/lib/github'

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [chats, setChats] = useState([])
  const [saved, setSaved] = useState(false)
  const [ghUser, setGhUser] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [showTokens, setShowTokens] = useState({ gh: false })
  
  const [settings, setSettings] = useState({
    ghToken: '',
    preferredModel: 'groq',
  })

  useEffect(() => {
    checkAuth()
    loadSettings()
  }, [])

  const checkAuth = async () => {
    const u = await getUser()
    if (!u) { router.push('/'); return }
    setUser(u)
    const { data } = await getUserChats(u.id)
    setChats(data || [])
  }

  const loadSettings = () => {
    const ghToken = localStorage.getItem('gh_token') || ''
    const preferredModel = localStorage.getItem('preferred_model') || 'groq'
    setSettings({ ghToken, preferredModel })
    if (ghToken) verifyGH(ghToken)
  }

  const verifyGH = async (token) => {
    setVerifying(true)
    try {
      const u = await getGitHubUser(token)
      if (u.login) setGhUser(u)
    } catch {}
    setVerifying(false)
  }

  const saveSettings = () => {
    localStorage.setItem('gh_token', settings.ghToken)
    localStorage.setItem('preferred_model', settings.preferredModel)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    if (settings.ghToken) verifyGH(settings.ghToken)
  }

  return (
    <div className="flex h-screen bg-dark-900 overflow-hidden">
      <Sidebar
        chats={chats}
        onNewChat={() => router.push('/chat')}
        onSelectChat={() => router.push('/chat')}
        onDeleteChat={async (id) => { await deleteChat(id); const { data } = await getUserChats(user?.id); setChats(data || []) }}
        user={user}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-8 ml-12 md:ml-0">
            <Settings className="w-5 h-5 text-accent-purple" />
            <h1 className="text-xl font-bold text-white">Settings</h1>
          </div>

          {/* Model Preference */}
          <div className="glass rounded-2xl p-5 mb-4">
            <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
              <span>⚡</span> AI Model
            </h2>
            <p className="text-xs text-slate-500 mb-4">Chat mein default model chuno</p>
            <div className="flex gap-2">
              {[
                { id: 'groq', label: '⚡ Groq (Llama3-70B)', desc: 'Fast & Accurate' },
                { id: 'openrouter', label: '🧠 DeepSeek', desc: 'More Creative' },
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setSettings(s => ({ ...s, preferredModel: m.id }))}
                  className={`flex-1 p-3 rounded-xl text-left border transition-all ${
                    settings.preferredModel === m.id
                      ? 'border-accent-purple bg-accent-purple/10'
                      : 'border-dark-500 bg-dark-700 hover:border-dark-400'
                  }`}
                >
                  <p className="text-sm text-white font-medium">{m.label}</p>
                  <p className="text-xs text-slate-500">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* GitHub Token */}
          <div className="glass rounded-2xl p-5 mb-4">
            <h2 className="text-white font-semibold mb-1 flex items-center gap-2">
              <Github className="w-4 h-4" /> GitHub Token
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Editor se GitHub push karne ke liye zaroori hai.{' '}
              <a href="https://github.com/settings/tokens" target="_blank" className="text-accent-purple underline">
                Token banao yahan
              </a>
            </p>
            <div className="relative">
              <input
                type={showTokens.gh ? 'text' : 'password'}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={settings.ghToken}
                onChange={e => setSettings(s => ({ ...s, ghToken: e.target.value }))}
                className="w-full bg-dark-800 border border-dark-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-accent-purple pr-10"
              />
              <button
                onClick={() => setShowTokens(s => ({ ...s, gh: !s.gh }))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                {showTokens.gh ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {verifying && <p className="text-xs text-slate-400 mt-2 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Verify ho raha hai...</p>}
            {ghUser && !verifying && (
              <div className="mt-2 flex items-center gap-2">
                <img src={ghUser.avatar_url} className="w-5 h-5 rounded-full" />
                <p className="text-xs text-green-400">✅ Connected: @{ghUser.login}</p>
              </div>
            )}
          </div>

          {/* Save */}
          <button
            onClick={saveSettings}
            className="w-full py-3 bg-gradient-to-r from-accent-purple to-accent-blue rounded-xl text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            {saved ? <><Check className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Settings Save Karo</>}
          </button>

          {/* Account info */}
          <div className="glass rounded-2xl p-5 mt-4">
            <h2 className="text-white font-semibold mb-3">Account</h2>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center text-white font-bold">
                {user?.email?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-white text-sm font-medium">{user?.user_metadata?.full_name || 'Developer'}</p>
                <p className="text-slate-400 text-xs">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
