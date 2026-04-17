import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Save, Upload, Eye, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function ProductEditor() {
  const params = useParams<{ id: string }>();
  const isEditing = !!params.id;
  const [, setLocation] = useLocation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentMarkdown, setContentMarkdown] = useState("");
  const [externalCheckoutUrl, setExternalCheckoutUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editorTab, setEditorTab] = useState("write");

  const { data: product } = trpc.products.getById.useQuery(
    { id: Number(params.id) },
    { enabled: isEditing }
  );

  useEffect(() => {
    if (product) {
      setTitle(product.title);
      setDescription(product.description || "");
      setContentMarkdown(product.contentMarkdown || "");
      setExternalCheckoutUrl(product.externalCheckoutUrl || "");
    }
  }, [product]);

  const utils = trpc.useUtils();

  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate();
      toast.success("Product created");
      setLocation("/products");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate();
      toast.success("Product updated");
      setLocation("/products");
    },
    onError: (err) => toast.error(err.message),
  });

  const convertPdfMutation = trpc.products.convertToPdf.useMutation({
    onSuccess: () => {
      toast.success("PDF generated and hosted!");
      utils.products.list.invalidate();
      if (isEditing) {
        utils.products.getById.invalidate({ id: Number(params.id) });
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    const data = {
      title,
      description,
      contentMarkdown,
      externalCheckoutUrl,
    };
    if (isEditing) {
      updateMutation.mutate({ id: Number(params.id), ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const uploadPdfMutation = trpc.products.uploadPdf.useMutation({
    onSuccess: () => {
      toast.success("PDF uploaded successfully!");
      if (isEditing) {
        utils.products.getById.invalidate({ id: Number(params.id) });
      }
      utils.products.list.invalidate();
      setUploading(false);
    },
    onError: (err) => {
      toast.error(err.message || "Upload failed");
      setUploading(false);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File size must be under 20MB");
      return;
    }

    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadPdfMutation.mutate({
        fileName: file.name,
        fileBase64: base64,
        productId: isEditing ? Number(params.id) : undefined,
      });
    };
    reader.readAsDataURL(file);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setLocation("/products")}
          className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {isEditing ? "Edit Product" : "New Product"}
          </h1>
        </div>
        <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-9 text-xs">
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Basic Info */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-medium text-foreground">Basic Information</h2>
        <div className="space-y-1.5">
          <Label htmlFor="title" className="text-xs text-muted-foreground">Title</Label>
          <Input
            id="title"
            placeholder="My Awesome Ebook"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description" className="text-xs text-muted-foreground">Description</Label>
          <Textarea
            id="description"
            placeholder="A brief description of your product..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="checkout" className="text-xs text-muted-foreground">External Checkout URL (optional)</Label>
          <Input
            id="checkout"
            placeholder="https://gumroad.com/l/your-product"
            value={externalCheckoutUrl}
            onChange={(e) => setExternalCheckoutUrl(e.target.value)}
            className="h-9 text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            Your Stripe, Gumroad, or other payment link. This will be included in DM messages.
          </p>
        </div>
      </div>

      {/* Content Editor */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-foreground">Content Editor</h2>
          {isEditing && contentMarkdown && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => convertPdfMutation.mutate({ id: Number(params.id) })}
              disabled={convertPdfMutation.isPending}
            >
              <FileText className="mr-1.5 h-3 w-3" />
              {convertPdfMutation.isPending ? "Generating..." : "Generate PDF"}
            </Button>
          )}
        </div>
        <Tabs value={editorTab} onValueChange={setEditorTab}>
          <TabsList className="mb-3 h-8">
            <TabsTrigger value="write" className="text-xs h-7 px-3">Write</TabsTrigger>
            <TabsTrigger value="preview" className="text-xs h-7 px-3">
              <Eye className="mr-1 h-3 w-3" />
              Preview
            </TabsTrigger>
          </TabsList>
          <TabsContent value="write">
            <Textarea
              placeholder="Write your ebook content in Markdown..."
              value={contentMarkdown}
              onChange={(e) => setContentMarkdown(e.target.value)}
              rows={20}
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground mt-2">
              Supports Markdown: **bold**, *italic*, # headings, - lists, etc.
            </p>
          </TabsContent>
          <TabsContent value="preview">
            <div className="min-h-[400px] rounded-lg border border-border bg-background p-6 prose max-w-none">
              {contentMarkdown ? (
                <Streamdown>{contentMarkdown}</Streamdown>
              ) : (
                <p className="text-muted-foreground italic text-sm">
                  Nothing to preview yet. Start writing in the editor.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* PDF Upload */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-medium text-foreground mb-4">Upload PDF</h2>
        <div className="border border-dashed border-border rounded-xl p-8 text-center bg-background">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
            <Upload className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Upload an existing PDF file (max 20MB)
          </p>
          <label>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <Button variant="outline" size="sm" asChild disabled={uploading} className="h-8 text-xs">
              <span>{uploading ? "Uploading..." : "Choose File"}</span>
            </Button>
          </label>
        </div>
        {product?.fileUrl && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            <FileText className="h-3.5 w-3.5 text-primary" />
            <a
              href={product.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline truncate"
            >
              Current file: {product.fileUrl}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
