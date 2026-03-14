'use client'

import { FormEvent, useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { useTradingAgent, TradingMessage } from '@/hooks/use-trading-agent'
import { type NavSession } from './navbar'
import { useLocalStorage } from 'usehooks-ts'

interface TradingChatInputProps {
  messages: TradingMessage[]
  setMessages: React.Dispatch<React.SetStateAction<TradingMessage[]>>
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  session: NavSession | null
  userID?: string
}

export function TradingChatInput({
  messages,
  setMessages,
  isLoading,
  setIsLoading,
  session,
  userID,
}: TradingChatInputProps) {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const [apiKey, setApiKey] = useLocalStorage<string>('trading-agent-api-key', '')
  const [model, setModel] = useLocalStorage<string>('trading-agent-model', 'anthropic/claude-3.5-sonnet')
  
  const { sendMessage } = useTradingAgent()

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!input.trim() || isLoading) return
    if (!session) {
      setError('Please sign in to continue')
      return
    }

    const message = input.trim()
    setInput('')
    setError(null)
    setIsLoading(true)

    await sendMessage(
      messages,
      message,
      (msg) => setMessages(prev => [...prev, msg]),
      (msg) => setMessages(prev => prev.map(m => m.id === msg.id ? msg : m)),
      (err) => {
        setError(err)
        setIsLoading(false)
      },
      apiKey || undefined,
      model,
    )

    setIsLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="w-full">
      {error && (
        <div className="mb-2 p-2 bg-destructive/10 text-destructive text-sm rounded-lg">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about stocks, request charts, or analyze markets..."
          disabled={isLoading}
          rows={1}
          className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 pr-12 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <Send className="h-5 w-5 text-primary" />
          )}
        </button>
      </form>

      {/* Settings row */}
      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="opacity-50">Model:</span>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="bg-transparent border border-input rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
          <option value="anthropic/claude-3-opus">Claude 3 Opus</option>
          <option value="openai/gpt-4o">GPT-4o</option>
          <option value="openai/gpt-4-turbo">GPT-4 Turbo</option>
        </select>
        
        <span className="opacity-50 ml-4">API Key:</span>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Optional (uses default)"
          className="bg-transparent border border-input rounded px-2 py-1 text-xs w-40 focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
    </div>
  )
}
