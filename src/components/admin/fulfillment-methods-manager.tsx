"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MoneyInput } from "@/components/shared/money-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { deleteFulfillmentMethod, upsertFulfillmentMethod, type FulfillmentMethodInput } from "@/lib/settings/fulfillment-actions";
import { formatCents } from "@/lib/orders/totals";
import type { FulfillmentMethod } from "@/types/database";

const EMPTY: FulfillmentMethodInput = {
  key: "",
  label: "",
  description: "",
  fee_cents: 0,
  requires_address: false,
  requires_date: false,
  is_active: true,
  sort_order: 0,
};

export function FulfillmentMethodsManager({ methods }: { methods: FulfillmentMethod[] }) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<FulfillmentMethodInput>(EMPTY);

  function openNew() {
    setDraft({ ...EMPTY, sort_order: methods.length });
    setOpen(true);
  }

  function openEdit(method: FulfillmentMethod) {
    setDraft(method);
    setOpen(true);
  }

  async function handleSave() {
    const toSave = draft.key.trim() ? draft : { ...draft, key: draft.label.toLowerCase().replace(/\s+/g, "_") };
    try {
      await upsertFulfillmentMethod(toSave);
      toast.success("Fulfillment method saved.");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {methods.map((method) => (
        <Card key={method.id}>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium">{method.label}</p>
                {!method.is_active && <Badge variant="secondary">Inactive</Badge>}
                {method.fee_cents > 0 && <Badge variant="outline">+{formatCents(method.fee_cents)}</Badge>}
              </div>
              <p className="truncate text-sm text-muted-foreground">{method.description || "—"}</p>
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
                    <AlertDialogTitle>Delete {method.label}?</AlertDialogTitle>
                    <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await deleteFulfillmentMethod(method.id);
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
        <Plus className="h-4 w-4" /> Add Fulfillment Method
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft.key ? "Edit" : "New"} Fulfillment Method</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label>Label</Label>
              <Input className="mt-1" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Input className="mt-1" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </div>
            <div>
              <Label>Fee</Label>
              <MoneyInput className="mt-1" cents={draft.fee_cents} onChangeCents={(c) => setDraft({ ...draft, fee_cents: c })} />
            </div>
            <ToggleRow label="Requires an address" checked={draft.requires_address} onChange={(v) => setDraft({ ...draft, requires_address: v })} />
            <ToggleRow label="Requires a requested date/time" checked={draft.requires_date} onChange={(v) => setDraft({ ...draft, requires_date: v })} />
            <ToggleRow label="Active" checked={draft.is_active} onChange={(v) => setDraft({ ...draft, is_active: v })} />
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
