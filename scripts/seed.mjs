/**
 * AgriFlow seed script — realistic Pakistani rice mill data
 * Run with: node --env-file=.env.local scripts/seed.mjs
 *
 * Idempotent: checks for "Super Basmati Paddy" before inserting.
 * All money in paisa (1 rupee = 100 paisa). All quantities as numeric strings.
 */

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString().split("T")[0];
}

function uuid() {
  return crypto.randomUUID();
}

async function seed() {
  console.log("=== AgriFlow Seed Script ===\n");

  // ── Step 1: Find existing org and user ─────────────────────────────────────
  console.log("Step 1: Finding existing org and user...");
  const orgs = await sql`SELECT id, name FROM organization LIMIT 1`;
  if (orgs.length === 0) {
    throw new Error("No organization found. Please set up an org first via the app.");
  }
  const orgId = orgs[0].id;
  console.log(`  Found org: "${orgs[0].name}" (${orgId})`);

  const users = await sql`SELECT id, name FROM "user" LIMIT 1`;
  if (users.length === 0) {
    throw new Error("No user found. Please sign up first via the app.");
  }
  const userId = users[0].id;
  console.log(`  Found user: "${users[0].name}" (${userId})`);

  // ── Step 2: Idempotency check ───────────────────────────────────────────────
  console.log("\nStep 2: Checking if seed data already exists...");
  const existing = await sql`
    SELECT id FROM product
    WHERE org_id = ${orgId} AND name = 'Super Basmati Paddy' AND deleted_at IS NULL
    LIMIT 1
  `;
  if (existing.length > 0) {
    console.log("  Seed data already exists (found 'Super Basmati Paddy'). Skipping.");
    console.log("\nSeed complete! (skipped — already seeded)");
    return;
  }
  console.log("  No existing seed data found. Proceeding...");

  // ── Step 3: Warehouses ─────────────────────────────────────────────────────
  console.log("\nStep 3: Creating warehouses...");
  const existingWarehouses = await sql`
    SELECT id FROM warehouse WHERE org_id = ${orgId} AND deleted_at IS NULL LIMIT 1
  `;

  let mainWarehouseId;
  let coldStorageId;

  if (existingWarehouses.length > 0) {
    console.log("  Warehouses already exist, fetching IDs...");
    const whs = await sql`
      SELECT id, name FROM warehouse WHERE org_id = ${orgId} AND deleted_at IS NULL
    `;
    mainWarehouseId = whs.find((w) => w.name === "Main Warehouse")?.id;
    coldStorageId = whs.find((w) => w.name === "Cold Storage")?.id;
    if (!mainWarehouseId) {
      mainWarehouseId = whs[0].id;
    }
    console.log(`  Using warehouse: ${mainWarehouseId}`);
  } else {
    mainWarehouseId = uuid();
    coldStorageId = uuid();

    await sql`
      INSERT INTO warehouse (id, org_id, name, address, is_default, created_by)
      VALUES (
        ${mainWarehouseId}, ${orgId}, 'Main Warehouse',
        'Gujranwala, Punjab', true, ${userId}
      )
    `;
    console.log("  Created: Main Warehouse (Gujranwala, Punjab)");

    await sql`
      INSERT INTO warehouse (id, org_id, name, address, is_default, created_by)
      VALUES (
        ${coldStorageId}, ${orgId}, 'Cold Storage',
        'Lahore, Punjab', false, ${userId}
      )
    `;
    console.log("  Created: Cold Storage (Lahore, Punjab)");
  }

  // ── Step 4: Products, variants, packaging ──────────────────────────────────
  console.log("\nStep 4: Creating products...");

  // Helper: create product + variants + packaging
  async function createProduct({ name, baseUnit, category, variants, packaging }) {
    const productId = uuid();
    await sql`
      INSERT INTO product (id, org_id, name, category, base_unit, status, created_by)
      VALUES (${productId}, ${orgId}, ${name}, ${category ?? null}, ${baseUnit}, 'active', ${userId})
    `;

    const variantIds = {};
    for (const v of variants) {
      const variantId = uuid();
      variantIds[v.name] = variantId;
      await sql`
        INSERT INTO product_variant (id, org_id, product_id, name, grade, status)
        VALUES (${variantId}, ${orgId}, ${productId}, ${v.name}, ${v.grade ?? null}, 'active')
      `;
      // Set price on variant — we use daily_price to record the base price
      if (v.basePriceMinor) {
        await sql`
          INSERT INTO daily_price (id, org_id, product_id, variant_id, price_minor, effective_date, created_by)
          VALUES (${uuid()}, ${orgId}, ${productId}, ${variantId}, ${v.basePriceMinor}, ${daysAgo(1)}, ${userId})
        `;
      }
    }

    for (const p of packaging) {
      await sql`
        INSERT INTO packaging_option (id, org_id, product_id, name, factor)
        VALUES (${uuid()}, ${orgId}, ${productId}, ${p.name}, ${p.factor})
      `;
    }

    console.log(`  Created: ${name} (${variants.length} variant(s), ${packaging.length} packaging option(s))`);
    return { productId, variantIds };
  }

  // 1. Super Basmati Paddy
  const { productId: sbPaddyId, variantIds: sbPaddyVariants } = await createProduct({
    name: "Super Basmati Paddy",
    baseUnit: "kg",
    category: "Raw Input",
    variants: [
      { name: "Grade A", grade: "A", basePriceMinor: 9000 },
      { name: "Grade B", grade: "B", basePriceMinor: 7500 },
    ],
    packaging: [
      { name: "40kg Bag (1 Maund)", factor: "40.0000" },
      { name: "Bulk (per kg)", factor: "1.0000" },
    ],
  });

  // 2. IRRI-6 Paddy
  const { productId: irri6PaddyId, variantIds: irri6PaddyVariants } = await createProduct({
    name: "IRRI-6 Paddy",
    baseUnit: "kg",
    category: "Raw Input",
    variants: [{ name: "Standard", basePriceMinor: 6500 }],
    packaging: [{ name: "40kg Bag", factor: "40.0000" }],
  });

  // 3. Super Basmati Rice (Milled)
  const { productId: sbRiceId, variantIds: sbRiceVariants } = await createProduct({
    name: "Super Basmati Rice (Milled)",
    baseUnit: "kg",
    category: "Finished Good",
    variants: [{ name: "25kg Bag", basePriceMinor: 17000 }],
    packaging: [
      { name: "25kg Bag", factor: "25.0000" },
      { name: "50kg Bag", factor: "50.0000" },
    ],
  });

  // 4. IRRI-6 Rice (Milled)
  const { productId: irri6RiceId, variantIds: irri6RiceVariants } = await createProduct({
    name: "IRRI-6 Rice (Milled)",
    baseUnit: "kg",
    category: "Finished Good",
    variants: [{ name: "Standard", basePriceMinor: 11000 }],
    packaging: [{ name: "50kg Bag", factor: "50.0000" }],
  });

  // 5. Broken Rice
  const { productId: brokenRiceId, variantIds: brokenRiceVariants } = await createProduct({
    name: "Broken Rice",
    baseUnit: "kg",
    category: "Finished Good",
    variants: [{ name: "Standard", basePriceMinor: 5500 }],
    packaging: [{ name: "50kg Bag", factor: "50.0000" }],
  });

  // 6. Rice Bran
  const { productId: riceBranId, variantIds: riceBranVariants } = await createProduct({
    name: "Rice Bran",
    baseUnit: "kg",
    category: "By-product",
    variants: [{ name: "Fresh", basePriceMinor: 3500 }],
    packaging: [{ name: "40kg Bag", factor: "40.0000" }],
  });

  // 7. Rice Polish
  const { productId: ricePolishId, variantIds: ricePolishVariants } = await createProduct({
    name: "Rice Polish",
    baseUnit: "kg",
    category: "By-product",
    variants: [{ name: "Standard", basePriceMinor: 3000 }],
    packaging: [{ name: "40kg Bag", factor: "40.0000" }],
  });

  // ── Step 5: Suppliers ──────────────────────────────────────────────────────
  console.log("\nStep 5: Creating suppliers...");

  const supplier1Id = uuid();
  await sql`
    INSERT INTO supplier (id, org_id, type, name, business_name, phone, address, status, created_by)
    VALUES (
      ${supplier1Id}, ${orgId}, 'farmer',
      'Muhammad Aslam', 'Muhammad Aslam & Sons',
      '+92-300-1234567', 'Hafizabad, Punjab', 'active', ${userId}
    )
  `;
  console.log("  Created: Muhammad Aslam & Sons (farmer, Hafizabad)");

  const supplier2Id = uuid();
  await sql`
    INSERT INTO supplier (id, org_id, type, name, business_name, phone, address, status, created_by)
    VALUES (
      ${supplier2Id}, ${orgId}, 'trader',
      'Chaudhry Grain Traders', 'Chaudhry Grain Traders',
      '+92-321-9876543', 'Gujranwala, Punjab', 'active', ${userId}
    )
  `;
  console.log("  Created: Chaudhry Grain Traders (trader, Gujranwala)");

  const supplier3Id = uuid();
  await sql`
    INSERT INTO supplier (id, org_id, type, name, business_name, phone, address, status, created_by)
    VALUES (
      ${supplier3Id}, ${orgId}, 'supplier',
      'Punjab Agri Cooperative', 'Punjab Agri Cooperative',
      '+92-333-5551234', 'Sheikhupura, Punjab', 'active', ${userId}
    )
  `;
  console.log("  Created: Punjab Agri Cooperative (supplier, Sheikhupura)");

  // ── Step 6: Customers ──────────────────────────────────────────────────────
  console.log("\nStep 6: Creating customers...");

  const cust1Id = uuid(); // Al-Barkat
  await sql`
    INSERT INTO customer (id, org_id, name, business_name, phone, city, credit_limit_minor, status, created_by)
    VALUES (
      ${cust1Id}, ${orgId},
      'Al-Barkat Rice Traders', 'Al-Barkat Rice Traders',
      '+92-21-3456789', 'Karachi', 50000000, 'active', ${userId}
    )
  `;
  console.log("  Created: Al-Barkat Rice Traders (Karachi, limit Rs 500,000)");

  const cust2Id = uuid(); // Mian Brothers
  await sql`
    INSERT INTO customer (id, org_id, name, business_name, phone, city, credit_limit_minor, status, created_by)
    VALUES (
      ${cust2Id}, ${orgId},
      'Mian Brothers & Co', 'Mian Brothers & Co',
      '+92-42-7654321', 'Lahore', 30000000, 'active', ${userId}
    )
  `;
  console.log("  Created: Mian Brothers & Co (Lahore, limit Rs 300,000)");

  const cust3Id = uuid(); // Zafar Grain House
  await sql`
    INSERT INTO customer (id, org_id, name, business_name, phone, city, credit_limit_minor, status, created_by)
    VALUES (
      ${cust3Id}, ${orgId},
      'Zafar Grain House', 'Zafar Grain House',
      '+92-61-1234567', 'Multan', 25000000, 'active', ${userId}
    )
  `;
  console.log("  Created: Zafar Grain House (Multan, limit Rs 250,000)");

  const cust4Id = uuid(); // Pak Export Rice Mills
  await sql`
    INSERT INTO customer (id, org_id, name, business_name, phone, city, credit_limit_minor, status, created_by)
    VALUES (
      ${cust4Id}, ${orgId},
      'Pak Export Rice Mills', 'Pak Export Rice Mills',
      '+92-41-9871234', 'Faisalabad', 100000000, 'active', ${userId}
    )
  `;
  console.log("  Created: Pak Export Rice Mills (Faisalabad, limit Rs 1,000,000)");

  const cust5Id = uuid(); // Hussain Trading
  await sql`
    INSERT INTO customer (id, org_id, name, business_name, phone, city, credit_limit_minor, status, created_by)
    VALUES (
      ${cust5Id}, ${orgId},
      'Hussain Trading Company', 'Hussain Trading Company',
      '+92-51-2345678', 'Rawalpindi', 20000000, 'active', ${userId}
    )
  `;
  console.log("  Created: Hussain Trading Company (Rawalpindi, limit Rs 200,000)");

  // ── Step 7: Inventory transactions (opening stock + purchase) ──────────────
  console.log("\nStep 7: Inserting inventory transactions...");

  // Opening stock — Super Basmati Paddy Grade A: +5000 kg
  await sql`
    INSERT INTO inventory_transaction
      (id, org_id, product_id, variant_id, warehouse_id, quantity_delta, type, unit_cost_minor, ref_type, created_by)
    VALUES (
      ${uuid()}, ${orgId}, ${sbPaddyId}, ${sbPaddyVariants["Grade A"]},
      ${mainWarehouseId}, '5000.000', 'opening', 8500, 'opening_stock', ${userId}
    )
  `;
  console.log("  Opening: Super Basmati Paddy Grade A +5000 kg @ Rs 85/kg");

  // Opening stock — IRRI-6 Paddy Standard: +8000 kg
  await sql`
    INSERT INTO inventory_transaction
      (id, org_id, product_id, variant_id, warehouse_id, quantity_delta, type, unit_cost_minor, ref_type, created_by)
    VALUES (
      ${uuid()}, ${orgId}, ${irri6PaddyId}, ${irri6PaddyVariants["Standard"]},
      ${mainWarehouseId}, '8000.000', 'opening', 6000, 'opening_stock', ${userId}
    )
  `;
  console.log("  Opening: IRRI-6 Paddy Standard +8000 kg @ Rs 60/kg");

  // Opening stock — Super Basmati Rice 25kg Bag: +2000 kg
  await sql`
    INSERT INTO inventory_transaction
      (id, org_id, product_id, variant_id, warehouse_id, quantity_delta, type, unit_cost_minor, ref_type, created_by)
    VALUES (
      ${uuid()}, ${orgId}, ${sbRiceId}, ${sbRiceVariants["25kg Bag"]},
      ${mainWarehouseId}, '2000.000', 'opening', 14000, 'opening_stock', ${userId}
    )
  `;
  console.log("  Opening: Super Basmati Rice (25kg Bag) +2000 kg @ Rs 140/kg");

  // Opening stock — IRRI-6 Rice Standard: +3000 kg
  await sql`
    INSERT INTO inventory_transaction
      (id, org_id, product_id, variant_id, warehouse_id, quantity_delta, type, unit_cost_minor, ref_type, created_by)
    VALUES (
      ${uuid()}, ${orgId}, ${irri6RiceId}, ${irri6RiceVariants["Standard"]},
      ${mainWarehouseId}, '3000.000', 'opening', 9000, 'opening_stock', ${userId}
    )
  `;
  console.log("  Opening: IRRI-6 Rice Standard +3000 kg @ Rs 90/kg");

  // Opening stock — Broken Rice Standard: +1500 kg
  await sql`
    INSERT INTO inventory_transaction
      (id, org_id, product_id, variant_id, warehouse_id, quantity_delta, type, unit_cost_minor, ref_type, created_by)
    VALUES (
      ${uuid()}, ${orgId}, ${brokenRiceId}, ${brokenRiceVariants["Standard"]},
      ${mainWarehouseId}, '1500.000', 'opening', 4000, 'opening_stock', ${userId}
    )
  `;
  console.log("  Opening: Broken Rice Standard +1500 kg @ Rs 40/kg");

  // Opening stock — Rice Bran Fresh: +800 kg
  await sql`
    INSERT INTO inventory_transaction
      (id, org_id, product_id, variant_id, warehouse_id, quantity_delta, type, unit_cost_minor, ref_type, created_by)
    VALUES (
      ${uuid()}, ${orgId}, ${riceBranId}, ${riceBranVariants["Fresh"]},
      ${mainWarehouseId}, '800.000', 'opening', 2800, 'opening_stock', ${userId}
    )
  `;
  console.log("  Opening: Rice Bran Fresh +800 kg @ Rs 28/kg");

  // Purchase from Chaudhry Grain Traders — Super Basmati Paddy Grade A: +10000 kg
  const purchaseTxId = uuid();
  await sql`
    INSERT INTO inventory_transaction
      (id, org_id, product_id, variant_id, warehouse_id, quantity_delta, type, unit_cost_minor, ref_type, ref_id, reason, created_by)
    VALUES (
      ${purchaseTxId}, ${orgId}, ${sbPaddyId}, ${sbPaddyVariants["Grade A"]},
      ${mainWarehouseId}, '10000.000', 'purchase', 8800,
      'purchase', ${supplier2Id},
      'Purchase from Chaudhry Grain Traders', ${userId}
    )
  `;
  console.log("  Purchase: Super Basmati Paddy Grade A +10000 kg @ Rs 88/kg (Chaudhry Grain Traders)");

  // ── Step 8: Production batch ───────────────────────────────────────────────
  console.log("\nStep 8: Creating production batch BATCH-001...");

  const batchId = uuid();
  const productionDate = daysAgo(15);

  await sql`
    INSERT INTO production_batch
      (id, org_id, batch_number, warehouse_id, production_date, added_cost_minor, allocation_method, status, created_by)
    VALUES (
      ${batchId}, ${orgId}, 'BATCH-001', ${mainWarehouseId},
      ${productionDate}, 500000, 'value', 'completed', ${userId}
    )
  `;

  // Production input record
  await sql`
    INSERT INTO production_input
      (id, org_id, batch_id, product_id, variant_id, quantity, unit_cost_minor)
    VALUES (
      ${uuid()}, ${orgId}, ${batchId},
      ${sbPaddyId}, ${sbPaddyVariants["Grade A"]},
      '3000.000', 8800
    )
  `;

  // Production input inventory transaction: -3000 kg Super Basmati Paddy Grade A
  await sql`
    INSERT INTO inventory_transaction
      (id, org_id, product_id, variant_id, warehouse_id, quantity_delta, type, unit_cost_minor, ref_type, ref_id, reason, created_by)
    VALUES (
      ${uuid()}, ${orgId}, ${sbPaddyId}, ${sbPaddyVariants["Grade A"]},
      ${mainWarehouseId}, '-3000.000', 'production_out', 8800,
      'production_batch', ${batchId},
      'Input for BATCH-001', ${userId}
    )
  `;
  console.log("  Production input: Super Basmati Paddy Grade A -3000 kg");

  // Production outputs
  const outputs = [
    {
      productId: sbRiceId,
      variantId: sbRiceVariants["25kg Bag"],
      qty: "1800.000",
      allocatedCost: 14500,
      name: "Super Basmati Rice (25kg Bag)",
    },
    {
      productId: brokenRiceId,
      variantId: brokenRiceVariants["Standard"],
      qty: "400.000",
      allocatedCost: 4200,
      name: "Broken Rice Standard",
    },
    {
      productId: riceBranId,
      variantId: riceBranVariants["Fresh"],
      qty: "500.000",
      allocatedCost: 2900,
      name: "Rice Bran Fresh",
    },
    {
      productId: ricePolishId,
      variantId: ricePolishVariants["Standard"],
      qty: "200.000",
      allocatedCost: 2700,
      name: "Rice Polish Standard",
    },
  ];

  for (const out of outputs) {
    await sql`
      INSERT INTO production_output
        (id, org_id, batch_id, product_id, variant_id, quantity, allocated_cost_minor, is_waste)
      VALUES (
        ${uuid()}, ${orgId}, ${batchId},
        ${out.productId}, ${out.variantId},
        ${out.qty}, ${out.allocatedCost}, false
      )
    `;

    await sql`
      INSERT INTO inventory_transaction
        (id, org_id, product_id, variant_id, warehouse_id, quantity_delta, type, unit_cost_minor, ref_type, ref_id, reason, created_by)
      VALUES (
        ${uuid()}, ${orgId}, ${out.productId}, ${out.variantId},
        ${mainWarehouseId}, ${out.qty}, 'production_in', ${out.allocatedCost},
        'production_batch', ${batchId},
        'Output from BATCH-001', ${userId}
      )
    `;
    console.log(`  Production output: ${out.name} +${out.qty} kg`);
  }

  // ── Step 9: Orders ─────────────────────────────────────────────────────────
  console.log("\nStep 9: Creating orders...");

  // ORD-0001: completed, Al-Barkat, 500 kg Super Basmati Rice
  const ord1Id = uuid();
  const ord1LineId = uuid();
  await sql`
    INSERT INTO "order"
      (id, org_id, order_number, customer_id, status, confirmed_at, completed_at, created_by)
    VALUES (
      ${ord1Id}, ${orgId}, 'ORD-0001', ${cust1Id}, 'completed',
      ${daysAgo(20) + "T00:00:00.000Z"}, ${daysAgo(18) + "T00:00:00.000Z"},
      ${userId}
    )
  `;
  await sql`
    INSERT INTO order_line
      (id, org_id, order_id, product_id, variant_id, warehouse_id, qty_ordered, qty_dispatched, qty_delivered, unit_price_minor, line_total_minor)
    VALUES (
      ${ord1LineId}, ${orgId}, ${ord1Id},
      ${sbRiceId}, ${sbRiceVariants["25kg Bag"]}, ${mainWarehouseId},
      '500.000', '500.000', '500.000', 17000, 8500000
    )
  `;
  // Dispatch inventory transaction
  await sql`
    INSERT INTO inventory_transaction
      (id, org_id, product_id, variant_id, warehouse_id, quantity_delta, type, ref_type, ref_id, reason, created_by)
    VALUES (
      ${uuid()}, ${orgId}, ${sbRiceId}, ${sbRiceVariants["25kg Bag"]},
      ${mainWarehouseId}, '-500.000', 'dispatch',
      'order', ${ord1Id}, 'Dispatch for ORD-0001', ${userId}
    )
  `;
  console.log("  Created: ORD-0001 (completed) — Al-Barkat, 500 kg Super Basmati Rice @ Rs 170/kg");

  // ORD-0002: dispatched, Mian Brothers, 1000 kg IRRI-6 Rice
  const ord2Id = uuid();
  const ord2LineId = uuid();
  await sql`
    INSERT INTO "order"
      (id, org_id, order_number, customer_id, status, confirmed_at, created_by)
    VALUES (
      ${ord2Id}, ${orgId}, 'ORD-0002', ${cust2Id}, 'dispatched',
      ${daysAgo(12) + "T00:00:00.000Z"}, ${userId}
    )
  `;
  await sql`
    INSERT INTO order_line
      (id, org_id, order_id, product_id, variant_id, warehouse_id, qty_ordered, qty_dispatched, qty_delivered, unit_price_minor, line_total_minor)
    VALUES (
      ${ord2LineId}, ${orgId}, ${ord2Id},
      ${irri6RiceId}, ${irri6RiceVariants["Standard"]}, ${mainWarehouseId},
      '1000.000', '1000.000', '0.000', 11000, 11000000
    )
  `;
  // Dispatch inventory transaction
  await sql`
    INSERT INTO inventory_transaction
      (id, org_id, product_id, variant_id, warehouse_id, quantity_delta, type, ref_type, ref_id, reason, created_by)
    VALUES (
      ${uuid()}, ${orgId}, ${irri6RiceId}, ${irri6RiceVariants["Standard"]},
      ${mainWarehouseId}, '-1000.000', 'dispatch',
      'order', ${ord2Id}, 'Dispatch for ORD-0002', ${userId}
    )
  `;
  console.log("  Created: ORD-0002 (dispatched) — Mian Brothers, 1000 kg IRRI-6 Rice @ Rs 110/kg");

  // ORD-0003: reserved, Zafar Grain House, 300 kg Broken Rice
  const ord3Id = uuid();
  const ord3LineId = uuid();
  await sql`
    INSERT INTO "order"
      (id, org_id, order_number, customer_id, status, confirmed_at, created_by)
    VALUES (
      ${ord3Id}, ${orgId}, 'ORD-0003', ${cust3Id}, 'reserved',
      ${daysAgo(7) + "T00:00:00.000Z"}, ${userId}
    )
  `;
  await sql`
    INSERT INTO order_line
      (id, org_id, order_id, product_id, variant_id, warehouse_id, qty_ordered, qty_dispatched, qty_delivered, unit_price_minor, line_total_minor)
    VALUES (
      ${ord3LineId}, ${orgId}, ${ord3Id},
      ${brokenRiceId}, ${brokenRiceVariants["Standard"]}, ${mainWarehouseId},
      '300.000', '0.000', '0.000', 5500, 1650000
    )
  `;
  // Reserve inventory transaction
  await sql`
    INSERT INTO inventory_transaction
      (id, org_id, product_id, variant_id, warehouse_id, quantity_delta, type, ref_type, ref_id, reason, created_by)
    VALUES (
      ${uuid()}, ${orgId}, ${brokenRiceId}, ${brokenRiceVariants["Standard"]},
      ${mainWarehouseId}, '-300.000', 'reserve',
      'order', ${ord3Id}, 'Reserve for ORD-0003', ${userId}
    )
  `;
  console.log("  Created: ORD-0003 (reserved) — Zafar Grain House, 300 kg Broken Rice @ Rs 55/kg");

  // ORD-0004: draft, Pak Export, 2000 kg Super Basmati Rice
  const ord4Id = uuid();
  const ord4LineId = uuid();
  await sql`
    INSERT INTO "order"
      (id, org_id, order_number, customer_id, status, created_by)
    VALUES (
      ${ord4Id}, ${orgId}, 'ORD-0004', ${cust4Id}, 'draft', ${userId}
    )
  `;
  await sql`
    INSERT INTO order_line
      (id, org_id, order_id, product_id, variant_id, warehouse_id, qty_ordered, qty_dispatched, qty_delivered, unit_price_minor, line_total_minor)
    VALUES (
      ${ord4LineId}, ${orgId}, ${ord4Id},
      ${sbRiceId}, ${sbRiceVariants["25kg Bag"]}, ${mainWarehouseId},
      '2000.000', '0.000', '0.000', 16500, 33000000
    )
  `;
  console.log("  Created: ORD-0004 (draft) — Pak Export Rice Mills, 2000 kg Super Basmati Rice @ Rs 165/kg");

  // ── Step 10: Invoices ──────────────────────────────────────────────────────
  console.log("\nStep 10: Creating invoices...");

  // INV-0001: paid, linked to ORD-0001, Al-Barkat, Rs 85,000
  const inv1Id = uuid();
  await sql`
    INSERT INTO invoice
      (id, org_id, invoice_number, order_id, customer_id, status, issue_date, due_date,
       subtotal_minor, tax_minor, total_minor, amount_paid_minor, created_by)
    VALUES (
      ${inv1Id}, ${orgId}, 'INV-0001', ${ord1Id}, ${cust1Id}, 'paid',
      ${daysAgo(20)}, ${daysAgo(5)},
      8500000, 0, 8500000, 8500000, ${userId}
    )
  `;
  await sql`
    INSERT INTO invoice_line
      (id, org_id, invoice_id, description, quantity, unit_price_minor, line_total_minor, order_line_id)
    VALUES (
      ${uuid()}, ${orgId}, ${inv1Id},
      'Super Basmati Rice (Milled) — 25kg Bag', '500.000', 17000, 8500000, ${ord1LineId}
    )
  `;
  console.log("  Created: INV-0001 (paid) — Al-Barkat, Rs 85,000");

  // INV-0002: partial, Mian Brothers, Rs 110,000 total, Rs 50,000 paid
  const inv2Id = uuid();
  await sql`
    INSERT INTO invoice
      (id, org_id, invoice_number, order_id, customer_id, status, issue_date, due_date,
       subtotal_minor, tax_minor, total_minor, amount_paid_minor, created_by)
    VALUES (
      ${inv2Id}, ${orgId}, 'INV-0002', ${ord2Id}, ${cust2Id}, 'partial',
      ${daysAgo(12)}, ${daysAgo(2)},
      11000000, 0, 11000000, 5000000, ${userId}
    )
  `;
  await sql`
    INSERT INTO invoice_line
      (id, org_id, invoice_id, description, quantity, unit_price_minor, line_total_minor, order_line_id)
    VALUES (
      ${uuid()}, ${orgId}, ${inv2Id},
      'IRRI-6 Rice (Milled) — 50kg Bag', '1000.000', 11000, 11000000, ${ord2LineId}
    )
  `;
  console.log("  Created: INV-0002 (partial) — Mian Brothers, Rs 110,000 total / Rs 50,000 paid");

  // INV-0003: sent, Zafar Grain House, Rs 16,500
  const inv3Id = uuid();
  await sql`
    INSERT INTO invoice
      (id, org_id, invoice_number, order_id, customer_id, status, issue_date, due_date,
       subtotal_minor, tax_minor, total_minor, amount_paid_minor, created_by)
    VALUES (
      ${inv3Id}, ${orgId}, 'INV-0003', ${ord3Id}, ${cust3Id}, 'sent',
      ${daysAgo(7)}, ${daysAgo(0)},
      1650000, 0, 1650000, 0, ${userId}
    )
  `;
  await sql`
    INSERT INTO invoice_line
      (id, org_id, invoice_id, description, quantity, unit_price_minor, line_total_minor, order_line_id)
    VALUES (
      ${uuid()}, ${orgId}, ${inv3Id},
      'Broken Rice — 50kg Bag', '300.000', 5500, 1650000, ${ord3LineId}
    )
  `;
  console.log("  Created: INV-0003 (sent) — Zafar Grain House, Rs 16,500");

  // INV-0004: overdue, Hussain Trading, Rs 55,000 (standalone invoice, no order)
  const inv4Id = uuid();
  await sql`
    INSERT INTO invoice
      (id, org_id, invoice_number, customer_id, status, issue_date, due_date,
       subtotal_minor, tax_minor, total_minor, amount_paid_minor, created_by)
    VALUES (
      ${inv4Id}, ${orgId}, 'INV-0004', ${cust5Id}, 'overdue',
      ${daysAgo(40)}, ${daysAgo(10)},
      5500000, 0, 5500000, 0, ${userId}
    )
  `;
  await sql`
    INSERT INTO invoice_line
      (id, org_id, invoice_id, description, quantity, unit_price_minor, line_total_minor)
    VALUES (
      ${uuid()}, ${orgId}, ${inv4Id},
      'Rice Bran Fresh — 40kg Bag', '1571.000', 3500, 5498500
    )
  `;
  console.log("  Created: INV-0004 (overdue) — Hussain Trading, Rs 55,000 (due 10 days ago)");

  // ── Step 11: Payments + allocations ───────────────────────────────────────
  console.log("\nStep 11: Creating payments and allocations...");

  // PAY-0001: Al-Barkat, Rs 85,000 bank transfer (18 days ago)
  const pay1Id = uuid();
  await sql`
    INSERT INTO payment
      (id, org_id, payment_number, customer_id, amount_minor, method, payment_date, notes, created_by)
    VALUES (
      ${pay1Id}, ${orgId}, 'PAY-0001', ${cust1Id},
      8500000, 'bank_transfer', ${daysAgo(18)},
      'Full payment for INV-0001', ${userId}
    )
  `;
  // Allocate to INV-0001
  await sql`
    INSERT INTO payment_allocation (id, org_id, payment_id, invoice_id, amount_minor)
    VALUES (${uuid()}, ${orgId}, ${pay1Id}, ${inv1Id}, 8500000)
  `;
  console.log("  Created: PAY-0001 (bank_transfer, Rs 85,000) → INV-0001 fully allocated");

  // PAY-0002: Mian Brothers, Rs 50,000 cheque (5 days ago)
  const pay2Id = uuid();
  await sql`
    INSERT INTO payment
      (id, org_id, payment_number, customer_id, amount_minor, method, payment_date, notes, created_by)
    VALUES (
      ${pay2Id}, ${orgId}, 'PAY-0002', ${cust2Id},
      5000000, 'cheque', ${daysAgo(5)},
      'Partial payment for INV-0002', ${userId}
    )
  `;
  // Allocate to INV-0002
  await sql`
    INSERT INTO payment_allocation (id, org_id, payment_id, invoice_id, amount_minor)
    VALUES (${uuid()}, ${orgId}, ${pay2Id}, ${inv2Id}, 5000000)
  `;
  console.log("  Created: PAY-0002 (cheque, Rs 50,000) → INV-0002 partially allocated");

  // ── Done ───────────────────────────────────────────────────────────────────
  console.log("\n=== Seed complete! ===");
  console.log("\nSummary:");
  console.log("  Warehouses:   2 (Main Warehouse, Cold Storage)");
  console.log("  Products:     7 (2 raw inputs, 3 finished goods, 2 by-products)");
  console.log("  Variants:     9 total across all products");
  console.log("  Suppliers:    3 (Muhammad Aslam & Sons, Chaudhry Grain Traders, Punjab Agri Cooperative)");
  console.log("  Customers:    5 (Al-Barkat, Mian Brothers, Zafar, Pak Export, Hussain)");
  console.log("  Inv. txns:    ~17 (opening stock, purchase, production, dispatch, reserve)");
  console.log("  Production:   1 batch (BATCH-001, completed, 3000 kg paddy → rice + by-products)");
  console.log("  Orders:       4 (1 completed, 1 dispatched, 1 reserved, 1 draft)");
  console.log("  Invoices:     4 (1 paid, 1 partial, 1 sent, 1 overdue)");
  console.log("  Payments:     2 (PAY-0001 full, PAY-0002 partial)");
}

seed().catch((err) => {
  console.error("\nSeed failed:", err.message ?? err);
  process.exit(1);
});
