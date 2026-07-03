import { LoginForm } from "./LoginForm";

export default async function CandidateLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  return <LoginForm redirectTo={redirect ?? "/"} />;
}
