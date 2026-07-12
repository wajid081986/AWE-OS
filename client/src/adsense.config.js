export const ADSENSE_CONFIG = {
  publisherId: import.meta.env.VITE_ADSENSE_PUBLISHER_ID,
};

// Single source of truth: is an approved ad configuration active?
export const ADS_ACTIVE = Boolean(ADSENSE_CONFIG.publisherId);
