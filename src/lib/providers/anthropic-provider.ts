import Anthropic from "@anthropic-ai/sdk";
import { LLMCompletionRequest, LLMCompletionResponse, LLMProvider } from "../types";
import { QuintiaProviderError } from "./errors";

export class AnthropicProvider implements LLMProvider {
  readonly providerId = "anthropic";
  private client: Anthropic;
  private readonly defaultModel = "claude-3-5-sonnet-20241022";

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is missing from environment.");
    }
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const startTime = Date.now();

    // Anthropic does not have a native response_format=json_object switch.
    // However, instructing it via system prompt + pre-filling assistant '{"' forces JSON reliably.
    // For this generic interface we will simply inject a robust system instruction if JSON is selected.
    const systemInstruction = request.responseFormat === "json" 
      ? request.systemPrompt + "\n\nIMPORTANT: You must respond ONLY with valid JSON. Do not use markdown blocks like ```json. Your response must be parsed directly with JSON.parse()."
      : request.systemPrompt;

    try {
      const response = await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: request.maxTokens ?? 8192,
        temperature: request.temperature ?? 0.1,
        system: systemInstruction,
        messages: [
          { role: "user", content: request.userPrompt }
        ]
      }, {
        timeout: 30000
      });

      const textBlock = response.content.find(c => c.type === "text");
      const content = textBlock && textBlock.type === "text" ? textBlock.text : "";
      
      return {
        content,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
        providerId: this.providerId,
        modelId: response.model,
        latencyMs: Date.now() - startTime
      };

    } catch (error: any) {
      if (error instanceof Anthropic.APIConnectionError || error instanceof Anthropic.APIConnectionTimeoutError) {
        throw new QuintiaProviderError("TIMEOUT", error.message, error);
      }
      if (error instanceof Anthropic.RateLimitError) {
        throw new QuintiaProviderError("RATE_LIMIT", error.message, error);
      }
      if (error instanceof Anthropic.AuthenticationError) {
        throw new QuintiaProviderError("AUTH_ERROR", error.message, error);
      }
      if (error instanceof Anthropic.APIError && error.status && error.status >= 500) {
        throw new QuintiaProviderError("SERVER_ERROR", error.message, error);
      }
      if (error instanceof Anthropic.BadRequestError) {
        throw new QuintiaProviderError("BAD_REQUEST", error.message, error);
      }
      
      throw new QuintiaProviderError("UNKNOWN_ERROR", error.message || "Unknown Anthropic error", error);
    }
  }
}
