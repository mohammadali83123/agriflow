"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
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

// ─── Mutation actions (void — use redirect on success) ────────────────────────

/**
 * Create a new org for a client and invite their owner email.
 * On success: redirects to /admin.
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

  redirect("/admin");
}
