import { Hero } from "@/components/marketing/Hero";
import { getPageSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const session = await getPageSession();

  return (
    <Hero
      initialSignedIn={Boolean(session?.user)}
      initialUserName={session?.user?.name ?? null}
      initialUserEmail={session?.user?.email ?? null}
    />
  );
}
