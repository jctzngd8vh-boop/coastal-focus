"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Minus, Trash2, Search, RefreshCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { MessageComposer } from "@/components/shared/message-composer";
import { searchCustomers } from "@/lib/customers/search-actions";
import { createPosOrder } from "@/lib/orders/pos-actions";
import { addAdjustment } from "@/lib/orders/order-actions";
import { calculateOrderTotals, formatCents } from "@/lib/orders/totals";
import { normalizePhone } from "@/lib/customers/normalize";
import type {
  BusinessSettings,
  Customer,
  FulfillmentMethod,
  MessageTemplate,
  PaymentMethod,
  ProductWithRelations,
} from "@/types/database";

interface PosLineItem {
  key: string;
  productId: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  selectedOptionIds: string[];
  optionsLabel: string;
  optionDeltasCents: number[];
}

const SOURCES = [
  { value: "phone", label: "Phone order" },
  { value: "text", label: "Text-message order" },
  { value: "social", label: "Social media order" },
  { value: "walk_in", label: "Walk-up / in-person" },
] as const;

export function PosOrderForm({
  products,
  fulfillmentMethods,
  paymentMethods,
  settings,
  templates,
}: {
  products: ProductWithRelations[];
  fulfillmentMethods: FulfillmentMethod[];
  paymentMethods: PaymentMethod[];
  settings: BusinessSettings;
  templates: MessageTemplate[];
}) {
  const [source, setSource] = React.useState<(typeof SOURCES)[number]["value"]>("phone");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<Customer[]>([]);
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");

  const [lineItems, setLineItems] = React.useState<PosLineItem[]>([]);
  const [fulfillmentMethodId, setFulfillmentMethodId] = React.useState(fulfillmentMethods[0]?.id ?? "");
  const [address, setAddress] = React.useState({ line1: "", line2: "", city: "", state: "", postal_code: "" });
  const [requestedAt, setRequestedAt] = React.useState("");
  const [paymentMethodId, setPaymentMethodId] = React.useState(paymentMethods[0]?.id ?? "");
  const [markPaidNow, setMarkPaidNow] = React.useState(false);
  const [isComplimentary, setIsComplimentary] = React.useState(false);
  const [orderNotes, setOrderNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<{ orderNumber: string } | null>(null);

  const selectedFulfillment = fulfillmentMethods.find((m) => m.id === fulfillmentMethodId);

  React.useEffect(() => {
    const handle = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setSearchResults(await searchCustomers(searchQuery));
      } else {
        setSearchResults([]);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  function selectCustomer(c: Customer) {
    setFirstName(c.first_name);
    setLastName(c.last_name);
    setPhone(c.phone);
    setEmail(c.email ?? "");
    setSearchResults([]);
    setSearchQuery("");
  }

  function addProduct(product: ProductWithRelations) {
    if (product.product_variant_groups.length > 0) {
      toast.info(`${product.name} has options — set them from the storefront cart, or add and edit price manually.`);
    }
    setLineItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        productId: product.id,
        productName: product.name,
        unitPriceCents: product.price_cents,
        quantity: product.min_quantity || 1,
        selectedOptionIds: [],
        optionsLabel: "",
        optionDeltasCents: [],
      },
    ]);
  }

  function updateQty(key: string, quantity: number) {
    setLineItems((prev) => prev.map((i) => (i.key === key ? { ...i, quantity: Math.max(1, quantity) } : i)));
  }

  function removeItem(key: string) {
    setLineItems((prev) => prev.filter((i) => i.key !== key));
  }

  const totals = calculateOrderTotals({
    lines: lineItems.map((i) => ({ unitPriceCents: i.unitPriceCents, quantity: i.quantity, optionDeltasCents: i.optionDeltasCents })),
    taxRateBps: settings.tax_rate_bps,
    fulfillmentFeeCents: selectedFulfillment?.fee_cents ?? 0,
  });

  async function handleSubmit() {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      toast.error("Enter the customer's name and phone number.");
      return;
    }
    if (lineItems.length === 0) {
      toast.error("Add at least one product.");
      return;
    }
    if (!fulfillmentMethodId || !paymentMethodId) {
      toast.error("Choose a fulfillment method and payment method.");
      return;
    }

    setSubmitting(true);
    try {
      const order = await createPosOrder(
        {
          items: lineItems.map((i) => ({ productId: i.productId, quantity: i.quantity, selectedOptionIds: i.selectedOptionIds, prepNotes: "" })),
          firstName,
          lastName,
          phone,
          email: email || undefined,
          fulfillmentMethodId,
          requestedAt: requestedAt ? new Date(requestedAt).toISOString() : null,
          requestedTimeWindow: "",
          address: selectedFulfillment?.requires_address ? address : undefined,
          giftMessage: "",
          orderNotes,
          paymentMethodId,
          paymentReference: "",
          idempotencyKey: crypto.randomUUID(),
        },
        { source, markPaidNow: markPaidNow || isComplimentary }
      );

      if (isComplimentary && totals.totalCents > 0) {
        // Zero it out after creation via the standard adjustment path so it stays auditable.
        await addAdjustment(order.orderId, "discount", "Complimentary order", totals.totalCents);
      }

      toast.success(`Order ${order.orderNumber} saved!`);
      setResult({ orderNumber: order.orderNumber });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the order.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setLineItems([]);
    setOrderNotes("");
    setMarkPaidNow(false);
    setIsComplimentary(false);
    setResult(null);
  }

  if (result) {
    const phoneNormalized = phone ? normalizePhone(phone) : null;
    return (
      <div className="flex flex-col gap-4">
        <Card className="border-success/50 bg-success/5">
          <CardContent className="p-4">
            <p className="text-lg font-semibold">Order {result.orderNumber} saved!</p>
            <p className="text-sm text-muted-foreground">Send a confirmation below, then start the next order.</p>
          </CardContent>
        </Card>
        <MessageComposer
          templates={templates}
          phoneNormalized={phoneNormalized}
          email={email || null}
          variables={{
            first_name: firstName,
            business_name: settings.business_name,
            order_number: result.orderNumber,
            amount_due: formatCents(markPaidNow ? 0 : totals.totalCents, settings.currency),
            pickup_instructions: settings.pickup_instructions,
            fulfillment_details: selectedFulfillment?.label ?? "",
            payment_instructions: `Please pay via ${paymentMethods.find((p) => p.id === paymentMethodId)?.display_name ?? ""}.`,
          }}
        />
        <Button onClick={resetForm} size="lg">
          <RefreshCcw className="h-4 w-4" /> Start Next Order
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <h1 className="text-xl font-bold">New POS Order</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Source</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={source} onChange={(e) => setSource(e.target.value as typeof source)}>
            {SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search existing customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-md">
                {searchResults.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => selectCustomer(c)}
                  >
                    {c.first_name} {c.last_name} — {c.phone}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            <Input placeholder="Phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input placeholder="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Products</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {products.map((p) => (
              <Button key={p.id} type="button" variant="outline" size="sm" onClick={() => addProduct(p)}>
                <Plus className="h-3.5 w-3.5" /> {p.name}
              </Button>
            ))}
          </div>

          {lineItems.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              {lineItems.map((item) => (
                <div key={item.key} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">{item.productName}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.key, item.quantity - 1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-5 text-center">{item.quantity}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(item.key, item.quantity + 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                  <span className="w-16 text-right">{formatCents(item.unitPriceCents * item.quantity, settings.currency)}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.key)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fulfillment</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Select value={fulfillmentMethodId} onChange={(e) => setFulfillmentMethodId(e.target.value)}>
            {fulfillmentMethods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </Select>
          {selectedFulfillment?.requires_date && (
            <Input type="datetime-local" value={requestedAt} onChange={(e) => setRequestedAt(e.target.value)} />
          )}
          {selectedFulfillment?.requires_address && (
            <div className="grid grid-cols-2 gap-2">
              <Input className="col-span-2" placeholder="Address line 1" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
              <Input placeholder="City" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
              <Input placeholder="State" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
              <Input placeholder="ZIP" value={address.postal_code} onChange={(e) => setAddress({ ...address, postal_code: e.target.value })} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)}>
            {paymentMethods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name}
              </option>
            ))}
          </Select>
          <div className="flex items-center justify-between">
            <Label className="font-normal">Mark as paid now</Label>
            <Switch checked={markPaidNow || isComplimentary} disabled={isComplimentary} onCheckedChange={setMarkPaidNow} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="font-normal">Complimentary (no charge)</Label>
            <Switch checked={isComplimentary} onCheckedChange={setIsComplimentary} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea rows={2} value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Optional" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-1 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCents(totals.subtotalCents, settings.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span>{formatCents(totals.taxCents, settings.currency)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{isComplimentary ? formatCents(0, settings.currency) : formatCents(totals.totalCents, settings.currency)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-card p-4 safe-bottom md:bottom-0 md:left-56">
        <div className="mx-auto max-w-3xl">
          <Button size="lg" className="w-full" disabled={submitting} onClick={handleSubmit}>
            {submitting ? "Saving..." : "Save Order"}
          </Button>
        </div>
      </div>
    </div>
  );
}
