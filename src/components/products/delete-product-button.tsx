"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteProduct } from "@/server/products/actions";

interface DeleteProductButtonProps {
  id: string;
}

export function DeleteProductButton({ id }: DeleteProductButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    startTransition(async () => {
      const result = await deleteProduct(id);
      if ("error" in result && result.error) {
        alert("Failed to delete product.");
        return;
      }
      router.push("/products");
    });
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={isPending}
    >
      {isPending ? "Deleting..." : "Delete"}
    </Button>
  );
}
