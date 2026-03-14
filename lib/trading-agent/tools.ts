import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Market Data Tool - Uses Financial Modeling Prep API
 * Falls back to mock data if no API key
 */
export const marketDataTool = tool(
  async ({ symbol, dataType }) => {
    const apiKey = process.env.FMP_API_KEY;
    
    if (!apiKey) {
      return JSON.stringify({
        error: "FMP_API_KEY not configured",
        message: "Set FMP_API_KEY in environment for real market data",
        mockData: {
          symbol,
          price: 150.25,
          change: 2.35,
          changePercent: 1.59,
          volume: 52340000,
        }
      });
    }

    try {
      const endpoints: Record<string, string> = {
        quote: `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${apiKey}`,
        profile: `https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${apiKey}`,
        metrics: `https://financialmodelingprep.com/api/v3/key-metrics/${symbol}?apikey=${apiKey}`,
      };

      const url = endpoints[dataType] || endpoints.quote;
      const response = await fetch(url);
      const data = await response.json();
      
      return JSON.stringify(data, null, 2);
    } catch (error: any) {
      return JSON.stringify({ error: error.message });
    }
  },
  {
    name: "market_data",
    description: "Fetch real-time market data for a stock symbol. Use this to get quotes, company profiles, and key metrics.",
    schema: z.object({
      symbol: z.string().describe("Stock symbol (e.g., AAPL, GOOGL, TSLA)"),
      dataType: z.enum(["quote", "profile", "metrics"]).describe("Type of data to fetch"),
    }),
  }
);

/**
 * Technical Analysis Tool - Calculates indicators
 */
export const technicalAnalysisTool = tool(
  async ({ symbol, indicators, period }) => {
    // This would integrate with a data provider for real calculations
    // For now, returns structure for what would be calculated
    
    const results: Record<string, any> = {
      symbol,
      period,
      timestamp: new Date().toISOString(),
      indicators: {},
    };

    for (const indicator of indicators) {
      // Mock calculations - in production, use yfinance or TA-Lib
      results.indicators[indicator] = {
        value: Math.random() * 100,
        signal: Math.random() > 0.5 ? "bullish" : "bearish",
        confidence: Math.random() * 0.5 + 0.5,
      };
    }

    return JSON.stringify(results, null, 2);
  },
  {
    name: "technical_analysis",
    description: "Calculate technical indicators for a stock. Use for RSI, MACD, moving averages, etc.",
    schema: z.object({
      symbol: z.string().describe("Stock symbol"),
      indicators: z.array(z.enum([
        "rsi", "macd", "sma", "ema", "bollinger_bands",
        "atr", "obv", "vwap", "adx", "stochastic"
      ])).describe("List of technical indicators to calculate"),
      period: z.number().optional().default(14).describe("Lookback period in days"),
    }),
  }
);

/**
 * Options Flow Tool - Analyzes options activity
 */
export const optionsFlowTool = tool(
  async ({ symbol, daysBack }) => {
    // This would integrate with an options data provider
    // Mock data structure for now
    
    return JSON.stringify({
      symbol,
      analysis_period: `${daysBack} days`,
      timestamp: new Date().toISOString(),
      summary: {
        call_volume: Math.floor(Math.random() * 100000),
        put_volume: Math.floor(Math.random() * 80000),
        call_put_ratio: (Math.random() * 0.5 + 0.8).toFixed(2),
        unusual_activity: Math.random() > 0.7,
        max_pain: Math.floor(Math.random() * 50 + 100),
        implied_volatility: (Math.random() * 30 + 20).toFixed(1) + "%",
      },
      top_strikes: [
        { strike: 150, type: "call", volume: 5000, openInterest: 12000 },
        { strike: 145, type: "put", volume: 3500, openInterest: 8500 },
        { strike: 155, type: "call", volume: 2800, openInterest: 6000 },
      ],
      sentiment: Math.random() > 0.5 ? "bullish" : "bearish",
    }, null, 2);
  },
  {
    name: "options_flow",
    description: "Analyze options flow and activity for a stock. Shows call/put ratios, unusual activity, and sentiment.",
    schema: z.object({
      symbol: z.string().describe("Stock symbol"),
      daysBack: z.number().optional().default(7).describe("Number of days to analyze"),
    }),
  }
);

