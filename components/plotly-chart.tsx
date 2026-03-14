'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

// Dynamic import to avoid SSR issues with Plotly
const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 w-full bg-accent/50 rounded-lg">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <span className="ml-2 text-muted-foreground">Loading chart...</span>
    </div>
  ),
})

export interface PlotlyChartSpec {
  data: Array<{
    type?: string
    mode?: string
    x?: (string | number)[]
    y?: number[]
    open?: number[]
    high?: number[]
    low?: number[]
    close?: number[]
    name?: string
    line?: { color?: string; width?: number }
    marker?: { color?: string; size?: number }
    increasing?: { line?: { color?: string } }
    decreasing?: { line?: { color?: string } }
    [key: string]: unknown
  }>
  layout: {
    title?: string | { text: string }
    template?: string
    paper_bgcolor?: string
    plot_bgcolor?: string
    font?: { color?: string; family?: string }
    xaxis?: { title?: string; rangeslider?: { visible?: boolean }; [key: string]: unknown }
    yaxis?: { title?: string; [key: string]: unknown }
    showlegend?: boolean
    legend?: { orientation?: string; x?: number; y?: number }
    margin?: { t?: number; r?: number; b?: number; l?: number }
    height?: number
    width?: number
    [key: string]: unknown
  }
  config?: {
    responsive?: boolean
    displayModeBar?: boolean | 'hover'
    displaylogo?: boolean
    [key: string]: unknown
  }
}

interface PlotlyChartProps {
  spec: PlotlyChartSpec
  className?: string
  height?: number
}

export function PlotlyChart({ spec, className = '', height = 400 }: PlotlyChartProps) {
  // Ensure we have valid data
  if (!spec?.data || !Array.isArray(spec.data)) {
    return (
      <div className="flex items-center justify-center h-64 w-full bg-destructive/10 rounded-lg">
        <span className="text-destructive">Invalid chart specification</span>
      </div>
    )
  }

  // Apply dark theme defaults
  const layout = {
    ...spec.layout,
    paper_bgcolor: spec.layout?.paper_bgcolor || 'rgba(0,0,0,0)',
    plot_bgcolor: spec.layout?.plot_bgcolor || 'rgba(15,23,42,1)',
    font: {
      color: spec.layout?.font?.color || '#94a3b8',
      family: spec.layout?.font?.family || 'Inter, sans-serif',
    },
    height: spec.layout?.height || height,
    margin: spec.layout?.margin || { t: 50, r: 20, b: 50, l: 60 },
    xaxis: {
      gridcolor: 'rgba(148, 163, 184, 0.1)',
      zerolinecolor: 'rgba(148, 163, 184, 0.2)',
      ...spec.layout?.xaxis,
    },
    yaxis: {
      gridcolor: 'rgba(148, 163, 184, 0.1)',
      zerolinecolor: 'rgba(148, 163, 184, 0.2)',
      ...spec.layout?.yaxis,
    },
  }

  // Default config for interactive charts
  const config = {
    responsive: true,
    displayModeBar: 'hover' as const,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    ...spec.config,
  }

  return (
    <div className={`w-full ${className}`}>
      <Plot
        data={spec.data as any}
        layout={layout as any}
        config={config as any}
        className="w-full"
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}

/**
 * Parse chart spec from string (handles JSON strings from agent)
 */
export function parseChartSpec(specString: string): PlotlyChartSpec | null {
  try {
    const parsed = JSON.parse(specString)
    if (parsed.data && Array.isArray(parsed.data)) {
      return parsed as PlotlyChartSpec
    }
    return null
  } catch {
    return null
  }
}
