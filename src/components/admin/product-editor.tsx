"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/shared/money-input";
import { ImageUpload } from "@/components/admin/image-upload";
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
import {
  addProductImage,
  deleteProduct,
  deleteProductImage,
  setProductArchived,
  updateProduct,
  type ProductInput,
} from "@/lib/products/actions";
import { VariantGroupsEditor } from "@/components/admin/variant-groups-editor";
import type { ProductWithRelations } from "@/types/database";

export function ProductEditor({ product }: { product: ProductWithRelations }) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<ProductInput>({
    id: product.id,
    name: product.name,
    description: product.description,
    price_cents: product.price_cents,
    is_active: product.is_active,
    is_archived: product.is_archived,
    inventory_mode: product.inventory_mode,
    inventory_count: product.inventory_count,
    is_sold_out: product.is_sold_out,
    min_quantity: product.min_quantity,
    max_quantity: product.max_quantity,
    prep_notes: product.prep_notes,
    allergen_info: product.allergen_info,
    sort_order: product.sort_order,
  });

  async function handleSave() {
    setSaving(true);
    try {
      await updateProduct(form);
      toast.success("Product saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{product.name}</h1>
        <div className="flex gap-2">
          {product.is_demo && (
            <span className="self-center text-xs text-muted-foreground">Demo product — safe to edit or archive</span>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Photos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {product.product_images.map((img) => (
            <div key={img.id} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border">
              <Image src={img.url} alt="" fill className="object-cover" />
              <button
                type="button"
                className="absolute -right-1 -top-1 rounded-full bg-destructive p-1 text-white"
                onClick={async () => {
                  await deleteProductImage(img.id, product.id);
                  router.refresh();
                }}
                aria-label="Delete photo"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          <ImageUpload
            value={null}
            onChange={async (url) => {
              if (!url) return;
              await addProductImage(product.id, url);
              router.refresh();
            }}
            folder="products"
            label="Add photo"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <Label>Name</Label>
            <Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea className="mt-1" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label>Price</Label>
            <MoneyInput className="mt-1" cents={form.price_cents} onChangeCents={(c) => setForm({ ...form, price_cents: c })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Minimum quantity</Label>
              <Input
                type="number"
                min={1}
                className="mt-1"
                value={form.min_quantity}
                onChange={(e) => setForm({ ...form, min_quantity: parseInt(e.target.value, 10) || 1 })}
              />
            </div>
            <div>
              <Label>Maximum quantity</Label>
              <Input
                type="number"
                min={1}
                placeholder="No limit"
                className="mt-1"
                value={form.max_quantity ?? ""}
                onChange={(e) => setForm({ ...form, max_quantity: e.target.value ? parseInt(e.target.value, 10) : null })}
              />
            </div>
          </div>
          <div>
            <Label>Preparation notes</Label>
            <Textarea className="mt-1" rows={2} value={form.prep_notes} onChange={(e) => setForm({ ...form, prep_notes: e.target.value })} />
          </div>
          <div>
            <Label>Allergen information</Label>
            <Textarea className="mt-1" rows={2} value={form.allergen_info} onChange={(e) => setForm({ ...form, allergen_info: e.target.value })} />
          </div>
          <div>
            <Label>Display order (lower shows first)</Label>
            <Input
              type="number"
              className="mt-1"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value, 10) || 0 })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Availability &amp; Inventory</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ToggleRow label="Published (visible in the shop)" checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} />
          <ToggleRow label="Sold out" checked={form.is_sold_out} onChange={(v) => setForm({ ...form, is_sold_out: v })} />
          <div className="flex items-center justify-between">
            <Label className="font-normal">Track inventory</Label>
            <Switch
              checked={form.inventory_mode === "tracked"}
              onCheckedChange={(v) => setForm({ ...form, inventory_mode: v ? "tracked" : "unlimited" })}
            />
          </div>
          {form.inventory_mode === "tracked" && (
            <div>
              <Label>Quantity in stock</Label>
              <Input
                type="number"
                min={0}
                className="mt-1"
                value={form.inventory_count}
                onChange={(e) => setForm({ ...form, inventory_count: parseInt(e.target.value, 10) || 0 })}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sizes, Flavors &amp; Options</CardTitle>
        </CardHeader>
        <CardContent>
          <VariantGroupsEditor productId={product.id} groups={product.product_variant_groups} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {product.is_archived ? (
            <Button
              variant="outline"
              onClick={async () => {
                await setProductArchived(product.id, false);
                router.refresh();
              }}
            >
              Reactivate
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={async () => {
                await setProductArchived(product.id, true);
                router.refresh();
              }}
            >
              Archive
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete permanently</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {product.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the product. Existing orders keep their own snapshot of the item, so past
                  orders aren&apos;t affected. Consider archiving instead if you might bring it back.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    await deleteProduct(product.id);
                    router.push("/admin/products");
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-card p-4 safe-bottom md:bottom-0 md:left-56">
        <div className="mx-auto flex max-w-3xl gap-2">
          <Button variant="outline" onClick={() => router.push("/admin/products")} className="flex-1">
            Back
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "Saving..." : "Save Product"}
          </Button>
        </div>
      </div>
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
