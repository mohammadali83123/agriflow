import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AcceptInvitationButtons } from "./accept-invitation-buttons";

interface PageProps {
  searchParams: Promise<{ invitationId?: string }>;
}

export default async function AcceptInvitationPage({ searchParams }: PageProps) {
  const { invitationId } = await searchParams;

  if (!invitationId) {
    return <ErrorCard message="This invitation link is invalid or incomplete." />;
  }

  // Look up the invitation with org + inviter
  const [row] = await db
    .select({
      id: schema.invitation.id,
      email: schema.invitation.email,
      role: schema.invitation.role,
      status: schema.invitation.status,
      expiresAt: schema.invitation.expiresAt,
      orgName: schema.organization.name,
      inviterName: schema.user.name,
    })
    .from(schema.invitation)
    .innerJoin(schema.organization, eq(schema.invitation.organizationId, schema.organization.id))
    .innerJoin(schema.user, eq(schema.invitation.inviterId, schema.user.id))
    .where(eq(schema.invitation.id, invitationId))
    .limit(1);

  if (!row) {
    return <ErrorCard message="This invitation link is invalid or has been removed." />;
  }

  if (row.status !== "pending") {
    const label = row.status === "accepted" ? "already been accepted" : "been cancelled";
    return <ErrorCard message={`This invitation has ${label}.`} />;
  }

  if (row.expiresAt < new Date()) {
    return <ErrorCard message="This invitation has expired. Ask the owner to send a new one." />;
  }

  // Check if a user is already signed in
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  const isSignedIn = !!session?.user;

  // If signed in but different email, warn the user
  const emailMismatch = isSignedIn && session!.user.email !== row.email;

  const acceptPath = `/accept-invitation?invitationId=${invitationId}`;
  const signInUrl = `/sign-in?callbackURL=${encodeURIComponent(acceptPath)}`;
  const signUpUrl = `/sign-up?callbackURL=${encodeURIComponent(acceptPath)}`;

  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl font-bold">You&apos;re invited</CardTitle>
        <CardDescription>
          <strong>{row.inviterName}</strong> invited you to join{" "}
          <strong>{row.orgName}</strong> as {row.role === "owner" ? "an owner" : "a member"}.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          <p className="text-muted-foreground">Invitation sent to</p>
          <p className="font-medium mt-0.5">{row.email}</p>
        </div>

        {emailMismatch && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            You&apos;re signed in as <strong>{session!.user.email}</strong>, but this invitation
            was sent to <strong>{row.email}</strong>. Sign in with the correct account to accept.
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-3 pt-2">
        {isSignedIn && !emailMismatch ? (
          <AcceptInvitationButtons invitationId={invitationId} orgName={row.orgName} />
        ) : (
          <>
            <Link href={signInUrl} className="w-full">
              <Button className="w-full">Sign in to accept</Button>
            </Link>
            <Link href={signUpUrl} className="w-full">
              <Button variant="outline" className="w-full">Create account to accept</Button>
            </Link>
          </>
        )}
      </CardFooter>
    </Card>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold">Invitation not found</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Link href="/sign-in">
          <Button variant="outline">Go to sign in</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
