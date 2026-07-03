import { Wheat } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[460px_1fr]">
      {/* Brand panel — desktop only */}
      <div className="hidden md:flex flex-col justify-between bg-primary p-10 text-primary-foreground">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary-foreground/15 backdrop-blur-sm">
            <Wheat className="size-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">AgriFlow</span>
        </div>

        {/* Center content */}
        <div className="space-y-6">
          <p className="text-4xl font-bold leading-tight tracking-tight">
            One platform for<br />your entire operation.
          </p>
          <ul className="space-y-3 text-primary-foreground/80 text-sm">
            {[
              "Procurement & supplier ledgers",
              "Inventory with full stock history",
              "Orders, dispatch & invoicing",
              "Customer balances & payments",
              "Production tracking for the mill",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary-foreground/60 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-primary-foreground/50 text-xs">
          © {new Date().getFullYear()} AgriFlow
        </p>
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen md:min-h-0 flex-col items-center justify-center p-6 bg-background">
        {/* Mobile brand — shown only when the left panel is hidden */}
        <div className="flex items-center gap-2 mb-8 md:hidden">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wheat className="size-4" />
          </div>
          <span className="text-lg font-bold tracking-tight">AgriFlow</span>
        </div>

        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
