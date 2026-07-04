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
  name: z.string().min(2).max(100),
  ownerEmail: z.string().email(),
  ownerName: z.string().min(1).max(100),
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

/** List all users on the platform (platform admin only). */
export async function listAllUsers() {
  await requirePlatformAdmin();

  return db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      createdAt: schema.user.createdAt,
    })
    .from(schema.user)
    .orderBy(schema.user.createdAt);
}

/** List all users with org membership count. */
export async function listAllUsersWithOrgCount() {
  await requirePlatformAdmin();

  const users = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      createdAt: schema.user.createdAt,
    })
    .from(schema.user)
    .orderBy(schema.user.createdAt);

  const enriched = await Promise.all(
    users.map(async (u) => {
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
  _prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  await requirePlatformAdmin();

  const parsed = createOrgSchema.safeParse({
    name: formData.get("name"),
    ownerEmail: formData.get("ownerEmail"),
    ownerName: formData.get("ownerName"),
  });

  if (!parsed.success) {
    return { error: "Invalid input — check all fields." };
  }

  const { name, ownerEmail } = parsed.data;

  const base = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const suffix = Date.now().toString(36).slice(-4);
  const slug = `${base || "business"}-${suffix}`;

  const h = await headers();

  // Create org via Better Auth server API (bypasses client-facing creation check)
  const orgResult = await auth.api.createOrganization({
    body: { name: name.trim(), slug },
    headers: h,
  });

  if (!orgResult || !("id" in orgResult)) {
    return { error: "Could not create organization. Try again." };
  }

  const orgId = (orgResult as { id: string }).id;

  // Invite the owner via Better Auth's invitation API
  const inviteResult = await auth.api.createInvitation({
    body: { organizationId: orgId, email: ownerEmail, role: "owner" },
    headers: h,
  });

  if (!inviteResult || !("id" in inviteResult)) {
    return {
      error: `Org "${name}" created, but invite failed. Send an invite manually from the org settings.`,
    };
  }

  redirect("/admin/organizations");
}
