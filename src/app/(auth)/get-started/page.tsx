import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export const metadata = { title: "Get started — AgriFlow" };

export default async function GetStartedPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token) {
    return <ErrorCard message="This invitation link is invalid or incomplete." />;
  }

  const [invite] = await db
    .select()
    .from(schema.platformInvitation)
    .where(eq(schema.platformInvitation.id, token))
    .limit(1);

  if (!invite) {
    return <ErrorCard message="This invitation link is invalid or has been removed." />;
  }

  if (invite.acceptedAt) {
    return <ErrorCard message="This invitation has already been used. Sign in to access your account." showSignIn />;
  }

  if (invite.expiresAt < new Date()) {
    return <ErrorCard message="This invitation link has expired. Contact AgriFlow to get a new one." />;
  }

  const onboardingUrl = `/onboarding?token=${token}`;
  const signUpUrl = `/sign-up?callbackURL=${encodeURIComponent(onboardingUrl)}`;
  const signInUrl = `/sign-in?callbackURL=${encodeURIComponent(onboardingUrl)}`;

  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl font-bold">Welcome to AgriFlow</CardTitle>
        <CardDescription>
          You&apos;ve been invited to set up your business on AgriFlow.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
          <p className="text-muted-foreground">Invitation sent to</p>
          <p className="font-medium mt-0.5">{invite.email}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Create your account, then name your business. It takes less than 2 minutes.
        </p>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 pt-2">
        <Link href={signUpUrl} className="w-full">
          <Button className="w-full">Create account</Button>
        </Link>
        <Link href={signInUrl} className="w-full">
          <Button variant="outline" className="w-full">Sign in to existing account</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

function ErrorCard({ message, showSignIn }: { message: string; showSignIn?: boolean }) {
  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold">Link unavailable</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      {showSignIn && (
        <CardFooter>
          <Link href="/sign-in">
            <Button variant="outline">Sign in</Button>
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
