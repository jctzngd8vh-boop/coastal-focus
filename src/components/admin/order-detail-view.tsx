"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Printer, Copy, Plus, Trash2, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { OrderStageBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { MoneyInput } from "@/components/shared/money-input";
import { MessageComposer } from "@/components/shared/message-composer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { formatCents, outstandingBalanceCents } from "@/lib/orders/totals";
import { normalizePhone } from "@/lib/customers/normalize";
import { fullName } from "@/lib/utils";
import { PAYMENT_STATUS_LABELS } from "@/lib/payments/status";
import { resendOrderNotifications } from "@/lib/notifications/resend-notification-action";
import {
  addAdjustment,
  addOrderItem,
  cancelOrder,
  duplicateOrder,
  recordPayment,
  recordRefund,
  removeAdjustment,
  removeOrderItem,
  updateItemQuantity,
  updateOrderNotes,
  updateOrderStatus,
  updatePaymentStatusManually,
} from "@/lib/orders/order-actions";
import type { AdminOrderDetail } from "@/lib/orders/get-admin-orders";
import type { BusinessSettings, MessageTemplate, OrderStage, PaymentStatus, Product } from "@/types/database";

export function OrderDetailView({
  detail,
  stages,
  products,
  settings,
  templates,
}: {
  detail: AdminOrderDetail;
  stages: OrderStage[];
  products: Product[];
  settings: BusinessSettings;
  templates: MessageTemplate[];
}) {
  const router = useRouter();
  const { order, customer, items, adjustments, payments, refunds, statusHistory } = detail;
  const [internalNotes, setInternalNotes] = React.useState(order.internal_notes);
  const [customerNotes, setCustomerNotes] = React.useState(order.customer_visible_notes);

  const balanceDue = outstandingBalanceCents(order);
  const phoneNormalized = normalizePhone(customer.phone);

  return (
    <div className="flex flex-col gap-4 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div>
          <h1 className="text-xl font-bold">{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleString()} · {order.source}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await resendOrderNotifications(order.id);
                toast.success("Notifications sent (check Resend/Twilio configuration if nothing arrives).");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Couldn't send notifications.");
              }
            }}
          >
            <Send className="h-4 w-4" /> Notify
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await duplicateOrder(order.id);
            }}
          >
            <Copy className="h-4 w-4" /> Duplicate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fulfillment Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <OrderStageBadge stage={stages.find((s) => s.key === order.status)} />
            <Select
              defaultValue={order.status}
              onChange={async (e) => {
                await updateOrderStatus(order.id, e.target.value);
                toast.success("Status updated.");
                router.refresh();
              }}
            >
              {stages.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <PaymentStatusBadge status={order.payment_status} />
            <Select
              defaultValue={order.payment_status}
              onChange={async (e) => {
                await updatePaymentStatusManually(order.id, e.target.value, "Manually set by owner.");
                toast.success("Payment status updated.");
                router.refresh();
              }}
            >
              {Object.entries(PAYMENT_STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key as PaymentStatus}>
                  {label}
                </option>
              ))}
            </Select>
            {balanceDue > 0 && <p className="text-sm text-muted-foreground">Balance due: {formatCents(balanceDue, settings.currency)}</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <Link href={`/admin/customers/${customer.id}`} className="font-medium underline underline-offset-2">
            {fullName(customer.first_name, customer.last_name)}
          </Link>
          <p className="text-sm text-muted-foreground">
            {customer.phone}
            {customer.email ? ` · ${customer.email}` : ""}
          </p>
          <p className="mt-2 text-sm">
            <span className="font-medium">{order.fulfillment_method_label}</span>
            {order.requested_at && ` · Requested ${new Date(order.requested_at).toLocaleString()}`}
          </p>
          {order.fulfillment_address && (
            <p className="text-sm text-muted-foreground">
              {order.fulfillment_address.line1}, {order.fulfillment_address.city}, {order.fulfillment_address.state}{" "}
              {order.fulfillment_address.postal_code}
            </p>
          )}
          {order.gift_message && <p className="mt-2 text-sm italic">Gift message: {order.gift_message}</p>}
        </CardContent>
      </Card>

      <ItemsCard orderId={order.id} items={items} products={products} currency={settings.currency} />

      <AdjustmentsCard orderId={order.id} adjustments={adjustments} currency={settings.currency} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Totals</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <Row label="Subtotal" value={formatCents(order.subtotal_cents, settings.currency)} />
          <Row label="Discount" value={`-${formatCents(order.discount_cents, settings.currency)}`} />
          <Row label="Tax" value={formatCents(order.tax_cents, settings.currency)} />
          <Row label="Fulfillment fee" value={formatCents(order.fulfillment_fee_cents, settings.currency)} />
          <div className="flex justify-between border-t border-border pt-2 font-semibold">
            <span>Total</span>
            <span>{formatCents(order.total_cents, settings.currency)}</span>
          </div>
          <Row label="Paid" value={formatCents(order.amount_paid_cents, settings.currency)} />
          <Row label="Refunded" value={formatCents(order.amount_refunded_cents, settings.currency)} />
        </CardContent>
      </Card>

      <PaymentsCard orderId={order.id} payments={payments} refunds={refunds} currency={settings.currency} defaultMethodLabel={order.payment_method_label} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <Label>Internal notes (owner only)</Label>
            <Textarea
              className="mt-1"
              rows={2}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              onBlur={() => updateOrderNotes(order.id, "internal_notes", internalNotes)}
            />
          </div>
          <div>
            <Label>Customer-visible note</Label>
            <Textarea
              className="mt-1"
              rows={2}
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              onBlur={() => updateOrderNotes(order.id, "customer_visible_notes", customerNotes)}
            />
          </div>
          {order.customer_notes && (
            <div>
              <Label>Customer&apos;s order notes</Label>
              <p className="mt-1 rounded-lg bg-muted p-2 text-sm">{order.customer_notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <MessageComposer
        templates={templates}
        phoneNormalized={phoneNormalized}
        email={customer.email}
        variables={{
          first_name: customer.first_name,
          business_name: settings.business_name,
          order_number: order.order_number,
          amount_due: formatCents(balanceDue, settings.currency),
          pickup_instructions: settings.pickup_instructions,
          fulfillment_details: order.fulfillment_method_label,
          payment_instructions: `Please pay via ${order.payment_method_label}.`,
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          {statusHistory.map((h) => (
            <div key={h.id} className="flex justify-between text-muted-foreground">
              <span>
                {h.status_type === "payment" ? "Payment" : "Status"}: {h.status_value} {h.note && `— ${h.note}`}
              </span>
              <span>{new Date(h.changed_at).toLocaleString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {order.status !== "cancelled" && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Cancel Order</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Cancel this order</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel {order.order_number}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This restocks any tracked inventory and marks the order cancelled. This can&apos;t be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep order</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      await cancelOrder(order.id, "Cancelled by owner.");
                      toast.success("Order cancelled.");
                      router.refresh();
                    }}
                  >
                    Cancel order
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ItemsCard({
  orderId,
  items,
  products,
  currency,
}: {
  orderId: string;
  items: AdminOrderDetail["items"];
  products: Product[];
  currency: string;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = React.useState(false);
  const [productId, setProductId] = React.useState(products[0]?.id ?? "");
  const [qty, setQty] = React.useState(1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Items</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
            <div className="min-w-0 flex-1">
              <p>{item.product_name}</p>
              {item.selected_options.length > 0 && (
                <p className="text-xs text-muted-foreground">{item.selected_options.map((o) => o.option_name).join(", ")}</p>
              )}
            </div>
            <Input
              type="number"
              min={1}
              className="h-9 w-16"
              defaultValue={item.quantity}
              onBlur={async (e) => {
                const q = parseInt(e.target.value, 10) || 1;
                if (q !== item.quantity) {
                  await updateItemQuantity(item.id, orderId, q);
                  router.refresh();
                }
              }}
            />
            <span className="w-20 text-right">{formatCents(item.line_total_cents, currency)}</span>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={async () => {
                await removeOrderItem(item.id, orderId);
                router.refresh();
              }}
              aria-label="Remove item"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button variant="outline" size="sm" className="w-fit print:hidden" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      </CardContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatCents(p.price_cents, currency)}
                </option>
              ))}
            </Select>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(parseInt(e.target.value, 10) || 1)} />
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                await addOrderItem(orderId, productId, qty);
                setAddOpen(false);
                router.refresh();
              }}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function AdjustmentsCard({
  orderId,
  adjustments,
  currency,
}: {
  orderId: string;
  adjustments: AdminOrderDetail["adjustments"];
  currency: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState<"discount" | "custom_charge">("discount");
  const [label, setLabel] = React.useState("");
  const [amountCents, setAmountCents] = React.useState(0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Discounts &amp; Charges</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {adjustments.map((a) => (
          <div key={a.id} className="flex items-center justify-between text-sm">
            <span>{a.label}</span>
            <div className="flex items-center gap-2">
              <span>{a.amount_cents < 0 ? "-" : ""}{formatCents(Math.abs(a.amount_cents), currency)}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={async () => {
                  await removeAdjustment(a.id, orderId);
                  router.refresh();
                }}
                aria-label="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" className="w-fit print:hidden" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Add Discount or Charge
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Discount or Charge</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <option value="discount">Discount</option>
              <option value="custom_charge">Custom charge</option>
            </Select>
            <Input placeholder="Label (e.g. Loyalty discount)" value={label} onChange={(e) => setLabel(e.target.value)} />
            <MoneyInput cents={amountCents} onChangeCents={setAmountCents} />
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                if (!label.trim() || amountCents <= 0) {
                  toast.error("Enter a label and amount.");
                  return;
                }
                await addAdjustment(orderId, type, label, amountCents);
                setOpen(false);
                setLabel("");
                setAmountCents(0);
                router.refresh();
              }}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function PaymentsCard({
  orderId,
  payments,
  refunds,
  currency,
  defaultMethodLabel,
}: {
  orderId: string;
  payments: AdminOrderDetail["payments"];
  refunds: AdminOrderDetail["refunds"];
  currency: string;
  defaultMethodLabel: string;
}) {
  const router = useRouter();
  const [payOpen, setPayOpen] = React.useState(false);
  const [refundOpen, setRefundOpen] = React.useState(false);
  const [amountCents, setAmountCents] = React.useState(0);
  const [methodLabel, setMethodLabel] = React.useState(defaultMethodLabel);
  const [reference, setReference] = React.useState("");
  const [reason, setReason] = React.useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Payments &amp; Refunds</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {payments.map((p) => (
          <div key={p.id} className="flex justify-between text-sm">
            <span>
              Payment via {p.payment_method_label || "—"} {p.reference && `(${p.reference})`}
            </span>
            <span>{formatCents(p.amount_cents, currency)}</span>
          </div>
        ))}
        {refunds.map((r) => (
          <div key={r.id} className="flex justify-between text-sm text-destructive">
            <span>Refund {r.reason && `— ${r.reason}`}</span>
            <span>-{formatCents(r.amount_cents, currency)}</span>
          </div>
        ))}
        <div className="flex gap-2 print:hidden">
          <Button size="sm" onClick={() => setPayOpen(true)}>
            Record Payment
          </Button>
          <Button size="sm" variant="outline" onClick={() => setRefundOpen(true)}>
            Record Refund
          </Button>
        </div>
      </CardContent>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label>Amount</Label>
              <MoneyInput className="mt-1" cents={amountCents} onChangeCents={setAmountCents} />
            </div>
            <div>
              <Label>Method</Label>
              <Input className="mt-1" value={methodLabel} onChange={(e) => setMethodLabel(e.target.value)} />
            </div>
            <div>
              <Label>Reference (optional)</Label>
              <Input className="mt-1" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                if (amountCents <= 0) {
                  toast.error("Enter an amount.");
                  return;
                }
                await recordPayment({ orderId, amountCents, paymentMethodLabel: methodLabel, reference, notes: "" });
                toast.success("Payment recorded.");
                setPayOpen(false);
                setAmountCents(0);
                router.refresh();
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Refund</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label>Amount</Label>
              <MoneyInput className="mt-1" cents={amountCents} onChangeCents={setAmountCents} />
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Input className="mt-1" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                if (amountCents <= 0) {
                  toast.error("Enter an amount.");
                  return;
                }
                try {
                  await recordRefund({ orderId, amountCents, reason });
                  toast.success("Refund recorded.");
                  setRefundOpen(false);
                  setAmountCents(0);
                  router.refresh();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Couldn't record refund.");
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
