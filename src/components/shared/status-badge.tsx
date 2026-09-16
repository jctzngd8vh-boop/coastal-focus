import { Badge } from "@/components/ui/badge";
import { PAYMENT_STATUS_LABELS } from "@/lib/payments/status";
import type { OrderStage, PaymentStatus } from "@/types/database";
import { cn } from "@/lib/utils";

const STAGE_COLOR_CLASSES: Record<string, string> = {
  blue: "bg-blue-100 text-blue-800 border-transparent dark:bg-blue-950 dark:text-blue-300",
  indigo: "bg-indigo-100 text-indigo-800 border-transparent dark:bg-indigo-950 dark:text-indigo-300",
  amber: "bg-amber-100 text-amber-800 border-transparent dark:bg-amber-950 dark:text-amber-300",
  emerald: "bg-emerald-100 text-emerald-800 border-transparent dark:bg-emerald-950 dark:text-emerald-300",
  slate: "bg-slate-200 text-slate-800 border-transparent dark:bg-slate-800 dark:text-slate-300",
  red: "bg-red-100 text-red-800 border-transparent dark:bg-red-950 dark:text-red-300",
};

export function OrderStageBadge({ stage }: { stage: OrderStage | undefined }) {
  if (!stage) return <Badge variant="outline">Unknown</Badge>;
  return <Badge className={cn(STAGE_COLOR_CLASSES[stage.color] ?? STAGE_COLOR_CLASSES.slate)}>{stage.label}</Badge>;
}

const PAYMENT_STATUS_VARIANT: Record<PaymentStatus, "success" | "warning" | "destructive" | "secondary"> = {
  unpaid: "destructive",
  pending_verification: "warning",
  partially_paid: "warning",
  paid: "success",
  refunded: "secondary",
  partially_refunded: "secondary",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={PAYMENT_STATUS_VARIANT[status]}>{PAYMENT_STATUS_LABELS[status]}</Badge>;
}
