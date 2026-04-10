import { storageGet, storageSet } from './storage.js';

const PREMIUM_KEY = 'cleannote_premium';

export async function isPremium() {
  const val = await storageGet(PREMIUM_KEY);
  return val === true;
}

export async function setPremium(value) {
  await storageSet(PREMIUM_KEY, !!value);
  return !!value;
}