/**
 * Screener Tool - Screen stocks based on criteria
 */
export const screenerTool = tool(
  async ({ criteria, limit }) => {
    // This would query a database or API for real screening
    // Mock results for now
    
    const mockStocks = [
      { symbol: "AAPL", name: "Apple Inc.", pe: 28.5, marketCap: "2.8T", sector: "Technology" },
      { symbol: "MSFT", name: "Microsoft Corp.", pe: 32.1, marketCap: "2.5T", sector: "Technology" },
      { symbol: "GOOGL", name: "Alphabet Inc.", pe: 24.3, marketCap: "1.8T", sector: "Technology" },
      { symbol: "AMZN", name: "Amazon.com Inc.", pe: 45.2, marketCap: "1.5T", sector: "Consumer Cyclical" },
      { symbol: "NVDA", name: "NVIDIA Corp.", pe: 65.8, marketCap: "1.2T", sector: "Technology" },
    ];

    return JSON.stringify({
      criteria,
      timestamp: new Date().toISOString(),
      results_count: Math.min(limit, mockStocks.length),
      results: mockStocks.slice(0, limit),
    }, null, 2);
  },
  {
    name: "stock_screener",
    description: "Screen stocks based on fundamental criteria like P/E ratio, market cap, sector, etc.",
    schema: z.object({
      criteria: z.object({
        peMax: z.number().optional().describe("Maximum P/E ratio"),
        peMin: z.number().optional().describe("Minimum P/E ratio"),
        marketCapMin: z.string().optional().describe("Minimum market cap (e.g., '10B')"),
        sector: z.string().optional().describe("Sector filter"),
        dividendYieldMin: z.number().optional().describe("Minimum dividend yield %"),
      }).describe("Screening criteria"),
      limit: z.number().optional().default(10).describe("Maximum results to return"),
    }),
  }
);

/**
 * Backtest Tool - Simple backtesting framework
 */
export const backtestTool = tool(
  async ({ symbol, strategy, startDate, endDate, initialCapital }) => {
    // This would run actual backtesting with historical data
    // Mock results for now
    
    const trades = Math.floor(Math.random() * 50) + 10;
    const winRate = Math.random() * 0.3 + 0.4;
    const avgReturn = Math.random() * 0.02 + 0.005;
    
    return JSON.stringify({
      symbol,
      strategy,
      period: { start: startDate, end: endDate },
      initial_capital: initialCapital,
      final_capital: Math.floor(initialCapital * (1 + avgReturn * trades * winRate)),
      results: {
        total_trades: trades,
        winning_trades: Math.floor(trades * winRate),
        losing_trades: Math.floor(trades * (1 - winRate)),
        win_rate: (winRate * 100).toFixed(1) + "%",
        total_return: ((avgReturn * trades * winRate) * 100).toFixed(2) + "%",
        max_drawdown: (Math.random() * 15 + 5).toFixed(2) + "%",
        sharpe_ratio: (Math.random() * 1.5 + 0.5).toFixed(2),
      },
      equity_curve: "Plotly JSON would be generated here for interactive charts",
      timestamp: new Date().toISOString(),
    }, null, 2);
  },
  {
    name: "backtest",
    description: "Backtest a trading strategy on historical data. Returns performance metrics.",
    schema: z.object({
      symbol: z.string().describe("Stock symbol to backtest"),
      strategy: z.enum([
        "sma_crossover",
        "rsi_reversal",
        "macd_signal",
        "bollinger_bounce",
        "momentum"
      ]).describe("Trading strategy to test"),
      startDate: z.string().describe("Start date (YYYY-MM-DD)"),
      endDate: z.string().describe("End date (YYYY-MM-DD)"),
      initialCapital: z.number().optional().default(10000).describe("Starting capital"),
    }),
  }
);

/**
 * Chart Generation Tool - Creates Plotly chart specs for interactive visualization
 */
