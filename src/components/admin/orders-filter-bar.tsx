"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PAYMENT_STATUS_LABELS } from "@/lib/payments/status";
import type { OrderStage, PaymentStatus } from "@/types/database";

export function OrdersFilterBar({ stages }: { stages: OrderStage[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState(searchParams.get("q") ?? "");

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search order #, name, phone, email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setParam("q", search)}
          onBlur={() => setParam("q", search)}
        />
      </div>
      <Select className="sm:w-44" value={searchParams.get("status") ?? ""} onChange={(e) => setParam("status", e.target.value)}>
        <option value="">All stages</option>
        {stages.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </Select>
      <Select className="sm:w-48" value={searchParams.get("payment") ?? ""} onChange={(e) => setParam("payment", e.target.value)}>
        <option value="">All payment statuses</option>
        {Object.entries(PAYMENT_STATUS_LABELS).map(([key, label]) => (
          <option key={key} value={key as PaymentStatus}>
            {label}
          </option>
        ))}
      </Select>
      <Select className="sm:w-44" value={searchParams.get("sort") ?? "date_desc"} onChange={(e) => setParam("sort", e.target.value)}>
        <option value="date_desc">Newest first</option>
        <option value="date_asc">Oldest first</option>
        <option value="customer">Customer name</option>
        <option value="status">Stage</option>
        <option value="payment_status">Payment status</option>
        <option value="total_desc">Order total</option>
      </Select>
    </div>
  );
}
