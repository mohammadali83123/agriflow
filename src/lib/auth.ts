import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { sendInvitationEmail, sendVerificationEmail } from "@/lib/email";

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
    sendVerificationEmail: async ({ user, url }: { user: { email: string; name: string }; url: string; token: string }) => {
      await sendVerificationEmail({
        toEmail: user.email,
        userName: user.name,
        url,
      });
    },
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
      allowUserToCreateOrganization: true,
      sendInvitationEmail: async (data) => {
        await sendInvitationEmail({
          toEmail: data.invitation.email,
          inviterName: data.inviter.user.name,
          orgName: data.organization.name,
          invitationId: data.invitation.id,
        });
      },
    }),
  ],
});

export type Auth = typeof auth;
export type Session = typeof auth.$Infer.Session;
