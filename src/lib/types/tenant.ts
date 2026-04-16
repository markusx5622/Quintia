export interface TenantContext {
  readonly tenantId: string;
  readonly tenantSlug: string;
  readonly userId: string;
  readonly userRole: "admin" | "analyst" | "viewer";
  readonly resolvedAt: string; // ISO timestamp
}
