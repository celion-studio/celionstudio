'use client';

import type { Route } from 'next';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { EditorProofSection } from '@/components/marketing/landing/EditorProofSection';
import { FeatureSection } from '@/components/marketing/landing/FeatureSection';
import { FinalCtaSection } from '@/components/marketing/landing/FinalCtaSection';
import { HeroSection } from '@/components/marketing/landing/HeroSection';
import { OutputTypesSection } from '@/components/marketing/landing/OutputTypesSection';
import { PricingTeaserSection } from '@/components/marketing/landing/PricingTeaserSection';
import type { UserInfo } from '@/components/marketing/landing/types';
import { WorkflowSection } from '@/components/marketing/landing/WorkflowSection';

export function Hero({ user = null }: { user?: UserInfo | null }) {
  const pricingHref = "/pricing" as Route;
  const createHref = user ? ("/dashboard" as Route) : ("/auth?mode=sign-up" as Route);

  return (
    <div className="editorial-landing-page">
      <MarketingHeader user={user} />

      <main>
        <HeroSection createHref={createHref} pricingHref={pricingHref} />
        <OutputTypesSection />
        <WorkflowSection />
        <EditorProofSection />
        <FeatureSection />
        <PricingTeaserSection createHref={createHref} />
        <FinalCtaSection createHref={createHref} />
      </main>

      <MarketingFooter />
    </div>
  );
}
