/**
 * Transmit Security DRS (Fraud Prevention) integration.
 * Initializes on login page load and reports action events to Mosaic.
 * Client secret is for backend only (e.g. Recommendations API); never use it in the client.
 */

import { drs, initialize } from '@transmitsecurity/platform-web-sdk';

const CLIENT_ID = 'FY7MYqSinvz2CzfqZzNhe';
const DRS_SERVER_PATH = 'https://api.transmitsecurity.io/risk-collect/';

let initPromise: Promise<void> | null = null;

export async function initDrs(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    console.info(
      '[Init] DRS SDK → initializing',
      JSON.stringify({
        component: 'drs',
        clientId: CLIENT_ID,
        serverPath: DRS_SERVER_PATH,
        enableSessionToken: true,
      }),
    );
    initialize({
      clientId: CLIENT_ID,
      drs: {
        serverPath: DRS_SERVER_PATH,
        enableSessionToken: true,
      },
    });
    console.info('[Init] DRS SDK → ready');
  })();
  return initPromise;
}

/** Default expiration for secure session token (5 minutes). Max 3600. */
const SECURE_TOKEN_EXPIRATION_SECONDS = 300;

/** Truncate JWT for on-screen display (not a security guarantee; avoid sharing full token in public UI). */
export function formatSecureTokenPreview(token: string, head = 18, tail = 8): string {
  if (token.length <= head + tail + 1) return token;
  return `${token.slice(0, head)}…${token.slice(-tail)}`;
}

/**
 * Get a secure session token (JWT with device binding) for backend use.
 * Use this instead of getSessionToken when calling Mosaic APIs from your backend.
 * @param actionType Optional action type to bind the token to (e.g. 'login'). Default null.
 * @param expirationSeconds Optional validity in seconds. Default 300. Max 3600.
 */
export async function getSecureSessionToken(
  actionType: string | null = null,
  expirationSeconds: number = SECURE_TOKEN_EXPIRATION_SECONDS
): Promise<string | null> {
  try {
    await initDrs();
    return await drs.getSecureSessionToken(actionType, expirationSeconds);
  } catch (e) {
    console.warn('DRS getSecureSessionToken failed:', e);
    return null;
  }
}

/**
 * Report username step to Mosaic (e.g. when user clicks Continue after entering username).
 * Returns the secure session token for backend use (e.g. Recommendations API with device binding).
 */
export async function reportUsernameAction(claimedUserId: string): Promise<string | null> {
  try {
    await initDrs();
    await drs.triggerActionEvent('login', {
      claimedUserId,
      claimedUserIdType: 'account_id',
    });
    return await drs.getSecureSessionToken('login', SECURE_TOKEN_EXPIRATION_SECONDS);
  } catch (e) {
    console.warn('DRS reportUsernameAction failed:', e);
    return null;
  }
}

/**
 * Report password step to Mosaic (e.g. when user clicks Sign in after entering password).
 * Returns the secure session token for backend use (e.g. Recommendations API with device binding).
 */
export async function reportPasswordAction(claimedUserId: string): Promise<string | null> {
  try {
    await initDrs();
    await drs.triggerActionEvent('login', {
      claimedUserId,
      claimedUserIdType: 'account_id',
    });
    return await drs.getSecureSessionToken('login', SECURE_TOKEN_EXPIRATION_SECONDS);
  } catch (e) {
    console.warn('DRS reportPasswordAction failed:', e);
    return null;
  }
}

/**
 * Call after successful login to set authenticated user for subsequent events.
 */
export async function setAuthenticatedUser(userId: string): Promise<void> {
  try {
    await initDrs();
    await drs.setAuthenticatedUser(userId);
  } catch (e) {
    console.warn('DRS setAuthenticatedUser failed:', e);
  }
}

/**
 * Call on logout to clear user context.
 */
export async function clearDrsUser(): Promise<void> {
  try {
    await initDrs();
    await drs.clearUser();
  } catch (e) {
    console.warn('DRS clearUser failed:', e);
  }
}
