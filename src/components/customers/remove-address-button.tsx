"use client";

import { useRouter } from "next/navigation";
import { removeDeliveryAddress } from "@/server/customers/actions";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface RemoveAddressButtonProps {
  addressId: string;
}

export function RemoveAddressButton({ addressId }: RemoveAddressButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    if (!confirm("Remove this delivery address?")) return;
    setLoading(true);
    try {
      await removeDeliveryAddress(addressId);
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
