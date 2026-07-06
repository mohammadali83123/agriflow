"use server";

import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/db/scoped";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

/** Mark a platform invitation as accepted after the user creates their business. */
export async function acceptPlatformInvitation(token: string): Promise<void> {
  await requireAuth();
  if (!token) return;

  await db
    .update(schema.platformInvitation)
    .set({ acceptedAt: new Date() })
    .where(eq(schema.platformInvitation.id, token));
}
