import { base64urlToBuffer, randomBytes } from './base64url'

export type ExcludeCredRow = {
  idBase64Url: string
  /** subset of AuthenticatorTransport */
  usb: boolean
  nfc: boolean
  ble: boolean
  internal: boolean
}

export type RegisterDebuggerState = {
  rpId: string
  rpName: string
  userName: string
  userDisplayName: string
  userId: Uint8Array
  challenge: Uint8Array
  pubKeyCredParams: { alg: number }[]
  timeout: number
  excludeCredentials: ExcludeCredRow[]
  authenticatorAttachment: '' | 'platform' | 'cross-platform'
  residentKey: ResidentKeyRequirement
  userVerification: UserVerificationRequirement
  attestation: AttestationConveyancePreference
  extCredProps: boolean
  extMinPinLength: boolean
  extUvm: boolean
  extCredentialProtectionPolicy: '' | 'userVerificationOptional' | 'userVerificationOptionalWithCredentialIDList' | 'userVerificationRequired'
  extEnforceCredentialProtectionPolicy: boolean
}

export function defaultRegisterDebuggerState(): RegisterDebuggerState {
  return {
    rpId: typeof window !== 'undefined' ? window.location.hostname : 'localhost',
    rpName: 'WebAuthn debugger (local)',
    userName: '',
    userDisplayName: '',
    userId: randomBytes(16),
    challenge: randomBytes(32),
    pubKeyCredParams: [{ alg: -7 }, { alg: -257 }],
    timeout: 120_000,
    excludeCredentials: [],
    authenticatorAttachment: '',
    residentKey: 'preferred',
    userVerification: 'preferred',
    attestation: 'none',
    extCredProps: false,
    extMinPinLength: false,
    extUvm: false,
    extCredentialProtectionPolicy: '',
    extEnforceCredentialProtectionPolicy: false,
  }
}

function rowTransports(row: ExcludeCredRow): AuthenticatorTransport[] | undefined {
  const t: AuthenticatorTransport[] = []
  if (row.usb) t.push('usb')
  if (row.nfc) t.push('nfc')
  if (row.ble) t.push('ble')
  if (row.internal) t.push('internal')
  return t.length ? t : undefined
}

export function buildPublicKeyCredentialCreationOptions(
  s: RegisterDebuggerState,
  hostname: string
): PublicKeyCredentialCreationOptions {
  const rpIdVal = s.rpId.trim() || hostname

  const excludeCredentials: PublicKeyCredentialDescriptor[] = []
  for (const row of s.excludeCredentials) {
    const idStr = row.idBase64Url.trim()
    if (!idStr) continue
    const desc: PublicKeyCredentialDescriptor = {
      type: 'public-key',
      id: base64urlToBuffer(idStr),
    }
    const tr = rowTransports(row)
    if (tr) desc.transports = tr
    excludeCredentials.push(desc)
  }

  const authenticatorSelection: AuthenticatorSelectionCriteria = {
    userVerification: s.userVerification,
    residentKey: s.residentKey,
  }
  if (s.authenticatorAttachment) {
    authenticatorSelection.authenticatorAttachment = s.authenticatorAttachment
  }

  const ext: Record<string, string | boolean> = {}
  if (s.extCredProps) ext.credProps = true
  if (s.extMinPinLength) ext.minPinLength = true
  if (s.extUvm) ext.uvm = true
  if (s.extCredentialProtectionPolicy) {
    ext.credentialProtectionPolicy = s.extCredentialProtectionPolicy
  }
  if (s.extEnforceCredentialProtectionPolicy) {
    ext.enforceCredentialProtectionPolicy = true
  }
  const extensions = ext as unknown as AuthenticationExtensionsClientInputs

  const opts: PublicKeyCredentialCreationOptions = {
    challenge: s.challenge.buffer.slice(
      s.challenge.byteOffset,
      s.challenge.byteOffset + s.challenge.byteLength
    ) as ArrayBuffer,
    rp: {
      id: rpIdVal,
      name: s.rpName.trim() || 'WebAuthn debugger (local)',
    },
    user: {
      id: s.userId.buffer.slice(
        s.userId.byteOffset,
        s.userId.byteOffset + s.userId.byteLength
      ) as ArrayBuffer,
      name: s.userName.trim(),
      displayName: (s.userDisplayName.trim() || s.userName).trim(),
    },
    pubKeyCredParams: s.pubKeyCredParams.map((p) => ({ type: 'public-key' as const, alg: p.alg })),
    timeout: s.timeout,
    attestation: s.attestation,
    authenticatorSelection,
  }

  if (excludeCredentials.length) opts.excludeCredentials = excludeCredentials
  if (Object.keys(ext).length) opts.extensions = extensions

  return opts
}
