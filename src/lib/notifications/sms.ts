import "server-only";
import twilio from "twilio";
import { env, isTwilioConfigured } from "@/lib/env";

export interface SendSmsResult {
  status: "sent" | "failed" | "skipped";
  providerMessageId?: string;
  errorMessage?: string;
}

export async function sendSms(params: { to: string; body: string }): Promise<SendSmsResult> {
  if (!isTwilioConfigured()) {
    return {
      status: "skipped",
      errorMessage: "Twilio is not configured — see .env.example. SMS notifications are optional.",
    };
  }

  try {
    const client = twilio(env.twilioAccountSid, env.twilioAuthToken);
    const message = await client.messages.create({
      to: params.to,
      from: env.twilioFromNumber,
      body: params.body,
    });
    return { status: "sent", providerMessageId: message.sid };
  } catch (err) {
    return { status: "failed", errorMessage: err instanceof Error ? err.message : String(err) };
  }
}
