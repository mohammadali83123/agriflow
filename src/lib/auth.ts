import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL!,
  secret: process.env.BETTER_AUTH_SECRET!,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  databaseHooks: {
    session: {
      create: {
        // On every new session (i.e. sign-in), resolve the user's active org
        // so it persists across logins — not just right after onboarding.
        before: async (session) => {
          const memberships = await db
            .select({ organizationId: schema.member.organizationId })
            .from(schema.member)
            .where(eq(schema.member.userId, session.userId))
            .limit(2);
          // Auto-select only when there is exactly one org (frictionless).
          // 0 orgs → onboarding; 2+ → the user picks on /select-organization.
          const activeOrganizationId =
            memberships.length === 1 ? memberships[0].organizationId : null;
          return {
            data: {
              ...session,
              activeOrganizationId,
            },
          };
        },
      },
    },
  },
  plugins: [
    organization({
      // Any authenticated user can create orgs freely.
      // Account creation is invite-only (controlled at sign-up level).
      allowUserToCreateOrganization: true,
    }),
  ],
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
