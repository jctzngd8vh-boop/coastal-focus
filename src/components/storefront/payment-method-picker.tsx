"use client";

import Image from "next/image";
import { ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { PaymentMethod } from "@/types/database";
import type { UseFormRegisterReturn } from "react-hook-form";

const METHOD_ICON: Record<string, string> = {
  cashapp: "💵",
  venmo: "🅥",
  paypal: "🅿️",
  zelle: "💸",
  apple_pay: "🍎",
  cash: "💵",
  custom: "💳",
};

export function PaymentMethodPicker({
  paymentMethods,
  currency,
  value,
  registerRadio,
  registerReference,
}: {
  paymentMethods: PaymentMethod[];
  currency: string;
  value: string;
  registerRadio: UseFormRegisterReturn;
  registerReference: UseFormRegisterReturn;
}) {
  const selected = paymentMethods.find((m) => m.id === value);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {paymentMethods.map((method) => (
          <label
            key={method.id}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-input p-3 has-checked:border-brand"
          >
            <input
              type="radio"
              value={method.id}
              className="h-5 w-5 accent-[var(--brand)]"
              {...registerRadio}
            />
            <span className="text-lg">{METHOD_ICON[method.method_type] ?? "💳"}</span>
            <span className="flex-1">{method.display_name}</span>
          </label>
        ))}
      </div>

      {selected && (selected.instructions || selected.external_url || selected.qr_code_url) && (
        <div className="flex flex-col gap-3 rounded-lg bg-muted p-3">
          {selected.instructions && <p className="text-sm">{selected.instructions}</p>}
          {selected.handle && (
            <div className="flex items-center gap-2">
              <code className="rounded bg-card px-2 py-1 text-sm">{selected.handle}</code>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard?.writeText(selected.handle);
                  toast.success("Copied");
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
            </div>
          )}
          {selected.external_url && (
            <Button asChild variant="outline" size="sm" className="w-fit">
              <a href={selected.external_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" /> Open {selected.display_name}
              </a>
            </Button>
          )}
          {selected.qr_code_url && (
            <Image src={selected.qr_code_url} alt={`${selected.display_name} QR code`} width={160} height={160} className="rounded-lg" />
          )}
          <p className="text-xs text-muted-foreground">
            Your order will show as <strong>Payment Pending</strong> until we confirm we&apos;ve received it — opening
            a payment app doesn&apos;t automatically mark your order as paid.
          </p>
          <div>
            <Label htmlFor="paymentReference" className="text-xs">
              Confirmation code / reference (optional)
            </Label>
            <Input id="paymentReference" className="mt-1" {...registerReference} />
          </div>
        </div>
      )}
      {currency !== "USD" && (
        <p className="text-xs text-muted-foreground">Amounts shown reflect your order total in {currency}.</p>
      )}
    </div>
  );
}
