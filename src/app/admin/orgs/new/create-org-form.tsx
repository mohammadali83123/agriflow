"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
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
        {state?.warning && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
            <p className="text-sm text-amber-800">{state.warning}</p>
          </div>
        )}

        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="flex size-7 items-center justify-center rounded-md bg-blue-50 text-blue-600">
              <Send className="size-3.5" />
            </span>
            <h2 className="text-sm font-semibold">Client invitation</h2>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ownerEmail">
                Client email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ownerEmail"
                name="ownerEmail"
                type="email"
                placeholder="imran@alnoormill.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                An invitation link will be sent here. They&apos;ll sign up and name their own business.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ownerName">
                Client name <span className="text-muted-foreground text-xs font-normal">(optional)</span>
              </Label>
              <Input
                id="ownerName"
                name="ownerName"
                type="text"
                placeholder="Imran Khan"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                Used to personalise the invitation email greeting.
              </p>
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Sending…" : "Send invitation"}
        </Button>
      </form>
    </div>
  );
}
