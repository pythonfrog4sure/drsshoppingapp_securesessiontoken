/** COSE algorithm identifiers used in pubKeyCredParams */
export const COSE_ALG_CHOICES: { label: string; value: number }[] = [
  { label: 'RS256 (RSASSA-PKCS1-v1_5 + SHA-256)', value: -257 },
  { label: 'ES256 (ECDSA P-256 + SHA-256)', value: -7 },
  { label: 'ES384 (ECDSA P-384 + SHA-384)', value: -35 },
  { label: 'ES512 (ECDSA P-521 + SHA-512)', value: -36 },
  { label: 'EdDSA (Ed25519)', value: -8 },
]
