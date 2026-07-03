"use server";

import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { requireOrg } from "@/lib/db/scoped";
import { can } from "@/lib/rbac";
import * as schema from "@/lib/db/schema";
import {
  createProductSchema,
  updateProductSchema,
  createVariantSchema,
  createPackagingOptionSchema,
  createDailyPriceSchema,
} from "@/lib/validations/products";

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function listProducts(search?: string) {
  const { orgId, db } = await requireOrg();

  let query = db
    .select()
    .from(schema.product)
    .where(
      search
        ? and(
            eq(schema.product.orgId, orgId),
            isNull(schema.product.deletedAt),
            or(
              ilike(schema.product.name, `%${search}%`),
              ilike(schema.product.sku, `%${search}%`)
            )
          )
        : and(
            eq(schema.product.orgId, orgId),
            isNull(schema.product.deletedAt)
          )
    )
    .orderBy(schema.product.name);

  const products = await query;

  return {
    data: products.map((p) => ({
      ...p,
      basePriceMinor: p.basePriceMinor !== null ? Number(p.basePriceMinor) : null,
      minPriceMinor: p.minPriceMinor !== null ? Number(p.minPriceMinor) : null,
    })),
  };
}

export async function getProduct(id: string) {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "products:read")) {
    return { error: "Forbidden" };
  }

  const [p] = await db
    .select()
    .from(schema.product)
    .where(
      and(
        eq(schema.product.id, id),
        eq(schema.product.orgId, orgId),
        isNull(schema.product.deletedAt)
      )
    )
    .limit(1);

  if (!p) return { error: "Not found" };

  const variants = await db
    .select()
    .from(schema.productVariant)
    .where(
      and(
        eq(schema.productVariant.productId, id),
        eq(schema.productVariant.orgId, orgId),
        isNull(schema.productVariant.deletedAt)
      )
    )
    .orderBy(schema.productVariant.name);

  const packaging = await db
    .select()
    .from(schema.packagingOption)
    .where(
      and(
        eq(schema.packagingOption.productId, id),
        eq(schema.packagingOption.orgId, orgId),
        isNull(schema.packagingOption.deletedAt)
      )
    )
    .orderBy(schema.packagingOption.name);

  return {
    data: {
      ...p,
      basePriceMinor: p.basePriceMinor !== null ? Number(p.basePriceMinor) : null,
      minPriceMinor: p.minPriceMinor !== null ? Number(p.minPriceMinor) : null,
      variants,
      packaging,
    },
  };
}

export async function createProduct(input: unknown) {
  const { orgId, role, db, session } = await requireOrg();

  if (!can(role, "products:write")) {
    return { error: "Forbidden" };
  }

  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  const [newProduct] = await db
    .insert(schema.product)
    .values({
      orgId,
      name: data.name,
      baseUnit: data.baseUnit,
      category: data.category ?? null,
      sku: data.sku ?? null,
      description: data.description ?? null,
      status: data.status,
      minPriceMinor:
        data.minPriceMinor !== undefined ? BigInt(data.minPriceMinor) : null,
      basePriceMinor:
        data.basePriceMinor !== undefined ? BigInt(data.basePriceMinor) : null,
      createdBy: session.user.id,
    })
    .returning();

  return {
    data: {
      ...newProduct,
      basePriceMinor:
        newProduct.basePriceMinor !== null
          ? Number(newProduct.basePriceMinor)
          : null,
      minPriceMinor:
        newProduct.minPriceMinor !== null
          ? Number(newProduct.minPriceMinor)
          : null,
    },
  };
}

export async function updateProduct(id: string, input: unknown) {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "products:write")) {
    return { error: "Forbidden" };
  }

  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  // Verify ownership
  const [existing] = await db
    .select({ id: schema.product.id })
    .from(schema.product)
    .where(
      and(
        eq(schema.product.id, id),
        eq(schema.product.orgId, orgId),
        isNull(schema.product.deletedAt)
      )
    )
    .limit(1);

  if (!existing) return { error: "Not found" };

  const updateData: Partial<typeof schema.product.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.baseUnit !== undefined) updateData.baseUnit = data.baseUnit;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.sku !== undefined) updateData.sku = data.sku;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.minPriceMinor !== undefined)
    updateData.minPriceMinor =
      data.minPriceMinor !== null ? BigInt(data.minPriceMinor) : null;
  if (data.basePriceMinor !== undefined)
    updateData.basePriceMinor =
      data.basePriceMinor !== null ? BigInt(data.basePriceMinor) : null;

  const [updated] = await db
    .update(schema.product)
    .set(updateData)
    .where(
      and(eq(schema.product.id, id), eq(schema.product.orgId, orgId))
    )
    .returning();

  return {
    data: {
      ...updated,
      basePriceMinor:
        updated.basePriceMinor !== null
          ? Number(updated.basePriceMinor)
          : null,
      minPriceMinor:
        updated.minPriceMinor !== null ? Number(updated.minPriceMinor) : null,
    },
  };
}

export async function deleteProduct(id: string) {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "products:write")) {
    return { error: "Forbidden" };
  }

  const [existing] = await db
    .select({ id: schema.product.id })
    .from(schema.product)
    .where(
      and(
        eq(schema.product.id, id),
        eq(schema.product.orgId, orgId),
        isNull(schema.product.deletedAt)
      )
    )
    .limit(1);

  if (!existing) return { error: "Not found" };

  await db
    .update(schema.product)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(eq(schema.product.id, id), eq(schema.product.orgId, orgId))
    );

  return { data: { success: true } };
}

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

