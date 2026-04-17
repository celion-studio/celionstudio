import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Settings as SettingsIcon,
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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your integrations and account settings.
        </p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Account
          </CardTitle>
          <CardDescription>Your account information and subscription status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">Name</Label>
              <p className="font-medium">{settings?.name || "—"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Email</Label>
              <p className="font-medium">{settings?.email || "—"}</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-muted-foreground text-xs">Subscription</Label>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={settings?.subscriptionStatus === "pro" ? "default" : "secondary"}>
                  {settings?.subscriptionStatus === "pro" ? "PRO" : "FREE"}
                </Badge>
                {settings?.polarSubscriptionId && (
                  <span className="text-xs text-muted-foreground">
                    ID: {settings.polarSubscriptionId.slice(0, 12)}...
                  </span>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.location.href = "/pricing"}>
              <CreditCard className="h-4 w-4 mr-1" />
              Manage Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instagram Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Instagram className="h-5 w-5 text-pink-500" />
                Instagram Integration
              </CardTitle>
              <CardDescription className="mt-1">
                Connect your Instagram Business account to enable comment-to-DM automation.
              </CardDescription>
            </div>
            {settings?.igConnected ? (
              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="h-3 w-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Setup Guide */}
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
            <h4 className="text-sm font-semibold">Setup Guide</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>
                Go to{" "}
                <a
                  href="https://developers.facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  Meta for Developers <ExternalLink className="h-3 w-3" />
                </a>{" "}
                and create an app with Instagram API access.
              </li>
              <li>
                Add the <strong>Instagram Graph API</strong> and <strong>Webhooks</strong> products to your app.
              </li>
              <li>
                Generate a <strong>Page Access Token</strong> with{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">instagram_manage_comments</code> and{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">instagram_manage_messages</code> permissions.
              </li>
              <li>
                Set your Webhook callback URL to:{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded break-all">
                  {window.location.origin}/api/webhooks/instagram
                </code>
              </li>
              <li>Enter your Instagram Account ID and Page Access Token below.</li>
            </ol>
          </div>

          <Separator />

          {/* Credential Fields */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="igAccountId">Instagram Account ID</Label>
              <Input
                id="igAccountId"
                placeholder="e.g., 17841400123456789"
                value={igAccountId}
                onChange={(e) => setIgAccountId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Your Instagram Business or Creator account numeric ID.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="igToken">Page Access Token</Label>
              <div className="relative">
                <Input
                  id="igToken"
                  type={showToken ? "text" : "password"}
                  placeholder={settings?.igConnected ? "••••••••••••••••••••••••" : "Paste your long-lived page access token"}
                  value={igPageAccessToken}
                  onChange={(e) => setIgPageAccessToken(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {settings?.igConnected
                  ? "Token is saved. Enter a new token to replace it."
                  : "A long-lived token from the Meta Graph API Explorer or your app settings."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSaveInstagram}
              disabled={updateInstagram.isPending || (!igAccountId.trim() || !igPageAccessToken.trim())}
            >
              {updateInstagram.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {settings?.igConnected ? "Update Credentials" : "Connect Instagram"}
            </Button>

            {settings?.igConnected && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive hover:text-destructive">
                    <Unlink className="h-4 w-4 mr-1" />
                    Disconnect
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect Instagram?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove your Instagram credentials and stop all DM automations.
                      You can reconnect at any time.
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
        </CardContent>
      </Card>

      {/* Polar API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-500" />
            Polar Payment Integration
          </CardTitle>
          <CardDescription>
            Configure Polar API keys to enable subscription payments from your users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
            <h4 className="text-sm font-semibold">How to Set Up Polar</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>
                Create an account at{" "}
                <a
                  href="https://polar.sh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  polar.sh <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>Create a product for your Pro subscription plan.</li>
              <li>
                Go to <strong>Settings → Developers</strong> and generate an API key.
              </li>
              <li>
                Set the following environment variables in your deployment:
                <div className="mt-2 space-y-1">
                  <code className="block text-xs bg-muted px-2 py-1 rounded">POLAR_API_KEY=your_api_key</code>
                  <code className="block text-xs bg-muted px-2 py-1 rounded">POLAR_PRO_PRODUCT_ID=your_product_id</code>
                </div>
              </li>
              <li>
                Set up a Webhook in Polar pointing to:{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded break-all">
                  {window.location.origin}/api/webhooks/polar
                </code>
              </li>
            </ol>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status:</span>
            {settings?.polarSubscriptionId ? (
              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge variant="secondary">Awaiting Configuration</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
