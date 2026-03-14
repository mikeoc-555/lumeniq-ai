'use client'

import { NavBar } from '@/components/navbar'
import { TradingChat } from '@/components/trading-chat'
import { TradingChatInput } from '@/components/trading-chat-input'
import { useAuth } from '@/lib/auth'
import { ViewType } from '@/components/auth'
import { AuthDialog } from '@/components/auth-dialog'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { usePostHog } from 'posthog-js/react'
import { TradingMessage } from '@/hooks/use-trading-agent'

export default function TradingPage() {
  const [isAuthDialogOpen, setAuthDialog] = useState(false)
  const [authView, setAuthView] = useState<ViewType>('sign_in')
  const { session, userTeam } = useAuth(setAuthDialog, setAuthView)
  const posthog = usePostHog()
  
  const [messages, setMessages] = useState<TradingMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)

  function handleSocialClick(target: 'github' | 'x' | 'discord') {
    if (target === 'github') {
      window.open('https://github.com/e2b-dev/fragments', '_blank')
    } else if (target === 'x') {
      window.open('https://x.com/e2b', '_blank')
    } else if (target === 'discord') {
      window.open('https://discord.gg/e2b', '_blank')
    }
    posthog.capture(`${target}_click`)
  }

  function logout() {
    supabase
      ? supabase.auth.signOut()
      : console.warn('Supabase is not initialized')
  }

  function handleClearChat() {
    setMessages([])
  }

  return (
    <main className="flex min-h-screen max-h-screen">
      <AuthDialog
        open={isAuthDialogOpen}
        setOpen={setAuthDialog}
        view={authView}
      />
      <div className="w-full max-w-[900px] mx-auto px-4 flex flex-col h-screen">
        <NavBar
          session={session}
          showLogin={() => setAuthDialog(true)}
          signOut={logout}
          onSocialClick={handleSocialClick}
          onClear={handleClearChat}
          canClear={messages.length > 0}
          canUndo={messages.length > 1 && !isLoading}
          onUndo={() => setMessages(prev => prev.slice(0, -2))}
        />
        
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto pb-4">
            <TradingChat messages={messages} isLoading={isLoading} />
          </div>
          
          <div className="pb-6">
            <TradingChatInput
              messages={messages}
              setMessages={setMessages}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
              session={session}
              userID={session?.user?.id}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
