import Link from "next/link";
import { Phone, MessageSquare, Mail } from "lucide-react";
import { getBusinessSettings } from "@/lib/settings/get-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buildMailtoLink, buildSmsLink, buildTelLink } from "@/lib/messages/templates";
import { normalizePhone } from "@/lib/customers/normalize";

export default async function OrderLookupPage() {
  const settings = await getBusinessSettings();
  const phoneNormalized = settings.business_phone ? normalizePhone(settings.business_phone) : null;
  const smsNormalized = settings.sms_phone ? normalizePhone(settings.sms_phone) : phoneNormalized;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check your order status</CardTitle>
        <CardDescription>
          Use the secure link from your order confirmation email or text — it looks like
          coastal-focus.example/order/xxxxxxxx. Can&apos;t find it? Reach out below and we&apos;ll look it up.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {phoneNormalized && (
          <Button asChild variant="outline" className="justify-start">
            <a href={buildTelLink(phoneNormalized)}>
              <Phone className="h-4 w-4" /> Call {settings.business_phone}
            </a>
          </Button>
        )}
        {smsNormalized && (
          <Button asChild variant="outline" className="justify-start">
            <a href={buildSmsLink(smsNormalized, "Hi! Can you help me find my order status?")}>
              <MessageSquare className="h-4 w-4" /> Text us
            </a>
          </Button>
        )}
        {settings.contact_email && (
          <Button asChild variant="outline" className="justify-start">
            <a href={buildMailtoLink(settings.contact_email, "Order status")}>
              <Mail className="h-4 w-4" /> Email us
            </a>
          </Button>
        )}
        <Link href="/" className="text-sm text-muted-foreground underline underline-offset-2">
          Back to the shop
        </Link>
      </CardContent>
    </Card>
  );
}
