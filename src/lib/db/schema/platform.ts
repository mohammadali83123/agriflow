import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const platformInvitation = pgTable("platform_invitation", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
});
