"use client";

import * as React from "react";
import { Phone, MessageSquare, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildMailtoLink, buildSmsLink, buildTelLink, interpolateTemplate, type TemplateVariables } from "@/lib/messages/templates";
import type { MessageTemplate } from "@/types/database";

export function MessageComposer({
  templates,
  variables,
  phoneNormalized,
  email,
}: {
  templates: MessageTemplate[];
  variables: TemplateVariables;
  phoneNormalized: string | null;
  email: string | null;
}) {
  const [templateKey, setTemplateKey] = React.useState(templates[0]?.key ?? "");
  const template = templates.find((t) => t.key === templateKey);
  const [body, setBody] = React.useState(template ? interpolateTemplate(template.body, variables) : "");
  const [bodyForTemplateKey, setBodyForTemplateKey] = React.useState(templateKey);

  // Re-derive the editable body when the selected template changes — done
  // during render (React's guidance for syncing state to a changed prop)
  // rather than in an effect, so switching templates never flashes stale text.
  if (templateKey !== bodyForTemplateKey) {
    setBodyForTemplateKey(templateKey);
    setBody(template ? interpolateTemplate(template.body, variables) : "");
  }

  const subject = template?.subject ? interpolateTemplate(template.subject, variables) : "Message";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Message Customer</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Select value={templateKey} onChange={(e) => setTemplateKey(e.target.value)}>
          {templates.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </Select>
        <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          {phoneNormalized && (
            <Button asChild variant="outline" size="sm">
              <a href={buildTelLink(phoneNormalized)}>
                <Phone className="h-4 w-4" /> Call
              </a>
            </Button>
          )}
          {phoneNormalized && (
            <Button asChild size="sm">
              <a href={buildSmsLink(phoneNormalized, body)}>
                <MessageSquare className="h-4 w-4" /> Text
              </a>
            </Button>
          )}
          {email && (
            <Button asChild variant="outline" size="sm">
              <a href={buildMailtoLink(email, subject, body)}>
                <Mail className="h-4 w-4" /> Email
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
