-- Functional defaults (not demo data) — these make the app usable
-- immediately after migrating, before the owner has customized anything.

insert into public.business_settings (id) values (true)
on conflict (id) do nothing;

insert into public.order_stages (key, label, sort_order, is_terminal, color) values
  ('new', 'New', 0, false, 'blue'),
  ('confirmed', 'Confirmed', 1, false, 'indigo'),
  ('preparing', 'Preparing', 2, false, 'amber'),
  ('ready', 'Ready', 3, false, 'emerald'),
  ('completed', 'Completed', 4, true, 'slate'),
  ('cancelled', 'Cancelled', 5, true, 'red')
on conflict (key) do nothing;

insert into public.fulfillment_methods (key, label, description, fee_cents, requires_address, requires_date, is_active, sort_order) values
  ('pickup', 'Local Pickup', 'Pick up your order at the address in your confirmation.', 0, false, true, true, 0),
  ('delivery', 'Local Delivery', 'We will deliver to the address you provide.', 0, true, true, false, 1),
  ('shipping', 'Shipping', 'Your order will be shipped to the address you provide.', 0, true, false, false, 2)
on conflict (key) do nothing;

insert into public.payment_methods (key, display_name, method_type, handle, instructions, is_active, is_customer_selectable, is_pos_only, sort_order) values
  ('cash', 'Cash at Pickup', 'cash', '', 'Pay with exact cash when you pick up your order.', true, true, false, 0)
on conflict (key) do nothing;

insert into public.message_templates (key, label, channel, subject, body, is_default, sort_order) values
  ('order_received', 'Order Received', 'any', 'We received your order — {{business_name}}',
   'Hi {{first_name}}, thanks for your order #{{order_number}} from {{business_name}}! We''ll confirm it shortly. Total: {{total}}.', true, 0),
  ('payment_reminder', 'Payment Reminder', 'any', 'Payment needed for order {{order_number}}',
   'Hi {{first_name}}, a friendly reminder that {{amount_due}} is still due for order #{{order_number}} from {{business_name}}. {{payment_instructions}}', true, 1),
  ('order_confirmed', 'Order Confirmed', 'any', 'Your order is confirmed — {{order_number}}',
   'Hi {{first_name}}, your order #{{order_number}} is confirmed! {{fulfillment_details}} Thanks for choosing {{business_name}}.', true, 2),
  ('order_preparing', 'Order Being Prepared', 'any', 'We''re making your order — {{order_number}}',
   'Hi {{first_name}}, we''ve started preparing your order #{{order_number}}. We''ll let you know when it''s ready!', true, 3),
  ('order_ready', 'Order Ready for Pickup', 'any', 'Your order is ready! — {{order_number}}',
   'Hi {{first_name}}, order #{{order_number}} is ready! {{pickup_instructions}} See you soon — {{business_name}}.', true, 4),
  ('delivery_update', 'Delivery Update', 'any', 'Delivery update — {{order_number}}',
   'Hi {{first_name}}, your order #{{order_number}} is out for delivery. {{fulfillment_details}}', true, 5),
  ('order_completed', 'Order Completed', 'any', 'Thanks for your order! — {{order_number}}',
   'Hi {{first_name}}, thanks again for order #{{order_number}}! We hope you love it. — {{business_name}}', true, 6),
  ('custom', 'Custom Message', 'any', '', '', true, 7)
on conflict (key) do nothing;
