/**
 * Client-only WebAuthn demo (random challenges). Not a production pattern —
 * mirrors tutorial sites like https://www.webauthn.me/ for local learning.
 */
import { bufferToBase64url, randomBytes } from './base64url'

export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential
}

export function rpId(): string {
  return window.location.hostname
}

export type RegistrationResult = {
  rawIdB64: string
  publicKeyB64: string | null
  credential: PublicKeyCredential
}

export async function registerWithPublicKeyOptions(
  publicKey: PublicKeyCredentialCreationOptions
): Promise<RegistrationResult> {
  const cred = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null
  if (!cred) throw new Error('Registration was cancelled or failed.')

  const response = cred.response as AuthenticatorAttestationResponse
  let publicKeyB64: string | null = null
  if (typeof response.getPublicKey === 'function') {
    const pk = response.getPublicKey()
    if (pk) publicKeyB64 = bufferToBase64url(pk)
  }

  return {
    rawIdB64: bufferToBase64url(cred.rawId),
    publicKeyB64,
    credential: cred,
  }
}

/** Simple preset registration (used by tests / fallbacks). */
export async function registerCredential(username: string): Promise<RegistrationResult> {
  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: randomBytes(32),
    rp: { name: 'WebAuthn tutorial (local)', id: rpId() },
    user: {
      id: randomBytes(16),
      name: username,
      displayName: username,
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },
      { alg: -257, type: 'public-key' },
    ],
    timeout: 120_000,
    attestation: 'none',
    authenticatorSelection: {
      userVerification: 'preferred',
      residentKey: 'preferred',
    },
  }
  return registerWithPublicKeyOptions(publicKey)
}

export async function authenticateWithCredential(credentialId: ArrayBuffer): Promise<PublicKeyCredential> {
  const challenge = randomBytes(32)
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: rpId(),
      allowCredentials: [{ type: 'public-key', id: credentialId }],
      userVerification: 'preferred',
      timeout: 120_000,
    },
  })) as PublicKeyCredential | null

  if (!assertion) throw new Error('Authentication was cancelled or failed.')
  return assertion
}
