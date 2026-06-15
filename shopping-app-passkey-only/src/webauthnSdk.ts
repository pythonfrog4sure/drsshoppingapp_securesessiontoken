/**
 * Transmit Security WebAuthn (Passkey) integration.
 *
 * Per the quick-start guide
 * (https://developer.transmitsecurity.com/guides/webauthn/quick_start_sdk),
 * Step 3 instructs the application to initialize the SDK as soon as the page
 * loads. This module centralizes that init so it happens on page load (called
 * from App.tsx), regardless of whether the user lands on the Login or Shop
 * view, and exposes capability flags that the UI can await.
 */

import { initialize, webauthn } from '@transmitsecurity/platform-web-sdk';

export const WEBAUTHN_CLIENT_ID = '-LNkSyvmbee08fv7e9_p9';
export const WEBAUTHN_SERVER_PATH = 'https://api.transmitsecurity.io';

export interface WebauthnCapabilities {
  /** True once the SDK has been initialized successfully. */
  ready: boolean;
  /** Result of webauthn.isPlatformAuthenticatorSupported(). */
  platformAuthenticatorSupported: boolean;
  /**
   * Result of webauthn.isAutofillSupported(). Drives whether the autofill
   * toggle is shown. The toggle itself is off by default and must be enabled
   * explicitly by the user before the conditional UI is activated.
   */
  autofillSupported: boolean;
}

let initPromise: Promise<WebauthnCapabilities> | null = null;

export function initWebauthn(): Promise<WebauthnCapabilities> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    console.info(
      '[Init] WebAuthn SDK → initializing',
      JSON.stringify({
        component: 'webauthn',
        clientId: WEBAUTHN_CLIENT_ID,
        serverPath: WEBAUTHN_SERVER_PATH,
      }),
    );

    // Step 3: Initialize the SDK.
    await initialize({
      clientId: WEBAUTHN_CLIENT_ID,
      webauthn: { serverPath: WEBAUTHN_SERVER_PATH },
    });
    console.info('[Init] WebAuthn SDK → initialize() resolved');

    // Step 4.1: Check that the device supports WebAuthn.
    let platformAuthenticatorSupported = false;
    try {
      platformAuthenticatorSupported = Boolean(
        await webauthn.isPlatformAuthenticatorSupported()
      );
    } catch (err) {
      console.warn('webauthn.isPlatformAuthenticatorSupported failed', err);
    }

    // Detect autofill capability so the UI can show / hide the toggle. The
    // conditional UI is NOT activated here — activation only happens when the
    // user explicitly enables the toggle in the Login view.
    let autofillSupported = false;
    try {
      autofillSupported = Boolean(await webauthn.isAutofillSupported());
    } catch (err) {
      console.warn('webauthn.isAutofillSupported failed', err);
    }

    console.info(
      '[Init] WebAuthn SDK → ready',
      JSON.stringify({
        platformAuthenticatorSupported,
        autofillSupported,
      }),
    );

    return {
      ready: true,
      platformAuthenticatorSupported,
      autofillSupported,
    };
  })();

  // If init fails, allow a retry on the next call instead of caching the
  // rejection forever.
  initPromise.catch(() => {
    initPromise = null;
  });

  return initPromise;
}
