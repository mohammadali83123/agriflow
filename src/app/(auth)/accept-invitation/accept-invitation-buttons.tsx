"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

interface Props {
  invitationId: string;
  orgName: string;
}

export function AcceptInvitationButtons({ invitationId, orgName }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setError(null);
    setPending(true);
    const { error: err } = await authClient.organization.acceptInvitation({
      invitationId,
    });
    if (err) {
      setError(err.message ?? "Failed to accept invitation. Please try again.");
      setPending(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      {error && (
        <div className="rounded-lg bg-destructive/8 border border-destructive/20 px-3 py-2.5">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      <Button className="w-full" onClick={handleAccept} disabled={pending}>
        {pending ? "Accepting…" : `Join ${orgName}`}
      </Button>
    </div>
  );
}
