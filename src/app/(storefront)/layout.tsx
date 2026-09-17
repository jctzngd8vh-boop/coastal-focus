import Link from "next/link";
import Image from "next/image";
import { CartProvider } from "@/lib/cart/cart-context";
import { getBusinessSettings } from "@/lib/settings/get-settings";
import { CartLink } from "@/components/storefront/cart-link";
import { SiteFooter } from "@/components/storefront/site-footer";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const settings = await getBusinessSettings();
  const name = settings.business_name || "Your Toffee Shop";

  return (
    <CartProvider>
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur safe-top">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              {settings.logo_url ? (
                <Image
                  src={settings.logo_url}
                  alt={name}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-brand-foreground"
                  style={{ background: "var(--brand)" }}
                >
                  {name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="truncate">{name}</span>
            </Link>
            <CartLink />
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>

        <SiteFooter settings={settings} />
      </div>
    </CartProvider>
  );
}

export const dynamic = "force-dynamic";
