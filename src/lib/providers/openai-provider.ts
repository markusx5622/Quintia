import OpenAI from "openai";
import { LLMCompletionRequest, LLMCompletionResponse, LLMProvider } from "../types";
import { QuintiaProviderError } from "./errors";

export class OpenAIProvider implements LLMProvider {
  readonly providerId = "openai";
  private client: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is missing from environment.");
    }
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        temperature: request.temperature ?? 0.1,
        max_tokens: request.maxTokens,
        response_format: request.responseFormat === "json" ? { type: "json_object" } : undefined,
        messages: [
          { role: "system", content: request.systemPrompt },
          { role: "user", content: request.userPrompt }
        ]
      }, {
        timeout: 30000 // 30 sec basic timeout
      });

      const content = response.choices[0]?.message?.content || "";
      
      return {
        content,
        usage: {
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
        },
        providerId: this.providerId,
        modelId: response.model,
        latencyMs: Date.now() - startTime
      };

    } catch (error: any) {
      if (error instanceof OpenAI.APIConnectionError || error instanceof OpenAI.APIConnectionTimeoutError) {
        throw new QuintiaProviderError("TIMEOUT", error.message, error);
      }
      if (error instanceof OpenAI.RateLimitError) {
        throw new QuintiaProviderError("RATE_LIMIT", error.message, error);
      }
      if (error instanceof OpenAI.AuthenticationError) {
        throw new QuintiaProviderError("AUTH_ERROR", error.message, error);
      }
      if (error instanceof OpenAI.APIError && error.status && error.status >= 500) {
        throw new QuintiaProviderError("SERVER_ERROR", error.message, error);
      }
      if (error instanceof OpenAI.APIError && error.status === 400) {
        throw new QuintiaProviderError("BAD_REQUEST", error.message, error);
      }
      
      throw new QuintiaProviderError("UNKNOWN_ERROR", error.message || "Unknown OpenAI error", error);
    }
  }
}
