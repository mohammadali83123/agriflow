"use client";

import { useState, useTransition } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { removeMember, changeRole } from "@/server/settings/actions";

export interface MemberRow {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: Date;
}

interface MembersTableProps {
  members: MemberRow[];
  currentUserId: string;
  ownerCount: number;
}

function RoleBadge({ role }: { role: string }) {
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

function RemoveMemberButton({
  member,
  disabled,
  onDone,
}: {
  member: MemberRow;
  disabled: boolean;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove() {
    setLoading(true);
    setError(null);
    const result = await removeMember(member.id);
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
          <Button variant="destructive" size="sm" disabled={disabled}>
            Remove
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove member?</DialogTitle>
          <DialogDescription>
            This will remove{" "}
            <strong>{member.name}</strong> ({member.email}) from the
            organization. They will lose access immediately.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
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
            onClick={handleRemove}
            disabled={loading}
          >
            {loading ? "Removing..." : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoleSelect({
  member,
  disabled,
  onDone,
}: {
  member: MemberRow;
  disabled: boolean;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRoleChange(newRole: string | null) {
    if (!newRole || newRole === member.role) return;
    setError(null);
    startTransition(async () => {
      const result = await changeRole({ memberId: member.id, role: newRole });
      if (result.error) {
        setError(result.error);
      } else {
        onDone();
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Select
        value={member.role}
        onValueChange={handleRoleChange}
        disabled={disabled || isPending}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="owner">Owner</SelectItem>
          <SelectItem value="member">Operator</SelectItem>
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive max-w-32">{error}</p>}
    </div>
  );
}

export function MembersTable({
  members,
  currentUserId,
  ownerCount,
}: MembersTableProps) {
  const router = useRouter();

  function refresh() {
    router.refresh();
  }

  return (
    <div className="rounded-2xl border overflow-hidden shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Name
            </th>
            <th className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
              Email
            </th>
            <th className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Role
            </th>
            <th className="py-3.5 px-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">
              Joined
            </th>
            <th className="py-3.5 px-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {members.map((member) => {
            const isSelf = member.userId === currentUserId;
            const isLastOwner =
              member.role === "owner" && ownerCount <= 1;
            const canRemove = !isSelf && !isLastOwner;

            return (
              <tr key={member.id} className="hover:bg-muted/20 transition-colors">
                <td className="py-4 px-4">
                  <div className="font-medium">
                    {member.name}
                    {isSelf && (
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        (you)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground sm:hidden">
                    {member.email}
                  </div>
                </td>
                <td className="py-4 px-4 text-muted-foreground hidden sm:table-cell">
                  {member.email}
                </td>
                <td className="py-4 px-4">
                  <RoleSelect
                    member={member}
                    disabled={isSelf && isLastOwner}
                    onDone={refresh}
                  />
                </td>
                <td className="py-4 px-4 text-muted-foreground hidden md:table-cell">
                  {member.joinedAt.toLocaleDateString("en-PK", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="py-4 px-4 text-right">
                  <RemoveMemberButton
                    member={member}
                    disabled={!canRemove}
                    onDone={refresh}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {members.length === 0 && (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No members found.
        </div>
      )}
    </div>
  );
}
