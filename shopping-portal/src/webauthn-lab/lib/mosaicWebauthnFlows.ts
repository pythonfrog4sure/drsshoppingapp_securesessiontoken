/**
 * WebAuthn via Transmit SDK → Mosaic (same API usage as shopping-app-passkey).
 */
import { webauthn } from '@transmitsecurity/platform-web-sdk'
import { initTransmitMosaicSdk } from './initTransmitMosaic'

export async function mosaicRegister(username: string): Promise<string> {
  await initTransmitMosaicSdk()
  return webauthn.register({ username: username.trim() })
}

export async function mosaicAuthenticateModal(username: string): Promise<string> {
  await initTransmitMosaicSdk()
  return webauthn.authenticate.modal({ username: username.trim() })
}

export async function mosaicIsAutofillSupported(): Promise<boolean> {
  await initTransmitMosaicSdk()
  return webauthn.isAutofillSupported()
}
