/**
 * META PLATFORM INTEGRATIONS (Instagram, Facebook, WhatsApp)
 *
 * INTEGRATION POINTS:
 * - WhatsApp Business API: https://developers.facebook.com/docs/whatsapp/cloud-api
 * - Instagram Messaging API: https://developers.facebook.com/docs/instagram-api/guides/messaging
 * - Facebook Messenger API: https://developers.facebook.com/docs/messenger-platform
 *
 * REQUIRED ENV VARS:
 * - META_APP_ID: Facebook App ID
 * - META_APP_SECRET: Facebook App Secret
 * - META_ACCESS_TOKEN: Long-lived access token
 * - WHATSAPP_PHONE_NUMBER_ID: WhatsApp Business phone number ID
 * - WHATSAPP_BUSINESS_ACCOUNT_ID: WhatsApp Business Account ID
 *
 * WEBHOOK SETUP:
 * - Create webhook endpoint at /api/webhooks/meta
 * - Verify webhook with META_WEBHOOK_VERIFY_TOKEN
 * - Subscribe to messages, messaging_postbacks events
 */

export type MetaMessagePayload = {
  to: string;
  text: string;
  channel: "whatsapp" | "instagram" | "facebook";
};

export type MetaIncomingMessage = {
  from: string;
  text: string;
  timestamp: string;
  channel: "whatsapp" | "instagram" | "facebook";
  mediaUrl?: string;
  profileName?: string;
};

/**
 * Send a message via WhatsApp Business API.
 * Replace this placeholder with real API call.
 */
export async function sendWhatsAppMessage(payload: MetaMessagePayload): Promise<{ ok: boolean; messageId?: string }> {
  // TODO: Implement real WhatsApp Cloud API call
  // const url = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  // const res = await fetch(url, {
  //   method: "POST",
  //   headers: {
  //     "Authorization": `Bearer ${process.env.META_ACCESS_TOKEN}`,
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({
  //     messaging_product: "whatsapp",
  //     to: payload.to,
  //     type: "text",
  //     text: { body: payload.text },
  //   }),
  // });
  console.log("[META PLACEHOLDER] sendWhatsAppMessage:", payload);
  return { ok: true, messageId: `mock_wa_${Date.now()}` };
}

/**
 * Send a message via Instagram DM API.
 * Replace this placeholder with real API call.
 */
export async function sendInstagramMessage(payload: MetaMessagePayload): Promise<{ ok: boolean; messageId?: string }> {
  // TODO: Implement real Instagram Messaging API call
  // const url = `https://graph.facebook.com/v18.0/me/messages`;
  console.log("[META PLACEHOLDER] sendInstagramMessage:", payload);
  return { ok: true, messageId: `mock_ig_${Date.now()}` };
}

/**
 * Send a message via Facebook Messenger API.
 * Replace this placeholder with real API call.
 */
export async function sendFacebookMessage(payload: MetaMessagePayload): Promise<{ ok: boolean; messageId?: string }> {
  // TODO: Implement real Messenger Platform API call
  // const url = `https://graph.facebook.com/v18.0/me/messages`;
  console.log("[META PLACEHOLDER] sendFacebookMessage:", payload);
  return { ok: true, messageId: `mock_fb_${Date.now()}` };
}

/**
 * Parse incoming webhook payload from Meta platforms.
 * Replace this placeholder with real webhook parsing.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function parseMetaWebhook(_body: unknown): MetaIncomingMessage | null {
  // TODO: Implement webhook payload parsing for WhatsApp/Instagram/Facebook
  console.log("[META PLACEHOLDER] parseMetaWebhook");
  return null;
}
