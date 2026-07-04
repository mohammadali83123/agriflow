"use server";

import { and, eq, ilike, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/db/scoped";
import { can } from "@/lib/rbac";
import * as schema from "@/lib/db/schema";
import {
  createSupplierSchema,
  updateSupplierSchema,
} from "@/lib/validations/suppliers";

export async function listSuppliers(search?: string) {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "suppliers:read")) {
    throw new Error("Forbidden");
  }

  const conditions = [
    eq(schema.supplier.orgId, orgId),
    isNull(schema.supplier.deletedAt),
  ];

  if (search && search.trim()) {
    const pattern = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(schema.supplier.name, pattern),
        ilike(schema.supplier.phone, pattern)
      )!
    );
  }

  return db
    .select()
    .from(schema.supplier)
    .where(and(...conditions))
    .orderBy(schema.supplier.name);
}

export async function getSupplier(id: string) {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "suppliers:read")) {
    throw new Error("Forbidden");
  }

  const [row] = await db
    .select()
    .from(schema.supplier)
    .where(
      and(
        eq(schema.supplier.id, id),
        eq(schema.supplier.orgId, orgId),
        isNull(schema.supplier.deletedAt)
      )
    )
    .limit(1);

  if (!row) throw new Error("Supplier not found");

  return row;
}

export async function createSupplier(input: unknown) {
  const { orgId, role, db, session } = await requireOrg();

  if (!can(role, "suppliers:write")) {
    throw new Error("Forbidden");
  }

  const parsed = createSupplierSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const [created] = await db
    .insert(schema.supplier)
    .values({
      orgId,
      ...parsed.data,
      createdBy: session.user.id,
    })
    .returning();

  revalidatePath("/suppliers");
  return created;
}

export async function updateSupplier(id: string, input: unknown) {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "suppliers:write")) {
    throw new Error("Forbidden");
  }

  // Verify ownership
  const [existing] = await db
    .select({ id: schema.supplier.id })
    .from(schema.supplier)
    .where(
      and(
        eq(schema.supplier.id, id),
        eq(schema.supplier.orgId, orgId),
        isNull(schema.supplier.deletedAt)
      )
    )
    .limit(1);

  if (!existing) throw new Error("Supplier not found");

  const parsed = updateSupplierSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const [updated] = await db
    .update(schema.supplier)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(eq(schema.supplier.id, id))
    .returning();

  return updated;
}

export async function deleteSupplier(id: string) {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "suppliers:write")) {
    throw new Error("Forbidden");
  }

  const [existing] = await db
    .select({ id: schema.supplier.id })
    .from(schema.supplier)
    .where(
      and(
        eq(schema.supplier.id, id),
        eq(schema.supplier.orgId, orgId),
        isNull(schema.supplier.deletedAt)
      )
    )
    .limit(1);

  if (!existing) throw new Error("Supplier not found");

  await db
    .update(schema.supplier)
    .set({ deletedAt: new Date() })
    .where(eq(schema.supplier.id, id));

  revalidatePath("/suppliers");
}
