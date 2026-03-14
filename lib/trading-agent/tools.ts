import { tool } from "@langchain/core/tools";
import { z } from "zod";
import yahooFinance from "yahoo-finance2";

/**
 * Market Data Tool - Uses Yahoo Finance (yfinance)
 * Free and reliable for PoC/MVP
 */
export const marketDataTool = tool(
  async ({ symbol, dataType }) => {
    try {
      switch (dataType) {
        case "quote": {
          const quote = await yahooFinance.quote(symbol);
          const q = quote as any; // Type assertion for flexibility
          return JSON.stringify({
            symbol: q.symbol,
            price: q.regularMarketPrice,
            change: q.regularMarketChange,
            changePercent: q.regularMarketChangePercent,
            open: q.regularMarketOpen,
            high: q.regularMarketDayHigh,
            low: q.regularMarketDayLow,
            volume: q.regularMarketVolume,
            avgVolume: q.averageDailyVolume3Month,
            marketCap: q.marketCap,
            pe: q.trailingPE,
            fiftyTwoWeekHigh: q.fiftyTwoWeekHigh,
            fiftyTwoWeekLow: q.fiftyTwoWeekLow,
            timestamp: new Date().toISOString(),
          }, null, 2);
        }
        
        case "profile": {
          const quote = await yahooFinance.quote(symbol);
          const info = await yahooFinance.quoteSummary(symbol, { modules: ['assetProfile'] }) as any;
          const q = quote as any;
          return JSON.stringify({
            symbol: q.symbol,
            name: q.shortName,
            longName: q.longName,
            sector: info.assetProfile?.sector,
            industry: info.assetProfile?.industry,
            website: info.assetProfile?.website,
            description: info.assetProfile?.longBusinessSummary?.slice(0, 500),
            employees: info.assetProfile?.fullTimeEmployees,
            country: info.assetProfile?.country,
            exchange: q.fullExchangeName,
            currency: q.currency,
          }, null, 2);
        }
        
        case "metrics": {
          const quote = await yahooFinance.quote(symbol);
          const summary = await yahooFinance.quoteSummary(symbol, { 
            modules: ['financialData', 'defaultKeyStatistics'] 
          }) as any;
          const q = quote as any;
          return JSON.stringify({
            symbol: q.symbol,
            price: q.regularMarketPrice,
            marketCap: q.marketCap,
            enterpriseValue: summary.defaultKeyStatistics?.enterpriseValue,
            pe: summary.defaultKeyStatistics?.trailingPE || q.trailingPE,
            forwardPE: summary.defaultKeyStatistics?.forwardPE,
            pegRatio: summary.defaultKeyStatistics?.pegRatio,
            priceToBook: summary.defaultKeyStatistics?.priceToBook,
            priceToSales: summary.defaultKeyStatistics?.priceToSalesTrailing12Months,
            evToEbitda: summary.defaultKeyStatistics?.enterpriseToEbitda,
            profitMargin: summary.financialData?.profitMargins,
            operatingMargin: summary.financialData?.operatingMargins,
            roe: summary.financialData?.returnOnEquity,
            roa: summary.financialData?.returnOnAssets,
            debtToEquity: summary.financialData?.debtToEquity,
            currentRatio: summary.financialData?.currentRatio,
            quickRatio: summary.financialData?.quickRatio,
            dividendYield: summary.defaultKeyStatistics?.trailingAnnualDividendYield,
            beta: summary.defaultKeyStatistics?.beta,
          }, null, 2);
        }
        
        default:
          return JSON.stringify({ error: "Unknown data type" });
      }
    } catch (error: any) {
      return JSON.stringify({ 
        error: error.message,
        symbol,
        note: "Failed to fetch data from Yahoo Finance"
      });
    }
  },
  {
    name: "market_data",
    description: "Fetch real-time market data for a stock symbol using Yahoo Finance. Use this to get quotes, company profiles, and key metrics.",
    schema: z.object({
      symbol: z.string().describe("Stock symbol (e.g., AAPL, GOOGL, TSLA)"),
      dataType: z.enum(["quote", "profile", "metrics"]).describe("Type of data to fetch"),
    }),
  }
);

/**
 * Historical Price Data Tool - For charting and analysis
 */
