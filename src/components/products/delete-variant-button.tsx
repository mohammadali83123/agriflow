"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteVariant } from "@/server/products/actions";

interface DeleteVariantButtonProps {
  id: string;
  productId: string;
}

export function DeleteVariantButton({ id, productId: _productId }: DeleteVariantButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm("Remove this variant?")) return;
    startTransition(async () => {
      await deleteVariant(id);
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
