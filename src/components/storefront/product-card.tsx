"use client";

import * as React from "react";
import Image from "next/image";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/lib/cart/cart-context";
import { formatCents } from "@/lib/orders/totals";
import type { ProductWithRelations } from "@/types/database";

export function ProductCard({ product, currency }: { product: ProductWithRelations; currency: string }) {
  const { addItem } = useCart();
  const [open, setOpen] = React.useState(false);
  const [quantity, setQuantity] = React.useState(product.min_quantity || 1);
  const [selected, setSelected] = React.useState<Record<string, string[]>>({});
  const [prepNotes, setPrepNotes] = React.useState("");

  const hasOptions = product.product_variant_groups.length > 0;
  const primaryImage = product.product_images[0]?.url ?? null;

  function resetForm() {
    setQuantity(product.min_quantity || 1);
    setSelected({});
    setPrepNotes("");
  }

  function priceWithSelection() {
    let total = product.price_cents;
    for (const ids of Object.values(selected)) {
      for (const id of ids) {
        for (const group of product.product_variant_groups) {
          const opt = group.product_variant_options.find((o) => o.id === id);
          if (opt) total += opt.price_delta_cents;
        }
      }
    }
    return total;
  }

  function toggleOption(groupId: string, optionId: string, selectionType: "single" | "multiple") {
    setSelected((prev) => {
      const current = prev[groupId] ?? [];
      if (selectionType === "single") {
        return { ...prev, [groupId]: current.includes(optionId) ? [] : [optionId] };
      }
      return {
        ...prev,
        [groupId]: current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId],
      };
    });
  }

  function handleAdd() {
    for (const group of product.product_variant_groups) {
      if (group.is_required && (selected[group.id]?.length ?? 0) === 0) {
        toast.error(`Please choose a ${group.name.toLowerCase()}.`);
        return;
      }
    }

    const selectedOptions = Object.entries(selected).flatMap(([groupId, optionIds]) => {
      const group = product.product_variant_groups.find((g) => g.id === groupId)!;
      return optionIds.map((optionId) => {
        const option = group.product_variant_options.find((o) => o.id === optionId)!;
        return {
          groupName: group.name,
          optionId: option.id,
          optionName: option.name,
          priceDeltaCents: option.price_delta_cents,
        };
      });
    });

    addItem({
      productId: product.id,
      productName: product.name,
      unitPriceCents: product.price_cents,
      quantity,
      minQuantity: product.min_quantity,
      maxQuantity: product.max_quantity,
      selectedOptions,
      prepNotes,
      imageUrl: primaryImage,
    });

    toast.success(`Added ${product.name} to your cart.`);
    setOpen(false);
    resetForm();
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="flex gap-4 p-4 sm:p-5">
          {primaryImage ? (
            <Image
              src={primaryImage}
              alt={product.name}
              width={96}
              height={96}
              className="h-24 w-24 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-muted text-3xl">
              🍬
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold leading-tight">{product.name}</h3>
              {product.is_sold_out && <Badge variant="destructive">Sold out</Badge>}
            </div>
            {product.description && (
              <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
            )}
            <div className="mt-auto flex items-center justify-between pt-2">
              <span className="font-medium">{formatCents(product.price_cents, currency)}</span>
              <Button size="sm" disabled={product.is_sold_out} onClick={() => setOpen(true)}>
                {hasOptions ? "Choose options" : "Add to cart"}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{product.name}</DialogTitle>
            {product.description && <DialogDescription>{product.description}</DialogDescription>}
          </DialogHeader>

          <CardContent className="flex flex-col gap-4 p-0">
            {product.product_variant_groups.map((group) => (
              <div key={group.id}>
                <p className="mb-2 text-sm font-medium">
                  {group.name}
                  {group.is_required && <span className="text-destructive"> *</span>}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.product_variant_options
                    .filter((o) => o.is_active)
                    .map((option) => {
                      const isSelected = selected[group.id]?.includes(option.id);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          disabled={option.is_sold_out}
                          onClick={() => toggleOption(group.id, option.id, group.selection_type)}
                          className={`rounded-full border px-3 py-2 text-sm transition-colors disabled:opacity-40 ${
                            isSelected ? "border-transparent text-brand-foreground" : "border-input"
                          }`}
                          style={isSelected ? { background: "var(--brand)" } : undefined}
                        >
                          {option.name}
                          {option.price_delta_cents !== 0 &&
                            ` (${option.price_delta_cents > 0 ? "+" : ""}${formatCents(option.price_delta_cents, currency)})`}
                          {option.is_sold_out && " — sold out"}
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}

            {product.prep_notes && (
              <div>
                <label className="mb-1 block text-sm font-medium">Notes for this item</label>
                <Textarea
                  value={prepNotes}
                  onChange={(e) => setPrepNotes(e.target.value)}
                  placeholder="Optional"
                  rows={2}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Quantity</span>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity((q) => Math.max(product.min_quantity, q - 1))}
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-6 text-center font-medium">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setQuantity((q) => (product.max_quantity ? Math.min(product.max_quantity, q + 1) : q + 1))
                  }
                  aria-label="Increase quantity"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {product.allergen_info && (
              <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">⚠️ {product.allergen_info}</p>
            )}
          </CardContent>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleAdd}>
              Add {quantity} for {formatCents(priceWithSelection() * quantity, currency)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
