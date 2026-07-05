"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrg } from "@/lib/db/scoped";
import { can } from "@/lib/rbac";
import { auth } from "@/lib/auth";
import * as schema from "@/lib/db/schema";
import { db as globalDb } from "@/lib/db"; // used for deleteOrganization + updateProfile (no org context after delete)

// ─── Validation schemas ───────────────────────────────────────────────────────

const updateOrgSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and hyphens"),
});

const changeRoleSchema = z.object({
  memberId: z.string().min(1),
  role: z.enum(["owner", "member"]),
});

// ─── Organization ─────────────────────────────────────────────────────────────

export async function updateOrganization(
  input: unknown
): Promise<{ error?: string }> {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "settings:write")) {
    return { error: "Only owners can update organization settings." };
  }

  const parsed = updateOrgSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Check slug uniqueness (excluding current org)
  if (parsed.data.slug) {
    const [existing] = await db
      .select({ id: schema.organization.id })
      .from(schema.organization)
      .where(eq(schema.organization.slug, parsed.data.slug))
      .limit(1);

    if (existing && existing.id !== orgId) {
      return { error: "This slug is already taken. Please choose another." };
    }
  }

  await db
    .update(schema.organization)
    .set({ name: parsed.data.name, slug: parsed.data.slug })
    .where(eq(schema.organization.id, orgId));

  revalidatePath("/settings");
  return {};
}

// ─── Members ─────────────────────────────────────────────────────────────────

export async function removeMember(
  memberId: string
): Promise<{ error?: string }> {
  const { orgId, role, db, session } = await requireOrg();

  if (!can(role, "settings:write")) {
    return { error: "Only owners can remove members." };
  }

  // Fetch the member to remove
  const [target] = await db
    .select({ userId: schema.member.userId, role: schema.member.role })
    .from(schema.member)
    .where(
      and(
        eq(schema.member.id, memberId),
        eq(schema.member.organizationId, orgId)
      )
    )
    .limit(1);

  if (!target) return { error: "Member not found." };

  // Cannot remove yourself
  if (target.userId === session.user.id) {
    return { error: "You cannot remove yourself from the organization." };
  }

  // If removing an owner, make sure there's at least one other owner left
  if (target.role === "owner") {
    const owners = await db
      .select({ id: schema.member.id })
      .from(schema.member)
      .where(
        and(
          eq(schema.member.organizationId, orgId),
          eq(schema.member.role, "owner")
        )
      );

    if (owners.length <= 1) {
      return { error: "Cannot remove the last owner of the organization." };
    }
  }

  await db
    .delete(schema.member)
    .where(
      and(
        eq(schema.member.id, memberId),
        eq(schema.member.organizationId, orgId)
      )
    );

  revalidatePath("/settings");
  return {};
}

export async function changeRole(
  input: unknown
): Promise<{ error?: string }> {
  const { orgId, role, db, session } = await requireOrg();

  if (!can(role, "settings:write")) {
    return { error: "Only owners can change member roles." };
  }

  const parsed = changeRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { memberId, role: newRole } = parsed.data;

  // Fetch the target member
  const [target] = await db
    .select({ userId: schema.member.userId, role: schema.member.role })
    .from(schema.member)
    .where(
      and(
        eq(schema.member.id, memberId),
        eq(schema.member.organizationId, orgId)
      )
    )
    .limit(1);

  if (!target) return { error: "Member not found." };

  // Cannot demote yourself if you're the last owner
  if (
    target.userId === session.user.id &&
    target.role === "owner" &&
    newRole === "member"
  ) {
    const owners = await db
      .select({ id: schema.member.id })
      .from(schema.member)
      .where(
        and(
          eq(schema.member.organizationId, orgId),
          eq(schema.member.role, "owner")
        )
      );

    if (owners.length <= 1) {
      return { error: "Cannot demote yourself — you are the last owner." };
    }
  }

  await db
    .update(schema.member)
    .set({ role: newRole })
    .where(
      and(
        eq(schema.member.id, memberId),
        eq(schema.member.organizationId, orgId)
      )
    );

  revalidatePath("/settings");
  return {};
}

// ─── Invitations ──────────────────────────────────────────────────────────────

const sendInvitationSchema = z.object({
  email: z.string().email("Valid email required"),
  role: z.enum(["owner", "member"]),
});

export async function sendInvitation(
  input: unknown
): Promise<{ error?: string }> {
  const { orgId, role } = await requireOrg();

  if (!can(role, "settings:write")) {
    return { error: "Only owners can invite members." };
  }

  const parsed = sendInvitationSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const h = await headers();

  const result = await auth.api.createInvitation({
    body: {
      organizationId: orgId,
      email: parsed.data.email,
      role: parsed.data.role,
    },
    headers: h,
  });

  if (!result || !("id" in result)) {
    return { error: "Failed to send invitation. The user may already be a member or invited." };
  }

  revalidatePath("/settings");
  return {};
}

// ─── Delete organization ──────────────────────────────────────────────────────

/**
 * Permanently delete the active organization and all its business data.
 * Executes in dependency order so FK constraints aren't violated.
 * The organization row itself cascades to members + invitations.
 */
export async function deleteOrganization(): Promise<{ error?: string }> {
  const { orgId, role } = await requireOrg();

  if (!can(role, "settings:write")) {
    return { error: "Only owners can delete the organization." };
  }

  // All business tables have onDelete: "cascade" on their org_id FK,
  // so deleting the organization row cascades everything automatically.
  await globalDb.delete(schema.organization).where(eq(schema.organization.id, orgId));

  return {};
}

// ─── Profile ──────────────────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long"),
});

export async function updateProfile(input: unknown): Promise<{ error?: string }> {
  const { session } = await requireOrg();

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await globalDb
    .update(schema.user)
    .set({ name: parsed.data.name, updatedAt: new Date() })
    .where(eq(schema.user.id, session.user.id));

  revalidatePath("/settings");
  return {};
}

// ─── Invitations ──────────────────────────────────────────────────────────────

export async function revokeInvitation(
  invitationId: string
): Promise<{ error?: string }> {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "settings:write")) {
    return { error: "Only owners can revoke invitations." };
  }

  const [inv] = await db
    .select({ id: schema.invitation.id })
    .from(schema.invitation)
    .where(
      and(
        eq(schema.invitation.id, invitationId),
        eq(schema.invitation.organizationId, orgId)
      )
    )
    .limit(1);

  if (!inv) return { error: "Invitation not found." };

  await db
    .update(schema.invitation)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(schema.invitation.id, invitationId),
        eq(schema.invitation.organizationId, orgId)
      )
    );

  revalidatePath("/settings");
  return {};
}
