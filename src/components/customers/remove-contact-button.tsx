"use client";

import { useRouter } from "next/navigation";
import { removeContact } from "@/server/customers/actions";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface RemoveContactButtonProps {
  contactId: string;
}

export function RemoveContactButton({ contactId }: RemoveContactButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    if (!confirm("Remove this contact?")) return;
    setLoading(true);
    try {
      await removeContact(contactId);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleRemove}
      disabled={loading}
      className="text-muted-foreground hover:text-destructive"
    >
      {loading ? "..." : "Remove"}
    </Button>
  );
}
