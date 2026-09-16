import { getStorefrontProducts } from "@/lib/catalog/get-catalog";
import { getBusinessSettings } from "@/lib/settings/get-settings";
import { ProductCard } from "@/components/storefront/product-card";
import { EmptyState } from "@/components/shared/empty-state";
import { isSupabaseConfigured } from "@/lib/env";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function StorefrontHomePage() {
  if (!isSupabaseConfigured()) {
    return (
      <EmptyState
        title="Almost there — connect Supabase"
        description="This storefront needs Supabase configured (see .env.example and SETUP.md) before products can be shown or orders placed."
      />
    );
  }

  const [products, settings] = await Promise.all([getStorefrontProducts(), getBusinessSettings()]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{settings.business_name || "Welcome"}</h1>
        {settings.description && <p className="mt-1 text-muted-foreground">{settings.description}</p>}
        {settings.order_cutoff_info && (
          <p className="mt-2 text-sm text-muted-foreground">{settings.order_cutoff_info}</p>
        )}
      </div>

      {products.length === 0 ? (
        <EmptyState
          title="No products available yet"
          description="Check back soon, or if you're the owner, add products from the admin dashboard."
          action={
            <Button asChild variant="outline">
              <Link href="/admin/products">Go to Product Manager</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} currency={settings.currency} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        <Link href="/order/lookup" className="underline underline-offset-2">
          Check an existing order
        </Link>
      </div>
    </div>
  );
}
