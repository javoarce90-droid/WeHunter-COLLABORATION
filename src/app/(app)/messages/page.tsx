import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { listThreads, listTemplates } from "@/features/recruiter/messaging/data/messaging.queries";
import { listCandidates } from "@/features/recruiter/candidates/data/candidates.queries";
import { Inbox } from "@/features/recruiter/messaging/ui/Inbox";

export default async function MessagesPage() {
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const [threads, templates, candidates] = await Promise.all([
    listThreads(membership.organizationId),
    listTemplates(membership.organizationId),
    listCandidates(membership.organizationId),
  ]);

  return (
    <Inbox
      threads={threads}
      templates={templates}
      candidates={candidates.map((c) => ({ id: c.id, fullName: c.fullName }))}
    />
  );
}
