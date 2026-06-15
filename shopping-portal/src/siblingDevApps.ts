/** Sibling Vite apps started by `npm run start:all` (shopping-portal hub stays on 3000). */
/** Order matches `npm run start:all` / `start:full` (DRS pair first, then IDO / passkeys, then webauthn). */
export const SIBLING_DEV_APPS = [
  { id: 'drs', port: 3001, label: 'Shop with DRS' },
  { id: 'drs-secure', port: 3005, label: 'DRS (secure session token)' },
  { id: 'ido', port: 3002, label: 'Shop with IDO' },
  { id: 'passkey', port: 3003, label: 'Shop with Passkey' },
  { id: 'passkey-only', port: 3004, label: 'Shop with Passkey Only' },
  { id: 'iframe-passkey', port: 3006, label: 'iframe with Passkeys' },
  { id: 'webauthn', port: 3010, label: 'WebAuthn clone' },
] as const

export type SiblingDevAppId = (typeof SIBLING_DEV_APPS)[number]['id']

export type SiblingAppSnapshot = {
  id: SiblingDevAppId
  port: number
  label: string
  listening: boolean
}
