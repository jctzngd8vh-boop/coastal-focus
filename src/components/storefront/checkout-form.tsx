"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useCart } from "@/lib/cart/cart-context";
import { calculateOrderTotals, formatCents } from "@/lib/orders/totals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BusinessSettings, FulfillmentMethod, PaymentMethod } from "@/types/database";
import { PaymentMethodPicker } from "@/components/storefront/payment-method-picker";
import { EmptyState } from "@/components/shared/empty-state";

function buildClientSchema(emailRequired: boolean, requiresAddress: boolean, requiresDate: boolean) {
  return z.object({
    firstName: z.string().trim().min(1, "Required"),
    lastName: z.string().trim().min(1, "Required"),
    phone: z.string().trim().min(7, "Enter a valid phone number"),
    email: emailRequired ? z.email("Enter a valid email") : z.union([z.email(), z.literal("")]).optional(),
    fulfillmentMethodId: z.string().min(1, "Please choose a fulfillment method"),
    requestedAt: requiresDate ? z.string().min(1, "Please choose a date/time") : z.string().optional(),
    requestedTimeWindow: z.string().optional(),
    line1: requiresAddress ? z.string().min(1, "Address is required") : z.string().optional(),
    line2: z.string().optional(),
    city: requiresAddress ? z.string().min(1, "City is required") : z.string().optional(),
    state: requiresAddress ? z.string().min(1, "State is required") : z.string().optional(),
    postalCode: requiresAddress ? z.string().min(1, "ZIP is required") : z.string().optional(),
    giftMessage: z.string().optional(),
    orderNotes: z.string().optional(),
    paymentMethodId: z.string().min(1, "Please choose a payment method"),
    paymentReference: z.string().optional(),
  });
}