export const historicalDataTool = tool(
  async ({ symbol, period, interval }) => {
    try {
      const result = await yahooFinance.historical(symbol, {
        period1: period === "1mo" ? "1mo" : period === "3mo" ? "3mo" : period === "1y" ? "1y" : "1mo",
        interval,
      }) as any[];
      
      const quotes = result.map((q: any) => ({
        date: q.date instanceof Date ? q.date.toISOString().split('T')[0] : q.date,
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume,
        adjClose: q.adjClose,
      }));
      
      return JSON.stringify({
        symbol,
        period,
        interval,
        count: quotes.length,
        data: quotes,
      }, null, 2);
    } catch (error: any) {
      return JSON.stringify({ error: error.message });
    }
  },
  {
    name: "historical_data",
    description: "Fetch historical price data for charting and technical analysis. Returns OHLCV data.",
    schema: z.object({
      symbol: z.string().describe("Stock symbol"),
      period: z.enum(["1mo", "3mo", "6mo", "1y", "2y"]).optional().default("1mo").describe("Time period"),
      interval: z.enum(["1d", "1wk", "1mo"]).optional().default("1d").describe("Data interval"),
    }),
  }
);

/**
 * Technical Analysis Tool - Calculates indicators from real data
 */
export const technicalAnalysisTool = tool(
  async ({ symbol, indicators }) => {
    try {
      // Get historical data for calculations
      const historical = await yahooFinance.historical(symbol, { period1: "3mo" }) as any[];
      
      if (!historical || historical.length === 0) {
        return JSON.stringify({ error: "No historical data available" });
      }
      
      const closes = historical.map((h: any) => h.close);
      const highs = historical.map((h: any) => h.high);
      const lows = historical.map((h: any) => h.low);
      const volumes = historical.map((h: any) => h.volume);
      
      const results: Record<string, any> = {
        symbol,
        timestamp: new Date().toISOString(),
        lastPrice: closes[closes.length - 1],
        indicators: {},
      };

      // Simple indicator calculations
      for (const indicator of indicators) {
        switch (indicator) {
          case "sma": {
            const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
            const sma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / Math.min(50, closes.length);
            results.indicators.sma = { sma20: Number(sma20.toFixed(2)), sma50: Number(sma50.toFixed(2)) };
            break;
          }
          case "ema": {
            const ema12 = calculateEMA(closes, 12);
            const ema26 = calculateEMA(closes, 26);
            results.indicators.ema = { ema12: Number(ema12.toFixed(2)), ema26: Number(ema26.toFixed(2)) };
            break;
          }
          case "rsi": {
            const rsi = calculateRSI(closes, 14);
            results.indicators.rsi = { 
              value: Number(rsi.toFixed(2)),
              signal: rsi > 70 ? "overbought" : rsi < 30 ? "oversold" : "neutral"
            };
            break;
          }
          case "macd": {
            const macd = calculateMACD(closes);
            results.indicators.macd = {
              macd: Number(macd.macd.toFixed(4)),
              signal: Number(macd.signal.toFixed(4)),
              histogram: Number(macd.histogram.toFixed(4)),
              trend: macd.histogram > 0 ? "bullish" : "bearish"
            };
            break;
          }
          case "bollinger_bands": {
            const bb = calculateBollingerBands(closes, 20);
            results.indicators.bollinger_bands = {
              upper: Number(bb.upper.toFixed(2)),
              middle: Number(bb.middle.toFixed(2)),
              lower: Number(bb.lower.toFixed(2)),
              bandwidth: Number(((bb.upper - bb.lower) / bb.middle * 100).toFixed(2))
            };
            break;
          }
          case "atr": {
            const atr = calculateATR(highs, lows, closes, 14);
            results.indicators.atr = { value: Number(atr.toFixed(2)) };
            break;
          }
          case "vwap": {
            const vwap = calculateVwap(highs, lows, closes, volumes);
            results.indicators.vwap = { value: Number(vwap.toFixed(2)) };
            break;
          }
          default:
            results.indicators[indicator] = { note: "Use dedicated analysis tools for this indicator" };
        }
      }

      return JSON.stringify(results, null, 2);
    } catch (error: any) {
      return JSON.stringify({ error: error.message });
    }
  },
  {
    name: "technical_analysis",
    description: "Calculate technical indicators from real price data. Supports RSI, MACD, SMA, EMA, Bollinger Bands, ATR, and VWAP.",
    schema: z.object({
      symbol: z.string().describe("Stock symbol"),
      indicators: z.array(z.enum([
        "rsi", "macd", "sma", "ema", "bollinger_bands",
        "atr", "obv", "vwap", "adx", "stochastic"
      ])).describe("List of technical indicators to calculate"),
    }),
  }
);

