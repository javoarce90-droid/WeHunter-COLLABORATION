import { CandidateLoginForm } from "@/features/candidate/profile/ui/CandidateLoginForm";

export const metadata = {
  title: "Ingresar - WeHunter Talento",
  description: "Iniciá sesión en el portal de candidatos de WeHunter.",
};

export default async function CandidateLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect } = await searchParams;
  return <CandidateLoginForm redirectTo={redirect ?? "/portal"} />;
}
