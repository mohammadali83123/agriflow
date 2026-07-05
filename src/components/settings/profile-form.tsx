"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/server/settings/actions";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
});

type FormValues = z.infer<typeof formSchema>;

interface ProfileFormProps {
  user: { name: string; email: string };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: user.name },
  });

  async function onSubmit(data: FormValues) {
    setServerError(null);
    setSuccess(false);
    const result = await updateProfile(data);
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
          <p className="text-base font-semibold">Profile</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Update your display name. Email address cannot be changed.
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
              Profile updated successfully.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="profile-name" className="text-sm font-medium">
              Full name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="profile-name"
              placeholder="e.g. Muhammad Ali"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Email</Label>
            <Input value={user.email} disabled className="text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Email is used for sign-in and cannot be changed here.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 bg-muted/20">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}
