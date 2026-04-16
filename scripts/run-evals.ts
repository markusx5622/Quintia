import { GOLDEN_CASES } from "../src/lib/eval/golden-cases";
import { RegressionHarness } from "../src/lib/eval/regression-harness";
import { prisma } from "../src/lib/db/client";

async function main() {
  console.log("🚀 Starting QUINTIA Prompt Evaluation Harness...\n");
  
  const TENANT_ID = "eval-tenant";
  
  // Ensure tenant exists
  await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {},
    create: { id: TENANT_ID, name: "Evaluation Tenant", slug: "eval" }
  });

  for (const golden of GOLDEN_CASES) {
    console.log(`Evaluating Case [${golden.id}]: ${golden.name}...`);
    const report = await RegressionHarness.evaluateCase(golden, TENANT_ID);
    
    console.log("\n" + "=".repeat(60));
    console.log(`REPORT FOR CASE: ${golden.id}`);
    console.log(`OVERALL STATUS: ${report.overallStatus === "pass" ? "✅ PASS" : "❌ FAIL"}`);
    console.log("=".repeat(60));

    for (const res of report.agentResults) {
      const statusIcon = res.status === "pass" ? "✅" : "❌";
      console.log(`\n[Agent ${res.agentId}] ${res.agentName}: ${statusIcon} ${res.status.toUpperCase()}`);
      if (res.failureCategory) {
        console.log(`   Failure Category: ${res.failureCategory.toUpperCase()}`);
      }
      
      for (const metric of res.metrics) {
        const mIcon = metric.passed ? "✓" : "✗";
        console.log(`   ${mIcon} ${metric.name}: ${metric.score}/100 - ${metric.details || ""}`);
      }

      if (res.law4LeakageFound) {
        console.log(`   🚨 LAW 4 VIOLATION DETECTED! Financial leakage found in output.`);
      }
    }
    
    console.log("\n" + "=".repeat(60));
    console.log(`Summary: ${report.summary.passedAgents}/${report.summary.totalAgents} Agents Passed`);
    console.log("=".repeat(60) + "\n");
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Evaluation Script Failed:", err);
  process.exit(1);
});
