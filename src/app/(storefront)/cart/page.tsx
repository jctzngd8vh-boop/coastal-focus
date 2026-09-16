"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart/cart-context";
import { formatCents } from "@/lib/orders/totals";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";

export default function CartPage() {
  const { items, updateQuantity, removeItem } = useCart();
  const router = useRouter();

  const subtotal = items.reduce((sum, item) => {
    const optionsTotal = item.selectedOptions.reduce((s, o) => s + o.priceDeltaCents, 0);
    return sum + (item.unitPriceCents + optionsTotal) * item.quantity;
  }, 0);

  if (items.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Add something sweet to get started."
        action={
          <Button asChild>
            <Link href="/">Browse products</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">Your Cart</h1>

      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const lineTotal =
            (item.unitPriceCents + item.selectedOptions.reduce((s, o) => s + o.priceDeltaCents, 0)) *
            item.quantity;
          return (
            <Card key={item.key}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium">{item.productName}</p>
                  {item.selectedOptions.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {item.selectedOptions.map((o) => o.optionName).join(", ")}
                    </p>
                  )}
                  {item.prepNotes && <p className="text-xs text-muted-foreground">Note: {item.prepNotes}</p>}
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.key, item.quantity - 1)}
                      disabled={item.quantity <= item.minQuantity}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-6 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(item.key, item.quantity + 1)}
                      disabled={item.maxQuantity != null && item.quantity >= item.maxQuantity}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="font-medium">{formatCents(lineTotal)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeItem(item.key)}
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="text-lg font-semibold">{formatCents(subtotal)}</span>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">Tax and any fulfillment fee are calculated at checkout.</p>

      <Button size="lg" onClick={() => router.push("/checkout")}>
        Proceed to Checkout
      </Button>
    </div>
  );
}
