"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/admin/image-upload";
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
import { deletePaymentMethod, upsertPaymentMethod, type PaymentMethodInput } from "@/lib/settings/payment-method-actions";
import type { PaymentMethod, PaymentMethodType } from "@/types/database";

const METHOD_TYPES: PaymentMethodType[] = ["cashapp", "venmo", "paypal", "zelle", "apple_pay", "cash", "custom"];

const EMPTY: PaymentMethodInput = {
  key: "",
  display_name: "",
  method_type: "custom",
  handle: "",
  instructions: "",
  external_url: "",
  qr_code_url: null,
  is_active: true,
  is_customer_selectable: true,
  is_pos_only: false,
  sort_order: 0,
};

export function PaymentMethodsManager({ methods }: { methods: PaymentMethod[] }) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<PaymentMethodInput>(EMPTY);

  function openNew() {
    setDraft({ ...EMPTY, sort_order: methods.length });
    setOpen(true);
  }

  function openEdit(method: PaymentMethod) {
    setDraft({ ...method, external_url: method.external_url ?? "" });
    setOpen(true);
  }

  async function handleSave() {
    const toSave = draft.key.trim()
      ? draft
      : { ...draft, key: draft.display_name.toLowerCase().replace(/\s+/g, "_") };
    try {
      await upsertPaymentMethod(toSave);
      toast.success("Payment method saved.");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save payment method.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {methods.length === 0 && <p className="text-sm text-muted-foreground">No payment methods yet.</p>}
      {methods.map((method) => (
        <Card key={method.id}>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium">{method.display_name}</p>
                {!method.is_active && <Badge variant="secondary">Inactive</Badge>}
                {method.is_pos_only && <Badge variant="outline">POS only</Badge>}
              </div>
              <p className="truncate text-sm text-muted-foreground">{method.handle || method.instructions || "—"}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon" onClick={() => openEdit(method)} aria-label="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-destructive" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {method.display_name}?</AlertDialogTitle>
                    <AlertDialogDescription>This can&apos;t be undone. Past orders keep their payment method label.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await deletePaymentMethod(method.id);
                        toast.success("Deleted.");
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" onClick={openNew} className="w-fit">
        <Plus className="h-4 w-4" /> Add Payment Method
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft.key ? "Edit" : "New"} Payment Method</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label>Type</Label>
              <select
                className="mt-1 h-11 w-full rounded-lg border border-input bg-card px-3"
                value={draft.method_type}
                onChange={(e) => setDraft({ ...draft, method_type: e.target.value as PaymentMethodType })}
              >
                {METHOD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Display name</Label>
              <Input className="mt-1" value={draft.display_name} onChange={(e) => setDraft({ ...draft, display_name: e.target.value })} />
            </div>
            <div>
              <Label>Handle / email / phone / recipient name</Label>
              <Input className="mt-1" value={draft.handle} onChange={(e) => setDraft({ ...draft, handle: e.target.value })} />
            </div>
            <div>
              <Label>Instructions</Label>
              <Textarea className="mt-1" rows={2} value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} />
            </div>
            <div>
              <Label>External payment URL (optional)</Label>
              <Input className="mt-1" value={draft.external_url} onChange={(e) => setDraft({ ...draft, external_url: e.target.value })} />
            </div>
            <div>
              <Label>QR code image (optional)</Label>
              <div className="mt-1">
                <ImageUpload value={draft.qr_code_url} onChange={(url) => setDraft({ ...draft, qr_code_url: url })} folder="payment-qr" />
              </div>
            </div>
            <ToggleRow label="Active" checked={draft.is_active} onChange={(v) => setDraft({ ...draft, is_active: v })} />
            <ToggleRow
              label="Customers can select this online"
              checked={draft.is_customer_selectable}
              onChange={(v) => setDraft({ ...draft, is_customer_selectable: v })}
            />
            <ToggleRow label="POS only (hidden from storefront)" checked={draft.is_pos_only} onChange={(v) => setDraft({ ...draft, is_pos_only: v })} />
          </div>
          <DialogFooter>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
