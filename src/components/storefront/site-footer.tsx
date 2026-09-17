import { Phone, Mail, Clock } from "lucide-react";
import { formatBusinessHours } from "@/lib/settings/format-hours";
import { normalizePhone } from "@/lib/customers/normalize";
import { buildMailtoLink, buildTelLink } from "@/lib/messages/templates";
import type { BusinessSettings } from "@/types/database";

export function SiteFooter({ settings }: { settings: BusinessSettings }) {
  const name = settings.business_name || "Your Toffee Shop";
  const phoneNormalized = settings.business_phone ? normalizePhone(settings.business_phone) : null;
  const hoursLines = formatBusinessHours(settings.business_hours);
  const hasContactInfo = Boolean(phoneNormalized || settings.contact_email || hoursLines.length > 0);

  return (
    <footer className="border-t border-border px-4 py-8 text-sm text-muted-foreground safe-bottom">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 sm:flex-row sm:justify-between">
        <div>
          <p className="font-medium text-foreground">{name}</p>
          {settings.pickup_address && <p className="mt-1 max-w-xs">{settings.pickup_address}</p>}
        </div>

        {hasContactInfo && (
          <div className="flex flex-col gap-1.5">
            {phoneNormalized && (
              <a href={buildTelLink(phoneNormalized)} className="flex items-center gap-2 hover:text-foreground">
                <Phone className="h-4 w-4 shrink-0" /> {settings.business_phone}
              </a>
            )}
            {settings.contact_email && (
              <a href={buildMailtoLink(settings.contact_email)} className="flex items-center gap-2 hover:text-foreground">
                <Mail className="h-4 w-4 shrink-0" /> {settings.contact_email}
              </a>
            )}
            {hoursLines.length > 0 && (
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  {hoursLines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {settings.allergen_notice && (
        <p className="mx-auto mt-6 max-w-3xl text-left">{settings.allergen_notice}</p>
      )}
    </footer>
  );
}
