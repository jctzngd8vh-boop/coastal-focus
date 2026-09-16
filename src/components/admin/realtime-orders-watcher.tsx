"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/** Silently keeps the dashboard/orders list fresh when a new order comes in, without a manual reload. */
export function RealtimeOrdersWatcher() {
  const router = useRouter();

  React.useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel("orders-watcher")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const orderNumber = (payload.new as { order_number?: string })?.order_number;
        toast.success(orderNumber ? `New order: ${orderNumber}` : "New order received!");
        router.refresh();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
