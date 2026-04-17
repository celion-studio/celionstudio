import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    onSuccess: (data) => {
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
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/products")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {isEditing ? "Edit Product" : "New Product"}
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
          <CardTitle className="text-base">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="My Awesome Ebook"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="A brief description of your product..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="checkout">External Checkout URL (optional)</Label>
            <Input
              id="checkout"
              placeholder="https://gumroad.com/l/your-product"
              value={externalCheckoutUrl}
              onChange={(e) => setExternalCheckoutUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Your Stripe, Gumroad, or other payment link. This will be included in DM messages.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Content Editor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Content Editor</span>
            {isEditing && contentMarkdown && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => convertPdfMutation.mutate({ id: Number(params.id) })}
                disabled={convertPdfMutation.isPending}
              >
                <FileText className="mr-2 h-3.5 w-3.5" />
                {convertPdfMutation.isPending ? "Generating..." : "Generate PDF"}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={editorTab} onValueChange={setEditorTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="mr-1.5 h-3.5 w-3.5" />
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
              <p className="text-xs text-muted-foreground mt-2">
                Supports Markdown formatting: **bold**, *italic*, # headings, - lists, etc.
              </p>
            </TabsContent>
            <TabsContent value="preview">
              <div className="min-h-[400px] rounded-md border border-border bg-card p-6 prose prose-invert max-w-none">
                {contentMarkdown ? (
                  <Streamdown>{contentMarkdown}</Streamdown>
                ) : (
                  <p className="text-muted-foreground italic">
                    Nothing to preview yet. Start writing in the editor.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* PDF Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload PDF</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
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
              <Button variant="outline" asChild disabled={uploading}>
                <span>{uploading ? "Uploading..." : "Choose File"}</span>
              </Button>
            </label>
          </div>
          {product?.fileUrl && (
            <div className="mt-4 flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-primary" />
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
        </CardContent>
      </Card>
    </div>
  );
}
