import { describe, it, expect, beforeEach, vi } from "vitest";
import { JobWorker } from "../job-worker";
import { prisma } from "../../db/client";
import { PipelineOrchestrator } from "../pipeline-orchestrator";

// Mock the orchestrator to avoid actual LLM calls
vi.mock("../pipeline-orchestrator", () => ({
  PipelineOrchestrator: {
    executeJob: vi.fn().mockResolvedValue({ status: "completed" })
  }
}));

describe("JobWorker", () => {
  beforeEach(async () => {
    // Clear all tables to avoid FK violations (exhaustive purge)
    await prisma.auditLog.deleteMany();
    await prisma.report.deleteMany();
    await prisma.financialResult.deleteMany();
    await prisma.scenario.deleteMany();
    await prisma.diagnosticResult.deleteMany();
    await prisma.processGraph.deleteMany();
    await prisma.ontologyResult.deleteMany();
    await prisma.job.deleteMany();
    await prisma.rawInput.deleteMany();
    await prisma.project.deleteMany();
    await prisma.tenant.deleteMany();
    
    // Create dummy tenant/project/job
    const t = await prisma.tenant.create({ data: { name: "Test", slug: "test" } });
    const p = await prisma.project.create({ data: { tenant_id: t.id, name: "P1" } });
    await prisma.job.create({
      data: {
        id: "job-1",
        tenant_id: t.id,
        project_id: p.id,
        status: "pending"
      }
    });
  });

  it("should claim a pending job", async () => {
    const worker = new JobWorker("worker-1");
    // @ts-ignore - access private method for testing
    await worker.pollAndProcess();

    const job = await prisma.job.findUnique({ where: { id: "job-1" } });
    expect(job?.status).toBe("running");
    expect(job?.locked_by).toBe("worker-1");
    expect(job?.locked_until).toBeDefined();
    expect(PipelineOrchestrator.executeJob).toHaveBeenCalledWith("job-1");
  });

  it("should reclaim a stale running job", async () => {
    // Manually set job to running but expired
    await prisma.job.update({
      where: { id: "job-1" },
      data: {
        status: "running",
        locked_by: "worker-dead",
        locked_until: new Date(Date.now() - 1000) // 1s ago
      }
    });

    const worker = new JobWorker("worker-fresh");
    // @ts-ignore
    await worker.pollAndProcess();

    const job = await prisma.job.findUnique({ where: { id: "job-1" } });
    expect(job?.status).toBe("running");
    expect(job?.locked_by).toBe("worker-fresh"); // Successfully reclaimed
    expect(PipelineOrchestrator.executeJob).toHaveBeenCalled();
  });

  it("should not claim a currently locked running job", async () => {
    await prisma.job.update({
      where: { id: "job-1" },
      data: {
        status: "running",
        locked_by: "worker-active",
        locked_until: new Date(Date.now() + 60000) // 1m in future
      }
    });

    const worker = new JobWorker("worker-thief");
    // @ts-ignore
    await worker.pollAndProcess();

    const job = await prisma.job.findUnique({ where: { id: "job-1" } });
    expect(job?.locked_by).toBe("worker-active"); // Thief failed
  });
});
