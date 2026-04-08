'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, signUp } from '@/lib/supabase'
import { Code2, Zap, Lock, Mail, User, ArrowRight, Loader2 } from 'lucide-react'

export default function AuthPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '' })

  const handleSubmit = async () => {
    setError('')
    setLoading(true)

    if (!form.email || !form.password) {
      setError('Email aur password zaroori hai')
      setLoading(false)
      return
    }

    try {
      if (isLogin) {
        const { data, error } = await signIn(form.email, form.password)
        if (error) throw error
        router.push('/chat')
      } else {
        if (!form.name) { setError('Naam bhi bhar do'); setLoading(false); return }
        const { data, error } = await signUp(form.email, form.password, form.name)
        if (error) throw error
        router.push('/chat')
      }
    } catch (err) {
      setError(err.message || 'Kuch galat hua, dobara try karo')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-accent-blue/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-purple to-accent-blue mb-4">
            <Code2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Code-Cure AI</h1>
          <p className="text-slate-400 mt-2">Debug. Fix. Learn. — तीन भाषाओं में</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8">
          {/* Toggle */}
          <div className="flex bg-dark-900 rounded-xl p-1 mb-6">
            {['Login', 'Sign Up'].map((tab, i) => (
              <button
                key={tab}
                onClick={() => { setIsLogin(i === 0); setError('') }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  isLogin === (i === 0)
                    ? 'bg-accent-purple text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tumhara naam"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-dark-800 border border-dark-500 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-accent-purple transition-colors"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full bg-dark-800 border border-dark-500 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-accent-purple transition-colors"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                className="w-full bg-dark-800 border border-dark-500 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-accent-purple transition-colors"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full mt-6 py-3 bg-gradient-to-r from-accent-purple to-accent-blue rounded-xl text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isLogin ? 'Login Karo' : 'Account Banao'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Features */}
          <div className="mt-6 flex justify-around text-xs text-slate-500">
            {['🔥 Groq AI', '🇮🇳 Hindi', '⚡ Fast'].map(f => (
              <span key={f}>{f}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
