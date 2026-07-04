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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sendInvitation } from "@/server/settings/actions";

const formSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  role: z.enum(["owner", "member"]),
});

type FormValues = z.infer<typeof formSchema>;

export function InviteForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      role: "member",
    },
  });

  const roleValue = watch("role");

  async function onSubmit(data: FormValues) {
    setServerError(null);
    setSuccess(false);
    const result = await sendInvitation(data);
    if (result.error) {
      setServerError(result.error);
    } else {
      setSuccess(true);
      reset();
      router.refresh();
    }
  }

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b">
        <p className="text-base font-semibold">Invite a member</p>
        <p className="text-sm text-muted-foreground mt-0.5">
          Send an email invitation to add someone to your organization.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="px-6 py-6 space-y-4">
          {serverError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {serverError}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Invitation sent successfully.
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="invite-email" className="text-sm font-medium">
                Email address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="sm:w-40 space-y-2">
              <Label htmlFor="invite-role" className="text-sm font-medium">
                Role
              </Label>
              <Select
                value={roleValue}
                onValueChange={(val) => setValue("role", val as "owner" | "member")}
              >
                <SelectTrigger className="w-full" id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Operator</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-muted/20 flex items-center gap-3">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send invitation"}
          </Button>
        </div>
      </form>
    </div>
  );
}
