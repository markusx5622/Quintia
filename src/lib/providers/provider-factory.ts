import { LLMProvider } from "../types";
import { MockProvider } from "./mock-provider";
import { OpenAIProvider } from "./openai-provider";
import { AnthropicProvider } from "./anthropic-provider";

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
  
  throw new Error(`Unknown LLM provider: ${providerId}`);
}
