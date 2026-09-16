"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { OrderStageBadge } from "@/components/shared/status-badge";
import { deleteOrderStage, upsertOrderStage } from "@/lib/settings/order-stage-actions";
import type { OrderStage } from "@/types/database";

const COLORS: OrderStage["color"][] = ["blue", "indigo", "amber", "emerald", "slate", "red"];

export function OrderStagesManager({ stages }: { stages: OrderStage[] }) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<OrderStage & { isNew?: boolean }>({
    key: "",
    label: "",
    sort_order: stages.length,
    is_terminal: false,
    color: "slate",
    isNew: true,
  });

  function openNew() {
    setDraft({ key: "", label: "", sort_order: stages.length, is_terminal: false, color: "slate", isNew: true });
    setOpen(true);
  }

  function openEdit(stage: OrderStage) {
    setDraft({ ...stage, isNew: false });
    setOpen(true);
  }

  async function handleSave() {
    try {
      await upsertOrderStage(draft);
      toast.success("Stage saved.");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        These are the fulfillment stages every order moves through. Reorder by editing the position number.
      </p>
      {[...stages]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((stage) => (
          <Card key={stage.key}>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">#{stage.sort_order}</span>
                <OrderStageBadge stage={stage} />
                {stage.is_terminal && <span className="text-xs text-muted-foreground">(final)</span>}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(stage)}>
                  Edit
                </Button>
                {!["new", "completed", "cancelled"].includes(stage.key) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={async () => {
                      await deleteOrderStage(stage.key);
                      toast.success("Deleted.");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

      <Button variant="outline" onClick={openNew} className="w-fit">
        <Plus className="h-4 w-4" /> Add Stage
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft.isNew ? "New" : "Edit"} Stage</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {draft.isNew && (
              <div>
                <Label>Key (internal id, e.g. &quot;packing&quot;)</Label>
                <Input className="mt-1" value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} />
              </div>
            )}
            <div>
              <Label>Label</Label>
              <Input className="mt-1" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
            </div>
            <div>
              <Label>Position</Label>
              <Input
                type="number"
                className="mt-1"
                value={draft.sort_order}
                onChange={(e) => setDraft({ ...draft, sort_order: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="mt-1 flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDraft({ ...draft, color: c })}
                    className={`h-8 w-8 rounded-full border-2 ${draft.color === c ? "border-foreground" : "border-transparent"}`}
                  >
                    <OrderStageBadge stage={{ ...draft, color: c }} />
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-normal">Final stage (order is done)</Label>
              <Switch checked={draft.is_terminal} onCheckedChange={(v) => setDraft({ ...draft, is_terminal: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
