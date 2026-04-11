/** Browser / platform capability probes for WebAuthn UX. */

export function webauthnAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential
}

export async function conditionalMediationAvailable(): Promise<boolean> {
  try {
    const fn = PublicKeyCredential.isConditionalMediationAvailable
    if (typeof fn !== 'function') return false
    return await fn.call(PublicKeyCredential)
  } catch {
    return false
  }
}

export async function platformAuthenticatorAvailable(): Promise<boolean> {
  try {
    if (!PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) return false
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}
