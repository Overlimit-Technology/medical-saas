/**
 * TELEGRAM BOT API INTEGRATION
 *
 * INTEGRATION POINT:
 * - Telegram Bot API: https://core.telegram.org/bots/api
 *
 * REQUIRED ENV VARS:
 * - TELEGRAM_BOT_TOKEN: Bot token from @BotFather
 * - TELEGRAM_WEBHOOK_SECRET: Secret for verifying webhook requests
 *
 * WEBHOOK SETUP:
 * - Create webhook endpoint at /api/webhooks/telegram
 * - Register with Telegram: POST https://api.telegram.org/bot{token}/setWebhook
 */

export type TelegramMessagePayload = {
  chatId: string;
  text: string;
};

export type TelegramIncomingMessage = {
  chatId: string;
  from: string;
  text: string;
  timestamp: string;
  username?: string;
  firstName?: string;
  lastName?: string;
};

/**
 * Send a message via Telegram Bot API.
 * Replace this placeholder with real API call.
 */
export async function sendTelegramMessage(payload: TelegramMessagePayload): Promise<{ ok: boolean; messageId?: number }> {
  // TODO: Implement real Telegram Bot API call
  // const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  // const res = await fetch(url, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({
  //     chat_id: payload.chatId,
  //     text: payload.text,
  //     parse_mode: "HTML",
  //   }),
  // });
  console.log("[TELEGRAM PLACEHOLDER] sendTelegramMessage:", payload);
  return { ok: true, messageId: Date.now() };
}

/**
 * Parse incoming webhook payload from Telegram.
 * Replace this placeholder with real webhook parsing.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function parseTelegramWebhook(_body: unknown): TelegramIncomingMessage | null {
  // TODO: Implement Telegram webhook update parsing
  console.log("[TELEGRAM PLACEHOLDER] parseTelegramWebhook");
  return null;
}
