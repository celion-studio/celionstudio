import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import {
  ArrowRight,
  BookOpen,
  MessageCircle,
  Zap,
  Shield,
  BarChart3,
  Sparkles,
} from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-4.5 w-4.5 text-primary" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-foreground">SellMate</span>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Button onClick={() => setLocation("/dashboard")} size="sm">
                Dashboard
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => (window.location.href = getLoginUrl())}
                >
                  Sign in
                </Button>
                <Button size="sm" onClick={() => (window.location.href = getLoginUrl())}>
                  Get Started
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-24 md:py-32">
        <div className="container max-w-3xl text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-secondary/50 text-xs font-medium text-muted-foreground mb-8">
            <Sparkles className="h-3 w-3 text-primary" />
            Built for creators who sell
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
            Create ebooks.{" "}
            <span className="text-primary">Automate DMs.</span>
            <br />
            Sell on autopilot.
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            SellMate combines a digital product studio with Instagram comment-to-DM
            automation. Write, publish, and sell — all from one place.
          </p>

          <div className="flex items-center justify-center gap-3">
            <Button
              size="lg"
              className="px-6 h-11 text-sm font-medium"
              onClick={() =>
                isAuthenticated
                  ? setLocation("/dashboard")
                  : (window.location.href = getLoginUrl())
              }
            >
              Start Free
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="px-6 h-11 text-sm font-medium"
              onClick={() => {
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              How it works
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 border-t border-border/60">
        <div className="container max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground mb-3">
              Everything you need to sell digital products
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              No more juggling between 4 different tools. One platform, from creation to sale.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<BookOpen className="h-5 w-5" />}
              title="Ebook Studio"
              description="Write in markdown, upload PDFs, or start from scratch. Your content, beautifully formatted and ready to sell."
            />
            <FeatureCard
              icon={<MessageCircle className="h-5 w-5" />}
              title="Comment-to-DM Automation"
              description="Set keyword triggers on your Instagram posts. When followers comment, they instantly receive your product link via DM."
            />
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="Instant Delivery"
              description="No manual work. Your digital product is delivered automatically the moment someone triggers your automation."
            />
            <FeatureCard
              icon={<BarChart3 className="h-5 w-5" />}
              title="Analytics Dashboard"
              description="Track DMs sent, conversion rates, and product performance. Know exactly what's working."
            />
            <FeatureCard
              icon={<Shield className="h-5 w-5" />}
              title="Flexible Payments"
              description="Connect your own checkout link — Gumroad, Stripe, Stan Store, or any payment processor you prefer."
            />
            <FeatureCard
              icon={<Sparkles className="h-5 w-5" />}
              title="Pro Plan"
              description="Unlimited DMs, priority support, and advanced automation features. Scale without limits."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 border-t border-border/60 bg-secondary/30">
        <div className="container max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground text-center mb-14">
            How it works
          </h2>

          <div className="space-y-10">
            <Step
              number="1"
              title="Create your digital product"
              description="Write an ebook with our markdown editor or upload an existing PDF. Add a title, description, and your checkout link."
            />
            <Step
              number="2"
              title="Set up automation rules"
              description="Choose an Instagram post, define trigger keywords (e.g., 'ebook', 'link'), and craft your DM template with the product link."
            />
            <Step
              number="3"
              title="Watch sales happen"
              description="When a follower comments your keyword, SellMate sends them a DM with your product link instantly. You sell while you sleep."
            />
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="py-20 border-t border-border/60">
        <div className="container max-w-2xl text-center">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground mb-3">
            Simple, transparent pricing
          </h2>
          <p className="text-muted-foreground mb-8">
            Start free with 100 DMs/month. Upgrade when you're ready to scale.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto">
            <div className="rounded-xl border border-border bg-card p-6 text-left">
              <p className="text-sm font-medium text-muted-foreground mb-1">Free</p>
              <p className="text-3xl font-bold text-foreground mb-3">$0</p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span> 100 DMs / month
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span> Unlimited products
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span> Markdown editor
                </li>
              </ul>
            </div>
            <div className="rounded-xl border-2 border-primary bg-card p-6 text-left relative">
              <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-semibold rounded-full uppercase tracking-wider">
                Popular
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Pro</p>
              <p className="text-3xl font-bold text-foreground mb-3">
                $29<span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span> Unlimited DMs
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span> Advanced automations
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span> Priority support
                </li>
              </ul>
            </div>
          </div>

          <Button
            className="mt-8"
            onClick={() =>
              isAuthenticated
                ? setLocation("/pricing")
                : (window.location.href = getLoginUrl())
            }
          >
            View full pricing
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-border/60">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
              <Zap className="h-3 w-3 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">SellMate</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} SellMate. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 hover:border-primary/20 transition-colors">
      <div className="h-10 w-10 rounded-lg bg-primary/8 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-5">
      <div className="flex-shrink-0 h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
        {number}
      </div>
      <div className="pt-0.5">
        <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
