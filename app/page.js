'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, signUp, supabase } from '@/lib/supabase'
import { Code2, Lock, Mail, User, ArrowRight, Loader2 } from 'lucide-react'

export default function AuthPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '' })

  const handleGoogle = async () => {
    setGoogleLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/chat` }
    })
    if (error) setError(error.message)
    setGoogleLoading(false)
  }

  const handleSubmit = async () => {
    setError('')
    if (!form.email || !form.password) { setError('Email aur password zaroori hai'); return }
    setLoading(true)
    try {
      if (isLogin) {
        const { error } = await signIn(form.email, form.password)
        if (error) throw error
        router.push('/chat')
      } else {
        if (!form.name) { setError('Naam bhi bhar do'); setLoading(false); return }
        const { error } = await signUp(form.email, form.password, form.name)
        if (error) throw error
        router.push('/chat')
      }
    } catch (err) { setError(err.message || 'Kuch galat hua') }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 mb-4 shadow-2xl shadow-violet-500/30">
            <Code2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Coding AI</h1>
          <p className="text-slate-400 mt-2">Debug • Fix • Build — तीन भाषाओं में</p>
        </div>

        <div className="bg-[#12121a] border border-[#1a1a27] rounded-2xl p-8 shadow-2xl">
          {/* Toggle */}
          <div className="flex bg-[#0a0a0f] rounded-xl p-1 mb-6">
            {['Login', 'Sign Up'].map((tab, i) => (
              <button key={tab} onClick={() => { setIsLogin(i === 0); setError('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${isLogin === (i === 0) ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                {tab}
              </button>
            ))}
          </div>

          {/* Google Login */}
          <button onClick={handleGoogle} disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 bg-white hover:bg-gray-100 rounded-xl text-gray-800 font-semibold text-sm transition-all mb-4 disabled:opacity-50">
            {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Google se Login karo
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-[#1a1a27]" />
            <span className="text-xs text-slate-600">ya email se</span>
            <div className="flex-1 h-px bg-[#1a1a27]" />
          </div>

          <div className="space-y-3">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="text" placeholder="Tumhara naam" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-[#0a0a0f] border border-[#1a1a27] rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors" />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="email" placeholder="Email address" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full bg-[#0a0a0f] border border-[#1a1a27] rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="password" placeholder="Password" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full bg-[#0a0a0f] border border-[#1a1a27] rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors" />
            </div>
          </div>

          {error && <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}

          <button onClick={handleSubmit} disabled={loading}
            className="w-full mt-5 py-3 bg-gradient-to-r from-violet-600 to-blue-600 rounded-xl text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg shadow-violet-500/20">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{isLogin ? 'Login Karo' : 'Account Banao'} <ArrowRight className="w-4 h-4" /></>}
          </button>

          <div className="mt-5 flex justify-around text-xs text-slate-600">
            {['⚡ Groq AI', '🇮🇳 Hindi', '🔥 Fast', '🛡️ Secure'].map(f => <span key={f}>{f}</span>)}
          </div>
        </div>
      </div>
    </div>
  )
      }
    
