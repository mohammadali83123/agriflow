"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { eq, count, sum, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/db/scoped";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

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

/** List all users with org membership count. Excludes platform admins. */
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

  const enriched = await Promise.all(
    clientUsers.map(async (u) => {
      const [row] = await db
        .select({ cnt: count() })
        .from(schema.member)
        .where(eq(schema.member.userId, u.id));
      return { ...u, orgCount: row?.cnt ?? 0 };
    })
  );

  return enriched;
}

// ─── Mutation actions (void — use redirect on success) ────────────────────────

/**
 * Create a new org for a client and invite their owner email.
 * On success: redirects to /admin/organizations.
 * On failure: returns { error } (caller shows the message).
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

  const { ownerEmail } = parsed.data;

  // Placeholder org — the client renames it in Settings after signing up.
  const suffix = Date.now().toString(36).slice(-4);
  const placeholderName = "New Business";
  const slug = `new-business-${suffix}`;

  const h = await headers();

  const orgResult = await auth.api.createOrganization({
    body: { name: placeholderName, slug },
    headers: h,
  });

  if (!orgResult || !("id" in orgResult)) {
    return { error: "Could not create organization. Try again." };
  }

  const orgId = (orgResult as { id: string }).id;

  const inviteResult = await auth.api.createInvitation({
    body: { organizationId: orgId, email: ownerEmail, role: "owner" },
    headers: h,
  });

  if (!inviteResult || !("id" in inviteResult)) {
    return {
      error: "Org created but invitation failed. Send an invite manually from the org's settings.",
    };
  }

  redirect("/admin/organizations");
}

/** Hard-delete an organization and all its data (cascade). */
export async function deleteOrganization(orgId: string): Promise<{ error?: string }> {
  await requirePlatformAdmin();
  if (!orgId) return { error: "Missing org ID." };

  await db.delete(schema.organization).where(eq(schema.organization.id, orgId));
  return {};
}

/** Hard-delete a platform user and all their sessions/memberships. */
export async function deleteUser(userId: string): Promise<{ error?: string }> {
  await requirePlatformAdmin();
  if (!userId) return { error: "Missing user ID." };

  await db.delete(schema.user).where(eq(schema.user.id, userId));
  return {};
}
