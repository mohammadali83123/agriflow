import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
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

/** Throws (redirects) if there is no session OR no active organization.
 *  Returns { session, orgId, db } — the triple every feature Server Action needs.
 *  orgId is injected into every query: `.where(eq(table.orgId, orgId))`.
 */
export async function requireOrg() {
  const session = await requireAuth();
  const orgId = session.session.activeOrganizationId;
  if (!orgId) redirect("/select-organization");
  return { session, orgId, db } as const;
}
