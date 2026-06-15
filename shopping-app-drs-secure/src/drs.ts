/**
 * Transmit Security DRS (Fraud Prevention) with secure session tokens.
 * @see https://developer.transmitsecurity.com/sdk-ref/platform/modules/drs_overview
 *
 * `enableSessionToken: true` enables session/secure session tokens for backend action reporting.
 * Use `getSecureSessionToken` for device-bound tokens when calling Mosaic from your server.
 * Client secret is for backend only (e.g. Recommendations API); never use it in the client.
 */

import { drs, initialize } from '@transmitsecurity/platform-web-sdk';

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

/** Default expiration for secure session token (5 minutes). Max 3600. */
const SECURE_TOKEN_EXPIRATION_SECONDS = 300;

/**
 * Get a secure session token (JWT with device binding) for backend use.
 * When `enableSessionToken` is true, this is the method to use for device-bound
 * session material your server passes to Mosaic services (e.g. Recommendations).
 * @param actionType Optional action type to bind the token to (e.g. 'login'). Use `null` when no action binding.
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

/** Truncate JWT for on-screen display (not a security guarantee; avoid sharing full token in public UI). */
export function formatSecureTokenPreview(token: string, head = 18, tail = 8): string {
  if (token.length <= head + tail + 1) return token;
  return `${token.slice(0, head)}…${token.slice(-tail)}`;
}

const LOGIN_ACTION = {
  type: 'login' as const,
  claimedUserIdType: 'account_id' as const,
};

/**
 * Report username step to Mosaic (e.g. when user clicks Log in after entering username).
 * Fetches the secure session token via getSecureSessionToken after the action event.
 */
export async function reportUsernameAction(claimedUserId: string): Promise<string | null> {
  try {
    await initDrs();
    await drs.triggerActionEvent(LOGIN_ACTION.type, {
      claimedUserId,
      claimedUserIdType: LOGIN_ACTION.claimedUserIdType,
    });
    return await getSecureSessionToken(LOGIN_ACTION.type, SECURE_TOKEN_EXPIRATION_SECONDS);
  } catch (e) {
    console.warn('DRS reportUsernameAction failed:', e);
    return null;
  }
}

/**
 * Report password step to Mosaic (e.g. when user clicks Submit after entering password).
 * Fetches a fresh secure session token via getSecureSessionToken after the action event.
 */
export async function reportPasswordAction(claimedUserId: string): Promise<string | null> {
  try {
    await initDrs();
    await drs.triggerActionEvent(LOGIN_ACTION.type, {
      claimedUserId,
      claimedUserIdType: LOGIN_ACTION.claimedUserIdType,
    });
    return await getSecureSessionToken(LOGIN_ACTION.type, SECURE_TOKEN_EXPIRATION_SECONDS);
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