export async function listVariants(productId: string) {
  const { orgId, db } = await requireOrg();

  const variants = await db
    .select()
    .from(schema.productVariant)
    .where(
      and(
        eq(schema.productVariant.productId, productId),
        eq(schema.productVariant.orgId, orgId),
        isNull(schema.productVariant.deletedAt)
      )
    )
    .orderBy(schema.productVariant.name);

  return { data: variants };
}

export async function createVariant(input: unknown) {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "products:write")) {
    return { error: "Forbidden" };
  }

  const parsed = createVariantSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  // Verify product belongs to org
  const [p] = await db
    .select({ id: schema.product.id })
    .from(schema.product)
    .where(
      and(
        eq(schema.product.id, data.productId),
        eq(schema.product.orgId, orgId),
        isNull(schema.product.deletedAt)
      )
    )
    .limit(1);

  if (!p) return { error: "Product not found" };

  const [variant] = await db
    .insert(schema.productVariant)
    .values({
      orgId,
      productId: data.productId,
      name: data.name,
      grade: data.grade ?? null,
      quality: data.quality ?? null,
      brand: data.brand ?? null,
    })
    .returning();

  return { data: variant };
}

export async function deleteVariant(id: string) {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "products:write")) {
    return { error: "Forbidden" };
  }

  await db
    .update(schema.productVariant)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(schema.productVariant.id, id),
        eq(schema.productVariant.orgId, orgId),
        isNull(schema.productVariant.deletedAt)
      )
    );

  return { data: { success: true } };
}

// ---------------------------------------------------------------------------
// Packaging options
// ---------------------------------------------------------------------------

export async function listPackagingOptions(productId: string) {
  const { orgId, db } = await requireOrg();

  const options = await db
    .select()
    .from(schema.packagingOption)
    .where(
      and(
        eq(schema.packagingOption.productId, productId),
        eq(schema.packagingOption.orgId, orgId),
        isNull(schema.packagingOption.deletedAt)
      )
    )
    .orderBy(schema.packagingOption.name);

  return { data: options };
}

export async function createPackagingOption(input: unknown) {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "products:write")) {
    return { error: "Forbidden" };
  }

  const parsed = createPackagingOptionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  // Verify product belongs to org
  const [p] = await db
    .select({ id: schema.product.id })
    .from(schema.product)
    .where(
      and(
        eq(schema.product.id, data.productId),
        eq(schema.product.orgId, orgId),
        isNull(schema.product.deletedAt)
      )
    )
    .limit(1);

  if (!p) return { error: "Product not found" };

  const [option] = await db
    .insert(schema.packagingOption)
    .values({
      orgId,
      productId: data.productId,
      name: data.name,
      factor: String(data.factor),
    })
    .returning();

  return { data: option };
}

export async function deletePackagingOption(id: string) {
  const { orgId, role, db } = await requireOrg();

  if (!can(role, "products:write")) {
    return { error: "Forbidden" };
  }

  await db
    .update(schema.packagingOption)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(schema.packagingOption.id, id),
        eq(schema.packagingOption.orgId, orgId),
        isNull(schema.packagingOption.deletedAt)
      )
    );

  return { data: { success: true } };
}

// ---------------------------------------------------------------------------
// Daily prices
// ---------------------------------------------------------------------------

export async function setDailyPrice(input: unknown) {
  const { orgId, role, db, session } = await requireOrg();

  if (!can(role, "products:write")) {
    return { error: "Forbidden" };
  }

  const parsed = createDailyPriceSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;

  // Verify product belongs to org
  const [p] = await db
    .select({ id: schema.product.id })
    .from(schema.product)
    .where(
      and(
        eq(schema.product.id, data.productId),
        eq(schema.product.orgId, orgId),
        isNull(schema.product.deletedAt)
      )
    )
    .limit(1);

  if (!p) return { error: "Product not found" };

  const [price] = await db
    .insert(schema.dailyPrice)
    .values({
      orgId,
      productId: data.productId,
      variantId: data.variantId ?? null,
      priceMinor: BigInt(data.priceMinor),
      effectiveDate: data.effectiveDate,
      createdBy: session.user.id,
    })
    .returning();

  return {
    data: {
      ...price,
      priceMinor: Number(price.priceMinor),
    },
  };
}

export async function getPriceHistory(productId: string, variantId?: string) {
  const { orgId, db } = await requireOrg();

  const where = variantId
    ? and(
        eq(schema.dailyPrice.productId, productId),
        eq(schema.dailyPrice.orgId, orgId),
        eq(schema.dailyPrice.variantId, variantId)
      )
    : and(
        eq(schema.dailyPrice.productId, productId),
        eq(schema.dailyPrice.orgId, orgId)
      );

  const prices = await db
    .select({
      id: schema.dailyPrice.id,
      productId: schema.dailyPrice.productId,
      variantId: schema.dailyPrice.variantId,
      priceMinor: schema.dailyPrice.priceMinor,
      effectiveDate: schema.dailyPrice.effectiveDate,
      createdAt: schema.dailyPrice.createdAt,
      createdByName: schema.user.name,
    })
    .from(schema.dailyPrice)
    .leftJoin(schema.user, eq(schema.dailyPrice.createdBy, schema.user.id))
    .where(where)
    .orderBy(desc(schema.dailyPrice.effectiveDate))
    .limit(30);

  return {
    data: prices.map((row) => ({
      ...row,
      priceMinor: Number(row.priceMinor),
    })),
  };
}
