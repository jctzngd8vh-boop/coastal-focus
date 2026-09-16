import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { SignOutButton } from "@/components/admin/sign-out-button";

export const dynamic = "force-dynamic";

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/pos");

  const { data: ownerProfile } = await supabase.from("owner_profiles").select("*").eq("id", user.id).maybeSingle();
  if (!ownerProfile) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-bold">Not authorized</h1>
        <p className="text-muted-foreground">Your account isn&apos;t set up as a store owner or staff member.</p>
        <SignOutButton />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <AdminNav />
      <div className="flex min-h-dvh flex-1 flex-col pb-16 md:pb-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-3 safe-top">
          <p className="font-semibold">Point of Sale</p>
          <SignOutButton />
        </header>
        <main className="flex-1 p-4">{children}</main>
      </div>
    </div>
  );
}
