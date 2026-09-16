import { Phone, MessageSquare, Mail, PartyPopper } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrderStageBadge, PaymentStatusBadge } from "@/components/shared/status-badge";
import { formatCents } from "@/lib/orders/totals";
import { buildMailtoLink, buildSmsLink, buildTelLink, interpolateTemplate } from "@/lib/messages/templates";
import { normalizePhone } from "@/lib/customers/normalize";
import type { BusinessSettings, Customer, Order, OrderItem, OrderStage } from "@/types/database";

export function OrderStatusView({
  order,
  items,
  customer,
  settings,
  stages,
  isNew,
}: {
  order: Order;
  items: OrderItem[];
  customer: Customer;
  settings: BusinessSettings;
  stages: OrderStage[];
  isNew?: boolean;
}) {
  const stage = stages.find((s) => s.key === order.status);
  const businessPhone = settings.business_phone ? normalizePhone(settings.business_phone) : null;
  const smsPhone = settings.sms_phone ? normalizePhone(settings.sms_phone) : businessPhone;

  return (
    <div className="flex flex-col gap-4">
      {isNew && (
        <div className="flex items-center gap-2 rounded-lg bg-success/15 p-3 text-success">
          <PartyPopper className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">Order placed! Bookmark this page to check your status anytime.</p>
        </div>
      )}

      <div>
        <p className="text-sm text-muted-foreground">Order</p>
        <h1 className="text-2xl font-bold">{order.order_number}</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        <OrderStageBadge stage={stage} />
        <PaymentStatusBadge status={order.payment_status} />
      </div>

      {order.payment_status === "unpaid" && (
        <p className="text-sm text-muted-foreground">
          Your payment is pending until {settings.business_name || "we"} confirm it&apos;s been received.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <div>
                <p>
                  {item.quantity}x {item.product_name}
                </p>
                {item.selected_options.length > 0 && (
                  <p className="text-muted-foreground">{item.selected_options.map((o) => o.option_name).join(", ")}</p>
                )}
              </div>
              <span>{formatCents(item.line_total_cents, settings.currency)}</span>
            </div>
          ))}
          <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
            <Row label="Subtotal" value={formatCents(order.subtotal_cents, settings.currency)} />
            {order.discount_cents > 0 && <Row label="Discount" value={`-${formatCents(order.discount_cents, settings.currency)}`} />}
            <Row label="Tax" value={formatCents(order.tax_cents, settings.currency)} />
            {order.fulfillment_fee_cents > 0 && (
              <Row label="Fulfillment fee" value={formatCents(order.fulfillment_fee_cents, settings.currency)} />
            )}
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatCents(order.total_cents, settings.currency)}</span>
            </div>
            {order.amount_paid_cents > 0 && (
              <Row label="Paid so far" value={formatCents(order.amount_paid_cents, settings.currency)} />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fulfillment</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <p className="font-medium">{order.fulfillment_method_label}</p>
          {order.requested_at && <p>Requested: {new Date(order.requested_at).toLocaleString()}</p>}
          {order.requested_time_window && <p>{order.requested_time_window}</p>}
          {order.fulfillment_address && (
            <p>
              {order.fulfillment_address.line1}
              {order.fulfillment_address.line2 ? `, ${order.fulfillment_address.line2}` : ""}, {order.fulfillment_address.city},{" "}
              {order.fulfillment_address.state} {order.fulfillment_address.postal_code}
            </p>
          )}
          {settings.pickup_instructions && <p className="mt-2 text-muted-foreground">{settings.pickup_instructions}</p>}
          {order.customer_visible_notes && (
            <p className="mt-2 rounded-lg bg-muted p-2">Note from {settings.business_name || "us"}: {order.customer_visible_notes}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Need help with this order?</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {businessPhone && (
            <Button asChild variant="outline" className="justify-start">
              <a href={buildTelLink(businessPhone)}>
                <Phone className="h-4 w-4" /> Call {settings.business_name || "us"}
              </a>
            </Button>
          )}
          {smsPhone && (
            <Button asChild variant="outline" className="justify-start">
              <a
                href={buildSmsLink(
                  smsPhone,
                  interpolateTemplate("Hi, I have a question about order {{order_number}}.", {
                    order_number: order.order_number,
                  })
                )}
              >
                <MessageSquare className="h-4 w-4" /> Text about this order
              </a>
            </Button>
          )}
          {settings.contact_email && (
            <Button asChild variant="outline" className="justify-start">
              <a href={buildMailtoLink(settings.contact_email, `Question about order ${order.order_number}`)}>
                <Mail className="h-4 w-4" /> Email {settings.business_name || "us"}
              </a>
            </Button>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Sent to {customer.phone}
        {customer.email ? ` and ${customer.email}` : ""}. Save this page&apos;s link to check back anytime.
      </p>
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
