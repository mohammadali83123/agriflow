"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { eq, count, sum, sql, isNull, desc } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/db/scoped";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { sendGetStartedEmail } from "@/lib/email";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createOrgSchema = z.object({
  ownerEmail: z.string().email(),
  ownerName: z.string().max(100).optional(),
});

// ─── Query actions (return data) ─────────────────────────────────────────────

/** List all organizations on the platform (platform admin only). */
export async function listAllOrgs() {
  await requirePlatformAdmin();

  return db
    .select({
      id: schema.organization.id,
      name: schema.organization.name,
      slug: schema.organization.slug,
      createdAt: schema.organization.createdAt,
    })
    .from(schema.organization)
    .orderBy(schema.organization.createdAt);
}

/** List all organizations with member count, owner email, and usage metrics. */
export async function listAllOrgsWithStats() {
  await requirePlatformAdmin();

  const orgs = await db
    .select({
      id: schema.organization.id,
      name: schema.organization.name,
      slug: schema.organization.slug,
      createdAt: schema.organization.createdAt,
    })
    .from(schema.organization)
    .orderBy(schema.organization.createdAt);

  // Enrich each org with counts
  const enriched = await Promise.all(
    orgs.map(async (org) => {
      const [memberCountRow] = await db
        .select({ cnt: count() })
        .from(schema.member)
        .where(eq(schema.member.organizationId, org.id));

      const [ownerRow] = await db
        .select({ email: schema.user.email })
        .from(schema.member)
        .innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
        .where(
          sql`${schema.member.organizationId} = ${org.id} AND ${schema.member.role} = 'owner'`
        )
        .limit(1);

      const [invoiceCountRow] = await db
        .select({ cnt: count() })
        .from(schema.invoice)
        .where(eq(schema.invoice.orgId, org.id));

      const [paymentCountRow] = await db
        .select({ cnt: count() })
        .from(schema.payment)
        .where(eq(schema.payment.orgId, org.id));

      return {
        ...org,
        memberCount: memberCountRow?.cnt ?? 0,
        ownerEmail: ownerRow?.email ?? null,
        invoiceCount: invoiceCountRow?.cnt ?? 0,
        paymentCount: paymentCountRow?.cnt ?? 0,
      };
    })
  );

  return enriched;
}

/**
 * List all platform invitations that haven't been fully accepted yet,
 * with status derived from whether the user account and/or org exist.
 * Status values:
 *   "invited"         — email sent, no account created yet
 *   "account_created" — account exists, org not yet set up
 *   "expired"         — link expired before they acted
 */
export async function listPendingInvitations() {
  await requirePlatformAdmin();

  const rows = await db
    .select({
      id: schema.platformInvitation.id,
      email: schema.platformInvitation.email,
      name: schema.platformInvitation.name,
      createdAt: schema.platformInvitation.createdAt,
      expiresAt: schema.platformInvitation.expiresAt,
      userId: schema.user.id,
    })
    .from(schema.platformInvitation)
    .leftJoin(schema.user, eq(schema.platformInvitation.email, schema.user.email))
    .where(isNull(schema.platformInvitation.acceptedAt))
    .orderBy(desc(schema.platformInvitation.createdAt));

  const now = new Date();
  return rows.map((r) => ({
    ...r,
    status: (r.expiresAt < now
      ? "expired"
      : r.userId
      ? "account_created"
      : "invited") as "invited" | "account_created" | "expired",
  }));
}

/** Get a single org's detail: info, members, and usage stats. */
export async function getOrgDetail(orgId: string) {
  await requirePlatformAdmin();

  const [org] = await db
    .select({
      id: schema.organization.id,
      name: schema.organization.name,
      slug: schema.organization.slug,
      createdAt: schema.organization.createdAt,
    })
    .from(schema.organization)
    .where(eq(schema.organization.id, orgId))
    .limit(1);

  if (!org) return null;

  const members = await db
    .select({
      id: schema.member.id,
      email: schema.user.email,
      name: schema.user.name,
      role: schema.member.role,
      joinedAt: schema.member.createdAt,
    })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
    .where(eq(schema.member.organizationId, orgId))
    .orderBy(schema.member.createdAt);

  const [
    [productCountRow],
    [customerCountRow],
    [orderCountRow],
    [invoiceCountRow],
    [invoiceTotalRow],
    [paymentCountRow],
  ] = await Promise.all([
    db
      .select({ cnt: count() })
      .from(schema.product)
      .where(eq(schema.product.orgId, orgId)),
    db
      .select({ cnt: count() })
      .from(schema.customer)
      .where(eq(schema.customer.orgId, orgId)),
    db
      .select({ cnt: count() })
      .from(schema.order)
      .where(eq(schema.order.orgId, orgId)),
    db
      .select({ cnt: count() })
      .from(schema.invoice)
      .where(eq(schema.invoice.orgId, orgId)),
    db
      .select({ total: sum(schema.invoice.totalMinor) })
      .from(schema.invoice)
      .where(eq(schema.invoice.orgId, orgId)),
    db
      .select({ cnt: count() })
      .from(schema.payment)
      .where(eq(schema.payment.orgId, orgId)),
  ]);

  return {
    org,
    members,
    stats: {
      productCount: productCountRow?.cnt ?? 0,
      customerCount: customerCountRow?.cnt ?? 0,
      orderCount: orderCountRow?.cnt ?? 0,
      invoiceCount: invoiceCountRow?.cnt ?? 0,
      invoiceTotalMinor: invoiceTotalRow?.total
        ? BigInt(invoiceTotalRow.total)
        : 0n,
      paymentCount: paymentCountRow?.cnt ?? 0,
    },
  };
}

