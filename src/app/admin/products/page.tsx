import Link from "next/link";
import { Plus } from "lucide-react";
import { getAdminProducts } from "@/lib/products/get-admin-products";
import { createDraftProduct } from "@/lib/products/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCents } from "@/lib/orders/totals";

export default async function ProductsPage() {
  const products = await getAdminProducts();
  const active = products.filter((p) => !p.is_archived);
  const archived = products.filter((p) => p.is_archived);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Products</h1>
        <form action={createDraftProduct}>
          <Button size="sm">
            <Plus className="h-4 w-4" /> New Product
          </Button>
        </form>
      </div>

      {active.length === 0 ? (
        <EmptyState title="No products yet" description="Add your first product to start selling." />
      ) : (
        <div className="flex flex-col gap-2">
          {active.map((product) => (
            <Link key={product.id} href={`/admin/products/${product.id}`}>
              <Card className="hover:bg-muted/50">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{product.name}</p>
                      {!product.is_active && <Badge variant="secondary">Draft</Badge>}
                      {product.is_sold_out && <Badge variant="destructive">Sold out</Badge>}
                      {product.is_demo && <Badge variant="outline">Demo</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{formatCents(product.price_cents)}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Archived</h2>
          <div className="flex flex-col gap-2">
            {archived.map((product) => (
              <Link key={product.id} href={`/admin/products/${product.id}`}>
                <Card className="opacity-60 hover:opacity-100">
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <p className="font-medium">{product.name}</p>
                    <Badge variant="secondary">Archived</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
