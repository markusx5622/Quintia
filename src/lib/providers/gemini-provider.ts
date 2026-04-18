import { GoogleGenerativeAI } from "@google/generative-ai";
import { LLMCompletionRequest, LLMCompletionResponse, LLMProvider } from "../types";
import { QuintiaProviderError } from "./errors";

export class GeminiProvider implements LLMProvider {
  readonly providerId = "gemini";
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing from environment.");
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Allow configuration via env, fallback to Flash 1.5 which is robust for JSON
    this.modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  }

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const startTime = Date.now();

    try {
      // Configuration for generative model
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        systemInstruction: request.systemPrompt,
      });

      const generationConfig = {
        temperature: request.temperature ?? 0.1,
        maxOutputTokens: request.maxTokens,
        responseMimeType: request.responseFormat === "json" ? "application/json" : "text/plain",
      };

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: request.userPrompt }] }],
        generationConfig,
      });

      const response = await result.response;
      const text = response.text();
      
      return {
        content: text,
        usage: {
          inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        },
        providerId: this.providerId,
        modelId: this.modelName,
        latencyMs: Date.now() - startTime,
      };

    } catch (error: any) {
      // Basic error mapping for Gemini SDK
      const msg = error.message || "";
      
      if (msg.includes("429") || msg.includes("Quota exceeded")) {
        throw new QuintiaProviderError("RATE_LIMIT", "Gemini rate limit exceeded", error);
      }
      if (msg.includes("401") || msg.includes("API key not valid")) {
        throw new QuintiaProviderError("AUTH_ERROR", "Invalid Gemini API key", error);
      }
      if (msg.includes("500") || msg.includes("503")) {
        throw new QuintiaProviderError("SERVER_ERROR", "Gemini server error", error);
      }
      if (msg.includes("400")) {
        throw new QuintiaProviderError("BAD_REQUEST", "Gemini bad request", error);
      }
      if (msg.includes("deadline exceeded") || msg.includes("timeout")) {
        throw new QuintiaProviderError("TIMEOUT", "Gemini request timeout", error);
      }

      throw new QuintiaProviderError("UNKNOWN_ERROR", `Gemini error: ${msg}`, error);
    }
  }
}
