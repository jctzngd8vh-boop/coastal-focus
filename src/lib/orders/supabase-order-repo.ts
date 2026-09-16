import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  NewOrderItemRecord,
  NewOrderRecord,
  OrderRepo,
} from "@/lib/orders/create-order";
import type { Customer, CustomerAddress, Order, OrderItem, ProductWithRelations } from "@/types/database";

const PRODUCT_SELECT = `
  *,
  product_images (*),
  product_variant_groups (
    *,
    product_variant_options (*)
  )
`;

/**
 * Supabase-backed OrderRepo. Works with either the service-role client
 * (public storefront checkout) or an owner's authenticated client (POS),
 * since both expose the same query builder — RLS just decides what's
 * visible/writable.
 */
export function createSupabaseOrderRepo(client: SupabaseClient): OrderRepo {
  return {
    async getProductsByIds(ids) {
      if (ids.length === 0) return [];
      const { data, error } = await client.from("products").select(PRODUCT_SELECT).in("id", ids);
      if (error) throw error;
      return (data ?? []) as unknown as ProductWithRelations[];
    },

    async findOrderByIdempotencyKey(key) {
      const { data, error } = await client
        .from("orders")
        .select("*")
        .eq("idempotency_key", key)
        .maybeSingle();
      if (error) throw error;
      return (data as Order) ?? null;
    },

    async findCustomerByNormalized(phoneNormalized, emailNormalized) {
      if (!phoneNormalized && !emailNormalized) return null;

      const filters: string[] = [];
      if (phoneNormalized) filters.push(`phone_normalized.eq.${phoneNormalized}`);
      if (emailNormalized) filters.push(`email_normalized.eq.${emailNormalized}`);

      const { data, error } = await client
        .from("customers")
        .select("*")
        .or(filters.join(","))
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as Customer) ?? null;
    },

    async upsertCustomer(input) {
      const payload = {
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone,
        phone_normalized: input.phoneNormalized,
        email: input.email,
        email_normalized: input.emailNormalized,
        ...(input.address ? { address: input.address as CustomerAddress } : {}),
      };

      if (input.id) {
        const { data, error } = await client
          .from("customers")
          .update(payload)
          .eq("id", input.id)
          .select("*")
          .single();
        if (error) throw error;
        return data as Customer;
      }

      const { data, error } = await client.from("customers").insert(payload).select("*").single();
      if (error) throw error;
      return data as Customer;
    },

    async insertOrder(input: NewOrderRecord) {
      const { data, error } = await client.from("orders").insert(input).select("*").single();
      if (error) throw error;
      return data as Order;
    },

    async insertOrderItems(orderId: string, items: NewOrderItemRecord[]) {
      const { data, error } = await client
        .from("order_items")
        .insert(items.map((item) => ({ ...item, order_id: orderId })))
        .select("*");
      if (error) throw error;
      return (data ?? []) as OrderItem[];
    },

    async insertStatusHistory(orderId, statusType, statusValue) {
      const { error } = await client.from("order_status_history").insert({
        order_id: orderId,
        status_type: statusType,
        status_value: statusValue,
      });
      if (error) throw error;
    },

    async applyInventoryDecrement(productId, quantity, orderId) {
      const { data: product, error: fetchError } = await client
        .from("products")
        .select("inventory_count")
        .eq("id", productId)
        .single();
      if (fetchError) throw fetchError;

      const newCount = Math.max(0, (product?.inventory_count ?? 0) - quantity);

      const { error: updateError } = await client
        .from("products")
        .update({ inventory_count: newCount, is_sold_out: newCount === 0 })
        .eq("id", productId);
      if (updateError) throw updateError;

      const { error: movementError } = await client.from("inventory_movements").insert({
        product_id: productId,
        change_qty: -quantity,
        reason: "order",
        order_id: orderId,
      });
      if (movementError) throw movementError;
    },
  };
}
