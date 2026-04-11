/**
 * Client-generated challenges for local demos only. Production must use a server.
 * See: https://www.w3.org/TR/webauthn-3/ and passkeys.dev patterns.
 */
import { base64urlToBuffer, randomBytes, u8ToArrayBuffer } from './buffers'

export const RP_NAME = 'WebAuthn Use Cases Lab'

export function rpId(): string {
  return window.location.hostname
}

function challenge(): ArrayBuffer {
  return u8ToArrayBuffer(randomBytes(32))
}

const defaultPubKeyParams: PublicKeyCredentialParameters[] = [
  { type: 'public-key', alg: -7 },
  { type: 'public-key', alg: -257 },
]

/** Registration: platform / “this device” authenticator (Touch ID, Hello, etc.) */
export async function registerPlatformAuthenticator(username: string): Promise<PublicKeyCredential> {
  const userId = randomBytes(16)
  const opts: PublicKeyCredentialCreationOptions = {
    challenge: challenge(),
    rp: { id: rpId(), name: RP_NAME },
    user: {
      id: u8ToArrayBuffer(userId),
      name: username,
      displayName: username,
    },
    pubKeyCredParams: defaultPubKeyParams,
    timeout: 120_000,
    attestation: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      residentKey: 'preferred',
      userVerification: 'required',
    },
  }
  const c = await navigator.credentials.create({ publicKey: opts })
  if (!c) throw new Error('Registration cancelled.')
  return c as PublicKeyCredential
}

/** Registration: cross-platform / roaming (security key; phone/link flows depend on OS + browser). */
export async function registerCrossPlatformAuthenticator(username: string): Promise<PublicKeyCredential> {
  const userId = randomBytes(16)
  const opts: PublicKeyCredentialCreationOptions = {
    challenge: challenge(),
    rp: { id: rpId(), name: RP_NAME },
    user: {
      id: u8ToArrayBuffer(userId),
      name: username,
      displayName: username,
    },
    pubKeyCredParams: defaultPubKeyParams,
    timeout: 120_000,
    attestation: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'cross-platform',
      residentKey: 'preferred',
      userVerification: 'required',
    },
  }

  const c = await navigator.credentials.create({ publicKey: opts })
  if (!c) throw new Error('Registration cancelled.')
  return c as PublicKeyCredential
}

/** Registration: discoverable credential (resident key) — enables usernameless sign-in. */
export async function registerDiscoverableCredential(
  username: string,
  attachment: 'platform' | 'cross-platform' | undefined
): Promise<PublicKeyCredential> {
  const userId = randomBytes(16)
  const sel: AuthenticatorSelectionCriteria = {
    residentKey: 'required',
    userVerification: 'required',
  }
  if (attachment) sel.authenticatorAttachment = attachment

  const opts: PublicKeyCredentialCreationOptions = {
    challenge: challenge(),
    rp: { id: rpId(), name: RP_NAME },
    user: {
      id: u8ToArrayBuffer(userId),
      name: username,
      displayName: username,
    },
    pubKeyCredParams: defaultPubKeyParams,
    timeout: 120_000,
    attestation: 'none',
    authenticatorSelection: sel,
    extensions: { credProps: true },
  }

  const c = await navigator.credentials.create({ publicKey: opts })
  if (!c) throw new Error('Registration cancelled.')
  return c as PublicKeyCredential
}

/** Authentication: classic allowCredentials list (sign in as a known user). */
export async function authenticateWithAllowCredentials(rawIdB64: string): Promise<PublicKeyCredential> {
  const id = base64urlToBuffer(rawIdB64)
  const opts: PublicKeyCredentialRequestOptions = {
    challenge: challenge(),
    rpId: rpId(),
    allowCredentials: [{ type: 'public-key', id }],
    userVerification: 'required',
    timeout: 120_000,
  }
  const c = await navigator.credentials.get({ publicKey: opts })
  if (!c) throw new Error('Authentication cancelled.')
  return c as PublicKeyCredential
}

/** Authentication: discoverable / usernameless — browser shows passkey picker when credentials exist. */
export async function authenticateDiscoverable(): Promise<PublicKeyCredential> {
  const opts: PublicKeyCredentialRequestOptions = {
    challenge: challenge(),
    rpId: rpId(),
    userVerification: 'required',
    timeout: 120_000,
  }
  const c = await navigator.credentials.get({ publicKey: opts })
  if (!c) throw new Error('Authentication cancelled.')
  return c as PublicKeyCredential
}

/** Authentication: conditional UI (autofill integration). Pair with username field autocomplete="username webauthn". */
export async function authenticateConditional(
  signal: AbortSignal
): Promise<PublicKeyCredential | null> {
  const opts: PublicKeyCredentialRequestOptions = {
    challenge: challenge(),
    rpId: rpId(),
    userVerification: 'required',
    timeout: 120_000,
  }
  const c = await navigator.credentials.get({
    mediation: 'conditional',
    publicKey: opts,
    signal,
  })
  return c as PublicKeyCredential | null
}
