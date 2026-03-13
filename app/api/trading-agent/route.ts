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

    // Stream the response
    const stream = await agent.stream({
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
              const event = {
                type: "content",
                content: chunk.content,
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
            }
            
            if (chunk.tool_calls) {
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
