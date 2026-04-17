import { Card, CardContent } from "@/components/ui/card";
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

  const statusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "rate_limited":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const statusBadge = (status: string) => {
    const variant =
      status === "success"
        ? "default"
        : status === "failed"
          ? "destructive"
          : "secondary";
    return <Badge variant={variant as any}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">DM Logs</h1>
        <p className="text-muted-foreground mt-1">
          View the history of all automated DM sends.
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-5">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : !logs?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ScrollText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No DM logs yet</h3>
            <p className="text-sm text-muted-foreground">
              Logs will appear here once your automations start sending DMs.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Automation</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Comment ID</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {statusIcon(log.status)}
                        {statusBadge(log.status)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.automationName || `#${log.automationId}`}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {log.igSenderId}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {log.igCommentId}
                    </TableCell>
                    <TableCell className="text-sm text-destructive max-w-[200px] truncate">
                      {log.errorMessage || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
