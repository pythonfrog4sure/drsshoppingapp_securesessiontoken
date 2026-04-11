import { bufferToBase64url } from './buffers'

const KEY = 'webauthn-use-cases-lab:portal:v1'

export type FlowKind =
  | 'platform'
  | 'cross-platform'
  | 'discoverable'
  | 'mosaic-register'
  | 'mosaic-signin'

export type StoredRecord = {
  id: string
  username: string
  /** Set for raw WebAuthn demos; empty for Mosaic-only rows */
  rawIdB64: string
  flow: FlowKind
  createdAt: number
  note?: string
  /** Encoded WebAuthn result prefix (Mosaic SDK) */
  mosaicEncodedPrefix?: string
}

export function loadAll(): StoredRecord[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveAll(records: StoredRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(records))
}

export function addCredential(
  cred: PublicKeyCredential,
  username: string,
  flow: FlowKind,
  note?: string
): StoredRecord {
  const records = loadAll()
  const rec: StoredRecord = {
    id: crypto.randomUUID(),
    username,
    rawIdB64: bufferToBase64url(cred.rawId),
    flow,
    createdAt: Date.now(),
    note,
  }
  records.push(rec)
  saveAll(records)
  return rec
}

export function addMosaicRecord(
  username: string,
  flow: 'mosaic-register' | 'mosaic-signin',
  encodedResult: string
): StoredRecord {
  const records = loadAll()
  const rec: StoredRecord = {
    id: crypto.randomUUID(),
    username,
    rawIdB64: '',
    flow,
    createdAt: Date.now(),
    note: 'Transmit Mosaic (same app as Passkey shop)',
    mosaicEncodedPrefix: encodedResult.slice(0, 80),
  }
  records.push(rec)
  saveAll(records)
  return rec
}

export function removeCredential(id: string) {
  saveAll(loadAll().filter((r) => r.id !== id))
}

export function clearAll() {
  localStorage.removeItem(KEY)
}
