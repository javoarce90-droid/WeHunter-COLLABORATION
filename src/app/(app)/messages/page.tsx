import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { listThreads, listTemplates } from "@/features/recruiter/messaging/data/messaging.queries";
import { listCandidateOptions } from "@/features/recruiter/candidates/data/candidates.queries";
import { Inbox } from "@/features/recruiter/messaging/ui/Inbox";
import { parsePage, totalPages as calcTotalPages } from "@/lib/pagination";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const { page: rawPage } = await searchParams;
  const page = parsePage(rawPage);

  const [{ threads, total }, templates, candidates] = await Promise.all([
    listThreads(membership.organizationId, page),
    listTemplates(membership.organizationId),
    listCandidateOptions(membership.organizationId),
  ]);

  return (
    <Inbox
      threads={threads}
      templates={templates}
      candidates={candidates.map((c) => ({ id: c.id, fullName: c.fullName }))}
      page={page}
      totalPages={calcTotalPages(total)}
    />
  );
}
