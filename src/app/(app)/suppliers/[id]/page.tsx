import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, Phone, MapPin, FileText } from "lucide-react";
import { getSupplier } from "@/server/suppliers/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DeleteSupplierButton } from "@/components/suppliers/delete-supplier-button";
import { requireOrg } from "@/lib/db/scoped";
import { can } from "@/lib/rbac";

export const metadata = { title: "Supplier" };

function typeLabel(type: string) {
  if (type === "farmer") return "Farmer";
  if (type === "trader") return "Trader";
  return "Supplier";
}

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let supplier: Awaited<ReturnType<typeof getSupplier>>;
  try {
    supplier = await getSupplier(id);
  } catch {
    notFound();
  }

  const { role } = await requireOrg();
  const canWrite = can(role, "suppliers:write");

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/suppliers"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ChevronLeft className="size-4" /> Suppliers
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{supplier.name}</h1>
          {supplier.businessName && (
            <p className="text-sm text-muted-foreground">{supplier.businessName}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-800">
            {typeLabel(supplier.type)}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
              supplier.status === "active"
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-600"
            )}
          >
            {supplier.status === "active" ? "Active" : "Inactive"}
          </span>
          {canWrite && (
            <>
              <Button
                variant="outline"
                size="sm"
                render={<Link href={`/suppliers/${supplier.id}/edit`} />}
              >
                <Pencil className="size-3.5" />
                Edit
              </Button>
              <DeleteSupplierButton id={supplier.id} />
            </>
          )}
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Contact info */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Contact
          </p>
          {supplier.phone ? (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="size-4 text-muted-foreground shrink-0" />
              <span>{supplier.phone}</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No phone on file</p>
          )}
          {supplier.whatsapp && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="size-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">
                WhatsApp: {supplier.whatsapp}
              </span>
            </div>
          )}
          {supplier.address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{supplier.address}</span>
            </div>
          )}
        </div>

        {/* Payment */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Payment
          </p>
          <div>
            <p className="text-xs text-muted-foreground">Outstanding payable</p>
            <p className="text-sm text-muted-foreground">— (ledger Sprint 8)</p>
          </div>
          {supplier.paymentTerms && (
            <div>
              <p className="text-xs text-muted-foreground">Payment terms</p>
              <p className="text-sm">{supplier.paymentTerms}</p>
            </div>
          )}
        </div>

        {/* Notes */}
        {supplier.notes && (
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Notes
            </p>
            <div className="flex gap-2 text-sm">
              <FileText className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-muted-foreground">{supplier.notes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
