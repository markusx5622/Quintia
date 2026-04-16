import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("--- STARTING OPERATION VERIFICATION ---");

  // 1. Ensure the demo tenant exists (matching resolveDevTenantContext)
  const tenantId = "demo-tenant-001";
  const tenant = await prisma.tenant.upsert({
    where: { id: tenantId },
    update: {},
    create: { 
      id: tenantId,
      name: "Demo Tenant", 
      slug: "demo" 
    }
  });

  // 2. Create a project
  const project = await prisma.project.create({
    data: {
      tenant_id: tenant.id,
      name: "Operational Verification Project",
      description: "Project created for end-to-end verification of Slice 11 orchestration."
    }
  });

  // 3. Create raw input
  await prisma.rawInput.create({
    data: {
      tenant_id: tenant.id,
      project_id: project.id,
      input_type: "narrative",
      content: "This is a process narrative for verification. The process starts at node A, goes to node B, and ends at node C."
    }
  });

  // 4. Create a job
  const job = await prisma.job.create({
    data: {
      tenant_id: tenant.id,
      project_id: project.id,
      status: "pending",
      current_stage: "ontology",
    }
  });

  console.log(`Created Job ID: ${job.id}`);

  // 5. Trigger via API
  console.log(`Triggering pipeline via API: http://localhost:3000/api/pipeline/${job.id}/start`);
  try {
    const response = await fetch(`http://localhost:3000/api/pipeline/${job.id}/start`, {
      method: "POST"
    });
    const data = await response.json();
    console.log("API Response:", data);
  } catch (err: any) {
    console.error("API Error:", err.message);
  }

  console.log("--- TRIGGER COMPLETED. MONITOR INNGEST DEV SERVER ---");
}

main().catch(console.error);
