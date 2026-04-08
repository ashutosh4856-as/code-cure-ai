'use client'
import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { 
  Plus, MessageSquare, Code2, Settings, LogOut, 
  Trash2, Menu, X, ChevronRight, Zap
} from 'lucide-react'
import { signOut } from '@/lib/supabase'

export default function Sidebar({ chats = [], activeChatId, onNewChat, onSelectChat, onDeleteChat, user }) {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [hoveredChat, setHoveredChat] = useState(null)

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const navItems = [
    { icon: MessageSquare, label: 'Chat', path: '/chat' },
    { icon: Code2, label: 'Editor', path: '/editor' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ]

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setCollapsed(true)} />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative z-30 h-full flex flex-col
        bg-dark-800 border-r border-dark-600
        sidebar-transition
        ${collapsed ? 'w-0 md:w-14 overflow-hidden' : 'w-72'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-600">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white text-sm">Code-Cure AI</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-dark-600 text-slate-400 hover:text-white transition-colors"
          >
            {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
        </div>

        {!collapsed && (
          <>
            {/* Nav */}
            <div className="p-2 border-b border-dark-600">
              {navItems.map(({ icon: Icon, label, path }) => (
                <button
                  key={path}
                  onClick={() => router.push(path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                    pathname === path
                      ? 'bg-accent-purple/20 text-accent-purple font-medium'
                      : 'text-slate-400 hover:bg-dark-600 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </button>
              ))}
            </div>

            {/* New Chat Button */}
            <div className="p-2">
              <button
                onClick={onNewChat}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm bg-accent-purple/10 hover:bg-accent-purple/20 text-accent-purple border border-accent-purple/20 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Naya Chat
              </button>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <p className="text-xs text-slate-500 px-3 py-1 uppercase tracking-wider">History</p>
              {chats.length === 0 ? (
                <p className="text-xs text-slate-600 px-3 py-2">Koi chat nahi abhi</p>
              ) : (
                chats.map(chat => (
                  <div
                    key={chat.id}
                    onMouseEnter={() => setHoveredChat(chat.id)}
                    onMouseLeave={() => setHoveredChat(null)}
                    className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-colors ${
                      activeChatId === chat.id
                        ? 'bg-dark-600 text-white'
                        : 'text-slate-400 hover:bg-dark-700 hover:text-white'
                    }`}
                    onClick={() => onSelectChat(chat.id)}
                  >
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="flex-1 truncate text-xs">{chat.title || 'Naya Chat'}</span>
                    {hoveredChat === chat.id && (
                      <button
                        onClick={e => { e.stopPropagation(); onDeleteChat(chat.id) }}
                        className="text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* User Footer */}
            <div className="p-3 border-t border-dark-600">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center text-white text-xs font-bold">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium truncate">
                    {user?.user_metadata?.full_name || 'Developer'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
                <button onClick={handleSignOut} className="text-slate-500 hover:text-red-400 transition-colors">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Mobile toggle button */}
      <button
        className="fixed top-4 left-4 z-20 md:hidden p-2 rounded-xl bg-dark-800 border border-dark-600 text-slate-400"
        onClick={() => setCollapsed(false)}
      >
        <Menu className="w-5 h-5" />
      </button>
    </>
  )
}
