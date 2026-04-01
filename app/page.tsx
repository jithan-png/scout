import { auth } from "@/auth";
import { redirect } from "next/navigation";
import PublicLanding from "@/components/ui/PublicLanding";

export default async function HomePage() {
  const session = await auth();

  // Authenticated users go straight to Scout
  if (session?.user) {
    redirect("/scout");
  }

  return <PublicLanding />;
}
