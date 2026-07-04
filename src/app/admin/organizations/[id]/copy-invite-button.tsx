"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyInviteButtonProps {
  slug: string;
}

export function CopyInviteButton({ slug }: CopyInviteButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL ?? "";
    const url = `${base}/sign-up?org=${slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium bg-background hover:bg-muted transition-colors"
    >
      {copied ? (
        <>
          <Check className="size-3.5 text-green-600" />
          Copied
        </>
      ) : (
        <>
          <Copy className="size-3.5" />
          Copy invite link
        </>
      )}
    </button>
  );
}
