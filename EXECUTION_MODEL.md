# QUINTIA Execution Model Documentation

## Current State: Fire-and-Forget Mock Orchestration (Local/Demo Only)

### Architecture
In the current development bounds (Slices 1 to 5), the Quintia 7-stage pipeline acts synchronously at the infrastructure level (`AgentExecutor` loops straight into `PipelineOrchestrator` methods in a linear await chain). 

To prevent Next.js Route Handlers from inevitably timing out during these artificially long execution delays (especially once real LLM calls are attached), we trigger the execution using a **"fire-and-forget" pattern**.
When the client calls `POST /api/pipeline/[jobId]/start`, it emits the first tracking `AuditLog`, starts the execution as an unawaited background Promise, and immediately returns a `{ message: 'Pipeline started' }` 200 OK. 

### Source of Truth
Because the frontend connection disconnects before completion, **HTTP responses never contain deterministic system intelligence**. 
The React UI operates exclusively as a **polling dashboard** reading from `/api/pipeline/[jobId]/status`. 

**The unshakeable Source of Truth** for state transitions resides entirely in Database persistence:
- `Job` Model: Single source of pipeline placement (`current_stage`, `status`, `retry_count`, `error_message`).
- `AuditLog` Model: Immutable history of trace events natively committed before advancing limits.
- `FinancialResult`: Sole deterministic provider for UI displays ensuring Law 4 compliance. No generative JSON ever populates the financial dashboard values.

### Production Environment Future State
This execution framework will not suffice for Vercel Serverless deployments, where background promises without a response lock are brutally killed without warning by the infrastructure.

When deploying to production, this local `.catch()` execution must be replaced by a robust, persistent message broker (e.g. AWS SQS, Upstash Kafka, or Inngest). 
The `POST /start` route will push `{ jobId: "..." }` into the orchestrator queue and return perfectly seamlessly. 
Using persistent queues natively solves Next.js timeouts, guarantees retry survivability if a pod crashes midway, and maintains clean LLM state transitions.
