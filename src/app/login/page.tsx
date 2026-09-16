import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { LoginForm } from "@/components/admin/login-form";
import { EmptyState } from "@/components/shared/empty-state";
import { getBusinessSettings } from "@/lib/settings/get-settings";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md items-center px-4">
        <EmptyState
          title="Supabase isn't configured"
          description="Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment (see .env.example), then reload."
        />
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: ownerExists } = await supabase.rpc("owner_exists");
  const settings = await getBusinessSettings();

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <h1 className="mb-1 text-2xl font-bold">{settings.business_name || "Owner Sign In"}</h1>
      <p className="mb-6 text-muted-foreground">Sign in to manage orders, products, and settings.</p>
      <LoginForm ownerExists={Boolean(ownerExists)} redirectTo={next ?? "/admin"} configError={error === "not_configured"} />
    </div>
  );
}
