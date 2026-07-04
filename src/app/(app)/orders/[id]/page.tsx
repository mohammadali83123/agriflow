export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import {
  getOrder,
  getProductsForSelect,
  getWarehousesForSelect,
} from "@/server/orders/actions";
import { OrderDetailClient } from "@/components/orders/order-detail-client";
import { requireOrg } from "@/lib/db/scoped";
import { can } from "@/lib/rbac";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let order: Awaited<ReturnType<typeof getOrder>>;
  try {
    order = await getOrder(id);
  } catch {
    notFound();
  }

  const { role } = await requireOrg();
  const canWrite = can(role, "orders:write");
  const canConfirm = can(role, "orders:confirm");
  const canCancel = can(role, "orders:cancel");
  const canOverridePrice = can(role, "price:override_min");

  const [products, warehouses] = await Promise.all([
    getProductsForSelect(),
    getWarehousesForSelect(),
  ]);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="size-4" /> Orders
        </Link>
      </div>
      <OrderDetailClient
        order={order}
        products={products}
        warehouses={warehouses}
        canWrite={canWrite}
        canConfirm={canConfirm}
        canCancel={canCancel}
        canOverridePrice={canOverridePrice}
      />
    </div>
  );
}