export const chartTool = tool(
  async ({ chartType, data, title, options }) => {
    // Generate Plotly chart specification with dark theme
    const chartSpec: Record<string, any> = {
      data: [],
      layout: {
        title: {
          text: title,
          font: { size: 16, color: '#f1f5f9' },
        },
        template: "plotly_dark",
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(15,23,42,1)",
        font: { 
          color: "#94a3b8",
          family: "Inter, system-ui, sans-serif",
        },
        showlegend: true,
        legend: {
          orientation: "h",
          y: -0.15,
          x: 0.5,
          xanchor: "center",
        },
        margin: { t: 60, r: 20, b: 60, l: 60 },
        xaxis: {
          gridcolor: "rgba(148, 163, 184, 0.1)",
          zerolinecolor: "rgba(148, 163, 184, 0.2)",
        },
        yaxis: {
          gridcolor: "rgba(148, 163, 184, 0.1)",
          zerolinecolor: "rgba(148, 163, 184, 0.2)",
        },
        ...options,
      },
      config: {
        responsive: true,
        displayModeBar: 'hover' as const,
        displaylogo: false,
      },
    };

    // Color palette for charts
    const colors = {
      primary: "#3b82f6",
      secondary: "#8b5cf6",
      success: "#22c55e",
      danger: "#ef4444",
      warning: "#f59e0b",
      info: "#06b6d4",
    };

    switch (chartType) {
      case "line":
        chartSpec.data.push({
          type: "scatter",
          mode: "lines+markers",
          x: data.x || [],
          y: data.y || [],
          line: { color: colors.primary, width: 2 },
          marker: { size: 4 },
          name: data.name || "Series",
          hovertemplate: '%{x}<br>%{y}<extra></extra>',
        });
        break;

      case "candlestick":
        chartSpec.data.push({
          type: "candlestick",
          x: data.dates || [],
          open: data.open || [],
          high: data.high || [],
          low: data.low || [],
          close: data.close || [],
          increasing: { 
            line: { color: colors.success, width: 1 },
            fillcolor: colors.success,
          },
          decreasing: { 
            line: { color: colors.danger, width: 1 },
            fillcolor: colors.danger,
          },
          whiskerwidth: 0,
          hoverinfo: 'x:text',
        });
        // Add rangeslider for candlestick
        chartSpec.layout.xaxis = {
          ...chartSpec.layout.xaxis,
          rangeslider: { visible: true, bgcolor: 'rgba(0,0,0,0.2)' },
        };
        break;

      case "bar":
        chartSpec.data.push({
          type: "bar",
          x: data.x || [],
          y: data.y || [],
          marker: { 
            color: colors.primary,
            line: { color: 'rgba(59, 130, 246, 0.8)', width: 1 },
          },
          name: data.name || "Values",
          hovertemplate: '%{x}: %{y}<extra></extra>',
        });
        break;

      case "scatter":
        chartSpec.data.push({
          type: "scatter",
          mode: "markers",
          x: data.x || [],
          y: data.y || [],
          marker: { 
            color: colors.secondary,
            size: 8,
            line: { color: 'rgba(139, 92, 246, 0.5)', width: 1 },
          },
          name: data.name || "Points",
          hovertemplate: '(%{x}, %{y})<extra></extra>',
        });
        break;

      case "pie":
        chartSpec.data.push({
          type: "pie",
          labels: data.labels || data.x || [],
          values: data.values || data.y || [],
          hole: 0.4,
          marker: {
            colors: [colors.primary, colors.secondary, colors.success, colors.danger, colors.warning, colors.info],
          },
          textinfo: 'percent+label',
          textposition: 'outside',
          hovertemplate: '%{label}: %{value} (%{percent})<extra></extra>',
        });
        // Remove grid for pie charts
        delete chartSpec.layout.xaxis;
        delete chartSpec.layout.yaxis;
        break;

      case "area":
        chartSpec.data.push({
          type: "scatter",
          mode: "lines",
          x: data.x || [],
          y: data.y || [],
          fill: "tozeroy",
          fillcolor: "rgba(59, 130, 246, 0.2)",
          line: { color: colors.primary, width: 2 },
          name: data.name || "Area",
          hovertemplate: '%{x}<br>%{y}<extra></extra>',
        });
        break;

      case "multi_line":
        // Support for multiple series
        if (data.series && Array.isArray(data.series)) {
          const seriesColors = [colors.primary, colors.secondary, colors.success, colors.danger, colors.warning];
          data.series.forEach((series: any, idx: number) => {
            chartSpec.data.push({
              type: "scatter",
              mode: "lines",
              x: series.x || data.x || [],
              y: series.y || [],
              line: { color: seriesColors[idx % seriesColors.length], width: 2 },
              name: series.name || `Series ${idx + 1}`,
              hovertemplate: '%{x}<br>%{y}<extra></extra>',
            });
          });
        }
        break;

      case "indicator_overlay":
        // For showing price + indicators (RSI, MACD, etc.)
        // Main price line
        chartSpec.data.push({
          type: "scatter",
          mode: "lines",
          x: data.x || [],
          y: data.y || [],
          line: { color: colors.primary, width: 2 },
          name: data.name || "Price",
          yaxis: 'y',
        });
        // Add indicator as secondary series
        if (data.indicator_y) {
          chartSpec.data.push({
            type: "scatter",
            mode: "lines",
            x: data.x || [],
            y: data.indicator_y,
            line: { color: colors.warning, width: 1.5, dash: 'dash' },
            name: data.indicator_name || "Indicator",
            yaxis: 'y2',
          });
          // Add secondary y-axis
          chartSpec.layout.yaxis2 = {
            overlaying: 'y',
            side: 'right',
            gridcolor: "rgba(148, 163, 184, 0.1)",
            zerolinecolor: "rgba(148, 163, 184, 0.2)",
          };
        }
        break;
    }

    return JSON.stringify(chartSpec, null, 2);
  },
  {
    name: "generate_chart",
    description: "Generate a Plotly chart specification for interactive visualization. Returns JSON that will be rendered as an interactive chart. Supports: line, candlestick, bar, scatter, pie, area, multi_line, indicator_overlay.",
    schema: z.object({
      chartType: z.enum([
        "line", 
        "candlestick", 
        "bar", 
        "scatter", 
        "pie", 
        "area", 
        "multi_line", 
        "indicator_overlay"
      ]).describe("Type of chart to generate"),
      data: z.object({
        x: z.array(z.any()).optional().describe("X-axis values (dates, categories, etc.)"),
        y: z.array(z.any()).optional().describe("Y-axis values (prices, volumes, etc.)"),
        dates: z.array(z.string()).optional().describe("Date array for candlestick charts"),
        open: z.array(z.number()).optional().describe("Open prices for candlestick"),
        high: z.array(z.number()).optional().describe("High prices for candlestick"),
        low: z.array(z.number()).optional().describe("Low prices for candlestick"),
        close: z.array(z.number()).optional().describe("Close prices for candlestick"),
        name: z.string().optional().describe("Series name for legend"),
        labels: z.array(z.string()).optional().describe("Labels for pie chart"),
        values: z.array(z.number()).optional().describe("Values for pie chart"),
        series: z.array(z.object({
          x: z.array(z.any()).optional(),
          y: z.array(z.any()).optional(),
          name: z.string().optional(),
        })).optional().describe("Multiple series for multi_line chart"),
        indicator_y: z.array(z.number()).optional().describe("Indicator values for overlay"),
        indicator_name: z.string().optional().describe("Name of the indicator"),
      }).describe("Chart data - provide appropriate fields based on chartType"),
      title: z.string().describe("Chart title"),
      options: z.record(z.any()).optional().describe("Additional Plotly layout options (xaxis title, yaxis title, etc.)"),
    }),
  }
);

/**
 * Export all trading tools
 */
export const tradingTools = [
  marketDataTool,
  technicalAnalysisTool,
  optionsFlowTool,
  screenerTool,
  backtestTool,
  chartTool,
];
