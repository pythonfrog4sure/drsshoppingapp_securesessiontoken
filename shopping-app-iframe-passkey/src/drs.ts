/**
 * Transmit Security DRS (Fraud Prevention) integration.
 * Uses the same Mosaic client ID as the other shopping apps in the portal.
 * This app only needs DRS to initialize on page load — passkey authentication
 * happens inside the embedded shop-with-passkey-only iframe.
 */

import { initialize } from '@transmitsecurity/platform-web-sdk';

const CLIENT_ID = 'FY7MYqSinvz2CzfqZzNhe';

let initPromise: Promise<void> | null = null;

export async function initDrs(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    initialize({
      clientId: CLIENT_ID,
      drs: {
        serverPath: 'https://api.transmitsecurity.io/risk-collect/',
        enableSessionToken: true,
      },
    });
  })();
  return initPromise;
}
