"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { MoneyInput } from "@/components/shared/money-input";
import {
  deleteVariantGroup,
  deleteVariantOption,
  upsertVariantGroup,
  upsertVariantOption,
} from "@/lib/products/actions";
import type { ProductVariantGroup, ProductVariantOption } from "@/types/database";

type GroupWithOptions = ProductVariantGroup & { product_variant_options: ProductVariantOption[] };

export function VariantGroupsEditor({ productId, groups }: { productId: string; groups: GroupWithOptions[] }) {
  const router = useRouter();

  async function addGroup() {
    try {
      await upsertVariantGroup({
        product_id: productId,
        name: "New Group",
        selection_type: "single",
        is_required: false,
        sort_order: groups.length,
      });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add group.");
    }
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Optional. Add a group like &quot;Size&quot; or &quot;Flavor&quot; if customers should choose between options.
        </p>
        <Button variant="outline" onClick={addGroup} className="w-fit">
          <Plus className="h-4 w-4" /> Add Option Group
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <VariantGroupCard key={group.id} productId={productId} group={group} />
      ))}
      <Button variant="outline" onClick={addGroup} className="w-fit">
        <Plus className="h-4 w-4" /> Add Option Group
      </Button>
    </div>
  );
}

function VariantGroupCard({ productId, group }: { productId: string; group: GroupWithOptions }) {
  const router = useRouter();
  const [name, setName] = React.useState(group.name);
  const [selectionType, setSelectionType] = React.useState(group.selection_type);
  const [isRequired, setIsRequired] = React.useState(group.is_required);

  async function saveGroup() {
    try {
      await upsertVariantGroup({
        id: group.id,
        product_id: productId,
        name,
        selection_type: selectionType,
        is_required: isRequired,
        sort_order: group.sort_order,
      });
      toast.success("Group saved.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save.");
    }
  }

  async function addOption() {
    await upsertVariantOption({
      group_id: group.id,
      product_id: productId,
      name: "New option",
      price_delta_cents: 0,
      is_active: true,
      is_sold_out: false,
      sort_order: group.product_variant_options.length,
    });
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1">
          <Label className="text-xs">Group name</Label>
          <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} onBlur={saveGroup} />
        </div>
        <div>
          <Label className="text-xs">Selection</Label>
          <select
            className="mt-1 h-11 rounded-lg border border-input bg-card px-2"
            value={selectionType}
            onChange={(e) => {
              setSelectionType(e.target.value as "single" | "multiple");
              saveGroup();
            }}
          >
            <option value="single">Pick one</option>
            <option value="multiple">Pick any</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={isRequired}
            onCheckedChange={(v) => {
              setIsRequired(v);
              upsertVariantGroup({
                id: group.id,
                product_id: productId,
                name,
                selection_type: selectionType,
                is_required: v,
                sort_order: group.sort_order,
              }).then(() => router.refresh());
            }}
          />
          Required
        </label>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive"
          onClick={async () => {
            await deleteVariantGroup(group.id, productId);
            router.refresh();
          }}
          aria-label="Delete group"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {group.product_variant_options.map((option) => (
          <VariantOptionRow key={option.id} productId={productId} option={option} />
        ))}
        <Button variant="ghost" size="sm" onClick={addOption} className="w-fit">
          <Plus className="h-3.5 w-3.5" /> Add option
        </Button>
      </div>
    </div>
  );
}

function VariantOptionRow({ productId, option }: { productId: string; option: ProductVariantOption }) {
  const router = useRouter();
  const [name, setName] = React.useState(option.name);
  const [priceDelta, setPriceDelta] = React.useState(option.price_delta_cents);

  async function save(overrides: Partial<ProductVariantOption> = {}) {
    await upsertVariantOption({
      id: option.id,
      group_id: option.group_id,
      product_id: productId,
      name,
      price_delta_cents: priceDelta,
      is_active: option.is_active,
      is_sold_out: option.is_sold_out,
      sort_order: option.sort_order,
      ...overrides,
    });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Input className="flex-1" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => save()} />
      <MoneyInput
        className="w-28"
        cents={priceDelta}
        onChangeCents={(c) => {
          setPriceDelta(c);
          save({ price_delta_cents: c });
        }}
      />
      <label className="flex items-center gap-1 text-xs text-muted-foreground">
        <input type="checkbox" checked={option.is_sold_out} onChange={(e) => save({ is_sold_out: e.target.checked })} />
        Sold out
      </label>
      <Button
        variant="ghost"
        size="icon"
        className="text-destructive"
        onClick={async () => {
          await deleteVariantOption(option.id, productId);
          router.refresh();
        }}
        aria-label="Delete option"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
