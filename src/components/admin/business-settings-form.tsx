"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { businessSettingsSchema, DEFAULT_BUSINESS_HOURS, type BusinessSettingsInput } from "@/lib/settings/schema";
import { saveBusinessSettings } from "@/lib/settings/actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ImageUpload } from "@/components/admin/image-upload";
import type { BusinessSettings } from "@/types/database";

const CURRENCIES = ["USD", "CAD", "GBP", "EUR", "AUD"];

export function BusinessSettingsForm({
  settings,
  mode = "settings",
}: {
  settings: BusinessSettings;
  mode?: "settings" | "setup";
}) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [hours, setHours] = React.useState(
    settings.business_hours.length > 0 ? settings.business_hours : DEFAULT_BUSINESS_HOURS
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BusinessSettingsInput>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: {
      ...settings,
      logo_url: settings.logo_url ?? null,
    },
  });

  const logoUrl = watch("logo_url");
  const primaryColor = watch("primary_color");
  const [taxPercent, setTaxPercent] = React.useState((settings.tax_rate_bps / 100).toFixed(2));

  async function onSubmit(values: BusinessSettingsInput) {
    setSaving(true);
    try {
      await saveBusinessSettings(
        {
          ...values,
          tax_rate_bps: Math.round(parseFloat(taxPercent || "0") * 100),
          business_hours: hours,
        },
        { completeOnboarding: mode === "setup" }
      );
      toast.success(mode === "setup" ? "Store set up! Let's add your products next." : "Settings saved.");
      if (mode === "setup") {
        router.push("/admin/products");
      } else {
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 pb-24">
      <Card>
        <CardHeader>
          <CardTitle>Business Info</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <Label>Logo</Label>
            <div className="mt-1">
              <ImageUpload value={logoUrl ?? null} onChange={(url) => setValue("logo_url", url)} folder="logo" />
            </div>
          </div>
          <div>
            <Label htmlFor="business_name">Business name</Label>
            <Input id="business_name" className="mt-1" {...register("business_name")} />
            {errors.business_name && <p className="mt-1 text-xs text-destructive">{errors.business_name.message}</p>}
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" className="mt-1" rows={3} {...register("description")} />
          </div>
          <div>
            <Label htmlFor="primary_color">Primary color</Label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setValue("primary_color", e.target.value)}
                className="h-11 w-14 rounded-lg border border-input"
              />
              <Input className="flex-1" {...register("primary_color")} />
            </div>
          </div>
          <div>
            <Label htmlFor="owner_name">Owner name</Label>
            <Input id="owner_name" className="mt-1" {...register("owner_name")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
          <CardDescription>Used for native call/text/email buttons and notifications.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <Label htmlFor="business_phone">Business phone</Label>
            <Input id="business_phone" type="tel" className="mt-1" {...register("business_phone")} />
          </div>
          <div>
            <Label htmlFor="sms_phone">Text-message number</Label>
            <Input id="sms_phone" type="tel" className="mt-1" placeholder="Defaults to business phone if blank" {...register("sms_phone")} />
          </div>
          <div>
            <Label htmlFor="contact_email">Email address</Label>
            <Input id="contact_email" type="email" className="mt-1" {...register("contact_email")} />
            {errors.contact_email && <p className="mt-1 text-xs text-destructive">{errors.contact_email.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pickup, Hours &amp; Turnaround</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <Label htmlFor="pickup_address">Pickup address</Label>
            <Textarea id="pickup_address" className="mt-1" rows={2} {...register("pickup_address")} />
          </div>
          <div>
            <Label htmlFor="pickup_instructions">Pickup instructions</Label>
            <Textarea id="pickup_instructions" className="mt-1" rows={2} {...register("pickup_instructions")} />
          </div>
          <div>
            <Label>Business hours</Label>
            <div className="mt-1 flex flex-col gap-2">
              {hours.map((h, i) => (
                <div key={h.day} className="flex items-center gap-2 text-sm">
                  <span className="w-24 shrink-0">{h.day}</span>
                  <Input
                    type="time"
                    className="h-9"
                    value={h.open}
                    disabled={h.closed}
                    onChange={(e) =>
                      setHours((prev) => prev.map((d, idx) => (idx === i ? { ...d, open: e.target.value } : d)))
                    }
                  />
                  <span>to</span>
                  <Input
                    type="time"
                    className="h-9"
                    value={h.close}
                    disabled={h.closed}
                    onChange={(e) =>
                      setHours((prev) => prev.map((d, idx) => (idx === i ? { ...d, close: e.target.value } : d)))
                    }
                  />
                  <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={h.closed}
                      onChange={(e) =>
                        setHours((prev) => prev.map((d, idx) => (idx === i ? { ...d, closed: e.target.checked } : d)))
                      }
                    />
                    Closed
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="order_cutoff_info">Order cutoff info</Label>
            <Input id="order_cutoff_info" className="mt-1" placeholder="e.g. Order by Wednesday for weekend pickup" {...register("order_cutoff_info")} />
          </div>
          <div>
            <Label htmlFor="default_turnaround">Default turnaround time</Label>
            <Input id="default_turnaround" className="mt-1" placeholder="e.g. 2-3 business days" {...register("default_turnaround")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <Label htmlFor="tax_rate">Sales tax rate (%)</Label>
            <Input
              id="tax_rate"
              inputMode="decimal"
              className="mt-1"
              value={taxPercent}
              onChange={(e) => setTaxPercent(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="currency">Currency</Label>
            <select
              id="currency"
              className="mt-1 h-11 w-full rounded-lg border border-input bg-card px-3"
              {...register("currency")}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Policies</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <Label htmlFor="customer_policies">Customer-facing policies</Label>
            <Textarea id="customer_policies" className="mt-1" rows={3} placeholder="Refunds, cancellations, lead time, etc." {...register("customer_policies")} />
          </div>
          <div>
            <Label htmlFor="allergen_notice">Allergen notice</Label>
            <Textarea id="allergen_notice" className="mt-1" rows={2} {...register("allergen_notice")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ToggleRow label="Require customer email at checkout" checked={watch("email_required")} onChange={(v) => setValue("email_required", v)} />
          <ToggleRow label="Email me on new orders" checked={watch("notify_owner_email")} onChange={(v) => setValue("notify_owner_email", v)} />
          <ToggleRow label="Text me on new orders (requires Twilio)" checked={watch("notify_owner_sms")} onChange={(v) => setValue("notify_owner_sms", v)} />
          <ToggleRow label="Email customers an order confirmation" checked={watch("notify_customer_email")} onChange={(v) => setValue("notify_customer_email", v)} />
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-card p-4 safe-bottom md:bottom-0 md:left-56">
        <div className="mx-auto max-w-3xl">
          <Button type="submit" size="lg" className="w-full" disabled={saving}>
            {saving ? "Saving..." : mode === "setup" ? "Finish Setup" : "Save Changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="font-normal">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
