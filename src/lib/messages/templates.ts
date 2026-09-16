export type TemplateVariables = Record<string, string>;

/** Replaces {{variable}} placeholders; unknown variables are left as-is so typos are visible. */
export function interpolateTemplate(template: string, variables: TemplateVariables): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
    return Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : match;
  });
}

export function buildTelLink(phoneNormalized: string): string {
  return `tel:${encodeURIComponent(phoneNormalized)}`;
}

export function buildSmsLink(phoneNormalized: string, body?: string): string {
  const base = `sms:${encodeURIComponent(phoneNormalized)}`;
  if (!body) return base;
  // iOS Messages expects `&body=`, most others `?body=`; `&` works broadly on iPhone (the target platform here).
  return `${base}&body=${encodeURIComponent(body)}`;
}

export function buildMailtoLink(email: string, subject?: string, body?: string): string {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const query = params.toString();
  return `mailto:${encodeURIComponent(email)}${query ? `?${query}` : ""}`;
}
