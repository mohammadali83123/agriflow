"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateOrganization, deleteOrganization } from "@/server/settings/actions";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug may only contain lowercase letters, numbers, and hyphens"
    ),
});

type FormValues = z.infer<typeof formSchema>;

interface OrgFormProps {
  org: {
    name: string;
    slug: string | null;
  };
}

export function OrgForm({ org }: OrgFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: org.name,
      slug: org.slug ?? "",
    },
  });

  async function onSubmit(data: FormValues) {
    setServerError(null);
    setSuccess(false);
    const result = await updateOrganization(data);
    if (result.error) {
      setServerError(result.error);
    } else {
      setSuccess(true);
      router.refresh();
    }
  }

  async function handleDelete() {
    if (deleteConfirmName !== org.name) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      const result = await deleteOrganization();
      if (result.error) {
        setDeleteError(result.error);
        setDeleting(false);
        return;
      }
      // Org is gone — send user to onboarding
      router.push("/onboarding");
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Rename form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b">
            <p className="text-base font-semibold">Organization details</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Update your organization name and URL slug.
            </p>
          </div>

          <div className="px-6 py-6 space-y-5">
            {serverError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {serverError}
              </div>
            )}
            {success && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Organization updated successfully.
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="org-name" className="text-sm font-medium">
                Organization name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="org-name"
                placeholder="e.g. Al-Rehman Rice Mill"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="org-slug" className="text-sm font-medium">
                URL slug <span className="text-destructive">*</span>
              </Label>
              <Input
                id="org-slug"
                placeholder="e.g. al-rehman-rice-mill"
                aria-invalid={!!errors.slug}
                {...register("slug")}
              />
              {errors.slug && (
                <p className="text-xs text-destructive">{errors.slug.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Changing the slug may break any existing links that use the current URL.
              </p>
            </div>
          </div>

          <div className="px-6 py-4 bg-muted/20 flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </form>

      {/* Danger zone */}
      <div className="rounded-2xl border border-destructive/30 overflow-hidden">
        <div className="px-6 py-5 border-b border-destructive/20 bg-destructive/5">
          <p className="text-base font-semibold text-destructive">Danger zone</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Irreversible actions. Proceed with caution.
          </p>
        </div>
        <div className="px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Delete this business</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently deletes the business and all its data — products, customers,
              orders, inventory, invoices, and payments. This cannot be undone.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setDeleteConfirmName("");
              setDeleteError(null);
              setShowDeleteDialog(true);
            }}
          >
            Delete business
          </Button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{org.name}&rdquo;?</DialogTitle>
            <DialogDescription>
              This will permanently delete the business and all associated data. There is
              no going back. Type{" "}
              <strong className="font-semibold text-foreground">{org.name}</strong> to
              confirm.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {deleteError && (
              <p className="text-sm text-destructive">{deleteError}</p>
            )}
            <Input
              placeholder={org.name}
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              autoComplete="off"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || deleteConfirmName !== org.name}
            >
              {deleting ? "Deleting..." : "Permanently delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
