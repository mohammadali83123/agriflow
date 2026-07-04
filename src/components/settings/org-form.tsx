"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOrganization } from "@/server/settings/actions";

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

  return (
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
              Changing the slug may break any existing links that use the current
              URL.
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
  );
}
