/**
 * Same Transmit / Mosaic credentials as shopping-app-passkey (Login.tsx).
 * @see https://developer.transmitsecurity.com/sdk-ref/authnsdk/overview
 */
import { initialize } from '@transmitsecurity/platform-web-sdk'

/** IDO / WebAuthn client (matches passkey shop) */
export const TRANSMIT_PASSKEY_CLIENT_ID = '-LNkSyvmbee08fv7e9_p9'

export const TRANSMIT_IDO_APPLICATION_ID = 'XT72jJDvuoGARxOI3dKyf'

export const TRANSMIT_IDO_SERVER_PATH = 'https://api.transmitsecurity.io/ido'

/** Base API host for WebAuthn module (US); align with passkey app */
export const TRANSMIT_WEBAUTHN_SERVER_PATH = 'https://api.transmitsecurity.io'

let mosaicReady: Promise<void> | null = null

/**
 * Initialize platform SDK for Mosaic WebAuthn + IDO (WebAuthn module uses clientId + serverPath).
 */
export function initTransmitMosaicSdk(): Promise<void> {
  if (mosaicReady) return mosaicReady
  mosaicReady = (async () => {
    await Promise.resolve(
      initialize({
        clientId: TRANSMIT_PASSKEY_CLIENT_ID,
        ido: {
          applicationId: TRANSMIT_IDO_APPLICATION_ID,
          serverPath: TRANSMIT_IDO_SERVER_PATH,
        },
        webauthn: {
          serverPath: TRANSMIT_WEBAUTHN_SERVER_PATH,
        },
      })
    )
  })()
  return mosaicReady
}
