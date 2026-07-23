import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default async function CandidateForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <ForgotPasswordForm realm="candidate" expired={error === "expired"} />;
}
