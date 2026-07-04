"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function AdminSignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/sign-in");
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors"
    >
      <LogOut className="size-4" />
      Sign out
    </button>
  );
}
