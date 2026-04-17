import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { ScrollText, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function DmLogs() {
  const { data: logs, isLoading } = trpc.dmLogs.list.useQuery();

  const statusConfig: Record<string, { icon: React.ReactNode; label: string; variant: "default" | "destructive" | "secondary" }> = {
    success: {
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />,
      label: "Success",
      variant: "default",
    },
    failed: {
      icon: <XCircle className="h-3.5 w-3.5 text-destructive" />,
      label: "Failed",
      variant: "destructive",
    },
    rate_limited: {
      icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
      label: "Rate Limited",
      variant: "secondary",
    },
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">DM Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View the history of all automated DM sends.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : !logs?.length ? (
        <div className="rounded-xl border border-dashed border-border bg-card flex flex-col items-center justify-center py-16 text-center">
          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-4">
            <ScrollText className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">No DM logs yet</h3>
          <p className="text-xs text-muted-foreground">
            Logs will appear here once your automations start sending DMs.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium text-muted-foreground h-10">Status</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-10">Automation</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-10">Recipient</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-10">Error</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground h-10">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log: any) => {
                const config = statusConfig[log.status] || statusConfig.failed;
                return (
                  <TableRow key={log.id} className="hover:bg-accent/30">
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1.5">
                        {config.icon}
                        <Badge variant={config.variant} className="text-[10px] h-5">
                          {config.label}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-[13px] text-foreground">
                      {log.automationName || `#${log.automationId}`}
                    </TableCell>
                    <TableCell className="text-[13px] font-mono text-muted-foreground">
                      {log.igSenderId}
                    </TableCell>
                    <TableCell className="text-[13px] text-destructive max-w-[200px] truncate">
                      {log.errorMessage || "—"}
                    </TableCell>
                    <TableCell className="text-[13px] text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
