import "server-only";
import { Resend } from "resend";
import { env, isResendConfigured } from "@/lib/env";

export interface SendEmailResult {
  status: "sent" | "failed" | "skipped";
  providerMessageId?: string;
  errorMessage?: string;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
}): Promise<SendEmailResult> {
  if (!isResendConfigured()) {
    return {
      status: "skipped",
      errorMessage: "RESEND_API_KEY / RESEND_FROM_EMAIL not configured — see .env.example.",
    };
  }

  try {
    const resend = new Resend(env.resendApiKey);
    const { data, error } = await resend.emails.send({
      from: env.resendFromEmail,
      to: params.to,
      subject: params.subject,
      text: params.text,
    });

    if (error) {
      return { status: "failed", errorMessage: error.message };
    }
    return { status: "sent", providerMessageId: data?.id };
  } catch (err) {
    return { status: "failed", errorMessage: err instanceof Error ? err.message : String(err) };
  }
}
