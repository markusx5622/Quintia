export interface LLMCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  responseFormat: "json"; // Agents always expect JSON
  maxTokens?: number;
  temperature?: number;
}

export interface LLMCompletionResponse {
  content: string; // Raw text response
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  providerId: string;
  modelId: string;
  latencyMs: number;
}

export interface LLMProvider {
  readonly providerId: string; // "mock", "openai", "anthropic"

  complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse>;
}