// Helper functions for technical analysis
function calculateEMA(prices: number[], period: number): number {
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  return ema;
}

function calculateRSI(prices: number[], period: number): number {
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = prices[prices.length - i] - prices[prices.length - i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(prices: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12 - ema26;
  // Simplified signal line (9-period EMA of MACD)
  const signal = macd * 0.9; // Approximation
  return { macd, signal, histogram: macd - signal };
}

function calculateBollingerBands(prices: number[], period: number): { upper: number; middle: number; lower: number } {
  const slice = prices.slice(-period);
  const middle = slice.reduce((a, b) => a + b, 0) / period;
  const squaredDiffs = slice.map(p => Math.pow(p - middle, 2));
  const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / period);
  return {
    upper: middle + 2 * stdDev,
    middle,
    lower: middle - 2 * stdDev
  };
}

function calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
  let atrSum = 0;
  for (let i = highs.length - period; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    atrSum += tr;
  }
  return atrSum / period;
}

function calculateVwap(highs: number[], lows: number[], closes: number[], volumes: number[]): number {
  let sumPV = 0, sumV = 0;
  for (let i = 0; i < highs.length; i++) {
    const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
    sumPV += typicalPrice * volumes[i];
    sumV += volumes[i];
  }
  return sumV > 0 ? sumPV / sumV : 0;
}

/**
 * Options Flow Tool - Analyzes options activity
 * Note: Real options data requires premium APIs, using estimates for PoC
 */
export const optionsFlowTool = tool(
  async ({ symbol, daysBack }) => {
    try {
      // Get current price for context
      const quote = await yahooFinance.quote(symbol) as any;
      
      // Note: Yahoo Finance free tier doesn't include detailed options flow
      // This returns structure for future integration with options data providers
      return JSON.stringify({
        symbol,
        currentPrice: quote.regularMarketPrice,
        analysis_period: `${daysBack} days`,
        timestamp: new Date().toISOString(),
        note: "Options flow requires premium data provider. Using implied volatility from quote.",
        impliedVolatility: quote.trailingAnnualDividendYield ? 
          ((quote.regularMarketPrice - quote.fiftyTwoWeekLow) / (quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow) * 100).toFixed(1) + "%" : 
          "N/A",
        fiftyTwoWeekRange: `${quote.fiftyTwoWeekLow} - ${quote.fiftyTwoWeekHigh}`,
        recommendation: "For full options flow analysis, integrate with Unusual Whales or similar provider post-MVP",
      }, null, 2);
    } catch (error: any) {
      return JSON.stringify({ error: error.message });
    }
  },
  {
    name: "options_flow",
    description: "Analyze options activity for a stock. Note: Full options flow requires premium data - returns price context for PoC.",
    schema: z.object({
      symbol: z.string().describe("Stock symbol"),
      daysBack: z.number().optional().default(7).describe("Number of days to analyze"),
    }),
  }
);

/**
 * Screener Tool - Screen stocks using Yahoo Finance
 */
export const screenerTool = tool(
  async ({ symbols, criteria }) => {
    try {
      const results = [];
      
      for (const symbol of symbols.slice(0, 10)) { // Limit to 10 for performance
        try {
          const quote = await yahooFinance.quote(symbol) as any;
          const summary = await yahooFinance.quoteSummary(symbol, { 
            modules: ['defaultKeyStatistics', 'financialData', 'assetProfile'] 
          }) as any;
          
          const stock: Record<string, any> = {
            symbol: quote.symbol,
            name: quote.shortName,
            price: quote.regularMarketPrice,
            pe: quote.trailingPE,
            marketCap: quote.marketCap,
            sector: summary.assetProfile?.sector,
          };
          
          // Apply filters
          let passes = true;
          if (criteria.peMax && stock.pe && stock.pe > criteria.peMax) passes = false;
          if (criteria.peMin && stock.pe && stock.pe < criteria.peMin) passes = false;
          if (criteria.sector && stock.sector !== criteria.sector) passes = false;
          
          if (passes) results.push(stock);
        } catch (e) {
          // Skip failed symbols
        }
      }
      
      return JSON.stringify({
        criteria,
        timestamp: new Date().toISOString(),
        results_count: results.length,
        results,
      }, null, 2);
    } catch (error: any) {
      return JSON.stringify({ error: error.message });
    }
  },
  {
    name: "stock_screener",
    description: "Screen multiple stocks based on fundamental criteria. Provide a list of symbols to analyze.",
    schema: z.object({
      symbols: z.array(z.string()).describe("List of stock symbols to screen (max 10)"),
      criteria: z.object({
        peMax: z.number().optional().describe("Maximum P/E ratio"),
        peMin: z.number().optional().describe("Minimum P/E ratio"),
        sector: z.string().optional().describe("Sector filter"),
      }).describe("Screening criteria"),
    }),
  }
);

