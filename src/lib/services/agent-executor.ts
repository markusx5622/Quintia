import { ValidationService } from "./validation";
import { resolveLLMProvider } from "../providers/provider-factory";
import { ZodType } from "zod";
import { QuintiaProviderError } from "../providers/errors";

export class AgentExecutorError extends Error {
  constructor(message: string, public readonly validationErrors?: any[]) {
    super(message);
    this.name = "AgentExecutorError";
  }
}

export class AgentExecutor {
  private static readonly MAX_TRANSIENT_RETRIES = 3;
  private static readonly BASE_BACKOFF_MS = 2000;

  static async execute<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: ZodType<T>,
    retryCount = 0
  ): Promise<T> {
    const provider = resolveLLMProvider();

    try {
      const response = await provider.complete({
        systemPrompt,
        userPrompt,
        temperature: 0.1,
        responseFormat: "json",
      });

      let rawData: unknown;
      try {
        rawData = JSON.parse(response.content);
      } catch (e) {
        throw new AgentExecutorError("MALFORMED_OUTPUT: Failed to parse LLM response as JSON.");
      }

      const { valid, data, result } = ValidationService.validateSchema(schema, rawData);

      if (!valid || !data) {
        const law4Violation = result.errors.find(e => e.law4_violation);
        if (law4Violation) {
          throw new AgentExecutorError(
            `CRITICAL: Law 4 Violation Detected in Agent output. Key injected: ${law4Violation.field}`,
            result.errors
          );
        }
        throw new AgentExecutorError("SCHEMA_VIOLATION: Agent output schema validation failed.", result.errors);
      }

      return data;
    } catch (error: any) {
      if (error instanceof QuintiaProviderError && error.isTransient) {
        if (retryCount >= this.MAX_TRANSIENT_RETRIES) {
          throw new AgentExecutorError(`TRANSIENT_FAILURE: Provider failed after ${this.MAX_TRANSIENT_RETRIES} attempts. ${error.message}`);
        }
        const delay = this.BASE_BACKOFF_MS * Math.pow(2, retryCount);
        console.warn(`[AgentExecutor] Transient error from ${provider.providerId} (${error.code}). Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.execute(systemPrompt, userPrompt, schema, retryCount + 1);
      }
      
      // Structural errors or permanent provider errors bubble up
      throw error;
    }
  }
}

