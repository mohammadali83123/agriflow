import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { type Role } from "@/lib/rbac";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export interface UserOrganization {
  id: string;
  name: string;
  slug: string | null;
}

/** All organizations the given user is a member of. */
export async function getUserOrganizations(
  userId: string
): Promise<UserOrganization[]> {
  return db
    .select({
      id: schema.organization.id,
      name: schema.organization.name,
      slug: schema.organization.slug,
    })
    .from(schema.member)
    .innerJoin(
      schema.organization,
      eq(schema.member.organizationId, schema.organization.id)
    )
    .where(eq(schema.member.userId, userId));
}

// ─── Session helpers ──────────────────────────────────────────────────────────

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Throws (redirects) to /sign-in if there is no authenticated session. */
export async function requireAuth() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}

/**
 * Throws (redirects) if there is no session OR no active organization.
 * Returns { session, orgId, role, db } — everything feature Server Actions need.
 * Every query must filter by orgId: `.where(eq(table.orgId, orgId))`.
 */
export async function requireOrg() {
  const session = await requireAuth();
  const orgId = session.session.activeOrganizationId;
  if (!orgId) redirect("/select-organization");

  const [membership] = await db
    .select({ role: schema.member.role })
    .from(schema.member)
    .where(
      and(
        eq(schema.member.userId, session.user.id),
        eq(schema.member.organizationId, orgId)
      )
    )
    .limit(1);

  const role = (membership?.role ?? "member") as Role;

  return { session, orgId, role, db } as const;
}
