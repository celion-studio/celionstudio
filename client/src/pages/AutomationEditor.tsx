import { Button } from "@/components/ui/button";
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
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setLocation("/automations")}
          className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {isEditing ? "Edit Automation" : "New Automation"}
          </h1>
        </div>
        <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-9 text-xs">
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Automation Details */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-medium text-foreground">Automation Details</h2>
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs text-muted-foreground">Name</Label>
          <Input
            id="name"
            placeholder="e.g., Ebook Sales Automation"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="product" className="text-xs text-muted-foreground">Linked Product (optional)</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger className="h-9 text-sm">
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
      </div>

      {/* Trigger Settings */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-medium text-foreground">Trigger Settings</h2>
        <div className="space-y-1.5">
          <Label htmlFor="mediaId" className="text-xs text-muted-foreground">Instagram Post ID (optional)</Label>
          <Input
            id="mediaId"
            placeholder="Leave empty to apply to all posts"
            value={igMediaId}
            onChange={(e) => setIgMediaId(e.target.value)}
            className="h-9 text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            If empty, the automation triggers on comments from any of your posts.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Trigger Keywords</Label>
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
              className="h-9 text-sm"
            />
            <Button variant="outline" onClick={addKeyword} type="button" size="sm" className="h-9 w-9 p-0 shrink-0">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-secondary text-muted-foreground border border-border"
                >
                  {kw}
                  <button
                    onClick={() => removeKeyword(kw)}
                    className="hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            When a follower comments with any of these keywords, a DM will be sent.
          </p>
        </div>
      </div>

      {/* DM Template */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-medium text-foreground">DM Message Template</h2>
        <div className="space-y-1.5">
          <Textarea
            placeholder={`Hi {{name}}! 👋\n\nThanks for your interest! Here's the link to grab your copy:\n\n{{link}}\n\nLet me know if you have any questions!`}
            value={dmTemplate}
            onChange={(e) => setDmTemplate(e.target.value)}
            rows={8}
            className="text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            Use {"{{link}}"} to insert the product checkout URL. Use {"{{name}}"} for the commenter's name.
          </p>
        </div>
      </div>
    </div>
  );
}
