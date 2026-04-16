import { prisma } from "../db/client";

export class IngestionService {
  /**
   * Sanitizes input text to prevent basic prompt injections and malformed structure.
   */
  static sanitizeText(text: string): string {
    if (!text) return "";
    // Remove basic XML/HTML tags that could confuse LLM parsing
    let clean = text.replace(/<[^>]*>?/gm, "");
    // Strip common system prompt override attempts (basic defense-in-depth)
    clean = clean.replace(/ignore previous instructions/gi, "[REDACTED]");
    clean = clean.replace(/you are now/gi, "[REDACTED]");
    return clean.trim();
  }

  /**
   * Mocks the ingestion of a raw narrative or document.
   * Creates a Project, a RawInput, and the initial Job.
   */
  static async ingestNarrative(tenantId: string, narrativeText: string, projectName: string) {
    if (!tenantId) throw new Error("Tenant context missing");
    
    // Bounds check
    const rawText = narrativeText.trim();
    if (rawText.length < 50) {
      throw new Error("Ingestion payload too small. Minimum 50 characters required for process analysis.");
    }
    if (rawText.length > 50000) {
      throw new Error("Ingestion payload exceeds maximum system bounds of 50,000 characters.");
    }

    const sanitizedText = this.sanitizeText(rawText);

    const project = await prisma.project.create({
      data: {
        tenant_id: tenantId,
        name: projectName.substring(0, 100), // Max 100 char limit
        status: "processing",
        raw_inputs: {
          create: {
            tenant_id: tenantId,
            input_type: "narrative",
            content: sanitizedText,
          }
        },
        jobs: {
          create: {
            tenant_id: tenantId,
            current_stage: "ontology",
            status: "pending",
          }
        }
      },
      include: {
        jobs: true,
        raw_inputs: true
      }
    });

    return { project, job: project.jobs[0] };
  }
}
