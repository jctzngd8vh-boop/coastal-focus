import { z } from "zod";

export const checkoutItemSchema = z.object({
  productId: z.uuid(),
  quantity: z.number().int().min(1).max(999),
  selectedOptionIds: z.array(z.uuid()).default([]),
  prepNotes: z.string().max(500).optional().default(""),
});

export const checkoutAddressSchema = z.object({
  line1: z.string().max(200).default(""),
  line2: z.string().max(200).default(""),
  city: z.string().max(120).default(""),
  state: z.string().max(60).default(""),
  postal_code: z.string().max(20).default(""),
});

export function buildCheckoutSchema(emailRequired: boolean) {
  return z.object({
    items: z.array(checkoutItemSchema).min(1, "Your cart is empty."),
    firstName: z.string().trim().min(1, "First name is required.").max(100),
    lastName: z.string().trim().min(1, "Last name is required.").max(100),
    phone: z.string().trim().min(7, "A valid phone number is required.").max(30),
    email: emailRequired
      ? z.email("Enter a valid email address.")
      : z.union([z.email("Enter a valid email address."), z.literal("")]).optional(),
    fulfillmentMethodId: z.uuid(),
    requestedAt: z.string().datetime({ offset: true }).optional().nullable(),
    requestedTimeWindow: z.string().max(200).optional().default(""),
    address: checkoutAddressSchema.optional(),
    giftMessage: z.string().max(500).optional().default(""),
    orderNotes: z.string().max(1000).optional().default(""),
    paymentMethodId: z.uuid(),
    paymentReference: z.string().max(200).optional().default(""),
    idempotencyKey: z.uuid(),
  });
}

export type CheckoutInput = z.infer<ReturnType<typeof buildCheckoutSchema>>;
