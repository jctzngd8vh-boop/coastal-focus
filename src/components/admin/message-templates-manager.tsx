"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { deleteMessageTemplate, upsertMessageTemplate } from "@/lib/settings/message-template-actions";
import type { MessageTemplate } from "@/types/database";

export function MessageTemplatesManager({ templates }: { templates: MessageTemplate[] }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Use <code>{"{{first_name}}"}</code>, <code>{"{{order_number}}"}</code>, <code>{"{{business_name}}"}</code>,{" "}
        <code>{"{{amount_due}}"}</code>, <code>{"{{pickup_instructions}}"}</code>, and <code>{"{{fulfillment_details}}"}</code> — they&apos;re
        filled in automatically when you send a message.
      </p>
      {templates.map((t) => (
        <TemplateRow key={t.id} template={t} />
      ))}
    </div>
  );
}

function TemplateRow({ template }: { template: MessageTemplate }) {
  const [label, setLabel] = React.useState(template.label);
  const [subject, setSubject] = React.useState(template.subject);
  const [body, setBody] = React.useState(template.body);

  async function save() {
    try {
      await upsertMessageTemplate({ id: template.id, key: template.key, label, channel: template.channel, subject, body, sort_order: template.sort_order });
      toast.success("Template saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save.");
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <Input className="font-medium" value={label} onChange={(e) => setLabel(e.target.value)} onBlur={save} />
          {!template.is_default && (
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={async () => {
                await deleteMessageTemplate(template.id);
                toast.success("Deleted.");
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div>
          <Label className="text-xs">Email subject (optional)</Label>
          <Input className="mt-1" value={subject} onChange={(e) => setSubject(e.target.value)} onBlur={save} />
        </div>
        <div>
          <Label className="text-xs">Message body</Label>
          <Textarea className="mt-1" rows={3} value={body} onChange={(e) => setBody(e.target.value)} onBlur={save} />
        </div>
      </CardContent>
    </Card>
  );
}

export function AddMessageTemplateButton() {
  return (
    <Button
      variant="outline"
      className="w-fit"
      onClick={async () => {
        await upsertMessageTemplate({
          key: `custom_${Date.now()}`,
          label: "New Template",
          channel: "any",
          subject: "",
          body: "",
          sort_order: 99,
        });
      }}
    >
      <Plus className="h-4 w-4" /> Add Template
    </Button>
  );
}