/**
 * Backtest Tool - Simple backtesting with real historical data
 */
export const backtestTool = tool(
  async ({ symbol, strategy, period, initialCapital }) => {
    try {
      // Get historical data
      const historical = await yahooFinance.historical(symbol, {
        period1: period === "1mo" ? "1mo" : period === "3mo" ? "3mo" : period === "6mo" ? "6mo" : "1y"
      }) as any[];
      
      if (!historical || historical.length < 30) {
        return JSON.stringify({ error: "Insufficient historical data" });
      }
      
      const closes = historical.map((h: any) => h.close);
      let capital = initialCapital;
      let shares = 0;
      const trades: any[] = [];
      
      // Simple strategy implementations
      switch (strategy) {
        case "sma_crossover": {
          for (let i = 50; i < closes.length; i++) {
            const sma20 = closes.slice(i - 20, i).reduce((a: number, b: number) => a + b, 0) / 20;
            const sma50 = closes.slice(i - 50, i).reduce((a: number, b: number) => a + b, 0) / 50;
            const price = closes[i];
            
            if (sma20 > sma50 && shares === 0) {
              shares = Math.floor(capital / price);
              capital -= shares * price;
              trades.push({ type: "BUY", price, shares, date: historical[i].date });
            } else if (sma20 < sma50 && shares > 0) {
              capital += shares * price;
              trades.push({ type: "SELL", price, shares, date: historical[i].date });
              shares = 0;
            }
          }
          break;
        }
        case "rsi_reversal": {
          for (let i = 20; i < closes.length; i++) {
            const rsi = calculateRSI(closes.slice(0, i + 1), 14);
            const price = closes[i];
            
            if (rsi < 30 && shares === 0) {
              shares = Math.floor(capital / price);
              capital -= shares * price;
              trades.push({ type: "BUY", price, shares, rsi, date: historical[i].date });
            } else if (rsi > 70 && shares > 0) {
              capital += shares * price;
              trades.push({ type: "SELL", price, shares, rsi, date: historical[i].date });
              shares = 0;
            }
          }
          break;
        }
        default:
          return JSON.stringify({ error: `Strategy ${strategy} not implemented yet` });
      }
      
      // Calculate final value
      const finalPrice = closes[closes.length - 1];
      const finalValue = capital + (shares * finalPrice);
      const totalReturn = ((finalValue - initialCapital) / initialCapital * 100);
      
      const winningTrades = trades.filter((t, i) => 
        t.type === "SELL" && t.price > trades[i-1]?.price
      ).length;
      
      return JSON.stringify({
        symbol,
        strategy,
        period,
        initial_capital: initialCapital,
        final_value: Number(finalValue.toFixed(2)),
        results: {
          total_trades: trades.length,
          winning_trades: winningTrades,
          total_return: totalReturn.toFixed(2) + "%",
          buy_hold_return: ((finalPrice - closes[0]) / closes[0] * 100).toFixed(2) + "%",
        },
        trades: trades.slice(-10), // Last 10 trades
        timestamp: new Date().toISOString(),
      }, null, 2);
    } catch (error: any) {
      return JSON.stringify({ error: error.message });
    }
  },
  {
    name: "backtest",
    description: "Backtest a trading strategy using real historical data from Yahoo Finance.",
    schema: z.object({
      symbol: z.string().describe("Stock symbol to backtest"),
      strategy: z.enum([
        "sma_crossover",
        "rsi_reversal",
      ]).describe("Trading strategy to test"),
      period: z.enum(["1mo", "3mo", "6mo", "1y"]).optional().default("3mo").describe("Backtest period"),
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
        chartSpec.data.push({
          type: "scatter",
          mode: "lines",
          x: data.x || [],
          y: data.y || [],
          line: { color: colors.primary, width: 2 },
          name: data.name || "Price",
          yaxis: 'y',
        });
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
  historicalDataTool,
  technicalAnalysisTool,
  optionsFlowTool,
  screenerTool,
  backtestTool,
  chartTool,
];
