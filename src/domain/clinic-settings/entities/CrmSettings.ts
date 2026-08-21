export type CrmSettings = {
  whatsappPhoneNumberId: string | null;
  whatsappBusinessAccountId: string | null;
  whatsappAccessToken: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  websiteUrl: string | null;
};

export type CrmSettingsInput = {
  whatsappPhoneNumberId?: string | null;
  whatsappBusinessAccountId?: string | null;
  whatsappAccessToken?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  tiktokUrl?: string | null;
  websiteUrl?: string | null;
};
