import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Save, X, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function AutomationEditor() {
  const params = useParams<{ id: string }>();
  const isEditing = !!params.id;
  const [, setLocation] = useLocation();

  const [name, setName] = useState("");
  const [igMediaId, setIgMediaId] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [dmTemplate, setDmTemplate] = useState("");
  const [productId, setProductId] = useState<string>("none");

  const { data: automation } = trpc.automations.getById.useQuery(
    { id: Number(params.id) },
    { enabled: isEditing }
  );

  const { data: products } = trpc.products.list.useQuery();

  useEffect(() => {
    if (automation) {
      setName(automation.name);
      setIgMediaId(automation.igMediaId || "");
      setKeywords((automation.triggerKeywords as string[]) || []);
      setDmTemplate(automation.dmTemplate);
      setProductId(automation.productId ? String(automation.productId) : "none");
    }
  }, [automation]);

  const utils = trpc.useUtils();

  const createMutation = trpc.automations.create.useMutation({
    onSuccess: () => {
      utils.automations.list.invalidate();
      toast.success("Automation created");
      setLocation("/automations");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.automations.update.useMutation({
    onSuccess: () => {
      utils.automations.list.invalidate();
      toast.success("Automation updated");
      setLocation("/automations");
    },
    onError: (err) => toast.error(err.message),
  });

  const addKeyword = () => {
    const kw = keywordInput.trim().toLowerCase();
    if (kw && !keywords.includes(kw)) {
      setKeywords([...keywords, kw]);
    }
    setKeywordInput("");
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (keywords.length === 0) {
      toast.error("At least one trigger keyword is required");
      return;
    }
    if (!dmTemplate.trim()) {
      toast.error("DM template is required");
      return;
    }

    const data = {
      name,
      igMediaId: igMediaId || null,
      triggerKeywords: keywords,
      dmTemplate,
      productId: productId !== "none" ? Number(productId) : null,
    };

    if (isEditing) {
      updateMutation.mutate({ id: Number(params.id), ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/automations")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {isEditing ? "Edit Automation" : "New Automation"}
          </h1>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Automation Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g., Ebook Sales Automation"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="product">Linked Product (optional)</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No product linked</SelectItem>
                {products?.map((p: any) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Trigger */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trigger Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mediaId">Instagram Post ID (optional)</Label>
            <Input
              id="mediaId"
              placeholder="Leave empty to apply to all posts"
              value={igMediaId}
              onChange={(e) => setIgMediaId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              If empty, the automation triggers on comments from any of your posts.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Trigger Keywords</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., ebook"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addKeyword();
                  }
                }}
              />
              <Button variant="outline" onClick={addKeyword} type="button">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {keywords.map((kw) => (
                  <Badge key={kw} variant="secondary" className="gap-1 pr-1">
                    {kw}
                    <button
                      onClick={() => removeKeyword(kw)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              When a follower comments with any of these keywords, a DM will be sent.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* DM Template */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">DM Message Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder={`Hi {{name}}! 👋\n\nThanks for your interest! Here's the link to grab your copy:\n\n{{link}}\n\nLet me know if you have any questions!`}
              value={dmTemplate}
              onChange={(e) => setDmTemplate(e.target.value)}
              rows={8}
            />
            <p className="text-xs text-muted-foreground">
              Use {"{{link}}"} to insert the product checkout URL. Use {"{{name}}"} for the commenter's name.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
