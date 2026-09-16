import { getActiveFulfillmentMethods, getCustomerPaymentMethods } from "@/lib/catalog/get-catalog";
import { getBusinessSettings } from "@/lib/settings/get-settings";
import { CheckoutForm } from "@/components/storefront/checkout-form";

export default async function CheckoutPage() {
  const [fulfillmentMethods, paymentMethods, settings] = await Promise.all([
    getActiveFulfillmentMethods(),
    getCustomerPaymentMethods(),
    getBusinessSettings(),
  ]);

  return (
    <CheckoutForm
      fulfillmentMethods={fulfillmentMethods}
      paymentMethods={paymentMethods}
      settings={settings}
    />
  );
}
