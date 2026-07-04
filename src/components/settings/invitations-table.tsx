"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { revokeInvitation } from "@/server/settings/actions";

export interface InvitationRow {
  id: string;
  email: string;
  role: string | null;
  expiresAt: Date;
  inviterName: string;
}

interface InvitationsTableProps {
  invitations: InvitationRow[];
}

function RoleBadge({ role }: { role: string | null }) {
  const isOwner = role === "owner";
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-semibold",
        isOwner
          ? "bg-emerald-100 text-emerald-800"
          : "bg-gray-100 text-gray-600"
      )}
    >
      {isOwner ? "Owner" : "Operator"}
    </span>
  );
}

function RevokeButton({
  invitation,
  onDone,
}: {
  invitation: InvitationRow;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRevoke() {
    setLoading(true);
    setError(null);
    const result = await revokeInvitation(invitation.id);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setOpen(false);
      setLoading(false);
      onDone();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="destructive" size="sm">
            Revoke
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke invitation?</DialogTitle>
          <DialogDescription>
            This will cancel the invitation sent to{" "}
            <strong>{invitation.email}</strong>. They will no longer be able to
            join the organization with this invite.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRevoke}
            disabled={loading}
          >
            {loading ? "Revoking..." : "Revoke"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function InvitationsTable({ invitations }: InvitationsTableProps) {
  const router = useRouter();

  function refresh() {
    router.refresh();
  }

  if (invitations.length === 0) {
    return (
      <div className="rounded-2xl border overflow-hidden shadow-sm">
        <div className="py-12 text-center text-sm text-muted-foreground">
          No pending invitations.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Email
            </th>
            <th className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Role
            </th>
            <th className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
              Invited by
            </th>
            <th className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">
              Expires
            </th>
            <th className="py-3.5 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {invitations.map((inv) => (
            <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
              <td className="py-4 px-4 font-medium">{inv.email}</td>
              <td className="py-4 px-4">
                <RoleBadge role={inv.role} />
              </td>
              <td className="py-4 px-4 text-muted-foreground hidden sm:table-cell">
                {inv.inviterName}
              </td>
              <td className="py-4 px-4 text-muted-foreground hidden md:table-cell">
                {inv.expiresAt.toLocaleDateString("en-PK", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </td>
              <td className="py-4 px-4 text-right">
                <RevokeButton invitation={inv} onDone={refresh} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
