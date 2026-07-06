/**
 * WebAuthn via Transmit Platform SDK v2.x → Mosaic.
 * @see https://developer.transmitsecurity.com/sdk-ref/authnsdk/modules
 * @see https://developer.transmitsecurity.com/sdk-ref/platform/migration
 */
import { webauthn } from '@transmitsecurity/platform-web-sdk'
import type { WebauthnRegistrationOptions } from '@transmitsecurity/platform-web-sdk/webauthn'
import { initTransmitMosaicSdk } from './initTransmitMosaic'

/** Benign autofill errors — user dismissed picker or request timed out. */
export const BENIGN_AUTOFILL_ERROR_CODES = new Set([
  'autofill_authentication_aborted',
  'webauthn_authentication_canceled',
  'authentication_aborted_timeout',
])

export function isBenignAutofillError(err: { errorCode?: string } | null | undefined): boolean {
  return Boolean(err?.errorCode && BENIGN_AUTOFILL_ERROR_CODES.has(err.errorCode))
}

export async function mosaicRegister(
  username: string,
  options?: WebauthnRegistrationOptions,
): Promise<string> {
  await initTransmitMosaicSdk()
  return webauthn.register({ username: username.trim(), ...(options ? { options } : {}) })
}

export async function mosaicAuthenticateModal(username: string): Promise<string> {
  await initTransmitMosaicSdk()
  return webauthn.authenticate.modal({ username: username.trim() })
}

/** v2.x: authenticate by identifier + identifierType instead of username. */
export async function mosaicAuthenticateByIdentifier(
  identifier: string,
  identifierType: string,
): Promise<string> {
  await initTransmitMosaicSdk()
  return webauthn.authenticate.modal({
    identifier: identifier.trim(),
    identifierType: identifierType.trim(),
  })
}

/** v2.x: sign approval data with a registered passkey (transaction approval). */
export async function mosaicApprove(
  username: string,
  approvalData: Record<string, string>,
): Promise<string> {
  await initTransmitMosaicSdk()
  return webauthn.approve.modal({ username: username.trim(), approvalData })
}

export async function mosaicIsAutofillSupported(): Promise<boolean> {
  await initTransmitMosaicSdk()
  return webauthn.isAutofillSupported()
}

export async function mosaicIsPlatformAuthenticatorSupported(): Promise<boolean | undefined> {
  await initTransmitMosaicSdk()
  return webauthn.isPlatformAuthenticatorSupported()
}

export async function mosaicGetDefaultApiPaths(): Promise<ReturnType<typeof webauthn.getDefaultPaths>> {
  await initTransmitMosaicSdk()
  return webauthn.getDefaultPaths()
}
