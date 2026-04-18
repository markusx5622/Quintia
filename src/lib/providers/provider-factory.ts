import { LLMProvider } from "../types";
import { MockProvider } from "./mock-provider";
import { OpenAIProvider } from "./openai-provider";
import { AnthropicProvider } from "./anthropic-provider";
import { GeminiProvider } from "./gemini-provider";

export function resolveLLMProvider(): LLMProvider {
  const providerId = process.env.QUINTIA_LLM_PROVIDER || "mock";
  
  if (providerId === "mock") {
    return new MockProvider();
  }
  
  if (providerId === "openai") {
    return new OpenAIProvider();
  }
  
  if (providerId === "anthropic") {
    return new AnthropicProvider();
  }

  if (providerId === "gemini") {
    return new GeminiProvider();
  }
  
  throw new Error(`Unknown LLM provider: ${providerId}`);
}
