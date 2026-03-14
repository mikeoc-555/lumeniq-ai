import { createTradingAgent } from "@/lib/trading-agent/agent";
import { handleAPIError, createRateLimitResponse } from "@/lib/api-errors";
import { Duration } from "@/lib/duration";
import ratelimit from "@/lib/ratelimit";

export const maxDuration = 300;

const rateLimitMaxRequests = process.env.RATE_LIMIT_MAX_REQUESTS
  ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS)
  : 20;
const ratelimitWindow = process.env.RATE_LIMIT_WINDOW
  ? (process.env.RATE_LIMIT_WINDOW as Duration)
  : "1d";

interface TradingAgentRequest {
  messages: Array<{ role: string; content: string }>;
  userID?: string;
  model?: string;
  apiKey?: string;
}

/**
 * Parse chart specs from tool call results
 */
function extractChartFromToolCall(toolCall: any): { spec: any; title: string } | null {
  if (toolCall.name !== "generate_chart") return null;
  
  try {
    const args = typeof toolCall.args === 'string' ? JSON.parse(toolCall.args) : toolCall.args;
    const result = typeof toolCall.result === 'string' ? JSON.parse(toolCall.result) : toolCall.result;
    
    // The result contains the Plotly spec
    if (result && result.data && Array.isArray(result.data)) {
      return {
        spec: result,
        title: args.title || "Chart",
      };
    }
    
    // Sometimes the result is a JSON string
    if (typeof toolCall.result === 'string') {
      const parsed = JSON.parse(toolCall.result);
      if (parsed.data && Array.isArray(parsed.data)) {
        return {
          spec: parsed,
          title: args.title || "Chart",
        };
      }
    }
  } catch (e) {
    console.error("Error parsing chart from tool call:", e);
  }
  
  return null;
}

export async function POST(req: Request) {
  const {
    messages,
    userID,
    model,
    apiKey,
  }: TradingAgentRequest = await req.json();

  const limit = !apiKey
    ? await ratelimit(
        req.headers.get("x-forwarded-for"),
        rateLimitMaxRequests,
        ratelimitWindow,
      )
    : false;

  if (limit) {
    return createRateLimitResponse(limit);
  }

  console.log("Trading Agent Request:", {
    userID,
    model,
    messageCount: messages.length,
  });

  try {
    // Create the trading agent
    const agent = createTradingAgent({
      modelName: model,
      apiKey: apiKey || process.env.OPENROUTER_API_KEY,
    });

    // Convert messages to LangGraph format
    const langGraphMessages = messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    // Stream the response - use any to avoid complex type inference
    const stream = await (agent as any).stream({
      messages: langGraphMessages,
    });

    // Create a TransformStream for SSE
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            // Handle different chunk types from DeepAgents
            if (chunk.content) {
              // Check if content contains a chart JSON
              let contentToSend = chunk.content;
              
              // Try to detect inline chart specs in the content
              try {
                const chartMatch = contentToSend.match(/```chart\n([\s\S]*?)\n```/);
                if (chartMatch) {
                  const chartSpec = JSON.parse(chartMatch[1]);
                  const event = {
                    type: "chart",
                    spec: chartSpec,
                    title: chartSpec.layout?.title?.text || chartSpec.layout?.title || "Chart",
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
                  // Remove the chart block from content
                  contentToSend = contentToSend.replace(chartMatch[0], "").trim();
                }
              } catch (e) {
                // Not a valid chart, continue with normal content
              }
              
              if (contentToSend) {
                const event = {
                  type: "content",
                  content: contentToSend,
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
              }
            }
            
            if (chunk.tool_calls) {
              // Check for chart tool calls
              for (const toolCall of chunk.tool_calls) {
                if (toolCall.name === "generate_chart") {
                  const chartData = extractChartFromToolCall(toolCall);
                  if (chartData) {
                    const event = {
                      type: "chart",
                      spec: chartData.spec,
                      title: chartData.title,
                    };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
                  }
                }
              }
              
              const event = {
                type: "tool_call",
                tool_calls: chunk.tool_calls,
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            }
            
            if (chunk.todos) {
              const event = {
                type: "todos",
                todos: chunk.todos,
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            }
          }
          
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    return handleAPIError(error, { hasOwnApiKey: !!apiKey });
  }
}
