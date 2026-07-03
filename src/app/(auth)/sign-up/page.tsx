import Link from "next/link";
import { Phone, Mail, MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignUpForm } from "./sign-up-form";

export const metadata = { title: "Get started" };

const CONTACT_EMAIL = process.env.CONTACT_EMAIL ?? "";
const CONTACT_PHONE = process.env.CONTACT_PHONE ?? "";
const CONTACT_WHATSAPP = process.env.CONTACT_WHATSAPP ?? "";
const ALLOW_PUBLIC_SIGNUP = process.env.ALLOW_PUBLIC_SIGNUP === "true";

export default function SignUpPage() {
  if (ALLOW_PUBLIC_SIGNUP) {
    return <SignUpForm />;
  }

  return (
    <Card className="shadow-sm border-border/60">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-2xl font-bold">Request access</CardTitle>
        <CardDescription>
          AgriFlow is invite-only. Contact us to get set up for your mill.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          We onboard each business personally to make sure AgriFlow is
          configured exactly right for your operation.
        </p>

        <div className="space-y-2">
          {CONTACT_WHATSAPP && (
            <a
              href={`https://wa.me/${CONTACT_WHATSAPP.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-muted/50 transition-colors group"
            >
              <span className="flex size-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 shrink-0">
                <MessageCircle className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">WhatsApp</p>
                <p className="text-xs text-muted-foreground">{CONTACT_WHATSAPP}</p>
              </div>
            </a>
          )}

          {CONTACT_PHONE && (
            <a
              href={`tel:${CONTACT_PHONE}`}
              className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-muted/50 transition-colors group"
            >
              <span className="flex size-8 items-center justify-center rounded-md bg-blue-50 text-blue-600 shrink-0">
                <Phone className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">Call us</p>
                <p className="text-xs text-muted-foreground">{CONTACT_PHONE}</p>
              </div>
            </a>
          )}

          {CONTACT_EMAIL && (
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-muted/50 transition-colors group"
            >
              <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                <Mail className="size-4" />
              </span>
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-xs text-muted-foreground">{CONTACT_EMAIL}</p>
              </div>
            </a>
          )}
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <Link href="/sign-in" className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}>
          Sign in to existing account
        </Link>
      </CardContent>
    </Card>
  );
}
