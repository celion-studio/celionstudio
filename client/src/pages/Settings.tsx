import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import {
  Instagram,
  CreditCard,
  Shield,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Unlink,
} from "lucide-react";

export default function Settings() {
  const { data: settings, isLoading } = trpc.settings.get.useQuery();
  const utils = trpc.useUtils();

  const [igAccountId, setIgAccountId] = useState("");
  const [igPageAccessToken, setIgPageAccessToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (settings) {
      setIgAccountId(settings.igAccountId ?? "");
    }
  }, [settings]);

  const updateInstagram = trpc.settings.updateInstagram.useMutation({
    onSuccess: () => {
      toast.success("Instagram credentials saved successfully");
      utils.settings.get.invalidate();
      setIgPageAccessToken("");
      setShowToken(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const disconnectInstagram = trpc.settings.disconnectInstagram.useMutation({
    onSuccess: () => {
      toast.success("Instagram account disconnected");
      utils.settings.get.invalidate();
      setIgAccountId("");
      setIgPageAccessToken("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSaveInstagram = () => {
    if (!igAccountId.trim() || !igPageAccessToken.trim()) {
      toast.error("Both Account ID and Page Access Token are required");
      return;
    }
    updateInstagram.mutate({
      igAccountId: igAccountId.trim(),
      igPageAccessToken: igPageAccessToken.trim(),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your integrations and account settings.
        </p>
      </div>

      {/* Account Info */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-medium text-foreground">Account</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Name</Label>
            <p className="text-sm font-medium text-foreground mt-0.5">{settings?.name || "—"}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <p className="text-sm font-medium text-foreground mt-0.5">{settings?.email || "—"}</p>
          </div>
        </div>
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs text-muted-foreground">Subscription</Label>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={settings?.subscriptionStatus === "pro" ? "default" : "secondary"} className="text-[10px] h-5">
                {settings?.subscriptionStatus === "pro" ? "PRO" : "FREE"}
              </Badge>
              {settings?.polarSubscriptionId && (
                <span className="text-[11px] text-muted-foreground">
                  ID: {settings.polarSubscriptionId.slice(0, 12)}...
                </span>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => window.location.href = "/pricing"}>
            <CreditCard className="h-3 w-3 mr-1.5" />
            Manage Plan
          </Button>
        </div>
      </div>

      {/* Instagram Integration */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Instagram className="h-4 w-4 text-pink-500" />
            <h2 className="text-sm font-medium text-foreground">Instagram Integration</h2>
          </div>
          {settings?.igConnected ? (
            <Badge variant="default" className="text-[10px] h-5 bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] h-5">
              <XCircle className="h-2.5 w-2.5 mr-1" />
              Not Connected
            </Badge>
          )}
        </div>

        {/* Setup Guide */}
        <div className="rounded-lg border border-border bg-background p-4 space-y-2">
          <h4 className="text-xs font-semibold text-foreground">Setup Guide</h4>
          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
            <li>
              Go to{" "}
              <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                Meta for Developers <ExternalLink className="h-2.5 w-2.5" />
              </a>{" "}
              and create an app with Instagram API access.
            </li>
            <li>Add <strong>Instagram Graph API</strong> and <strong>Webhooks</strong> products.</li>
            <li>
              Generate a Page Access Token with{" "}
              <code className="text-[10px] bg-muted px-1 py-0.5 rounded">instagram_manage_comments</code> and{" "}
              <code className="text-[10px] bg-muted px-1 py-0.5 rounded">instagram_manage_messages</code>.
            </li>
            <li>
              Webhook URL:{" "}
              <code className="text-[10px] bg-muted px-1 py-0.5 rounded break-all">
                {window.location.origin}/api/webhooks/instagram
              </code>
            </li>
          </ol>
        </div>

        <div className="h-px bg-border" />

        {/* Credential Fields */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="igAccountId" className="text-xs text-muted-foreground">Instagram Account ID</Label>
            <Input
              id="igAccountId"
              placeholder="e.g., 17841400123456789"
              value={igAccountId}
              onChange={(e) => setIgAccountId(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="igToken" className="text-xs text-muted-foreground">Page Access Token</Label>
            <div className="relative">
              <Input
                id="igToken"
                type={showToken ? "text" : "password"}
                placeholder={settings?.igConnected ? "••••••••••••••••••••••••" : "Paste your long-lived page access token"}
                value={igPageAccessToken}
                onChange={(e) => setIgPageAccessToken(e.target.value)}
                className="pr-10 h-9 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {settings?.igConnected
                ? "Token is saved. Enter a new token to replace it."
                : "A long-lived token from the Meta Graph API Explorer."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={handleSaveInstagram}
            disabled={updateInstagram.isPending || (!igAccountId.trim() || !igPageAccessToken.trim())}
          >
            {updateInstagram.isPending && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
            {settings?.igConnected ? "Update Credentials" : "Connect Instagram"}
          </Button>

          {settings?.igConnected && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs text-destructive hover:text-destructive">
                  <Unlink className="h-3 w-3 mr-1.5" />
                  Disconnect
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect Instagram?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove your credentials and stop all DM automations.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => disconnectInstagram.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Polar Payment Integration */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-blue-500" />
          <h2 className="text-sm font-medium text-foreground">Polar Payment Integration</h2>
        </div>

        <div className="rounded-lg border border-border bg-background p-4 space-y-2">
          <h4 className="text-xs font-semibold text-foreground">How to Set Up Polar</h4>
          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
            <li>
              Create an account at{" "}
              <a href="https://polar.sh" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                polar.sh <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </li>
            <li>Create a product for your Pro subscription plan.</li>
            <li>Go to <strong>Settings &rarr; Developers</strong> and generate an API key.</li>
            <li>
              Set environment variables:
              <div className="mt-1.5 space-y-1">
                <code className="block text-[10px] bg-muted px-2 py-1 rounded">POLAR_API_KEY=your_api_key</code>
                <code className="block text-[10px] bg-muted px-2 py-1 rounded">POLAR_PRO_PRODUCT_ID=your_product_id</code>
              </div>
            </li>
            <li>
              Webhook URL:{" "}
              <code className="text-[10px] bg-muted px-1 py-0.5 rounded break-all">
                {window.location.origin}/api/webhooks/polar
              </code>
            </li>
          </ol>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Status:</span>
          {settings?.polarSubscriptionId ? (
            <Badge variant="default" className="text-[10px] h-5 bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
              Active
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] h-5">Awaiting Configuration</Badge>
          )}
        </div>
      </div>
    </div>
  );
}
