import { describe, it, expect, vi } from "vitest";
import { AgentExecutor, AgentExecutorError } from "../../services/agent-executor";
import { z } from "zod";
import * as providerFactory from "../provider-factory";
import { LLMCompletionResponse } from "../../types";
import { QuintiaProviderError } from "../errors";

describe("Provider Contract Boundaries", () => {
  it("AgentExecutor enforces Law 4 exactly with MockProvider natively", async () => {
    // This confirms the mock loop wasn't broken by the refactor
    vi.spyOn(providerFactory, "resolveLLMProvider").mockReturnValue({
      providerId: "mock",
      complete: async () => ({
        content: JSON.stringify({ roi: "123%" }), // Violating payload
        usage: { inputTokens: 10, outputTokens: 10 },
        providerId: "mock",
        modelId: "mock-model",
        latencyMs: 50
      })
    });

    const law4Schema = z.object({
      valid_field: z.string().optional()
    }).strict();

    await expect(AgentExecutor.execute("sys", "user", law4Schema))
      .rejects.toThrow(/CRITICAL: Law 4 Violation/);
  });

  it("AgentExecutor halts and invokes retry loop dynamically on MALFORMED_OUTPUT", async () => {
    vi.spyOn(providerFactory, "resolveLLMProvider").mockReturnValue({
      providerId: "openai",
      complete: async () => ({
        content: "Here is your data: \`\`\`json\n{ oops this is not json",
        usage: { inputTokens: 10, outputTokens: 10 },
        providerId: "openai",
        modelId: "gpt-4o",
        latencyMs: 100
      })
    });

    const schema = z.object({ id: z.string() });

    await expect(AgentExecutor.execute("sys", "user", schema))
      .rejects.toThrow(/MALFORMED_OUTPUT/);
  });

  it("AgentExecutor attempts local backoff ONLY on TRANSIENT network errors", async () => {
    let callCount = 0;
    vi.spyOn(providerFactory, "resolveLLMProvider").mockReturnValue({
      providerId: "anthropic",
      complete: async () => {
        callCount++;
        if (callCount < 2) {
          throw new QuintiaProviderError("TIMEOUT", "Network lost");
        }
        return {
          content: JSON.stringify({ id: "success-after-retry" }),
          usage: { inputTokens: 10, outputTokens: 10 },
          providerId: "anthropic",
          modelId: "claude-3-5-sonnet",
          latencyMs: 100
        };
      }
    });

    const schema = z.object({ id: z.string() });

    // Since our test uses a 2000ms base wait, we could mock the timer, but we can also just run it 
    // since it only delays 2000ms once.
    const result = await AgentExecutor.execute("sys", "user", schema);
    
    expect(callCount).toBe(2);
    expect(result.id).toBe("success-after-retry");
  }, 10000); // 10s timeout for the local backoff delay
});
