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
 * Chart Generation Tool - Creates Plotly chart specs
 */
export const chartTool = tool(
  async ({ chartType, data, title, options }) => {
    // Generate Plotly chart specification
    const chartSpec: Record<string, any> = {
      data: [],
      layout: {
        title: title,
        template: "plotly_dark",
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { color: "#fff" },
        ...options,
      },
    };

    switch (chartType) {
      case "line":
        chartSpec.data.push({
          type: "scatter",
          mode: "lines",
          x: data.x || [],
          y: data.y || [],
          line: { color: "#3b82f6", width: 2 },
          name: data.name || "Series",
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
          increasing: { line: { color: "#22c55e" } },
          decreasing: { line: { color: "#ef4444" } },
        });
        chartSpec.layout.xaxis = { rangeslider: { visible: false } };
        break;
      case "bar":
        chartSpec.data.push({
          type: "bar",
          x: data.x || [],
          y: data.y || [],
          marker: { color: "#3b82f6" },
        });
        break;
    }

    return JSON.stringify(chartSpec, null, 2);
  },
  {
    name: "generate_chart",
    description: "Generate a Plotly chart specification for interactive visualization",
    schema: z.object({
      chartType: z.enum(["line", "candlestick", "bar", "scatter", "pie"]).describe("Type of chart"),
      data: z.object({
        x: z.array(z.any()).optional(),
        y: z.array(z.any()).optional(),
        dates: z.array(z.string()).optional(),
        open: z.array(z.number()).optional(),
        high: z.array(z.number()).optional(),
        low: z.array(z.number()).optional(),
        close: z.array(z.number()).optional(),
        name: z.string().optional(),
      }).describe("Chart data"),
      title: z.string().describe("Chart title"),
      options: z.record(z.any()).optional().describe("Additional layout options"),
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