function getAdminEmails(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

/** List all users on the platform (platform admin only). Excludes platform admins. */
export async function listAllUsers() {
  await requirePlatformAdmin();
  const adminEmails = getAdminEmails();

  const users = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      createdAt: schema.user.createdAt,
    })
    .from(schema.user)
    .orderBy(schema.user.createdAt);

  return users.filter((u) => !adminEmails.includes(u.email));
}

/** List all users with their org memberships (name + role). Excludes platform admins. */
export async function listAllUsersWithOrgCount() {
  await requirePlatformAdmin();
  const adminEmails = getAdminEmails();

  const users = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      createdAt: schema.user.createdAt,
    })
    .from(schema.user)
    .orderBy(schema.user.createdAt);

  const clientUsers = users.filter((u) => !adminEmails.includes(u.email));

  // Fetch all memberships in one query
  const allMemberships = await db
    .select({
      userId: schema.member.userId,
      orgName: schema.organization.name,
      role: schema.member.role,
    })
    .from(schema.member)
    .innerJoin(schema.organization, eq(schema.member.organizationId, schema.organization.id))
    .orderBy(schema.member.createdAt);

  const membershipMap = new Map<string, { orgName: string; role: string }[]>();
  for (const m of allMemberships) {
    if (!membershipMap.has(m.userId)) membershipMap.set(m.userId, []);
    membershipMap.get(m.userId)!.push({ orgName: m.orgName, role: m.role });
  }

  return clientUsers.map((u) => ({
    ...u,
    memberships: membershipMap.get(u.id) ?? [],
  }));
}

// ─── Mutation actions (void — use redirect on success) ────────────────────────

/**
 * Send a platform invitation email to a new client.
 * No org is created — the client signs up and creates their own business.
 * On success: redirects to /admin/organizations.
 * On failure: returns { error }.
 */
export async function createOrgAndInviteOwner(
  _prevState: { error?: string; warning?: string } | null,
  formData: FormData
): Promise<{ error?: string; warning?: string }> {
  await requirePlatformAdmin();

  const parsed = createOrgSchema.safeParse({
    ownerEmail: formData.get("ownerEmail"),
    ownerName: formData.get("ownerName") || undefined,
  });

  if (!parsed.success) {
    return { error: "Please enter a valid email address." };
  }

  const { ownerEmail, ownerName } = parsed.data;

  // 7-day expiry
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = crypto.randomUUID();

  await db.insert(schema.platformInvitation).values({
    id: token,
    email: ownerEmail,
    name: ownerName ?? null,
    expiresAt,
  });

  await sendGetStartedEmail({ toEmail: ownerEmail, name: ownerName ?? null, token });

  redirect("/admin/organizations");
}

/** Hard-delete an organization and all its data (cascade). */
export async function deleteOrganization(orgId: string): Promise<{ error?: string }> {
  await requirePlatformAdmin();
  if (!orgId) return { error: "Missing org ID." };

  await db.delete(schema.organization).where(eq(schema.organization.id, orgId));
  return {};
}

/** Hard-delete a platform user. Orgs where they are the only member are also deleted (cascades all business data). Shared orgs are preserved — the user is simply removed from them. */
export async function deleteUser(userId: string): Promise<{ error?: string }> {
  await requirePlatformAdmin();
  if (!userId) return { error: "Missing user ID." };

  // Find every org this user belongs to.
  const memberships = await db
    .select({ orgId: schema.member.organizationId })
    .from(schema.member)
    .where(eq(schema.member.userId, userId));

  // Delete orgs where this user is the only member so they don't become orphans.
  // Orgs with other members are left intact; the member row cascades away with the user.
  for (const { orgId } of memberships) {
    const [row] = await db
      .select({ cnt: count() })
      .from(schema.member)
      .where(eq(schema.member.organizationId, orgId));

    if ((row?.cnt ?? 0) <= 1) {
      await db.delete(schema.organization).where(eq(schema.organization.id, orgId));
    }
  }

  await db.delete(schema.user).where(eq(schema.user.id, userId));
  return {};
}
