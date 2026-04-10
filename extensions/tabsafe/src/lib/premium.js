/**
 * Premium module — feature gating for TabSafe PRO
 * Currently uses a local flag. Will integrate ExtensionPay later.
 */

const PREMIUM_KEY = 'tabsafe_premium';

export async function isPremium() {
  const result = await chrome.storage.local.get(PREMIUM_KEY);
  return result[PREMIUM_KEY] === true;
}

export async function setPremium(value) {
  await chrome.storage.local.set({ [PREMIUM_KEY]: !!value });
}
