"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deletePackagingOption } from "@/server/products/actions";
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

export function DeletePackagingButton({ id }: { id: string; productId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await deletePackagingOption(id);
      setOpen(false);
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button className="text-sm text-destructive hover:underline underline-offset-4">
            Remove
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove packaging option?</DialogTitle>
          <DialogDescription>
            This will remove the packaging option. Orders already placed with this packaging are unaffected.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Removing…" : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
