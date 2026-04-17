import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Plus, Zap, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { toast } from "sonner";

export default function Automations() {
  const [, setLocation] = useLocation();
  const { data: automations, isLoading } = trpc.automations.list.useQuery();
  const utils = trpc.useUtils();

  const toggleMutation = trpc.automations.toggle.useMutation({
    onSuccess: () => {
      utils.automations.list.invalidate();
    },
  });

  const deleteMutation = trpc.automations.delete.useMutation({
    onSuccess: () => {
      utils.automations.list.invalidate();
      toast.success("Automation deleted");
    },
  });

  const [deleteId, setDeleteId] = useState<number | null>(null);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Automations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your Instagram comment-to-DM automation rules.
          </p>
        </div>
        <Button size="sm" onClick={() => setLocation("/automations/new")} className="h-9 text-xs">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          New Automation
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <Skeleton className="h-5 w-1/3 mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : !automations?.length ? (
        <div className="rounded-xl border border-dashed border-border bg-card flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-4">
            <Zap className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">No automations yet</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Create your first automation rule to start sending DMs automatically.
          </p>
          <Button size="sm" onClick={() => setLocation("/automations/new")} className="h-8 text-xs">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Create Automation
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {automations.map((auto: any) => (
            <div
              key={auto.id}
              className="rounded-xl border border-border bg-card p-4 hover:border-primary/20 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${auto.isActive ? "bg-primary/8" : "bg-muted"}`}>
                    <Zap className={`h-4 w-4 ${auto.isActive ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-foreground truncate">{auto.name}</h3>
                      <Badge
                        variant={auto.isActive ? "default" : "secondary"}
                        className="text-[10px] h-5 shrink-0"
                      >
                        {auto.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {(auto.triggerKeywords as string[])?.map((k: string) => (
                        <span
                          key={k}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary text-muted-foreground border border-border"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <Switch
                    checked={auto.isActive}
                    onCheckedChange={() =>
                      toggleMutation.mutate({
                        id: auto.id,
                        isActive: !auto.isActive,
                      })
                    }
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        onClick={() => setLocation(`/automations/${auto.id}/edit`)}
                        className="text-[13px]"
                      >
                        <Pencil className="mr-2 h-3.5 w-3.5" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive text-[13px]"
                        onClick={() => setDeleteId(auto.id)}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete automation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this automation rule.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteMutation.mutate({ id: deleteId });
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
