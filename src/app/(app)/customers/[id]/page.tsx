import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, Phone, MapPin, FileText } from "lucide-react";
import { getCustomer } from "@/server/customers/actions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatRupees } from "@/lib/money";
import { DeleteCustomerButton } from "@/components/customers/delete-customer-button";
import { ContactsSection } from "@/components/customers/contacts-section";
import { DeliveryAddressesSection } from "@/components/customers/delivery-addresses-section";
import { requireOrg } from "@/lib/db/scoped";
import { can } from "@/lib/rbac";

export const metadata = { title: "Customer" };

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let data: Awaited<ReturnType<typeof getCustomer>>;
  try {
    data = await getCustomer(id);
  } catch {
    notFound();
  }

  const { role } = await requireOrg();
  const canWrite = can(role, "customers:write");

  const { contacts, addresses, ...customer } = data;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/customers"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ChevronLeft className="size-4" /> Customers
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{customer.name}</h1>
          {customer.businessName && (
            <p className="text-sm text-muted-foreground">{customer.businessName}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
              customer.status === "active"
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-600"
            )}
          >
            {customer.status === "active" ? "Active" : "Inactive"}
          </span>
          {canWrite && (
            <>
              <Link
                href={`/customers/${customer.id}/edit`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                <Pencil className="size-3.5" />
                Edit
              </Link>
              <DeleteCustomerButton id={customer.id} />
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
          <div className="flex items-center gap-2 text-sm">
            <Phone className="size-4 text-muted-foreground shrink-0" />
            <span>{customer.phone}</span>
          </div>
          {customer.whatsapp && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="size-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">
                WhatsApp: {customer.whatsapp}
              </span>
            </div>
          )}
          {customer.city && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="size-4 text-muted-foreground shrink-0" />
              <span>{customer.city}</span>
            </div>
          )}
          {customer.address && (
            <p className="text-sm text-muted-foreground pl-6">
              {customer.address}
            </p>
          )}
        </div>

        {/* Financial */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Financial
          </p>
          <div>
            <p className="text-xs text-muted-foreground">Credit limit</p>
            <p className="text-sm font-medium">
              {formatRupees(customer.creditLimitMinor)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Outstanding balance</p>
            <p className="text-sm text-muted-foreground">— (ledger Sprint 8)</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Available credit</p>
            <p className="text-sm text-muted-foreground">— (ledger Sprint 8)</p>
          </div>
          {customer.paymentTerms && (
            <div>
              <p className="text-xs text-muted-foreground">Payment terms</p>
              <p className="text-sm">{customer.paymentTerms}</p>
            </div>
          )}
        </div>

        {/* Notes */}
        {customer.notes && (
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Notes
            </p>
            <div className="flex gap-2 text-sm">
              <FileText className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-muted-foreground">{customer.notes}</p>
            </div>
          </div>
        )}
      </div>

      {/* Contacts */}
      <ContactsSection
        customerId={customer.id}
        contacts={contacts}
        canWrite={canWrite}
      />

      {/* Delivery addresses */}
      <DeliveryAddressesSection
        customerId={customer.id}
        addresses={addresses}
        canWrite={canWrite}
      />
    </div>
  );
}
