"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePackagingOption } from "@/server/products/actions";

interface DeletePackagingButtonProps {
  id: string;
  productId: string;
}

export function DeletePackagingButton({ id, productId: _productId }: DeletePackagingButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm("Remove this packaging option?")) return;
    startTransition(async () => {
      await deletePackagingOption(id);
      router.refresh();
    });
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-sm text-destructive hover:underline underline-offset-4 disabled:opacity-50"
    >
      {isPending ? "Removing..." : "Remove"}
    </button>
  );
}
