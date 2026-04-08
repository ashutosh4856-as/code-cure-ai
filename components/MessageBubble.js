'use client'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useState } from 'react'
import { Copy, Check, Code2, User, Zap } from 'lucide-react'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors">
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 msg-appear ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
        isUser
          ? 'bg-gradient-to-br from-accent-blue to-accent-purple'
          : 'bg-gradient-to-br from-accent-purple to-pink-600'
      }`}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Zap className="w-4 h-4 text-white" />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[85%] md:max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <span className="text-xs text-slate-500 px-1">
          {isUser ? 'Tum' : 'Code-Cure AI'}
        </span>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-accent-purple/20 border border-accent-purple/30 text-white rounded-tr-sm'
            : 'bg-dark-700 border border-dark-500 text-slate-200 rounded-tl-sm'
        }`}>
          {isUser ? (
            <pre className="whitespace-pre-wrap font-sans text-sm">{message.content}</pre>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  const codeText = String(children).replace(/\n$/, '')
                  
                  if (!inline && match) {
                    return (
                      <div className="rounded-xl overflow-hidden my-3 border border-dark-500">
                        <div className="flex items-center justify-between px-4 py-2 bg-dark-900 border-b border-dark-500">
                          <span className="text-xs text-accent-purple font-mono">{match[1].toUpperCase()}</span>
                          <CopyButton text={codeText} />
                        </div>
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ margin: 0, background: '#0d0d14', padding: '1rem' }}
                          {...props}
                        >
                          {codeText}
                        </SyntaxHighlighter>
                      </div>
                    )
                  }
                  return (
                    <code className="bg-dark-900 text-accent-purple px-1.5 py-0.5 rounded text-xs font-mono" {...props}>
                      {children}
                    </code>
                  )
                },
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                h2: ({ children }) => <h2 className="text-white font-bold text-base mt-4 mb-2 flex items-center gap-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-white font-semibold mt-3 mb-1">{children}</h3>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-accent-purple pl-3 text-slate-400 my-2">{children}</blockquote>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  )
    }
