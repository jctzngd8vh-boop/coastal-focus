"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function LoginForm({
  ownerExists,
  redirectTo,
  configError,
}: {
  ownerExists: boolean;
  redirectTo: string;
  configError?: boolean;
}) {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const [signInEmail, setSignInEmail] = React.useState("");
  const [signInPassword, setSignInPassword] = React.useState("");

  const [fullName, setFullName] = React.useState("");
  const [signUpEmail, setSignUpEmail] = React.useState("");
  const [signUpPassword, setSignUpPassword] = React.useState("");

  async function finishAuth(fullNameForBootstrap?: string) {
    await supabase.rpc("bootstrap_owner", { p_full_name: fullNameForBootstrap ?? null });
    router.push(redirectTo);
    router.refresh();
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: signInEmail, password: signInPassword });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    await finishAuth();
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: signUpEmail, password: signUpPassword });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    if (!data.session) {
      toast.success("Account created! Check your email to confirm, then sign in.");
      setLoading(false);
      return;
    }
    await finishAuth(fullName);
  }

  return (
    <Card>
      <CardContent className="pt-5">
        {configError && (
          <p className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            Sign in to access that page.
          </p>
        )}
        <Tabs defaultValue={ownerExists ? "signin" : "signup"}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup" disabled={ownerExists}>
              {ownerExists ? "Sign In Only" : "Create Owner Account"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="flex flex-col gap-3">
              <div>
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  required
                  className="mt-1"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  required
                  className="mt-1"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={loading} className="mt-2">
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            {ownerExists ? (
              <p className="text-sm text-muted-foreground">
                An owner account already exists for this store. Ask them to add you from Settings → Staff, or sign in
                above.
              </p>
            ) : (
              <form onSubmit={handleSignUp} className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  No owner account exists yet — the first account created here becomes the store owner.
                </p>
                <div>
                  <Label htmlFor="signup-name">Your name</Label>
                  <Input id="signup-name" required className="mt-1" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    required
                    className="mt-1"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    required
                    minLength={8}
                    className="mt-1"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={loading} className="mt-2">
                  {loading ? "Creating account..." : "Create Owner Account"}
                </Button>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
