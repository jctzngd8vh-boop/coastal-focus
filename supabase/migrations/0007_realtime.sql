-- Enables realtime change notifications for the orders table so the owner
-- dashboard updates instantly when a new order comes in, without polling.
alter publication supabase_realtime add table public.orders;
