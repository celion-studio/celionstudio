import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Automations</h1>
          <p className="text-muted-foreground mt-1">
            Manage your Instagram comment-to-DM automation rules.
          </p>
        </div>
        <Button onClick={() => setLocation("/automations/new")}>
          <Plus className="mr-2 h-4 w-4" />
          New Automation
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-5 w-1/3 mb-3" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !automations?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Zap className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No automations yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first automation rule to start sending DMs automatically.
            </p>
            <Button onClick={() => setLocation("/automations/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Create Automation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {automations.map((auto: any) => (
            <Card
              key={auto.id}
              className="hover:border-primary/30 transition-colors"
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold truncate">{auto.name}</h3>
                      <Badge variant={auto.isActive ? "default" : "secondary"}>
                        {auto.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        Keywords:{" "}
                        {(auto.triggerKeywords as string[])?.map((k: string) => (
                          <Badge
                            key={k}
                            variant="outline"
                            className="mr-1 text-xs"
                          >
                            {k}
                          </Badge>
                        ))}
                      </span>
                      {auto.igMediaId && (
                        <span>Post: {auto.igMediaId}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
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
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            setLocation(`/automations/${auto.id}/edit`)
                          }
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(auto.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete automation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this automation rule. DMs will no longer be sent for this trigger.
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
