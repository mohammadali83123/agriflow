"use client";

import { useActionState } from "react";
import { Building2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrgAndInviteOwner } from "@/server/admin/actions";

export function CreateOrgForm() {
  const [state, action, isPending] = useActionState(createOrgAndInviteOwner, null);

  return (
    <div className="rounded-xl border bg-card shadow-sm p-6 space-y-5">
      <form action={action} className="space-y-5">
        {state?.error && (
          <div className="rounded-lg bg-destructive/8 border border-destructive/20 px-3 py-2.5">
            <p className="text-sm text-destructive">{state.error}</p>
          </div>
        )}

        {/* Org section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Building2 className="size-3.5" />
            </span>
            <h2 className="text-sm font-semibold">Organization</h2>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name">
              Business name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Al-Noor Rice Mill"
              required
              minLength={2}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              The name of the client&apos;s mill or trading business.
            </p>
          </div>
        </div>

        <div className="border-t" />

        {/* Owner section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="flex size-7 items-center justify-center rounded-md bg-blue-50 text-blue-600">
              <Send className="size-3.5" />
            </span>
            <h2 className="text-sm font-semibold">Owner invitation</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ownerName">
                Owner name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ownerName"
                name="ownerName"
                type="text"
                placeholder="Imran Khan"
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ownerEmail">
                Owner email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ownerEmail"
                name="ownerEmail"
                type="email"
                placeholder="imran@alnoor.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                An invitation link will be sent here. They&apos;ll set their own password.
              </p>
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Creating…" : "Create org & send invitation"}
        </Button>
      </form>
    </div>
  );
}
