"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PaymentStatusBadge } from "@/components/shared/status-badge";
import { MessageComposer } from "@/components/shared/message-composer";
import { updateCustomerNotes } from "@/lib/customers/actions";
import { formatCents } from "@/lib/orders/totals";
import { normalizePhone } from "@/lib/customers/normalize";
import { fullName } from "@/lib/utils";
import { collectedRevenueCents } from "@/lib/payments/status";
import type { CustomerDetail } from "@/lib/customers/get-admin-customers";
import type { BusinessSettings, MessageTemplate } from "@/types/database";

export function CustomerDetailView({
  detail,
  settings,
  templates,
}: {
  detail: CustomerDetail;
  settings: BusinessSettings;
  templates: MessageTemplate[];
}) {
  const { customer, orders } = detail;
  const [notes, setNotes] = React.useState(customer.notes);
  const totalRevenue = orders.reduce((sum, o) => sum + collectedRevenueCents(o), 0);
  const phoneNormalized = normalizePhone(customer.phone);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">{fullName(customer.first_name, customer.last_name)}</h1>
        <p className="text-muted-foreground">
          {customer.phone}
          {customer.email ? ` · ${customer.email}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{orders.length}</p>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{formatCents(totalRevenue, settings.currency)}</p>
            <p className="text-xs text-muted-foreground">Total Revenue</p>
          </CardContent>
        </Card>
      </div>

      {customer.address && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Address</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {customer.address.line1}
            {customer.address.line2 ? `, ${customer.address.line2}` : ""}, {customer.address.city}, {customer.address.state}{" "}
            {customer.address.postal_code}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Label className="sr-only">Customer notes</Label>
          <Textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => updateCustomerNotes(customer.id, notes)}
            placeholder="Preferences, allergies, VIP status, etc."
          />
        </CardContent>
      </Card>

      <MessageComposer
        templates={templates}
        phoneNormalized={phoneNormalized}
        email={customer.email}
        variables={{
          first_name: customer.first_name,
          business_name: settings.business_name,
          order_number: orders[0]?.order_number ?? "",
          amount_due: "",
          pickup_instructions: settings.pickup_instructions,
          fulfillment_details: "",
          payment_instructions: "",
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order History</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            orders.map((o) => (
              <Link key={o.id} href={`/admin/orders/${o.id}`} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-muted">
                <div>
                  <p className="font-medium">{o.order_number}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span>{formatCents(o.total_cents, settings.currency)}</span>
                  <PaymentStatusBadge status={o.payment_status} />
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
