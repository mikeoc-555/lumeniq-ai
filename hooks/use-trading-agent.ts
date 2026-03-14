'use client'

import { useCallback } from 'react'

export interface TradingMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  charts?: Array<{
    spec: Record<string, any>
    title: string
  }>
  toolCalls?: Array<{
    name: string
    args: Record<string, any>
  }>
  timestamp: Date
}

interface SSEEvent {
  type: 'content' | 'chart' | 'tool_call' | 'todos' | 'done'
  content?: string
  spec?: Record<string, any>
  title?: string
  tool_calls?: Array<{ name: string; args: any }>
  todos?: Array<any>
}

export function useTradingAgent() {
  const sendMessage = useCallback(async (
    messages: TradingMessage[],
    newMessage: string,
    onMessage: (msg: TradingMessage) => void,
    onUpdate: (msg: TradingMessage) => void,
    onError: (error: string) => void,
    apiKey?: string,
    model?: string,
  ) => {
    // Add user message
    const userMsg: TradingMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: newMessage,
      timestamp: new Date(),
    }
    onMessage(userMsg)

    // Create assistant message placeholder
    const assistantMsg: TradingMessage = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: '',
      charts: [],
      toolCalls: [],
      timestamp: new Date(),
    }
    onMessage(assistantMsg)

    // Build message history for API
    const apiMessages = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role,
        content: m.content,
      }))
    apiMessages.push({ role: 'user', content: newMessage })

    try {
      const response = await fetch('/api/trading-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          apiKey,
          model,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let buffer = ''
      let currentContent = ''
      let currentCharts: TradingMessage['charts'] = []

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            
            if (data === '[DONE]') {
              // Finalize the message
              const finalMsg: TradingMessage = {
                ...assistantMsg,
                content: currentContent.trim(),
                charts: currentCharts,
              }
              onUpdate(finalMsg)
              return
            }

            try {
              const event: SSEEvent = JSON.parse(data)

              switch (event.type) {
                case 'content':
                  if (event.content) {
                    currentContent += event.content
                    const updatedMsg: TradingMessage = {
                      ...assistantMsg,
                      content: currentContent,
                      charts: currentCharts,
                    }
                    onUpdate(updatedMsg)
                  }
                  break

                case 'chart':
                  if (event.spec) {
                    currentCharts = currentCharts || []
                    currentCharts.push({
                      spec: event.spec,
                      title: event.title || 'Chart',
                    })
                    const updatedMsg: TradingMessage = {
                      ...assistantMsg,
                      content: currentContent,
                      charts: currentCharts,
                    }
                    onUpdate(updatedMsg)
                  }
                  break

                case 'tool_call':
                  if (event.tool_calls) {
                    const updatedMsg: TradingMessage = {
                      ...assistantMsg,
                      content: currentContent,
                      charts: currentCharts,
                      toolCalls: event.tool_calls,
                    }
                    onUpdate(updatedMsg)
                  }
                  break

                case 'todos':
                  // Handle todos if needed
                  break
              }
            } catch (e) {
              // Skip invalid JSON
              console.warn('Failed to parse SSE event:', data)
            }
          }
        }
      }

      // Final update
      const finalMsg: TradingMessage = {
        ...assistantMsg,
        content: currentContent.trim(),
        charts: currentCharts,
      }
      onUpdate(finalMsg)

    } catch (error: any) {
      console.error('Trading agent error:', error)
      onError(error.message || 'Failed to send message')
    }
  }, [])

  return { sendMessage }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}
