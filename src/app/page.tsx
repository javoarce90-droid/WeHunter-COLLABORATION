import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LandingPage } from "./_marketing/LandingPage";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return <LandingPage />;
}
