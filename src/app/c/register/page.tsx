import { RegisterForm } from "./RegisterForm";

export default async function CandidateRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  return <RegisterForm redirectTo={redirect ?? "/"} />;
}
