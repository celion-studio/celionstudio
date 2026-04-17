import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Zap, BookOpen, MessageSquare, BarChart3, ArrowRight, CheckCircle2 } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tight">SellMate</span>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Button onClick={() => setLocation("/dashboard")}>
                Dashboard
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => (window.location.href = getLoginUrl())}
                >
                  Sign in
                </Button>
                <Button onClick={() => (window.location.href = getLoginUrl())}>
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary mb-8">
            <Zap className="h-3.5 w-3.5" />
            Built for Creators
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
            Create Ebooks.{" "}
            <span className="text-primary">Automate DMs.</span>
            <br />
            Sell on Autopilot.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            SellMate combines a digital product studio with Instagram comment-to-DM
            automation. Write ebooks, set keyword triggers, and let your sales
            happen automatically.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="text-base px-8"
              onClick={() =>
                isAuthenticated
                  ? setLocation("/dashboard")
                  : (window.location.href = getLoginUrl())
              }
            >
              Start Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-8 bg-transparent"
              onClick={() => {
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              See How It Works
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 border-t border-border/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Everything you need to sell digital products
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Stop juggling between Canva, ManyChat, and Gumroad. SellMate brings it all together.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<BookOpen className="h-6 w-6" />}
              title="Product Studio"
              description="Write ebooks with our markdown editor or upload existing PDFs. Generate download links instantly."
            />
            <FeatureCard
              icon={<MessageSquare className="h-6 w-6" />}
              title="DM Automation"
              description="Set keyword triggers on Instagram posts. When followers comment, they get your sales link via DM automatically."
            />
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="Analytics & Logs"
              description="Track every DM sent, monitor success rates, and understand your conversion funnel at a glance."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 border-t border-border/50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-16">
            How it works
          </h2>
          <div className="space-y-8">
            <StepItem
              step="01"
              title="Create your digital product"
              description="Use our markdown editor to write an ebook from scratch, or upload an existing PDF. We host it and generate a download link."
            />
            <StepItem
              step="02"
              title="Set up automation rules"
              description='Choose an Instagram post, define trigger keywords like "ebook" or "guide", and write your DM template with the product link.'
            />
            <StepItem
              step="03"
              title="Watch sales happen"
              description="When followers comment with your keyword, SellMate instantly sends them a DM with your product link. You sell while you sleep."
            />
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="py-20 border-t border-border/50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-muted-foreground text-lg mb-10">
            Start free with 100 DMs/month. Upgrade to Pro for unlimited everything.
          </p>
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="rounded-xl border border-border p-6 text-left bg-card">
              <p className="text-sm font-medium text-muted-foreground mb-1">Free</p>
              <p className="text-3xl font-bold mb-4">$0<span className="text-base font-normal text-muted-foreground">/mo</span></p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> 100 DMs / month</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Basic editor</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> 3 automation rules</li>
              </ul>
            </div>
            <div className="rounded-xl border-2 border-primary p-6 text-left bg-card relative">
              <div className="absolute -top-3 left-6 bg-primary text-primary-foreground text-xs font-medium px-3 py-0.5 rounded-full">
                Popular
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Pro</p>
              <p className="text-3xl font-bold mb-4">$29<span className="text-base font-normal text-muted-foreground">/mo</span></p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Unlimited DMs</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Premium templates</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Unlimited automations</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Priority support</li>
              </ul>
            </div>
          </div>
          <Button
            size="lg"
            className="mt-10 text-base px-8"
            onClick={() =>
              isAuthenticated
                ? setLocation("/pricing")
                : (window.location.href = getLoginUrl())
            }
          >
            Get Started Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">SellMate</span>
          </div>
          <p>&copy; {new Date().getFullYear()} SellMate. All rights reserved.</p>
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
    <div className="rounded-xl border border-border bg-card p-6 hover:border-primary/30 transition-colors">
      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function StepItem({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-6 items-start">
      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
        {step}
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
