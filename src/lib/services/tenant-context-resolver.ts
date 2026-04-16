import { TenantContext } from "../types";

export function resolveDevTenantContext(): TenantContext {
  return {
    tenantId: "demo-tenant-001",
    tenantSlug: "demo",
    userId: "demo-user-001",
    userRole: "admin",
    resolvedAt: new Date().toISOString(),
  };
}

export async function resolveTenantContext(request?: Request): Promise<TenantContext> {
  const mode = process.env.QUINTIA_AUTH_MODE || "dev";
  if (mode === "production") {
    // throw new Error("Production auth not yet implemented. Use QUINTIA_AUTH_MODE=dev.");
    // In the future this will read from the auth session
  }
  
  return resolveDevTenantContext();
}
