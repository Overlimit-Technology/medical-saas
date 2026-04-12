/**
 * TIKTOK BUSINESS API INTEGRATION
 *
 * INTEGRATION POINT:
 * - TikTok for Business API: https://business-api.tiktok.com/portal/docs
 * - TikTok Login Kit: https://developers.tiktok.com/doc/login-kit-web
 *
 * REQUIRED ENV VARS:
 * - TIKTOK_APP_ID: TikTok App ID
 * - TIKTOK_APP_SECRET: TikTok App Secret
 * - TIKTOK_ACCESS_TOKEN: Access token for API calls
 *
 * NOTE: TikTok Business API messaging capabilities are limited.
 * Primary use is for lead collection from TikTok Lead Gen ads
 * and reading profile/audience data.
 */

export type TikTokLeadData = {
  adId: string;
  formId: string;
  leadId: string;
  name?: string;
  phone?: string;
  email?: string;
  customFields: Record<string, string>;
  createdAt: string;
};

/**
 * Fetch leads from TikTok Lead Gen forms.
 * Replace this placeholder with real API call.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fetchTikTokLeads(_formId: string): Promise<TikTokLeadData[]> {
  // TODO: Implement real TikTok Business API call
  // const url = `https://business-api.tiktok.com/open_api/v1.3/lead/get/`;
  // const res = await fetch(url, {
  //   headers: { "Access-Token": process.env.TIKTOK_ACCESS_TOKEN! },
  // });
  console.log("[TIKTOK PLACEHOLDER] fetchTikTokLeads");
  return [];
}

/**
 * Parse incoming webhook payload from TikTok Lead Gen.
 * Replace this placeholder with real webhook parsing.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function parseTikTokWebhook(_body: unknown): TikTokLeadData | null {
  // TODO: Implement TikTok webhook parsing for lead events
  console.log("[TIKTOK PLACEHOLDER] parseTikTokWebhook");
  return null;
}
