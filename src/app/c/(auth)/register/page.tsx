import { RegisterForm } from "./RegisterForm";

export default async function CandidateRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; prefill_name?: string; prefill_email?: string }>;
}) {
  const { redirect, prefill_name, prefill_email } = await searchParams;
  return (
    <RegisterForm
      redirectTo={redirect ?? "/"}
      defaultName={prefill_name ?? ""}
      defaultEmail={prefill_email ?? ""}
    />
  );
}
