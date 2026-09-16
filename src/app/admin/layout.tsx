import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBusinessSettings } from "@/lib/settings/get-settings";
import { AdminNav } from "@/components/admin/admin-nav";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const { data: ownerProfile } = await supabase.from("owner_profiles").select("*").eq("id", user.id).maybeSingle();

  if (!ownerProfile) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-bold">Not authorized</h1>
        <p className="text-muted-foreground">
          Your account isn&apos;t set up as a store owner or staff member. Ask the store owner to add you.
        </p>
        <SignOutButton />
      </div>
    );
  }

  const settings = await getBusinessSettings();

  return (
    <div className="flex min-h-dvh">
      <div className="print:hidden">
        <AdminNav />
      </div>
      <div className="flex min-h-dvh flex-1 flex-col pb-16 md:pb-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-3 safe-top print:hidden">
          <div>
            <p className="text-xs text-muted-foreground">Owner Dashboard</p>
            <p className="font-semibold">{settings.business_name || "Your Store"}</p>
          </div>
          <SignOutButton />
        </header>

        {!settings.onboarding_completed && (
          <div className="flex items-center justify-between gap-3 bg-warning/15 px-4 py-2 text-sm print:hidden">
            <span>Finish setting up your store to start taking orders.</span>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/setup">Finish Setup</Link>
            </Button>
          </div>
        )}

        <main className="flex-1 p-4">{children}</main>
      </div>
    </div>
  );
}
