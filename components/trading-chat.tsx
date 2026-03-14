'use client'

import { Loader2, BarChart3 } from 'lucide-react'
import { TradingMessage } from '@/hooks/use-trading-agent'
import { PlotlyChart, PlotlyChartSpec } from './plotly-chart'
import { useEffect, useRef } from 'react'

interface TradingChatProps {
  messages: TradingMessage[]
  isLoading: boolean
}

export function TradingChat({ messages, isLoading }: TradingChatProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <BarChart3 className="h-16 w-16 mb-4 opacity-50" />
        <h2 className="text-xl font-semibold mb-2">Lumeniq Trading Agent</h2>
        <p className="text-center max-w-md">
          Ask me about stocks, technical analysis, options flow, or request charts.
          <br />
          <span className="text-sm opacity-75">Try: &quot;Show me AAPL price chart&quot; or &quot;Analyze NVDA RSI&quot;</span>
        </p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-4 overflow-y-auto">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex flex-col ${
            message.role === 'user'
              ? 'bg-gradient-to-b from-black/5 to-black/10 dark:from-black/30 dark:to-black/50 px-4 py-3 rounded-xl w-fit max-w-[85%] ml-auto'
              : 'bg-accent dark:bg-white/5 border px-4 py-4 rounded-2xl w-full'
          }`}
        >
          {/* Text content */}
          <div className="whitespace-pre-wrap font-serif text-sm">
            {message.content || (message.role === 'assistant' && isLoading ? '...' : '')}
          </div>

          {/* Charts */}
          {message.charts && message.charts.length > 0 && (
            <div className="mt-4 space-y-4 w-full">
              {message.charts.map((chart, idx) => (
                <div
                  key={idx}
                  className="w-full rounded-lg overflow-hidden border border-border/50 bg-background/50"
                >
                  <div className="px-3 py-2 border-b border-border/50 flex items-center gap-2 bg-muted/30">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium font-sans">
                      {chart.title}
                    </span>
                  </div>
                  <div className="p-2">
                    <PlotlyChart spec={chart.spec as PlotlyChartSpec} height={350} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tool calls indicator */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.toolCalls.map((tool, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-1 bg-muted rounded-md text-muted-foreground font-mono"
                >
                  {tool.name}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}

      {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
        <div className="flex items-center gap-2 text-muted-foreground px-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Analyzing...</span>
        </div>
      )}
    </div>
  )
}
