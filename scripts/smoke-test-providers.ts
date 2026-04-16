import { resolveLLMProvider } from "../src/lib/providers/provider-factory";
import "dotenv/config";

async function run() {
  console.log("----------------------------------------");
  console.log(" QUINTIA LIVE PROVIDER SMOKE TEST");
  console.log("----------------------------------------");

  const providerId = process.env.QUINTIA_LLM_PROVIDER || "mock";
  console.log(`\nActive Provider configured: [${providerId}]`);

  if (providerId === "mock") {
    console.log("Test assumes live provider. Please set QUINTIA_LLM_PROVIDER=openai or anthropic in .env");
    return;
  }

  const provider = resolveLLMProvider();

  const req = {
    systemPrompt: "You are a process testing bot. Return a JSON structure exactly matching the user request.",
    userPrompt: "Give me a single JSON object with the key 'status' mapped to 'systems online'.",
    responseFormat: "json" as const,
    temperature: 0.1
  };

  console.log("\nInitiating live API execution to Provider...");
  try {
    const res = await provider.complete(req);
    
    console.log("\n[SUCCESS]");
    console.log(`Latency: ${res.latencyMs}ms`);
    console.log(`Model ID: ${res.modelId}`);
    console.log(`Usage: ${res.usage.inputTokens} IN / ${res.usage.outputTokens} OUT`);
    console.log(`Raw Content payload:`);
    console.log(res.content);

    // Verify it parses as JSON strictly
    JSON.parse(res.content);
    console.log("\nPayload securely decoded as pure JSON.");
    
  } catch (error: any) {
    console.error("\n[FAILURE] Provider request failed.");
    console.error(`Error Class: ${error?.name} (${error?.code})`);
    console.error(`Message: ${error?.message}`);
  }
}

run();
