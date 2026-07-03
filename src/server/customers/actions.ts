"use server";

import { and, eq, ilike, isNull, or } from "drizzle-orm";
import { requireOrg } from "@/lib/db/scoped";
import { can } from "@/lib/rbac";
import { toMinor } from "@/lib/money";
import * as schema from "@/lib/db/schema";
import {
  createCustomerSchema,
  updateCustomerSchema,
  createContactSchema,
  createDeliveryAddressSchema,
} from "@/lib/validations/customers";

export async function listCustomers(search?: string) {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "customers:read")) {
    throw new Error("Forbidden");
  }

  const conditions = [
    eq(schema.customer.orgId, orgId),
    isNull(schema.customer.deletedAt),
  ];

  if (search && search.trim()) {
    const pattern = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(schema.customer.name, pattern),
        ilike(schema.customer.phone, pattern),
        ilike(schema.customer.city, pattern)
      )!
    );
  }

  return db
    .select()
    .from(schema.customer)
    .where(and(...conditions))
    .orderBy(schema.customer.name);
}

export async function getCustomer(id: string) {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "customers:read")) {
    throw new Error("Forbidden");
  }

  const [row] = await db
    .select()
    .from(schema.customer)
    .where(
      and(
        eq(schema.customer.id, id),
        eq(schema.customer.orgId, orgId),
        isNull(schema.customer.deletedAt)
      )
    )
    .limit(1);

  if (!row) throw new Error("Customer not found");

  const contacts = await db
    .select()
    .from(schema.customerContact)
    .where(
      and(
        eq(schema.customerContact.customerId, id),
        eq(schema.customerContact.orgId, orgId),
        isNull(schema.customerContact.deletedAt)
      )
    );

  const addresses = await db
    .select()
    .from(schema.customerDeliveryAddress)
    .where(
      and(
        eq(schema.customerDeliveryAddress.customerId, id),
        eq(schema.customerDeliveryAddress.orgId, orgId),
        isNull(schema.customerDeliveryAddress.deletedAt)
      )
    );

  return { ...row, contacts, addresses };
}

export async function createCustomer(input: unknown) {
  const { orgId, role, db, session } = await requireOrg();

  if (!can(role, "customers:write")) {
    throw new Error("Forbidden");
  }

  const parsed = createCustomerSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { creditLimitRupees, ...rest } = parsed.data;

  const [created] = await db
    .insert(schema.customer)
    .values({
      orgId,
      ...rest,
      creditLimitMinor: toMinor(creditLimitRupees ?? 0),
      createdBy: session.user.id,
    })
    .returning();

  return created;
}

export async function updateCustomer(id: string, input: unknown) {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "customers:write")) {
    throw new Error("Forbidden");
  }

  // Verify ownership
  const [existing] = await db
    .select({ id: schema.customer.id })
    .from(schema.customer)
    .where(
      and(
        eq(schema.customer.id, id),
        eq(schema.customer.orgId, orgId),
        isNull(schema.customer.deletedAt)
      )
    )
    .limit(1);

  if (!existing) throw new Error("Customer not found");

  const parsed = updateCustomerSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { creditLimitRupees, ...rest } = parsed.data;

  const updateData: Partial<typeof schema.customer.$inferInsert> = {
    ...rest,
    updatedAt: new Date(),
  };

  if (creditLimitRupees !== undefined) {
    updateData.creditLimitMinor = toMinor(creditLimitRupees);
  }

  const [updated] = await db
    .update(schema.customer)
    .set(updateData)
    .where(eq(schema.customer.id, id))
    .returning();

  return updated;
}

export async function deleteCustomer(id: string) {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "customers:write")) {
    throw new Error("Forbidden");
  }

  const [existing] = await db
    .select({ id: schema.customer.id })
    .from(schema.customer)
    .where(
      and(
        eq(schema.customer.id, id),
        eq(schema.customer.orgId, orgId),
        isNull(schema.customer.deletedAt)
      )
    )
    .limit(1);

  if (!existing) throw new Error("Customer not found");

  await db
    .update(schema.customer)
    .set({ deletedAt: new Date() })
    .where(eq(schema.customer.id, id));
}

export async function addContact(input: unknown) {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "customers:write")) {
    throw new Error("Forbidden");
  }

  const parsed = createContactSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { customerId, ...rest } = parsed.data;

  // Verify customer belongs to org
  const [existing] = await db
    .select({ id: schema.customer.id })
    .from(schema.customer)
    .where(
      and(
        eq(schema.customer.id, customerId),
        eq(schema.customer.orgId, orgId),
        isNull(schema.customer.deletedAt)
      )
    )
    .limit(1);

  if (!existing) throw new Error("Customer not found");

  const [contact] = await db
    .insert(schema.customerContact)
    .values({
      orgId,
      customerId,
      ...rest,
      email: rest.email || null,
    })
    .returning();

  return contact;
}

export async function removeContact(id: string) {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "customers:write")) {
    throw new Error("Forbidden");
  }

  await db
    .update(schema.customerContact)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(schema.customerContact.id, id),
        eq(schema.customerContact.orgId, orgId)
      )
    );
}

export async function addDeliveryAddress(input: unknown) {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "customers:write")) {
    throw new Error("Forbidden");
  }

  const parsed = createDeliveryAddressSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { customerId, isDefault, ...rest } = parsed.data;

  // Verify customer belongs to org
  const [existing] = await db
    .select({ id: schema.customer.id })
    .from(schema.customer)
    .where(
      and(
        eq(schema.customer.id, customerId),
        eq(schema.customer.orgId, orgId),
        isNull(schema.customer.deletedAt)
      )
    )
    .limit(1);

  if (!existing) throw new Error("Customer not found");

  // If setting as default, un-default others first
  if (isDefault) {
    await db
      .update(schema.customerDeliveryAddress)
      .set({ isDefault: false })
      .where(
        and(
          eq(schema.customerDeliveryAddress.customerId, customerId),
          eq(schema.customerDeliveryAddress.orgId, orgId),
          isNull(schema.customerDeliveryAddress.deletedAt)
        )
      );
  }

  const [address] = await db
    .insert(schema.customerDeliveryAddress)
    .values({
      orgId,
      customerId,
      isDefault: isDefault ?? false,
      ...rest,
    })
    .returning();

  return address;
}

export async function removeDeliveryAddress(id: string) {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "customers:write")) {
    throw new Error("Forbidden");
  }

  await db
    .update(schema.customerDeliveryAddress)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(schema.customerDeliveryAddress.id, id),
        eq(schema.customerDeliveryAddress.orgId, orgId)
      )
    );
}
