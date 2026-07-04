/**
 * AgriFlow comprehensive seed script — realistic Pakistani rice mill data
 * Run with: node --env-file=.env.local scripts/seed.mjs [--force]
 *
 * Idempotency: checks for warehouse "Main Mill Warehouse".
 *   - If found and no --force flag: prints "Already seeded" and exits.
 *   - If --force: deletes all business data for this org, then re-inserts.
 *
 * All money in paisa (1 rupee = 100 paisa). All quantities as numeric strings.
 * Dates anchored to 2026-07-04 per project spec.
 */

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

const BASE_DATE = new Date("2026-07-04T00:00:00.000Z");
const daysAgo = (n) =>
  new Date(BASE_DATE.getTime() - n * 86400000).toISOString().split("T")[0];
const daysFromNow = (n) =>
  new Date(BASE_DATE.getTime() + n * 86400000).toISOString().split("T")[0];

function uuid() {
  return crypto.randomUUID();
}

async function seed() {
  console.log("=== AgriFlow Comprehensive Seed Script ===\n");

  // ── Step 0: Find org + user ──────────────────────────────────────────────
  console.log("Step 0: Finding org and user...");
  const orgs = await sql`SELECT id, name FROM organization ORDER BY created_at LIMIT 1`;
  if (orgs.length === 0) {
    throw new Error("No organization found. Sign up via the app first.");
  }
  const orgId = orgs[0].id;
  console.log(`  Org: "${orgs[0].name}" (${orgId})`);

  const users = await sql`SELECT id, name FROM "user" ORDER BY created_at LIMIT 1`;
  if (users.length === 0) {
    throw new Error("No user found. Sign up via the app first.");
  }
  const userId = users[0].id;
  console.log(`  User: "${users[0].name}" (${userId})`);

  // ── Idempotency check ────────────────────────────────────────────────────
  const existing = await sql`
    SELECT id FROM warehouse
    WHERE org_id = ${orgId} AND name = 'Main Mill Warehouse' AND deleted_at IS NULL
    LIMIT 1
  `;

  if (existing.length > 0 && !process.argv.includes("--force")) {
    console.log(
      '\nAlready seeded — run with --force to reseed\n  (found "Main Mill Warehouse")'
    );
    return;
  }

  if (existing.length > 0 && process.argv.includes("--force")) {
    console.log("\n--force detected. Deleting all business data for this org...");
    // Order matters — delete children before parents
    await sql`DELETE FROM payment_allocation WHERE org_id = ${orgId}`;
    await sql`DELETE FROM payment WHERE org_id = ${orgId}`;
    await sql`DELETE FROM invoice_line WHERE org_id = ${orgId}`;
    await sql`DELETE FROM invoice WHERE org_id = ${orgId}`;
    await sql`DELETE FROM dispatch_line WHERE org_id = ${orgId}`;
    await sql`DELETE FROM dispatch WHERE org_id = ${orgId}`;
    await sql`DELETE FROM order_line WHERE org_id = ${orgId}`;
    await sql`DELETE FROM "order" WHERE org_id = ${orgId}`;
    await sql`DELETE FROM production_output WHERE org_id = ${orgId}`;
    await sql`DELETE FROM production_input WHERE org_id = ${orgId}`;
    await sql`DELETE FROM production_batch WHERE org_id = ${orgId}`;
    await sql`DELETE FROM inventory_transaction WHERE org_id = ${orgId}`;
    await sql`DELETE FROM warehouse WHERE org_id = ${orgId}`;
    await sql`DELETE FROM daily_price WHERE org_id = ${orgId}`;
    await sql`DELETE FROM packaging_option WHERE org_id = ${orgId}`;
    await sql`DELETE FROM product_variant WHERE org_id = ${orgId}`;
    await sql`DELETE FROM product WHERE org_id = ${orgId}`;
    await sql`DELETE FROM customer_delivery_address WHERE org_id = ${orgId}`;
    await sql`DELETE FROM customer_contact WHERE org_id = ${orgId}`;
    await sql`DELETE FROM customer WHERE org_id = ${orgId}`;
    await sql`DELETE FROM supplier WHERE org_id = ${orgId}`;
    console.log("  ✓ Cleaned up existing data\n");
  }

  // ── Step 1: Warehouses ────────────────────────────────────────────────────
  console.log("Step 1: Creating warehouses...");

  const mainWhId = uuid();
  const coldStoreId = uuid();
  const transitYardId = uuid();

  await sql`
    INSERT INTO warehouse (id, org_id, name, address, is_default, created_by)
    VALUES (${mainWhId}, ${orgId}, 'Main Mill Warehouse', 'GT Road, Gujranwala, Punjab', true, ${userId})
  `;
  await sql`
    INSERT INTO warehouse (id, org_id, name, address, is_default, created_by)
    VALUES (${coldStoreId}, ${orgId}, 'Cold Storage Facility', 'Lahore Road, Gujranwala, Punjab', false, ${userId})
  `;
  await sql`
    INSERT INTO warehouse (id, org_id, name, address, is_default, created_by)
    VALUES (${transitYardId}, ${orgId}, 'Transit Yard', 'Sialkot Road, Gujranwala, Punjab', false, ${userId})
  `;
  console.log("  ✓ 3 warehouses created");

  // ── Step 2: Products, Variants, Packaging, Daily Prices ─────────────────
  console.log("\nStep 2: Creating products, variants, packaging, and price history...");

  // Helper: insert product, return productId
  async function insertProduct({ name, category, baseUnit, minPriceMinor, basePriceMinor }) {
    const id = uuid();
    await sql`
      INSERT INTO product (id, org_id, name, category, base_unit, status, min_price_minor, base_price_minor, created_by)
      VALUES (${id}, ${orgId}, ${name}, ${category}, ${baseUnit}, 'active', ${minPriceMinor ?? null}, ${basePriceMinor ?? null}, ${userId})
    `;
    return id;
  }

  // Helper: insert variant, return variantId
  async function insertVariant({ productId, name, grade, minPriceMinor, basePriceMinor }) {
    const id = uuid();
    await sql`
      INSERT INTO product_variant (id, org_id, product_id, name, grade, status)
      VALUES (${id}, ${orgId}, ${productId}, ${name}, ${grade ?? null}, 'active')
    `;
    // Insert 3 price history entries
    await sql`
      INSERT INTO daily_price (id, org_id, product_id, variant_id, price_minor, effective_date, created_by)
      VALUES (${uuid()}, ${orgId}, ${productId}, ${id}, ${Math.round(basePriceMinor * 0.9)}, ${daysAgo(94)}, ${userId})
    `;
    await sql`
      INSERT INTO daily_price (id, org_id, product_id, variant_id, price_minor, effective_date, created_by)
      VALUES (${uuid()}, ${orgId}, ${productId}, ${id}, ${Math.round(basePriceMinor * 0.95)}, ${daysAgo(50)}, ${userId})
    `;
    await sql`
      INSERT INTO daily_price (id, org_id, product_id, variant_id, price_minor, effective_date, created_by)
      VALUES (${uuid()}, ${orgId}, ${productId}, ${id}, ${basePriceMinor}, ${daysAgo(33)}, ${userId})
    `;
    return { id, minPriceMinor, basePriceMinor };
  }

  // Helper: insert packaging option
  async function insertPackaging({ productId, name, factor }) {
    await sql`
      INSERT INTO packaging_option (id, org_id, product_id, name, factor)
      VALUES (${uuid()}, ${orgId}, ${productId}, ${name}, ${factor})
    `;
  }

  // ── 1. Super Basmati Paddy ──────────────────────────────────────────────
  const sbPaddyId = await insertProduct({ name: "Super Basmati Paddy", category: "Raw Input", baseUnit: "kg" });
  const sbPaddyGradeA = await insertVariant({ productId: sbPaddyId, name: "Grade A Premium", grade: "A", minPriceMinor: 7500, basePriceMinor: 9000 });
  const sbPaddyGradeB = await insertVariant({ productId: sbPaddyId, name: "Grade B Standard", grade: "B", minPriceMinor: 6000, basePriceMinor: 7500 });
  await insertPackaging({ productId: sbPaddyId, name: "40kg Bag (1 Maund)", factor: "40.0000" });
  await insertPackaging({ productId: sbPaddyId, name: "Bulk (per kg)", factor: "1.0000" });

  // ── 2. IRRI-6 Paddy ─────────────────────────────────────────────────────
  const irri6PaddyId = await insertProduct({ name: "IRRI-6 Paddy", category: "Raw Input", baseUnit: "kg" });
  const irri6PaddyStd = await insertVariant({ productId: irri6PaddyId, name: "Standard", minPriceMinor: 5000, basePriceMinor: 6000 });
  const irri6PaddyDried = await insertVariant({ productId: irri6PaddyId, name: "Moisture-Dried", minPriceMinor: 5500, basePriceMinor: 6500 });
  await insertPackaging({ productId: irri6PaddyId, name: "40kg Bag", factor: "40.0000" });
  await insertPackaging({ productId: irri6PaddyId, name: "Bulk", factor: "1.0000" });

  // ── 3. 1121 Basmati Paddy ────────────────────────────────────────────────
  const p1121PaddyId = await insertProduct({ name: "1121 Basmati Paddy", category: "Raw Input", baseUnit: "kg" });
  const p1121PaddyPrem = await insertVariant({ productId: p1121PaddyId, name: "Premium Grade", grade: "Premium", minPriceMinor: 10000, basePriceMinor: 12000 });
  await insertPackaging({ productId: p1121PaddyId, name: "40kg Bag", factor: "40.0000" });
  await insertPackaging({ productId: p1121PaddyId, name: "Bulk", factor: "1.0000" });

  // ── 4. Super Basmati Rice ────────────────────────────────────────────────
  const sbRiceId = await insertProduct({ name: "Super Basmati Rice", category: "Finished Good", baseUnit: "kg" });
  const sbRice25kg = await insertVariant({ productId: sbRiceId, name: "25kg Bag (Export)", minPriceMinor: 14000, basePriceMinor: 17000 });
  const sbRice50kg = await insertVariant({ productId: sbRiceId, name: "50kg Bag (Local)", minPriceMinor: 13000, basePriceMinor: 16000 });
  await insertPackaging({ productId: sbRiceId, name: "25kg Bag", factor: "25.0000" });
  await insertPackaging({ productId: sbRiceId, name: "50kg Bag", factor: "50.0000" });

  // ── 5. 1121 Basmati Rice ─────────────────────────────────────────────────
  const p1121RiceId = await insertProduct({ name: "1121 Basmati Rice", category: "Finished Good", baseUnit: "kg" });
  const p1121Rice25kg = await insertVariant({ productId: p1121RiceId, name: "25kg Bag", minPriceMinor: 18000, basePriceMinor: 22000 });
  const p1121Rice50kg = await insertVariant({ productId: p1121RiceId, name: "50kg Bag", minPriceMinor: 17000, basePriceMinor: 21000 });
  await insertPackaging({ productId: p1121RiceId, name: "25kg Bag", factor: "25.0000" });
  await insertPackaging({ productId: p1121RiceId, name: "50kg Bag", factor: "50.0000" });

  // ── 6. IRRI-6 Rice (Milled) ──────────────────────────────────────────────
  const irri6RiceId = await insertProduct({ name: "IRRI-6 Rice (Milled)", category: "Finished Good", baseUnit: "kg" });
  const irri6Rice50kg = await insertVariant({ productId: irri6RiceId, name: "50kg Bag", minPriceMinor: 9000, basePriceMinor: 11000 });
  const irri6RiceBulk = await insertVariant({ productId: irri6RiceId, name: "Bulk", minPriceMinor: 8500, basePriceMinor: 10500 });
  await insertPackaging({ productId: irri6RiceId, name: "50kg Bag", factor: "50.0000" });
  await insertPackaging({ productId: irri6RiceId, name: "Bulk", factor: "1.0000" });

  // ── 7. Parboiled IRRI Rice ───────────────────────────────────────────────
  const parboiledRiceId = await insertProduct({ name: "Parboiled IRRI Rice", category: "Finished Good", baseUnit: "kg" });
  const parboiledRice50kg = await insertVariant({ productId: parboiledRiceId, name: "50kg Bag", minPriceMinor: 9500, basePriceMinor: 11500 });
  await insertPackaging({ productId: parboiledRiceId, name: "50kg Bag", factor: "50.0000" });

  // ── 8. Broken Rice (Khanda) ──────────────────────────────────────────────
  const brokenRiceId = await insertProduct({ name: "Broken Rice (Khanda)", category: "By-product", baseUnit: "kg" });
  const brokenRiceFine = await insertVariant({ productId: brokenRiceId, name: "Fine Broken", minPriceMinor: 4000, basePriceMinor: 5500 });
  const brokenRiceCoarse = await insertVariant({ productId: brokenRiceId, name: "Coarse Broken", minPriceMinor: 3500, basePriceMinor: 4500 });
  await insertPackaging({ productId: brokenRiceId, name: "50kg Bag", factor: "50.0000" });
  await insertPackaging({ productId: brokenRiceId, name: "Bulk", factor: "1.0000" });

  // ── 9. Rice Bran (Chokar) ────────────────────────────────────────────────
  const riceBranId = await insertProduct({ name: "Rice Bran (Chokar)", category: "By-product", baseUnit: "kg" });
  const riceBranFresh = await insertVariant({ productId: riceBranId, name: "Fresh Bran", minPriceMinor: 2800, basePriceMinor: 3500 });
  await insertPackaging({ productId: riceBranId, name: "40kg Bag", factor: "40.0000" });
  await insertPackaging({ productId: riceBranId, name: "Bulk", factor: "1.0000" });

  // ── 10. Rice Polish (Pholi) ──────────────────────────────────────────────
  const ricePolishId = await insertProduct({ name: "Rice Polish (Pholi)", category: "By-product", baseUnit: "kg" });
  const ricePolishStd = await insertVariant({ productId: ricePolishId, name: "Standard", minPriceMinor: 2500, basePriceMinor: 3200 });
  await insertPackaging({ productId: ricePolishId, name: "40kg Bag", factor: "40.0000" });

  // ── 11. Rice Husk ────────────────────────────────────────────────────────
  const riceHuskId = await insertProduct({ name: "Rice Husk", category: "By-product", baseUnit: "kg" });
  const riceHuskStd = await insertVariant({ productId: riceHuskId, name: "Standard", minPriceMinor: 500, basePriceMinor: 800 });
  await insertPackaging({ productId: riceHuskId, name: "Bulk", factor: "1.0000" });

  console.log("  ✓ 11 products, variants, packaging, and price history created");

  // ── Step 3: Suppliers ─────────────────────────────────────────────────────
  console.log("\nStep 3: Creating suppliers...");

  const sup1Id = uuid(); // Muhammad Aslam & Sons
  await sql`
    INSERT INTO supplier (id, org_id, type, name, business_name, phone, address, status, created_by)
    VALUES (${sup1Id}, ${orgId}, 'farmer', 'Muhammad Aslam', 'Muhammad Aslam & Sons', '+92-300-4521876', 'Hafizabad, Punjab', 'active', ${userId})
  `;
  const sup2Id = uuid(); // Chaudhry Brothers Grain
  await sql`
    INSERT INTO supplier (id, org_id, type, name, business_name, phone, address, status, created_by)
    VALUES (${sup2Id}, ${orgId}, 'trader', 'Chaudhry Brothers', 'Chaudhry Brothers Grain', '+92-321-6543210', 'Gujranwala, Punjab', 'active', ${userId})
  `;
  const sup3Id = uuid(); // Punjab Agri Cooperative
  await sql`
    INSERT INTO supplier (id, org_id, type, name, business_name, phone, address, status, created_by)
    VALUES (${sup3Id}, ${orgId}, 'supplier', 'Punjab Agri Cooperative', 'Punjab Agri Cooperative', '+92-333-9871234', 'Sheikhupura, Punjab', 'active', ${userId})
  `;
  const sup4Id = uuid(); // Sindh Harvest Traders
  await sql`
    INSERT INTO supplier (id, org_id, type, name, business_name, phone, address, status, created_by)
    VALUES (${sup4Id}, ${orgId}, 'trader', 'Sindh Harvest Traders', 'Sindh Harvest Traders', '+92-312-7896543', 'Sukkur, Sindh', 'active', ${userId})
  `;
  const sup5Id = uuid(); // Ali Brothers Farm
  await sql`
    INSERT INTO supplier (id, org_id, type, name, business_name, phone, address, status, created_by)
    VALUES (${sup5Id}, ${orgId}, 'farmer', 'Ali Brothers', 'Ali Brothers Farm', '+92-345-1234567', 'Hafizabad, Punjab', 'active', ${userId})
  `;

  console.log("  ✓ 5 suppliers created");

  // ── Step 4: Customers ─────────────────────────────────────────────────────
  console.log("\nStep 4: Creating customers...");

  const cust1Id = uuid(); // Al-Barkat Rice Traders
  await sql`
    INSERT INTO customer (id, org_id, name, business_name, phone, city, credit_limit_minor, status, created_by)
    VALUES (${cust1Id}, ${orgId}, 'Al-Barkat Rice Traders', 'Al-Barkat Rice Traders', '+92-21-35621478', 'Karachi', 100000000, 'active', ${userId})
  `;
  const cust2Id = uuid(); // Mian Brothers & Co
  await sql`
    INSERT INTO customer (id, org_id, name, business_name, phone, city, credit_limit_minor, status, created_by)
    VALUES (${cust2Id}, ${orgId}, 'Mian Brothers & Co', 'Mian Brothers & Co', '+92-42-37651234', 'Lahore', 50000000, 'active', ${userId})
  `;
  const cust3Id = uuid(); // Zafar Grain House
  await sql`
    INSERT INTO customer (id, org_id, name, business_name, phone, city, credit_limit_minor, status, created_by)
    VALUES (${cust3Id}, ${orgId}, 'Zafar Grain House', 'Zafar Grain House', '+92-61-4521897', 'Multan', 30000000, 'active', ${userId})
  `;
  const cust4Id = uuid(); // Pak Export Rice Mills
  await sql`
    INSERT INTO customer (id, org_id, name, business_name, phone, city, credit_limit_minor, status, created_by)
    VALUES (${cust4Id}, ${orgId}, 'Pak Export Rice Mills', 'Pak Export Rice Mills', '+92-41-8765432', 'Faisalabad', 200000000, 'active', ${userId})
  `;
  const cust5Id = uuid(); // Hussain Trading Company
  await sql`
    INSERT INTO customer (id, org_id, name, business_name, phone, city, credit_limit_minor, status, created_by)
    VALUES (${cust5Id}, ${orgId}, 'Hussain Trading Company', 'Hussain Trading Company', '+92-51-4523698', 'Rawalpindi', 25000000, 'active', ${userId})
  `;
  const cust6Id = uuid(); // Bismillah Rice Center
  await sql`
    INSERT INTO customer (id, org_id, name, business_name, phone, city, credit_limit_minor, status, created_by)
    VALUES (${cust6Id}, ${orgId}, 'Bismillah Rice Center', 'Bismillah Rice Center', '+92-22-3697412', 'Hyderabad', 20000000, 'active', ${userId})
  `;
  const cust7Id = uuid(); // Shah Grain Merchants
  await sql`
    INSERT INTO customer (id, org_id, name, business_name, phone, city, credit_limit_minor, status, created_by)
    VALUES (${cust7Id}, ${orgId}, 'Shah Grain Merchants', 'Shah Grain Merchants', '+92-81-2874512', 'Quetta', 40000000, 'active', ${userId})
  `;
  const cust8Id = uuid(); // Noor Trading Co
  await sql`
    INSERT INTO customer (id, org_id, name, business_name, phone, city, credit_limit_minor, status, created_by)
    VALUES (${cust8Id}, ${orgId}, 'Noor Trading Co', 'Noor Trading Co', '+92-52-4512369', 'Sialkot', 15000000, 'active', ${userId})
  `;

  console.log("  ✓ 8 customers created");

  // ── Step 5: Inventory Transactions ────────────────────────────────────────
  console.log("\nStep 5: Inserting inventory transactions...");

  // Helper for inventory_transaction insert
  async function insertTx({ productId, variantId, warehouseId, qtyDelta, type, unitCostMinor, refType, refId, reason, createdAt }) {
    const id = uuid();
    if (createdAt) {
      await sql`
        INSERT INTO inventory_transaction
          (id, org_id, product_id, variant_id, warehouse_id, quantity_delta, type, unit_cost_minor, ref_type, ref_id, reason, created_by, created_at)
        VALUES (${id}, ${orgId}, ${productId}, ${variantId ?? null}, ${warehouseId}, ${qtyDelta}, ${type}, ${unitCostMinor ?? null}, ${refType ?? null}, ${refId ?? null}, ${reason ?? null}, ${userId}, ${createdAt})
      `;
    } else {
      await sql`
        INSERT INTO inventory_transaction
          (id, org_id, product_id, variant_id, warehouse_id, quantity_delta, type, unit_cost_minor, ref_type, ref_id, reason, created_by)
        VALUES (${id}, ${orgId}, ${productId}, ${variantId ?? null}, ${warehouseId}, ${qtyDelta}, ${type}, ${unitCostMinor ?? null}, ${refType ?? null}, ${refId ?? null}, ${reason ?? null}, ${userId})
      `;
    }
    return id;
  }

  // ── Opening Stock (March 31, 2026 = 95 days ago) — Main Mill Warehouse ──
  await insertTx({ productId: sbPaddyId, variantId: sbPaddyGradeA.id, warehouseId: mainWhId, qtyDelta: "15000.000", type: "opening", unitCostMinor: 8200, refType: "opening_stock", createdAt: daysAgo(95) + "T00:00:00.000Z" });
  await insertTx({ productId: sbPaddyId, variantId: sbPaddyGradeB.id, warehouseId: mainWhId, qtyDelta: "8000.000", type: "opening", unitCostMinor: 7000, refType: "opening_stock", createdAt: daysAgo(95) + "T00:00:00.000Z" });
  await insertTx({ productId: irri6PaddyId, variantId: irri6PaddyStd.id, warehouseId: mainWhId, qtyDelta: "20000.000", type: "opening", unitCostMinor: 5500, refType: "opening_stock", createdAt: daysAgo(95) + "T00:00:00.000Z" });
  await insertTx({ productId: p1121PaddyId, variantId: p1121PaddyPrem.id, warehouseId: mainWhId, qtyDelta: "5000.000", type: "opening", unitCostMinor: 11000, refType: "opening_stock", createdAt: daysAgo(95) + "T00:00:00.000Z" });
  await insertTx({ productId: sbRiceId, variantId: sbRice25kg.id, warehouseId: mainWhId, qtyDelta: "3000.000", type: "opening", unitCostMinor: 15500, refType: "opening_stock", createdAt: daysAgo(95) + "T00:00:00.000Z" });
  await insertTx({ productId: irri6RiceId, variantId: irri6Rice50kg.id, warehouseId: mainWhId, qtyDelta: "5000.000", type: "opening", unitCostMinor: 9200, refType: "opening_stock", createdAt: daysAgo(95) + "T00:00:00.000Z" });
  await insertTx({ productId: brokenRiceId, variantId: brokenRiceFine.id, warehouseId: mainWhId, qtyDelta: "2000.000", type: "opening", unitCostMinor: 4800, refType: "opening_stock", createdAt: daysAgo(95) + "T00:00:00.000Z" });
  await insertTx({ productId: riceBranId, variantId: riceBranFresh.id, warehouseId: mainWhId, qtyDelta: "1500.000", type: "opening", unitCostMinor: 3000, refType: "opening_stock", createdAt: daysAgo(95) + "T00:00:00.000Z" });

  // ── Opening Stock — Cold Storage Facility ────────────────────────────────
  await insertTx({ productId: sbRiceId, variantId: sbRice25kg.id, warehouseId: coldStoreId, qtyDelta: "8000.000", type: "opening", unitCostMinor: 15500, refType: "opening_stock", createdAt: daysAgo(95) + "T00:00:00.000Z" });
  await insertTx({ productId: p1121RiceId, variantId: p1121Rice25kg.id, warehouseId: coldStoreId, qtyDelta: "3000.000", type: "opening", unitCostMinor: 20000, refType: "opening_stock", createdAt: daysAgo(95) + "T00:00:00.000Z" });
  await insertTx({ productId: irri6RiceId, variantId: irri6Rice50kg.id, warehouseId: coldStoreId, qtyDelta: "4000.000", type: "opening", unitCostMinor: 9200, refType: "opening_stock", createdAt: daysAgo(95) + "T00:00:00.000Z" });

  console.log("  ✓ Opening stock inserted (Main Mill + Cold Storage)");

  // ── April Purchases (85–75 days ago) ─────────────────────────────────────
  await insertTx({ productId: sbPaddyId, variantId: sbPaddyGradeA.id, warehouseId: mainWhId, qtyDelta: "25000.000", type: "purchase", unitCostMinor: 8500, refType: "supplier", refId: sup1Id, reason: "April purchase from Muhammad Aslam & Sons", createdAt: daysAgo(85) + "T00:00:00.000Z" });
  await insertTx({ productId: irri6PaddyId, variantId: irri6PaddyStd.id, warehouseId: mainWhId, qtyDelta: "30000.000", type: "purchase", unitCostMinor: 5800, refType: "supplier", refId: sup2Id, reason: "April purchase from Chaudhry Brothers Grain", createdAt: daysAgo(80) + "T00:00:00.000Z" });
  await insertTx({ productId: p1121PaddyId, variantId: p1121PaddyPrem.id, warehouseId: mainWhId, qtyDelta: "10000.000", type: "purchase", unitCostMinor: 11500, refType: "supplier", refId: sup3Id, reason: "April purchase from Punjab Agri Cooperative", createdAt: daysAgo(75) + "T00:00:00.000Z" });

  // ── May Purchases (65–55 days ago) ───────────────────────────────────────
  await insertTx({ productId: sbPaddyId, variantId: sbPaddyGradeA.id, warehouseId: mainWhId, qtyDelta: "20000.000", type: "purchase", unitCostMinor: 8800, refType: "supplier", refId: sup5Id, reason: "May purchase from Ali Brothers Farm", createdAt: daysAgo(65) + "T00:00:00.000Z" });
  await insertTx({ productId: irri6PaddyId, variantId: irri6PaddyDried.id, warehouseId: mainWhId, qtyDelta: "15000.000", type: "purchase", unitCostMinor: 6200, refType: "supplier", refId: sup4Id, reason: "May purchase from Sindh Harvest Traders", createdAt: daysAgo(60) + "T00:00:00.000Z" });
  await insertTx({ productId: sbPaddyId, variantId: sbPaddyGradeB.id, warehouseId: mainWhId, qtyDelta: "12000.000", type: "purchase", unitCostMinor: 7200, refType: "supplier", refId: sup1Id, reason: "May purchase from Muhammad Aslam & Sons", createdAt: daysAgo(55) + "T00:00:00.000Z" });

  // ── June Purchases (35–25 days ago) ──────────────────────────────────────
  await insertTx({ productId: sbPaddyId, variantId: sbPaddyGradeA.id, warehouseId: mainWhId, qtyDelta: "18000.000", type: "purchase", unitCostMinor: 9000, refType: "supplier", refId: sup2Id, reason: "June purchase from Chaudhry Brothers Grain", createdAt: daysAgo(35) + "T00:00:00.000Z" });
  await insertTx({ productId: p1121PaddyId, variantId: p1121PaddyPrem.id, warehouseId: mainWhId, qtyDelta: "8000.000", type: "purchase", unitCostMinor: 12000, refType: "supplier", refId: sup3Id, reason: "June purchase from Punjab Agri Cooperative", createdAt: daysAgo(25) + "T00:00:00.000Z" });

  console.log("  ✓ Purchases inserted (April, May, June)");

  // ── Stock Adjustments ────────────────────────────────────────────────────
  await insertTx({ productId: irri6PaddyId, variantId: irri6PaddyStd.id, warehouseId: mainWhId, qtyDelta: "-500.000", type: "adjustment", reason: "Damage - moisture loss", createdAt: daysAgo(60) + "T00:00:00.000Z" });
  await insertTx({ productId: sbRiceId, variantId: sbRice25kg.id, warehouseId: coldStoreId, qtyDelta: "-200.000", type: "adjustment", reason: "Quality rejection", createdAt: daysAgo(40) + "T00:00:00.000Z" });
  await insertTx({ productId: riceBranId, variantId: riceBranFresh.id, warehouseId: mainWhId, qtyDelta: "-300.000", type: "adjustment", reason: "Spillage", createdAt: daysAgo(30) + "T00:00:00.000Z" });

  console.log("  ✓ Stock adjustments inserted");
  console.log("  ✓ All inventory transactions done");

  // ── Step 6: Production Batches ────────────────────────────────────────────
  console.log("\nStep 6: Creating production batches...");

  // ── Batch 1: BATCH-2026-001 (85 days ago) ────────────────────────────────
  const batch1Id = uuid();
  await sql`
    INSERT INTO production_batch (id, org_id, batch_number, warehouse_id, production_date, added_cost_minor, allocation_method, status, created_by)
    VALUES (${batch1Id}, ${orgId}, 'BATCH-2026-001', ${mainWhId}, ${daysAgo(85)}, 800000, 'value', 'completed', ${userId})
  `;
  // Input
  await sql`
    INSERT INTO production_input (id, org_id, batch_id, product_id, variant_id, quantity, unit_cost_minor)
    VALUES (${uuid()}, ${orgId}, ${batch1Id}, ${sbPaddyId}, ${sbPaddyGradeA.id}, '8000.000', 8200)
  `;
  await insertTx({ productId: sbPaddyId, variantId: sbPaddyGradeA.id, warehouseId: mainWhId, qtyDelta: "-8000.000", type: "production_out", unitCostMinor: 8200, refType: "production_batch", refId: batch1Id, reason: "Input for BATCH-2026-001", createdAt: daysAgo(85) + "T00:00:00.000Z" });
  // Outputs
  const batch1Outputs = [
    { productId: sbRiceId, variantId: sbRice25kg.id, qty: "5000.000", allocatedCost: 16500, name: "Super Basmati Rice 25kg" },
    { productId: brokenRiceId, variantId: brokenRiceFine.id, qty: "800.000", allocatedCost: 5000, name: "Broken Rice Fine" },
    { productId: riceBranId, variantId: riceBranFresh.id, qty: "1200.000", allocatedCost: 3200, name: "Rice Bran Fresh" },
    { productId: ricePolishId, variantId: ricePolishStd.id, qty: "600.000", allocatedCost: 2800, name: "Rice Polish" },
    { productId: riceHuskId, variantId: riceHuskStd.id, qty: "400.000", allocatedCost: 700, name: "Rice Husk" },
  ];
  for (const o of batch1Outputs) {
    await sql`
      INSERT INTO production_output (id, org_id, batch_id, product_id, variant_id, quantity, allocated_cost_minor, is_waste)
      VALUES (${uuid()}, ${orgId}, ${batch1Id}, ${o.productId}, ${o.variantId}, ${o.qty}, ${o.allocatedCost}, false)
    `;
    await insertTx({ productId: o.productId, variantId: o.variantId, warehouseId: mainWhId, qtyDelta: o.qty, type: "production_in", unitCostMinor: o.allocatedCost, refType: "production_batch", refId: batch1Id, reason: `Output from BATCH-2026-001: ${o.name}`, createdAt: daysAgo(85) + "T00:00:00.000Z" });
  }
  console.log("  ✓ BATCH-2026-001 (85 days ago, Super Basmati Paddy → Rice)");

  // ── Batch 2: BATCH-2026-002 (70 days ago) ────────────────────────────────
  const batch2Id = uuid();
  await sql`
    INSERT INTO production_batch (id, org_id, batch_number, warehouse_id, production_date, added_cost_minor, allocation_method, status, created_by)
    VALUES (${batch2Id}, ${orgId}, 'BATCH-2026-002', ${mainWhId}, ${daysAgo(70)}, 600000, 'weight', 'completed', ${userId})
  `;
  await sql`
    INSERT INTO production_input (id, org_id, batch_id, product_id, variant_id, quantity, unit_cost_minor)
    VALUES (${uuid()}, ${orgId}, ${batch2Id}, ${irri6PaddyId}, ${irri6PaddyStd.id}, '10000.000', 5500)
  `;
  await insertTx({ productId: irri6PaddyId, variantId: irri6PaddyStd.id, warehouseId: mainWhId, qtyDelta: "-10000.000", type: "production_out", unitCostMinor: 5500, refType: "production_batch", refId: batch2Id, reason: "Input for BATCH-2026-002", createdAt: daysAgo(70) + "T00:00:00.000Z" });
  const batch2Outputs = [
    { productId: irri6RiceId, variantId: irri6Rice50kg.id, qty: "6500.000", allocatedCost: 9500, name: "IRRI-6 Rice 50kg" },
    { productId: brokenRiceId, variantId: brokenRiceCoarse.id, qty: "1000.000", allocatedCost: 4200, name: "Broken Rice Coarse" },
    { productId: riceBranId, variantId: riceBranFresh.id, qty: "1500.000", allocatedCost: 3100, name: "Rice Bran Fresh" },
    { productId: riceHuskId, variantId: riceHuskStd.id, qty: "800.000", allocatedCost: 700, name: "Rice Husk" },
  ];
  for (const o of batch2Outputs) {
    await sql`
      INSERT INTO production_output (id, org_id, batch_id, product_id, variant_id, quantity, allocated_cost_minor, is_waste)
      VALUES (${uuid()}, ${orgId}, ${batch2Id}, ${o.productId}, ${o.variantId}, ${o.qty}, ${o.allocatedCost}, false)
    `;
    await insertTx({ productId: o.productId, variantId: o.variantId, warehouseId: mainWhId, qtyDelta: o.qty, type: "production_in", unitCostMinor: o.allocatedCost, refType: "production_batch", refId: batch2Id, reason: `Output from BATCH-2026-002: ${o.name}`, createdAt: daysAgo(70) + "T00:00:00.000Z" });
  }
  console.log("  ✓ BATCH-2026-002 (70 days ago, IRRI-6 Paddy → Rice)");

  // ── Batch 3: BATCH-2026-003 (50 days ago) ────────────────────────────────
  const batch3Id = uuid();
  await sql`
    INSERT INTO production_batch (id, org_id, batch_number, warehouse_id, production_date, added_cost_minor, allocation_method, status, created_by)
    VALUES (${batch3Id}, ${orgId}, 'BATCH-2026-003', ${mainWhId}, ${daysAgo(50)}, 1200000, 'value', 'completed', ${userId})
  `;
  await sql`
    INSERT INTO production_input (id, org_id, batch_id, product_id, variant_id, quantity, unit_cost_minor)
    VALUES (${uuid()}, ${orgId}, ${batch3Id}, ${p1121PaddyId}, ${p1121PaddyPrem.id}, '6000.000', 11500)
  `;
  await insertTx({ productId: p1121PaddyId, variantId: p1121PaddyPrem.id, warehouseId: mainWhId, qtyDelta: "-6000.000", type: "production_out", unitCostMinor: 11500, refType: "production_batch", refId: batch3Id, reason: "Input for BATCH-2026-003", createdAt: daysAgo(50) + "T00:00:00.000Z" });
  const batch3Outputs = [
    { productId: p1121RiceId, variantId: p1121Rice25kg.id, qty: "3800.000", allocatedCost: 20500, name: "1121 Basmati Rice 25kg" },
    { productId: brokenRiceId, variantId: brokenRiceFine.id, qty: "600.000", allocatedCost: 5200, name: "Broken Rice Fine" },
    { productId: riceBranId, variantId: riceBranFresh.id, qty: "900.000", allocatedCost: 3300, name: "Rice Bran Fresh" },
    { productId: ricePolishId, variantId: ricePolishStd.id, qty: "400.000", allocatedCost: 2900, name: "Rice Polish" },
    { productId: riceHuskId, variantId: riceHuskStd.id, qty: "300.000", allocatedCost: 700, name: "Rice Husk" },
  ];
  for (const o of batch3Outputs) {
    await sql`
      INSERT INTO production_output (id, org_id, batch_id, product_id, variant_id, quantity, allocated_cost_minor, is_waste)
      VALUES (${uuid()}, ${orgId}, ${batch3Id}, ${o.productId}, ${o.variantId}, ${o.qty}, ${o.allocatedCost}, false)
    `;
    await insertTx({ productId: o.productId, variantId: o.variantId, warehouseId: mainWhId, qtyDelta: o.qty, type: "production_in", unitCostMinor: o.allocatedCost, refType: "production_batch", refId: batch3Id, reason: `Output from BATCH-2026-003: ${o.name}`, createdAt: daysAgo(50) + "T00:00:00.000Z" });
  }
  console.log("  ✓ BATCH-2026-003 (50 days ago, 1121 Basmati Paddy → Rice)");

  // ── Batch 4: BATCH-2026-004 (30 days ago) ────────────────────────────────
  const batch4Id = uuid();
  await sql`
    INSERT INTO production_batch (id, org_id, batch_number, warehouse_id, production_date, added_cost_minor, allocation_method, status, created_by)
    VALUES (${batch4Id}, ${orgId}, 'BATCH-2026-004', ${mainWhId}, ${daysAgo(30)}, 1000000, 'value', 'completed', ${userId})
  `;
  await sql`
    INSERT INTO production_input (id, org_id, batch_id, product_id, variant_id, quantity, unit_cost_minor)
    VALUES (${uuid()}, ${orgId}, ${batch4Id}, ${sbPaddyId}, ${sbPaddyGradeA.id}, '10000.000', 8800)
  `;
  await insertTx({ productId: sbPaddyId, variantId: sbPaddyGradeA.id, warehouseId: mainWhId, qtyDelta: "-10000.000", type: "production_out", unitCostMinor: 8800, refType: "production_batch", refId: batch4Id, reason: "Input for BATCH-2026-004", createdAt: daysAgo(30) + "T00:00:00.000Z" });
  const batch4Outputs = [
    { productId: sbRiceId, variantId: sbRice25kg.id, qty: "6200.000", allocatedCost: 17000, name: "Super Basmati Rice 25kg" },
    { productId: brokenRiceId, variantId: brokenRiceFine.id, qty: "1000.000", allocatedCost: 5300, name: "Broken Rice Fine" },
    { productId: riceBranId, variantId: riceBranFresh.id, qty: "1500.000", allocatedCost: 3400, name: "Rice Bran Fresh" },
    { productId: ricePolishId, variantId: ricePolishStd.id, qty: "800.000", allocatedCost: 3000, name: "Rice Polish" },
    { productId: riceHuskId, variantId: riceHuskStd.id, qty: "500.000", allocatedCost: 700, name: "Rice Husk" },
  ];
  for (const o of batch4Outputs) {
    await sql`
      INSERT INTO production_output (id, org_id, batch_id, product_id, variant_id, quantity, allocated_cost_minor, is_waste)
      VALUES (${uuid()}, ${orgId}, ${batch4Id}, ${o.productId}, ${o.variantId}, ${o.qty}, ${o.allocatedCost}, false)
    `;
    await insertTx({ productId: o.productId, variantId: o.variantId, warehouseId: mainWhId, qtyDelta: o.qty, type: "production_in", unitCostMinor: o.allocatedCost, refType: "production_batch", refId: batch4Id, reason: `Output from BATCH-2026-004: ${o.name}`, createdAt: daysAgo(30) + "T00:00:00.000Z" });
  }
  console.log("  ✓ BATCH-2026-004 (30 days ago, Super Basmati Paddy → Rice)");
  console.log("  ✓ 4 production batches created");

  // ── Step 7: Orders ────────────────────────────────────────────────────────
  console.log("\nStep 7: Creating orders...");

  // ORD-0001 completed — Al-Barkat — Super Basmati Rice 25kg × 1000 kg @ Rs 170
  const ord1Id = uuid();
  const ord1Line1Id = uuid();
  await sql`
    INSERT INTO "order" (id, org_id, order_number, customer_id, status, confirmed_at, completed_at, created_by, created_at)
    VALUES (${ord1Id}, ${orgId}, 'ORD-0001', ${cust1Id}, 'completed',
      ${daysAgo(78) + "T00:00:00.000Z"}, ${daysAgo(75) + "T00:00:00.000Z"}, ${userId}, ${daysAgo(80) + "T00:00:00.000Z"})
  `;
  await sql`
    INSERT INTO order_line (id, org_id, order_id, product_id, variant_id, warehouse_id, qty_ordered, qty_dispatched, qty_delivered, unit_price_minor, line_total_minor)
    VALUES (${ord1Line1Id}, ${orgId}, ${ord1Id}, ${sbRiceId}, ${sbRice25kg.id}, ${mainWhId}, '1000.000', '1000.000', '1000.000', 17000, 17000000)
  `;
  await insertTx({ productId: sbRiceId, variantId: sbRice25kg.id, warehouseId: mainWhId, qtyDelta: "-1000.000", type: "dispatch", refType: "order", refId: ord1Id, reason: "Dispatch ORD-0001", createdAt: daysAgo(77) + "T00:00:00.000Z" });
  console.log("  ✓ ORD-0001 (completed) — Al-Barkat, 1000 kg Super Basmati Rice @ Rs 170/kg");

  // ORD-0002 completed — Pak Export — 1121 Basmati × 500 kg + IRRI-6 × 2000 kg
  const ord2Id = uuid();
  const ord2Line1Id = uuid();
  const ord2Line2Id = uuid();
  await sql`
    INSERT INTO "order" (id, org_id, order_number, customer_id, status, confirmed_at, completed_at, created_by, created_at)
    VALUES (${ord2Id}, ${orgId}, 'ORD-0002', ${cust4Id}, 'completed',
      ${daysAgo(73) + "T00:00:00.000Z"}, ${daysAgo(70) + "T00:00:00.000Z"}, ${userId}, ${daysAgo(75) + "T00:00:00.000Z"})
  `;
  await sql`
    INSERT INTO order_line (id, org_id, order_id, product_id, variant_id, warehouse_id, qty_ordered, qty_dispatched, qty_delivered, unit_price_minor, line_total_minor)
    VALUES (${ord2Line1Id}, ${orgId}, ${ord2Id}, ${p1121RiceId}, ${p1121Rice25kg.id}, ${mainWhId}, '500.000', '500.000', '500.000', 22000, 11000000)
  `;
  await sql`
    INSERT INTO order_line (id, org_id, order_id, product_id, variant_id, warehouse_id, qty_ordered, qty_dispatched, qty_delivered, unit_price_minor, line_total_minor)
    VALUES (${ord2Line2Id}, ${orgId}, ${ord2Id}, ${irri6RiceId}, ${irri6Rice50kg.id}, ${mainWhId}, '2000.000', '2000.000', '2000.000', 11000, 22000000)
  `;
  await insertTx({ productId: p1121RiceId, variantId: p1121Rice25kg.id, warehouseId: mainWhId, qtyDelta: "-500.000", type: "dispatch", refType: "order", refId: ord2Id, reason: "Dispatch ORD-0002", createdAt: daysAgo(73) + "T00:00:00.000Z" });
  await insertTx({ productId: irri6RiceId, variantId: irri6Rice50kg.id, warehouseId: mainWhId, qtyDelta: "-2000.000", type: "dispatch", refType: "order", refId: ord2Id, reason: "Dispatch ORD-0002", createdAt: daysAgo(73) + "T00:00:00.000Z" });
  console.log("  ✓ ORD-0002 (completed) — Pak Export, 500 kg 1121 Rice + 2000 kg IRRI-6 Rice");

  // ORD-0003 completed — Mian Brothers — SB Rice 50kg × 1500 kg + Broken Fine × 500 kg
  const ord3Id = uuid();
  const ord3Line1Id = uuid();
  const ord3Line2Id = uuid();
  await sql`
    INSERT INTO "order" (id, org_id, order_number, customer_id, status, confirmed_at, completed_at, created_by, created_at)
    VALUES (${ord3Id}, ${orgId}, 'ORD-0003', ${cust2Id}, 'completed',
      ${daysAgo(58) + "T00:00:00.000Z"}, ${daysAgo(55) + "T00:00:00.000Z"}, ${userId}, ${daysAgo(60) + "T00:00:00.000Z"})
  `;
  await sql`
    INSERT INTO order_line (id, org_id, order_id, product_id, variant_id, warehouse_id, qty_ordered, qty_dispatched, qty_delivered, unit_price_minor, line_total_minor)
    VALUES (${ord3Line1Id}, ${orgId}, ${ord3Id}, ${sbRiceId}, ${sbRice50kg.id}, ${mainWhId}, '1500.000', '1500.000', '1500.000', 16000, 24000000)
  `;
  await sql`
    INSERT INTO order_line (id, org_id, order_id, product_id, variant_id, warehouse_id, qty_ordered, qty_dispatched, qty_delivered, unit_price_minor, line_total_minor)
    VALUES (${ord3Line2Id}, ${orgId}, ${ord3Id}, ${brokenRiceId}, ${brokenRiceFine.id}, ${mainWhId}, '500.000', '500.000', '500.000', 5500, 2750000)
  `;
  await insertTx({ productId: sbRiceId, variantId: sbRice50kg.id, warehouseId: mainWhId, qtyDelta: "-1500.000", type: "dispatch", refType: "order", refId: ord3Id, reason: "Dispatch ORD-0003", createdAt: daysAgo(58) + "T00:00:00.000Z" });
  await insertTx({ productId: brokenRiceId, variantId: brokenRiceFine.id, warehouseId: mainWhId, qtyDelta: "-500.000", type: "dispatch", refType: "order", refId: ord3Id, reason: "Dispatch ORD-0003", createdAt: daysAgo(58) + "T00:00:00.000Z" });
  console.log("  ✓ ORD-0003 (completed) — Mian Brothers, 1500 kg SB Rice 50kg + 500 kg Broken Rice");

  // ORD-0004 completed — Zafar Grain House — IRRI-6 Rice 50kg × 3000 kg
  const ord4Id = uuid();
  const ord4Line1Id = uuid();
  await sql`
    INSERT INTO "order" (id, org_id, order_number, customer_id, status, confirmed_at, completed_at, created_by, created_at)
    VALUES (${ord4Id}, ${orgId}, 'ORD-0004', ${cust3Id}, 'completed',
      ${daysAgo(53) + "T00:00:00.000Z"}, ${daysAgo(50) + "T00:00:00.000Z"}, ${userId}, ${daysAgo(55) + "T00:00:00.000Z"})
  `;
  await sql`
    INSERT INTO order_line (id, org_id, order_id, product_id, variant_id, warehouse_id, qty_ordered, qty_dispatched, qty_delivered, unit_price_minor, line_total_minor)
    VALUES (${ord4Line1Id}, ${orgId}, ${ord4Id}, ${irri6RiceId}, ${irri6Rice50kg.id}, ${mainWhId}, '3000.000', '3000.000', '3000.000', 11000, 33000000)
  `;
  await insertTx({ productId: irri6RiceId, variantId: irri6Rice50kg.id, warehouseId: mainWhId, qtyDelta: "-3000.000", type: "dispatch", refType: "order", refId: ord4Id, reason: "Dispatch ORD-0004", createdAt: daysAgo(53) + "T00:00:00.000Z" });
  console.log("  ✓ ORD-0004 (completed) — Zafar Grain, 3000 kg IRRI-6 Rice @ Rs 110/kg");

  // ORD-0005 completed — Shah Grain — 1121 × 800 kg + SB Rice × 600 kg
  const ord5Id = uuid();
  const ord5Line1Id = uuid();
  const ord5Line2Id = uuid();
  await sql`
    INSERT INTO "order" (id, org_id, order_number, customer_id, status, confirmed_at, completed_at, created_by, created_at)
    VALUES (${ord5Id}, ${orgId}, 'ORD-0005', ${cust7Id}, 'completed',
      ${daysAgo(43) + "T00:00:00.000Z"}, ${daysAgo(40) + "T00:00:00.000Z"}, ${userId}, ${daysAgo(45) + "T00:00:00.000Z"})
  `;
  await sql`
    INSERT INTO order_line (id, org_id, order_id, product_id, variant_id, warehouse_id, qty_ordered, qty_dispatched, qty_delivered, unit_price_minor, line_total_minor)
    VALUES (${ord5Line1Id}, ${orgId}, ${ord5Id}, ${p1121RiceId}, ${p1121Rice25kg.id}, ${mainWhId}, '800.000', '800.000', '800.000', 21500, 17200000)
  `;
  await sql`
    INSERT INTO order_line (id, org_id, order_id, product_id, variant_id, warehouse_id, qty_ordered, qty_dispatched, qty_delivered, unit_price_minor, line_total_minor)
    VALUES (${ord5Line2Id}, ${orgId}, ${ord5Id}, ${sbRiceId}, ${sbRice25kg.id}, ${mainWhId}, '600.000', '600.000', '600.000', 16500, 9900000)
  `;
  await insertTx({ productId: p1121RiceId, variantId: p1121Rice25kg.id, warehouseId: mainWhId, qtyDelta: "-800.000", type: "dispatch", refType: "order", refId: ord5Id, reason: "Dispatch ORD-0005", createdAt: daysAgo(43) + "T00:00:00.000Z" });
  await insertTx({ productId: sbRiceId, variantId: sbRice25kg.id, warehouseId: mainWhId, qtyDelta: "-600.000", type: "dispatch", refType: "order", refId: ord5Id, reason: "Dispatch ORD-0005", createdAt: daysAgo(43) + "T00:00:00.000Z" });
  console.log("  ✓ ORD-0005 (completed) — Shah Grain, 800 kg 1121 Rice + 600 kg SB Rice");

  // ORD-0006 dispatched — Al-Barkat — SB Rice 25kg × 2000 kg @ Rs 175
  const ord6Id = uuid();
  const ord6Line1Id = uuid();
  await sql`
    INSERT INTO "order" (id, org_id, order_number, customer_id, status, confirmed_at, created_by, created_at)
    VALUES (${ord6Id}, ${orgId}, 'ORD-0006', ${cust1Id}, 'dispatched',
      ${daysAgo(23) + "T00:00:00.000Z"}, ${userId}, ${daysAgo(25) + "T00:00:00.000Z"})
  `;
  await sql`
    INSERT INTO order_line (id, org_id, order_id, product_id, variant_id, warehouse_id, qty_ordered, qty_dispatched, qty_delivered, unit_price_minor, line_total_minor)
    VALUES (${ord6Line1Id}, ${orgId}, ${ord6Id}, ${sbRiceId}, ${sbRice25kg.id}, ${mainWhId}, '2000.000', '2000.000', '0.000', 17500, 35000000)
  `;
  await insertTx({ productId: sbRiceId, variantId: sbRice25kg.id, warehouseId: mainWhId, qtyDelta: "-2000.000", type: "dispatch", refType: "order", refId: ord6Id, reason: "Dispatch ORD-0006", createdAt: daysAgo(23) + "T00:00:00.000Z" });
  console.log("  ✓ ORD-0006 (dispatched) — Al-Barkat, 2000 kg SB Rice @ Rs 175/kg");

  // ORD-0007 dispatched — Hussain Trading — IRRI-6 × 1500 kg + Broken Coarse × 800 kg
  const ord7Id = uuid();
  const ord7Line1Id = uuid();
  const ord7Line2Id = uuid();
  await sql`
    INSERT INTO "order" (id, org_id, order_number, customer_id, status, confirmed_at, created_by, created_at)
    VALUES (${ord7Id}, ${orgId}, 'ORD-0007', ${cust5Id}, 'dispatched',
      ${daysAgo(18) + "T00:00:00.000Z"}, ${userId}, ${daysAgo(20) + "T00:00:00.000Z"})
  `;
  await sql`
    INSERT INTO order_line (id, org_id, order_id, product_id, variant_id, warehouse_id, qty_ordered, qty_dispatched, qty_delivered, unit_price_minor, line_total_minor)
    VALUES (${ord7Line1Id}, ${orgId}, ${ord7Id}, ${irri6RiceId}, ${irri6Rice50kg.id}, ${mainWhId}, '1500.000', '1500.000', '0.000', 11200, 16800000)
  `;
  await sql`
    INSERT INTO order_line (id, org_id, order_id, product_id, variant_id, warehouse_id, qty_ordered, qty_dispatched, qty_delivered, unit_price_minor, line_total_minor)
    VALUES (${ord7Line2Id}, ${orgId}, ${ord7Id}, ${brokenRiceId}, ${brokenRiceCoarse.id}, ${mainWhId}, '800.000', '800.000', '0.000', 4500, 3600000)
  `;
  await insertTx({ productId: irri6RiceId, variantId: irri6Rice50kg.id, warehouseId: mainWhId, qtyDelta: "-1500.000", type: "dispatch", refType: "order", refId: ord7Id, reason: "Dispatch ORD-0007", createdAt: daysAgo(18) + "T00:00:00.000Z" });
  await insertTx({ productId: brokenRiceId, variantId: brokenRiceCoarse.id, warehouseId: mainWhId, qtyDelta: "-800.000", type: "dispatch", refType: "order", refId: ord7Id, reason: "Dispatch ORD-0007", createdAt: daysAgo(18) + "T00:00:00.000Z" });
  console.log("  ✓ ORD-0007 (dispatched) — Hussain Trading, 1500 kg IRRI-6 + 800 kg Broken Rice");

  // ORD-0008 reserved — Bismillah Rice Center — SB Rice 50kg × 1000 kg @ Rs 163
  const ord8Id = uuid();
  const ord8Line1Id = uuid();
  await sql`
    INSERT INTO "order" (id, org_id, order_number, customer_id, status, confirmed_at, created_by, created_at)
    VALUES (${ord8Id}, ${orgId}, 'ORD-0008', ${cust6Id}, 'reserved',
      ${daysAgo(13) + "T00:00:00.000Z"}, ${userId}, ${daysAgo(15) + "T00:00:00.000Z"})
  `;
  await sql`
    INSERT INTO order_line (id, org_id, order_id, product_id, variant_id, warehouse_id, qty_ordered, qty_dispatched, qty_delivered, unit_price_minor, line_total_minor)
    VALUES (${ord8Line1Id}, ${orgId}, ${ord8Id}, ${sbRiceId}, ${sbRice50kg.id}, ${mainWhId}, '1000.000', '0.000', '0.000', 16300, 16300000)
  `;
  await insertTx({ productId: sbRiceId, variantId: sbRice50kg.id, warehouseId: mainWhId, qtyDelta: "-1000.000", type: "reserve", refType: "order", refId: ord8Id, reason: "Reserve ORD-0008", createdAt: daysAgo(13) + "T00:00:00.000Z" });
  console.log("  ✓ ORD-0008 (reserved) — Bismillah, 1000 kg SB Rice 50kg @ Rs 163/kg");

  // ORD-0009 confirmed — Noor Trading — 1121 Rice 50kg × 400 kg @ Rs 210
  const ord9Id = uuid();
  const ord9Line1Id = uuid();
  await sql`
    INSERT INTO "order" (id, org_id, order_number, customer_id, status, confirmed_at, created_by, created_at)
    VALUES (${ord9Id}, ${orgId}, 'ORD-0009', ${cust8Id}, 'confirmed',
      ${daysAgo(8) + "T00:00:00.000Z"}, ${userId}, ${daysAgo(10) + "T00:00:00.000Z"})
  `;
  await sql`
    INSERT INTO order_line (id, org_id, order_id, product_id, variant_id, warehouse_id, qty_ordered, qty_dispatched, qty_delivered, unit_price_minor, line_total_minor)
    VALUES (${ord9Line1Id}, ${orgId}, ${ord9Id}, ${p1121RiceId}, ${p1121Rice50kg.id}, ${mainWhId}, '400.000', '0.000', '0.000', 21000, 8400000)
  `;
  console.log("  ✓ ORD-0009 (confirmed) — Noor Trading, 400 kg 1121 Rice 50kg @ Rs 210/kg");

  // ORD-0010 draft — Pak Export — SB Rice 25kg × 3000 kg + 1121 Rice × 1000 kg
  const ord10Id = uuid();
  const ord10Line1Id = uuid();
  const ord10Line2Id = uuid();
  await sql`
    INSERT INTO "order" (id, org_id, order_number, customer_id, status, created_by, created_at)
    VALUES (${ord10Id}, ${orgId}, 'ORD-0010', ${cust4Id}, 'draft', ${userId}, ${daysAgo(3) + "T00:00:00.000Z"})
  `;
  await sql`
    INSERT INTO order_line (id, org_id, order_id, product_id, variant_id, warehouse_id, qty_ordered, qty_dispatched, qty_delivered, unit_price_minor, line_total_minor)
    VALUES (${ord10Line1Id}, ${orgId}, ${ord10Id}, ${sbRiceId}, ${sbRice25kg.id}, ${mainWhId}, '3000.000', '0.000', '0.000', 17200, 51600000)
  `;
  await sql`
    INSERT INTO order_line (id, org_id, order_id, product_id, variant_id, warehouse_id, qty_ordered, qty_dispatched, qty_delivered, unit_price_minor, line_total_minor)
    VALUES (${ord10Line2Id}, ${orgId}, ${ord10Id}, ${p1121RiceId}, ${p1121Rice25kg.id}, ${mainWhId}, '1000.000', '0.000', '0.000', 22000, 22000000)
  `;
  console.log("  ✓ ORD-0010 (draft) — Pak Export, 3000 kg SB Rice + 1000 kg 1121 Rice");
  console.log("  ✓ 10 orders created");

  // ── Step 8: Invoices ──────────────────────────────────────────────────────
  console.log("\nStep 8: Creating invoices...");

  // INV-0001 paid — Al-Barkat — ORD-0001
  const inv1Id = uuid();
  await sql`
    INSERT INTO invoice (id, org_id, invoice_number, order_id, customer_id, status, issue_date, due_date, subtotal_minor, tax_minor, total_minor, amount_paid_minor, created_by)
    VALUES (${inv1Id}, ${orgId}, 'INV-0001', ${ord1Id}, ${cust1Id}, 'paid', ${daysAgo(78)}, ${daysAgo(63)}, 17000000, 0, 17000000, 17000000, ${userId})
  `;
  await sql`
    INSERT INTO invoice_line (id, org_id, invoice_id, description, quantity, unit_price_minor, line_total_minor, order_line_id)
    VALUES (${uuid()}, ${orgId}, ${inv1Id}, 'Super Basmati Rice 25kg Bag (Export)', '1000.000', 17000, 17000000, ${ord1Line1Id})
  `;

  // INV-0002 paid — Pak Export — ORD-0002
  const inv2Id = uuid();
  await sql`
    INSERT INTO invoice (id, org_id, invoice_number, order_id, customer_id, status, issue_date, due_date, subtotal_minor, tax_minor, total_minor, amount_paid_minor, created_by)
    VALUES (${inv2Id}, ${orgId}, 'INV-0002', ${ord2Id}, ${cust4Id}, 'paid', ${daysAgo(73)}, ${daysAgo(58)}, 33000000, 0, 33000000, 33000000, ${userId})
  `;
  await sql`
    INSERT INTO invoice_line (id, org_id, invoice_id, description, quantity, unit_price_minor, line_total_minor, order_line_id)
    VALUES (${uuid()}, ${orgId}, ${inv2Id}, '1121 Basmati Rice 25kg Bag', '500.000', 22000, 11000000, ${ord2Line1Id})
  `;
  await sql`
    INSERT INTO invoice_line (id, org_id, invoice_id, description, quantity, unit_price_minor, line_total_minor, order_line_id)
    VALUES (${uuid()}, ${orgId}, ${inv2Id}, 'IRRI-6 Rice (Milled) 50kg Bag', '2000.000', 11000, 22000000, ${ord2Line2Id})
  `;

  // INV-0003 paid — Mian Brothers — ORD-0003
  const inv3Id = uuid();
  await sql`
    INSERT INTO invoice (id, org_id, invoice_number, order_id, customer_id, status, issue_date, due_date, subtotal_minor, tax_minor, total_minor, amount_paid_minor, created_by)
    VALUES (${inv3Id}, ${orgId}, 'INV-0003', ${ord3Id}, ${cust2Id}, 'paid', ${daysAgo(58)}, ${daysAgo(43)}, 26750000, 0, 26750000, 26750000, ${userId})
  `;
  await sql`
    INSERT INTO invoice_line (id, org_id, invoice_id, description, quantity, unit_price_minor, line_total_minor, order_line_id)
    VALUES (${uuid()}, ${orgId}, ${inv3Id}, 'Super Basmati Rice 50kg Bag (Local)', '1500.000', 16000, 24000000, ${ord3Line1Id})
  `;
  await sql`
    INSERT INTO invoice_line (id, org_id, invoice_id, description, quantity, unit_price_minor, line_total_minor, order_line_id)
    VALUES (${uuid()}, ${orgId}, ${inv3Id}, 'Broken Rice (Khanda) Fine Broken', '500.000', 5500, 2750000, ${ord3Line2Id})
  `;

  // INV-0004 paid — Zafar Grain — ORD-0004
  const inv4Id = uuid();
  await sql`
    INSERT INTO invoice (id, org_id, invoice_number, order_id, customer_id, status, issue_date, due_date, subtotal_minor, tax_minor, total_minor, amount_paid_minor, created_by)
    VALUES (${inv4Id}, ${orgId}, 'INV-0004', ${ord4Id}, ${cust3Id}, 'paid', ${daysAgo(53)}, ${daysAgo(38)}, 33000000, 0, 33000000, 33000000, ${userId})
  `;
  await sql`
    INSERT INTO invoice_line (id, org_id, invoice_id, description, quantity, unit_price_minor, line_total_minor, order_line_id)
    VALUES (${uuid()}, ${orgId}, ${inv4Id}, 'IRRI-6 Rice (Milled) 50kg Bag', '3000.000', 11000, 33000000, ${ord4Line1Id})
  `;

  // INV-0005 paid — Shah Grain — ORD-0005
  const inv5Id = uuid();
  await sql`
    INSERT INTO invoice (id, org_id, invoice_number, order_id, customer_id, status, issue_date, due_date, subtotal_minor, tax_minor, total_minor, amount_paid_minor, created_by)
    VALUES (${inv5Id}, ${orgId}, 'INV-0005', ${ord5Id}, ${cust7Id}, 'paid', ${daysAgo(43)}, ${daysAgo(28)}, 27100000, 0, 27100000, 27100000, ${userId})
  `;
  await sql`
    INSERT INTO invoice_line (id, org_id, invoice_id, description, quantity, unit_price_minor, line_total_minor, order_line_id)
    VALUES (${uuid()}, ${orgId}, ${inv5Id}, '1121 Basmati Rice 25kg Bag', '800.000', 21500, 17200000, ${ord5Line1Id})
  `;
  await sql`
    INSERT INTO invoice_line (id, org_id, invoice_id, description, quantity, unit_price_minor, line_total_minor, order_line_id)
    VALUES (${uuid()}, ${orgId}, ${inv5Id}, 'Super Basmati Rice 25kg Bag (Export)', '600.000', 16500, 9900000, ${ord5Line2Id})
  `;

  // INV-0006 partial — Al-Barkat — ORD-0006 (with tax)
  const inv6Id = uuid();
  await sql`
    INSERT INTO invoice (id, org_id, invoice_number, order_id, customer_id, status, issue_date, due_date, subtotal_minor, tax_rate, tax_minor, total_minor, amount_paid_minor, created_by)
    VALUES (${inv6Id}, ${orgId}, 'INV-0006', ${ord6Id}, ${cust1Id}, 'partial', ${daysAgo(23)}, ${daysAgo(8)}, 35000000, '0.1700', 5950000, 40950000, 20000000, ${userId})
  `;
  await sql`
    INSERT INTO invoice_line (id, org_id, invoice_id, description, quantity, unit_price_minor, line_total_minor, order_line_id)
    VALUES (${uuid()}, ${orgId}, ${inv6Id}, 'Super Basmati Rice 25kg Bag (Export)', '2000.000', 17500, 35000000, ${ord6Line1Id})
  `;

  // INV-0007 partial — Hussain Trading — ORD-0007
  const inv7Id = uuid();
  await sql`
    INSERT INTO invoice (id, org_id, invoice_number, order_id, customer_id, status, issue_date, due_date, subtotal_minor, tax_minor, total_minor, amount_paid_minor, created_by)
    VALUES (${inv7Id}, ${orgId}, 'INV-0007', ${ord7Id}, ${cust5Id}, 'partial', ${daysAgo(18)}, ${daysAgo(3)}, 20400000, 0, 20400000, 10000000, ${userId})
  `;
  await sql`
    INSERT INTO invoice_line (id, org_id, invoice_id, description, quantity, unit_price_minor, line_total_minor, order_line_id)
    VALUES (${uuid()}, ${orgId}, ${inv7Id}, 'IRRI-6 Rice (Milled) 50kg Bag', '1500.000', 11200, 16800000, ${ord7Line1Id})
  `;
  await sql`
    INSERT INTO invoice_line (id, org_id, invoice_id, description, quantity, unit_price_minor, line_total_minor, order_line_id)
    VALUES (${uuid()}, ${orgId}, ${inv7Id}, 'Broken Rice (Khanda) Coarse Broken', '800.000', 4500, 3600000, ${ord7Line2Id})
  `;

  // INV-0008 sent — Bismillah — ORD-0008
  const inv8Id = uuid();
  await sql`
    INSERT INTO invoice (id, org_id, invoice_number, order_id, customer_id, status, issue_date, due_date, subtotal_minor, tax_minor, total_minor, amount_paid_minor, created_by)
    VALUES (${inv8Id}, ${orgId}, 'INV-0008', ${ord8Id}, ${cust6Id}, 'sent', ${daysAgo(13)}, ${daysFromNow(2)}, 16300000, 0, 16300000, 0, ${userId})
  `;
  await sql`
    INSERT INTO invoice_line (id, org_id, invoice_id, description, quantity, unit_price_minor, line_total_minor, order_line_id)
    VALUES (${uuid()}, ${orgId}, ${inv8Id}, 'Super Basmati Rice 50kg Bag (Local)', '1000.000', 16300, 16300000, ${ord8Line1Id})
  `;

  // INV-0009 sent — Noor Trading — ORD-0009
  const inv9Id = uuid();
  await sql`
    INSERT INTO invoice (id, org_id, invoice_number, order_id, customer_id, status, issue_date, due_date, subtotal_minor, tax_minor, total_minor, amount_paid_minor, created_by)
    VALUES (${inv9Id}, ${orgId}, 'INV-0009', ${ord9Id}, ${cust8Id}, 'sent', ${daysAgo(8)}, ${daysFromNow(7)}, 8400000, 0, 8400000, 0, ${userId})
  `;
  await sql`
    INSERT INTO invoice_line (id, org_id, invoice_id, description, quantity, unit_price_minor, line_total_minor, order_line_id)
    VALUES (${uuid()}, ${orgId}, ${inv9Id}, '1121 Basmati Rice 50kg Bag', '400.000', 21000, 8400000, ${ord9Line1Id})
  `;

  // INV-0010 overdue — Hussain Trading — standalone
  const inv10Id = uuid();
  await sql`
    INSERT INTO invoice (id, org_id, invoice_number, customer_id, status, issue_date, due_date, subtotal_minor, tax_minor, total_minor, amount_paid_minor, created_by)
    VALUES (${inv10Id}, ${orgId}, 'INV-0010', ${cust5Id}, 'overdue', ${daysAgo(45)}, ${daysAgo(15)}, 9500000, 0, 9500000, 0, ${userId})
  `;
  await sql`
    INSERT INTO invoice_line (id, org_id, invoice_id, description, quantity, unit_price_minor, line_total_minor)
    VALUES (${uuid()}, ${orgId}, ${inv10Id}, 'Rice Bran (Chokar) Fresh Bran — Previous supply', '2714.000', 3500, 9499000)
  `;

  // INV-0011 overdue — Bismillah — standalone
  const inv11Id = uuid();
  await sql`
    INSERT INTO invoice (id, org_id, invoice_number, customer_id, status, issue_date, due_date, subtotal_minor, tax_minor, total_minor, amount_paid_minor, created_by)
    VALUES (${inv11Id}, ${orgId}, 'INV-0011', ${cust6Id}, 'overdue', ${daysAgo(50)}, ${daysAgo(20)}, 6800000, 0, 6800000, 0, ${userId})
  `;
  await sql`
    INSERT INTO invoice_line (id, org_id, invoice_id, description, quantity, unit_price_minor, line_total_minor)
    VALUES (${uuid()}, ${orgId}, ${inv11Id}, 'IRRI-6 Rice (Milled) Bulk', '648.000', 10500, 6804000)
  `;

  // INV-0012 cancelled — Noor Trading — standalone
  const inv12Id = uuid();
  await sql`
    INSERT INTO invoice (id, org_id, invoice_number, customer_id, status, issue_date, subtotal_minor, tax_minor, total_minor, amount_paid_minor, created_by)
    VALUES (${inv12Id}, ${orgId}, 'INV-0012', ${cust8Id}, 'cancelled', ${daysAgo(60)}, 5000000, 0, 5000000, 0, ${userId})
  `;
  await sql`
    INSERT INTO invoice_line (id, org_id, invoice_id, description, quantity, unit_price_minor, line_total_minor)
    VALUES (${uuid()}, ${orgId}, ${inv12Id}, 'Super Basmati Rice 25kg Bag (Export) — Cancelled order', '294.000', 17000, 4998000)
  `;

  console.log("  ✓ 12 invoices + invoice lines created");

  // ── Step 9: Payments + Allocations ───────────────────────────────────────
  console.log("\nStep 9: Creating payments and allocations...");

  // PAY-0001 Al-Barkat bank_transfer → fully allocates INV-0001
  const pay1Id = uuid();
  await sql`
    INSERT INTO payment (id, org_id, payment_number, customer_id, amount_minor, method, payment_date, notes, created_by)
    VALUES (${pay1Id}, ${orgId}, 'PAY-0001', ${cust1Id}, 17000000, 'bank_transfer', ${daysAgo(70)}, 'Full payment for INV-0001', ${userId})
  `;
  await sql`
    INSERT INTO payment_allocation (id, org_id, payment_id, invoice_id, amount_minor)
    VALUES (${uuid()}, ${orgId}, ${pay1Id}, ${inv1Id}, 17000000)
  `;

  // PAY-0002 Pak Export bank_transfer → fully allocates INV-0002
  const pay2Id = uuid();
  await sql`
    INSERT INTO payment (id, org_id, payment_number, customer_id, amount_minor, method, payment_date, notes, created_by)
    VALUES (${pay2Id}, ${orgId}, 'PAY-0002', ${cust4Id}, 33000000, 'bank_transfer', ${daysAgo(65)}, 'Full payment for INV-0002', ${userId})
  `;
  await sql`
    INSERT INTO payment_allocation (id, org_id, payment_id, invoice_id, amount_minor)
    VALUES (${uuid()}, ${orgId}, ${pay2Id}, ${inv2Id}, 33000000)
  `;

  // PAY-0003 Mian Brothers cheque → fully allocates INV-0003
  const pay3Id = uuid();
  await sql`
    INSERT INTO payment (id, org_id, payment_number, customer_id, amount_minor, method, payment_date, notes, created_by)
    VALUES (${pay3Id}, ${orgId}, 'PAY-0003', ${cust2Id}, 26750000, 'cheque', ${daysAgo(50)}, 'Full payment for INV-0003', ${userId})
  `;
  await sql`
    INSERT INTO payment_allocation (id, org_id, payment_id, invoice_id, amount_minor)
    VALUES (${uuid()}, ${orgId}, ${pay3Id}, ${inv3Id}, 26750000)
  `;

  // PAY-0004 Zafar Grain cash → fully allocates INV-0004
  const pay4Id = uuid();
  await sql`
    INSERT INTO payment (id, org_id, payment_number, customer_id, amount_minor, method, payment_date, notes, created_by)
    VALUES (${pay4Id}, ${orgId}, 'PAY-0004', ${cust3Id}, 33000000, 'cash', ${daysAgo(45)}, 'Full payment for INV-0004', ${userId})
  `;
  await sql`
    INSERT INTO payment_allocation (id, org_id, payment_id, invoice_id, amount_minor)
    VALUES (${uuid()}, ${orgId}, ${pay4Id}, ${inv4Id}, 33000000)
  `;

  // PAY-0005 Shah Grain bank_transfer → fully allocates INV-0005
  const pay5Id = uuid();
  await sql`
    INSERT INTO payment (id, org_id, payment_number, customer_id, amount_minor, method, payment_date, notes, created_by)
    VALUES (${pay5Id}, ${orgId}, 'PAY-0005', ${cust7Id}, 27100000, 'bank_transfer', ${daysAgo(35)}, 'Full payment for INV-0005', ${userId})
  `;
  await sql`
    INSERT INTO payment_allocation (id, org_id, payment_id, invoice_id, amount_minor)
    VALUES (${uuid()}, ${orgId}, ${pay5Id}, ${inv5Id}, 27100000)
  `;

  // PAY-0006 Al-Barkat online → partial allocation to INV-0006
  const pay6Id = uuid();
  await sql`
    INSERT INTO payment (id, org_id, payment_number, customer_id, amount_minor, method, payment_date, notes, created_by)
    VALUES (${pay6Id}, ${orgId}, 'PAY-0006', ${cust1Id}, 20000000, 'online', ${daysAgo(15)}, 'Partial payment for INV-0006', ${userId})
  `;
  await sql`
    INSERT INTO payment_allocation (id, org_id, payment_id, invoice_id, amount_minor)
    VALUES (${uuid()}, ${orgId}, ${pay6Id}, ${inv6Id}, 20000000)
  `;

  // PAY-0007 Hussain Trading cash → partial allocation to INV-0007
  const pay7Id = uuid();
  await sql`
    INSERT INTO payment (id, org_id, payment_number, customer_id, amount_minor, method, payment_date, notes, created_by)
    VALUES (${pay7Id}, ${orgId}, 'PAY-0007', ${cust5Id}, 10000000, 'cash', ${daysAgo(10)}, 'Partial payment for INV-0007', ${userId})
  `;
  await sql`
    INSERT INTO payment_allocation (id, org_id, payment_id, invoice_id, amount_minor)
    VALUES (${uuid()}, ${orgId}, ${pay7Id}, ${inv7Id}, 10000000)
  `;

  // PAY-0008 Bismillah cheque → unallocated advance
  const pay8Id = uuid();
  await sql`
    INSERT INTO payment (id, org_id, payment_number, customer_id, amount_minor, method, payment_date, notes, created_by)
    VALUES (${pay8Id}, ${orgId}, 'PAY-0008', ${cust6Id}, 8000000, 'cheque', ${daysAgo(5)}, 'Advance payment — unallocated', ${userId})
  `;
  // No payment_allocation for PAY-0008 (advance/unallocated)

  console.log("  ✓ 8 payments + 7 allocations created");

  // ── Done ─────────────────────────────────────────────────────────────────
  console.log("\n=== Seed complete! ===");
  console.log("\nSummary:");
  console.log("  Warehouses:          3 (Main Mill, Cold Storage, Transit Yard)");
  console.log("  Products:            11 (3 raw inputs, 4 finished goods, 4 by-products)");
  console.log("  Product variants:    18 total");
  console.log("  Price history:       3 entries per variant (April–July price movement)");
  console.log("  Suppliers:           5 (farmers, traders, cooperative)");
  console.log("  Customers:           8 (Karachi, Lahore, Multan, Faisalabad, etc.)");
  console.log("  Inventory txns:      ~60 (opening, purchases, adjustments, production, dispatch, reserve)");
  console.log("  Production batches:  4 (BATCH-2026-001 through 004, all completed)");
  console.log("  Orders:              10 (5 completed, 2 dispatched, 1 reserved, 1 confirmed, 1 draft)");
  console.log("  Invoices:            12 (5 paid, 2 partial, 2 sent, 2 overdue, 1 cancelled)");
  console.log("  Payments:            8 (PAY-0001 through PAY-0008; PAY-0008 is unallocated advance)");
  console.log("\nDashboard will show:");
  console.log("  Total sales (completed orders): Rs 1,371,000 (Rs 170k+330k+267.5k+330k+271k+...) ");
  console.log("  Outstanding receivables: Rs 5M+ across 4 unpaid/partial invoices");
  console.log("  Active inventory across 3 warehouses spanning 4 months");
}

seed().catch((err) => {
  console.error("\nSeed failed:", err.message ?? err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