export function CheckoutForm({
  fulfillmentMethods,
  paymentMethods,
  settings,
}: {
  fulfillmentMethods: FulfillmentMethod[];
  paymentMethods: PaymentMethod[];
  settings: BusinessSettings;
}) {
  const { items, clearCart } = useCart();
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [selectedFulfillmentId, setSelectedFulfillmentId] = React.useState(fulfillmentMethods[0]?.id ?? "");
  const idempotencyKeyRef = React.useRef<string>(crypto.randomUUID());

  const selectedFulfillment = fulfillmentMethods.find((m) => m.id === selectedFulfillmentId);
  const schema = buildClientSchema(
    settings.email_required,
    Boolean(selectedFulfillment?.requires_address),
    Boolean(selectedFulfillment?.requires_date)
  );
  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fulfillmentMethodId: fulfillmentMethods[0]?.id ?? "",
      paymentMethodId: paymentMethods[0]?.id ?? "",
    },
  });

  const paymentMethodId = watch("paymentMethodId");

  React.useEffect(() => {
    if (items.length === 0) router.replace("/cart");
  }, [items.length, router]);

  const subtotalCents = items.reduce((sum, item) => {
    const optionsTotal = item.selectedOptions.reduce((s, o) => s + o.priceDeltaCents, 0);
    return sum + (item.unitPriceCents + optionsTotal) * item.quantity;
  }, 0);

  const estimatedTotals = calculateOrderTotals({
    lines: items.map((i) => ({
      unitPriceCents: i.unitPriceCents,
      quantity: i.quantity,
      optionDeltasCents: i.selectedOptions.map((o) => o.priceDeltaCents),
    })),
    taxRateBps: settings.tax_rate_bps,
    fulfillmentFeeCents: selectedFulfillment?.fee_cents ?? 0,
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            selectedOptionIds: item.selectedOptions.map((o) => o.optionId),
            prepNotes: item.prepNotes,
          })),
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone,
          email: values.email || undefined,
          fulfillmentMethodId: values.fulfillmentMethodId,
          requestedAt: values.requestedAt ? new Date(values.requestedAt).toISOString() : null,
          requestedTimeWindow: values.requestedTimeWindow,
          address: selectedFulfillment?.requires_address
            ? {
                line1: values.line1,
                line2: values.line2,
                city: values.city,
                state: values.state,
                postal_code: values.postalCode,
              }
            : undefined,
          giftMessage: values.giftMessage,
          orderNotes: values.orderNotes,
          paymentMethodId: values.paymentMethodId,
          paymentReference: values.paymentReference,
          idempotencyKey: idempotencyKeyRef.current,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error ?? "Couldn't place your order.");
        setSubmitting(false);
        return;
      }

      clearCart();
      router.push(`/order/${data.statusToken}?new=1`);
    } catch {
      toast.error("Network error — please check your connection and try again.");
      setSubmitting(false);
    }
  }

  if (fulfillmentMethods.length === 0 || paymentMethods.length === 0) {
    return (
      <EmptyState
        title="Checkout isn't ready yet"
        description="The owner needs to configure at least one fulfillment method and one payment method before customers can check out."
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 pb-24">
      <h1 className="text-xl font-bold">Checkout</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="col-span-1">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" className="mt-1" {...register("firstName")} />
            {errors.firstName && <p className="mt-1 text-xs text-destructive">{errors.firstName.message}</p>}
          </div>
          <div className="col-span-1">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" className="mt-1" {...register("lastName")} />
            {errors.lastName && <p className="mt-1 text-xs text-destructive">{errors.lastName.message}</p>}
          </div>
          <div className="col-span-2">
            <Label htmlFor="phone">Mobile phone</Label>
            <Input id="phone" type="tel" inputMode="tel" className="mt-1" {...register("phone")} />
            {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>}
          </div>
          <div className="col-span-2">
            <Label htmlFor="email">
              Email {settings.email_required ? "" : <span className="text-muted-foreground">(optional)</span>}
            </Label>
            <Input id="email" type="email" className="mt-1" {...register("email")} />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fulfillment</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <Label htmlFor="fulfillmentMethodId">Method</Label>
            <Select
              id="fulfillmentMethodId"
              className="mt-1"
              {...register("fulfillmentMethodId", {
                onChange: (e) => setSelectedFulfillmentId(e.target.value),
              })}
            >
              {fulfillmentMethods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} {m.fee_cents > 0 ? `(+${formatCents(m.fee_cents, settings.currency)})` : ""}
                </option>
              ))}
            </Select>
            {selectedFulfillment?.description && (
              <p className="mt-1 text-xs text-muted-foreground">{selectedFulfillment.description}</p>
            )}
          </div>

          {selectedFulfillment?.requires_date && (
            <div>
              <Label htmlFor="requestedAt">Requested date &amp; time</Label>
              <Input id="requestedAt" type="datetime-local" className="mt-1" {...register("requestedAt")} />
              {errors.requestedAt && <p className="mt-1 text-xs text-destructive">{String(errors.requestedAt.message)}</p>}
              {settings.default_turnaround && (
                <p className="mt-1 text-xs text-muted-foreground">Typical turnaround: {settings.default_turnaround}</p>
              )}
            </div>
          )}

          {selectedFulfillment?.requires_address && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="line1">Address line 1</Label>
                <Input id="line1" className="mt-1" {...register("line1")} />
                {errors.line1 && <p className="mt-1 text-xs text-destructive">{errors.line1.message}</p>}
              </div>
              <div className="col-span-2">
                <Label htmlFor="line2">Address line 2</Label>
                <Input id="line2" className="mt-1" {...register("line2")} />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" className="mt-1" {...register("city")} />
                {errors.city && <p className="mt-1 text-xs text-destructive">{errors.city.message}</p>}
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input id="state" className="mt-1" {...register("state")} />
                {errors.state && <p className="mt-1 text-xs text-destructive">{errors.state.message}</p>}
              </div>
              <div>
                <Label htmlFor="postalCode">ZIP</Label>
                <Input id="postalCode" className="mt-1" {...register("postalCode")} />
                {errors.postalCode && <p className="mt-1 text-xs text-destructive">{errors.postalCode.message}</p>}
              </div>
            </div>
          )}

          {!selectedFulfillment?.requires_date && (
            <div>
              <Label htmlFor="requestedTimeWindow">Preferred time (optional)</Label>
              <Input id="requestedTimeWindow" className="mt-1" placeholder="e.g. this weekend" {...register("requestedTimeWindow")} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes &amp; Gift Message</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <Label htmlFor="orderNotes">Order notes (optional)</Label>
            <Textarea id="orderNotes" className="mt-1" rows={2} {...register("orderNotes")} />
          </div>
          <div>
            <Label htmlFor="giftMessage">Gift message (optional)</Label>
            <Textarea id="giftMessage" className="mt-1" rows={2} placeholder="This order is a gift..." {...register("giftMessage")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentMethodPicker
            paymentMethods={paymentMethods}
            currency={settings.currency}
            value={paymentMethodId}
            registerRadio={register("paymentMethodId")}
            registerReference={register("paymentReference")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <Row label="Subtotal" value={formatCents(subtotalCents, settings.currency)} />
          {estimatedTotals.discountCents > 0 && (
            <Row label="Discount" value={`-${formatCents(estimatedTotals.discountCents, settings.currency)}`} />
          )}
          <Row label="Estimated tax" value={formatCents(estimatedTotals.taxCents, settings.currency)} />
          {estimatedTotals.fulfillmentFeeCents > 0 && (
            <Row label="Fulfillment fee" value={formatCents(estimatedTotals.fulfillmentFeeCents, settings.currency)} />
          )}
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
            <span>Total</span>
            <span>{formatCents(estimatedTotals.totalCents, settings.currency)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card p-4 safe-bottom">
        <div className="mx-auto max-w-3xl">
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "Placing order..." : `Place Order — ${formatCents(estimatedTotals.totalCents, settings.currency)}`}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
