export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { requireOrg } from "@/lib/db/scoped";
import { can } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import * as schema from "@/lib/db/schema";
import { OrgForm } from "@/components/settings/org-form";
import { MembersTable, type MemberRow } from "@/components/settings/members-table";
import { InviteForm } from "@/components/settings/invite-form";
import {
  InvitationsTable,
  type InvitationRow,
} from "@/components/settings/invitations-table";

const TABS = [
  { id: "organization", label: "Organization" },
  { id: "members", label: "Members" },
  { id: "invitations", label: "Invitations" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const { orgId, role, db, session } = await requireOrg();

  if (!can(role, "settings:read")) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="rounded-2xl border bg-card shadow-sm p-8 text-center">
          <p className="text-base font-semibold">Not authorized</p>
          <p className="text-sm text-muted-foreground mt-1">
            Settings are only accessible to organization owners.
          </p>
        </div>
      </div>
    );
  }

  const resolvedSearch = await searchParams;
  const rawTab = resolvedSearch?.tab ?? "organization";
  const activeTab: TabId = (TABS.some((t) => t.id === rawTab)
    ? rawTab
    : "organization") as TabId;

  // ── Fetch data for the active tab ──────────────────────────────────────────
  let orgData: { name: string; slug: string | null } | null = null;
  let membersData: MemberRow[] = [];
  let ownerCount = 0;
  let invitationsData: InvitationRow[] = [];

  if (activeTab === "organization") {
    const [org] = await db
      .select({ name: schema.organization.name, slug: schema.organization.slug })
      .from(schema.organization)
      .where(eq(schema.organization.id, orgId))
      .limit(1);
    orgData = org ?? null;
  }

  if (activeTab === "members") {
    const rows = await db
      .select({
        id: schema.member.id,
        userId: schema.member.userId,
        role: schema.member.role,
        joinedAt: schema.member.createdAt,
        userName: schema.user.name,
        userEmail: schema.user.email,
      })
      .from(schema.member)
      .innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
      .where(eq(schema.member.organizationId, orgId))
      .orderBy(schema.member.createdAt);

    membersData = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      name: r.userName,
      email: r.userEmail,
      role: r.role,
      joinedAt: r.joinedAt,
    }));

    ownerCount = membersData.filter((m) => m.role === "owner").length;
  }

  if (activeTab === "invitations") {
    const rows = await db
      .select({
        id: schema.invitation.id,
        email: schema.invitation.email,
        role: schema.invitation.role,
        expiresAt: schema.invitation.expiresAt,
        inviterName: schema.user.name,
      })
      .from(schema.invitation)
      .innerJoin(schema.user, eq(schema.invitation.inviterId, schema.user.id))
      .where(
        and(
          eq(schema.invitation.organizationId, orgId),
          eq(schema.invitation.status, "pending")
        )
      )
      .orderBy(schema.invitation.expiresAt);

    invitationsData = rows.map((r) => ({
      id: r.id,
      email: r.email,
      role: r.role,
      expiresAt: r.expiresAt,
      inviterName: r.inviterName,
    }));
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your organization, members, and invitations.
        </p>
      </div>

      {/* Tab navigation */}
      <nav className="flex gap-1 border-b mb-6">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={`/settings?tab=${tab.id}`}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {/* Tab content */}
      {activeTab === "organization" && orgData && (
        <OrgForm org={orgData} />
      )}

      {activeTab === "members" && (
        <div className="space-y-6">
          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b">
              <p className="text-base font-semibold">Team members</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manage who has access to your organization.
              </p>
            </div>
            <div className="p-6">
              <MembersTable
                members={membersData}
                currentUserId={session.user.id}
                ownerCount={ownerCount}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "invitations" && (
        <div className="space-y-6">
          <InviteForm />

          <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b">
              <p className="text-base font-semibold">Pending invitations</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Invitations that have been sent but not yet accepted.
              </p>
            </div>
            <div className="p-6">
              <InvitationsTable invitations={invitationsData} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
