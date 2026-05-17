import { Hero } from "@/components/marketing/Hero";
import { getPageSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const session = await getPageSession();

  return (
    <Hero
      user={
        session?.user
          ? {
              name: session.user.name ?? null,
              email: session.user.email ?? null,
              image: session.user.image ?? null,
            }
          : null
      }
    />
  );
}
