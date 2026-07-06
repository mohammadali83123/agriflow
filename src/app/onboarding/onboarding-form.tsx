"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Wheat } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { acceptPlatformInvitation } from "@/server/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    setPending(true);

    const base = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    const suffix = Math.random().toString(36).slice(2, 6);
    const slug = `${base || "business"}-${suffix}`;

    const { data, error: err } = await authClient.organization.create({
      name: name.trim(),
      slug,
    });

    if (err || !data) {
      setError(err?.message ?? "Could not create business. Try again.");
      setPending(false);
      return;
    }

    await authClient.organization.setActive({ organizationId: data.id });

    // Expire the platform invitation token now that the business has been created.
    if (token) {
      await acceptPlatformInvitation(token);
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Wheat className="size-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Set up your business
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Enter the name of your mill or trading business to get started.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg bg-destructive/8 border border-destructive/20 px-3 py-2.5">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="name">Business name</Label>
            <Input
              id="name"
              type="text"
              placeholder="e.g. Al-Noor Rice Mill"
              required
              className="h-11 text-base"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This is what you&apos;ll see throughout the app. You can change it later.
            </p>
          </div>
          <Button
            type="submit"
            className="w-full h-11 text-base"
            disabled={pending || !name.trim()}
          >
            {pending ? "Setting up…" : "Continue →"}
          </Button>
        </form>
      </div>
    </div>
  );
}
