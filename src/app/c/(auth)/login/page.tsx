import { LoginForm } from "./LoginForm";

export default async function CandidateLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const { redirect, error } = await searchParams;
  return <LoginForm redirectTo={redirect ?? "/"} oauthError={error === "oauth"} />;
}
