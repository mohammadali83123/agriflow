import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

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
  if (!orgId) redirect("/onboarding");
  return { session, orgId, db } as const;
}
