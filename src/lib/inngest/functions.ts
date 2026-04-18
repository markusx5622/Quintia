import { inngest } from "./client";
import { PipelineOrchestrator } from "../services/pipeline-orchestrator";

/**
 * The Quintia Pipeline Step Function.
 * Orchestrates the 7 stages of process intelligence in a serverless-friendly way.
 */
export const quintiaPipeline = inngest.createFunction(
  { 
    id: "quintia-pipeline-v2",
    concurrency: 1,
    triggers: [{ event: "pipeline/job.started" }]
  },
  async ({ event, step }) => {
    const { jobId } = event.data;
    console.log(`[Inngest] Starting pipeline for Job: ${jobId}`);

    // Stage 1: Ontology
    await step.run("ontology", async () => {
      return PipelineOrchestrator.runStage(jobId, "ontology");
    });

    // Stage 2: Process Graph
    await step.run("process_graph", async () => {
      return PipelineOrchestrator.runStage(jobId, "process_graph");
    });

    // Stage 3: Diagnostics
    await step.run("diagnostics", async () => {
      return PipelineOrchestrator.runStage(jobId, "diagnostics");
    });

    // Stage 4: Scenarios
    await step.run("scenarios", async () => {
      return PipelineOrchestrator.runStage(jobId, "scenarios");
    });

    // Stage 5: Recalculation (Deterministic)
    await step.run("recalculation", async () => {
      return PipelineOrchestrator.runStage(jobId, "recalculation");
    });

    // Stage 6: Critic
    await step.run("critic", async () => {
      return PipelineOrchestrator.runStage(jobId, "critic");
    });

    // Stage 7: Synthesis
    await step.run("synthesis", async () => {
      return PipelineOrchestrator.runStage(jobId, "synthesis");
    });

    return { jobId, status: "completed" };
  }
);
