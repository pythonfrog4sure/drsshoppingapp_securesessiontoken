import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { webauthn } from '@transmitsecurity/platform-web-sdk'
import { conditionalMediationAvailable, platformAuthenticatorAvailable, webauthnAvailable } from './lib/capabilities'
import {
  addCredential,
  addMosaicRecord,
  clearAll,
  loadAll,
  removeCredential,
  type StoredRecord,
} from './lib/credentialStore'
import { bufferToBase64url } from './lib/buffers'
import { initTransmitMosaicSdk, TRANSMIT_PASSKEY_CLIENT_ID } from './lib/initTransmitMosaic'
import {
  mosaicAuthenticateModal,
  mosaicIsAutofillSupported,
  mosaicRegister,
} from './lib/mosaicWebauthnFlows'
import {
  authenticateConditional,
  authenticateDiscoverable,
  authenticateWithAllowCredentials,
  registerCrossPlatformAuthenticator,
  registerDiscoverableCredential,
  registerPlatformAuthenticator,
} from './lib/webauthnFlows'

type Tab =
  | 'home'
  | 'mosaic-register'
  | 'mosaic-signin'
  | 'mosaic-autofill'
  | 'reg-platform'
  | 'reg-cross'
  | 'reg-disc'
  | 'auth-allow'
  | 'auth-disc'
  | 'auth-conditional'
  | 'storage'

const TAB_LABEL: Record<Tab, string> = {
  home: 'Overview',
  'mosaic-register': 'Mosaic — register',
  'mosaic-signin': 'Mosaic — sign in',
  'mosaic-autofill': 'Mosaic — autofill',
  'reg-platform': 'Raw — this device',
  'reg-cross': 'Raw — cross-device',
  'reg-disc': 'Raw — discoverable',
  'auth-allow': 'Raw — allowCredentials',
  'auth-disc': 'Raw — discoverable',
  'auth-conditional': 'Raw — conditional UI',
  storage: 'Stored credentials',
}

export function WebAuthnUseCasesLab({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('home')
  const [records, setRecords] = useState<StoredRecord[]>(() => loadAll())
  const [condAvail, setCondAvail] = useState<boolean | null>(null)
  const [platAvail, setPlatAvail] = useState<boolean | null>(null)
  const [mosaicInit, setMosaicInit] = useState<'idle' | 'ok' | 'err'>('idle')

  useEffect(() => {
    void initTransmitMosaicSdk()
      .then(() => setMosaicInit('ok'))
      .catch(() => setMosaicInit('err'))
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [c, p] = await Promise.all([conditionalMediationAvailable(), platformAuthenticatorAvailable()])
      if (!cancelled) {
        setCondAvail(c)
        setPlatAvail(p)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const refreshStore = useCallback(() => setRecords(loadAll()), [])

  const supported = useMemo(() => webauthnAvailable(), [])

  const shell = !supported ? (
    <div className="wucl-main">
      <h2>WebAuthn not available</h2>
      <p className="doc">Use a modern browser with Web Authentication enabled.</p>
    </div>
  ) : (
    <div className="wcl-shell">
      <nav className="wcl-nav">
        <h1>WebAuthn use cases</h1>
        <p className="nav-sub">
          <strong>Mosaic</strong> uses the same Transmit client as the Passkey shop (
          <code className="inline-code">{TRANSMIT_PASSKEY_CLIENT_ID}</code>). <strong>Raw</strong> demos use
          in-page challenges only (no Transmit). See{' '}
          <a href="https://www.w3.org/TR/webauthn-3/" target="_blank" rel="noreferrer">
            WebAuthn
          </a>{' '}
          and{' '}
          <a href="https://passkeys.dev/" target="_blank" rel="noreferrer">
            passkeys.dev
          </a>
          .
        </p>
        {(Object.keys(TAB_LABEL) as Tab[]).map((k) => (
          <button key={k} type="button" className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
            {TAB_LABEL[k]}
          </button>
        ))}
      </nav>
      <div className="wucl-main">
        {tab === 'home' && (
          <Home
            condAvail={condAvail}
            platAvail={platAvail}
            recordCount={records.length}
            mosaicInit={mosaicInit}
          />
        )}
        {tab === 'mosaic-register' && (
          <MosaicRegister
            onDone={() => {
              refreshStore()
              setTab('storage')
            }}
          />
        )}
        {tab === 'mosaic-signin' && (
          <MosaicSignIn
            onDone={() => {
              refreshStore()
              setTab('storage')
            }}
          />
        )}
        {tab === 'mosaic-autofill' && <MosaicAutofill />}
        {tab === 'reg-platform' && (
          <RegisterPlatform
            onDone={() => {
              refreshStore()
              setTab('storage')
            }}
          />
        )}
        {tab === 'reg-cross' && (
          <RegisterCross
            onDone={() => {
              refreshStore()
              setTab('storage')
            }}
          />
        )}
        {tab === 'reg-disc' && (
          <RegisterDiscoverable
            onDone={() => {
              refreshStore()
              setTab('storage')
            }}
          />
        )}
        {tab === 'auth-allow' && <AuthAllow records={records} />}
        {tab === 'auth-disc' && <AuthDiscoverable />}
        {tab === 'auth-conditional' && <AuthConditional condAvail={condAvail} />}
        {tab === 'storage' && (
          <StoragePanel records={records} onChange={refreshStore} onClear={() => { clearAll(); refreshStore() }} />
        )}
      </div>
    </div>
  )

  return (
    <div className="webauthn-use-cases-lab">
      <div className="webauthn-use-cases-lab-back">
        <button type="button" className="webauthn-use-cases-lab-back-btn" onClick={onBack}>
          ← Platform Hub
        </button>
      </div>
      {shell}
    </div>
  )
}

function Home({
  condAvail,
  platAvail,
  recordCount,
  mosaicInit,
}: {
  condAvail: boolean | null
  platAvail: boolean | null
  recordCount: number
  mosaicInit: 'idle' | 'ok' | 'err'
}) {
  return (
    <>
      <h2>Overview</h2>
      <p className="doc">
        The <strong>Mosaic</strong> tabs call Transmit&apos;s WebAuthn APIs with the same <code>clientId</code>, IDO{' '}
        <code>applicationId</code>, and <code>serverPath</code> values as{' '}
        <code className="inline-code">shopping-app-passkey</code> — so registration and sign-in hit the same backend
        configuration as the Passkey shopping app. <strong>Raw</strong> tabs exercise{' '}
        <code>navigator.credentials</code> with challenges generated in the page (offline demo, separate from Mosaic).
      </p>
      <div className="panel">
        <h3>Transmit Mosaic SDK</h3>
        <p>
          <span className={`badge ${mosaicInit === 'ok' ? 'yes' : mosaicInit === 'err' ? 'no' : ''}`}>
            {mosaicInit === 'idle' ? '…' : mosaicInit === 'ok' ? 'Ready' : 'Init failed'}
          </span>
          {mosaicInit === 'idle' ? ' Initializing…' : mosaicInit === 'ok' ? ' SDK initialized for this origin.' : ' Check network and console.'}
        </p>
      </div>
      <div className="panel">
        <h3>Browser checks (raw demos)</h3>
        <p>
          <span className={`badge ${platAvail ? 'yes' : 'no'}`}>Platform UVRA</span>
          {platAvail === null ? '…' : platAvail ? 'Available' : 'Not available'}
        </p>
        <p style={{ marginTop: '0.5rem' }}>
          <span className={`badge ${condAvail ? 'yes' : 'no'}`}>Conditional UI</span>
          {condAvail === null ? '…' : condAvail ? 'Available' : 'Not available'}
        </p>
        <p className="small" style={{ marginTop: '0.75rem' }}>
          Stored rows in this origin: <strong>{recordCount}</strong>
        </p>
      </div>
      <ul className="flow-list">
        <li>
          <strong>Mosaic register / sign in / autofill</strong> — <code>webauthn.register</code>,{' '}
          <code>webauthn.authenticate.modal</code>, <code>webauthn.authenticate.autofill.activate</code>
        </li>
        <li>
          <strong>Raw — this device</strong> — <code>authenticatorAttachment: &apos;platform&apos;</code>
        </li>
        <li>
          <strong>Raw — cross-device</strong> — <code>authenticatorAttachment: &apos;cross-platform&apos;</code>
        </li>
        <li>
          <strong>Raw — discoverable</strong> — <code>residentKey: &apos;required&apos;</code>
        </li>
        <li>
          <strong>Raw — conditional</strong> — <code>mediation: &apos;conditional&apos;</code>
        </li>
      </ul>
    </>
  )
}

function MosaicRegister({ onDone }: { onDone: () => void }) {
  const [username, setUsername] = useState('mosaic.user')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async () => {
    const u = username.trim() || 'user'
    setErr(null)
    setMsg(null)
    setBusy(true)
    try {
      const encoded = await mosaicRegister(u)
      addMosaicRecord(u, 'mosaic-register', encoded)
      setMsg(`Registered. Encoded result (prefix): ${encoded.slice(0, 48)}…`)
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h2>Mosaic — register</h2>
      <p className="doc">
        Uses <code>webauthn.register</code> against Transmit with the Passkey shop credentials. Completes a passkey
        enrollment for your Transmit app.
      </p>
      <div className="panel">
        <label htmlFor="wcl-mr-u">Username</label>
        <input
          id="wcl-mr-u"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={busy}
          autoComplete="username"
        />
        <div className="row">
          <button type="button" className="primary" disabled={busy} onClick={() => void run()}>
            Register with Mosaic
          </button>
        </div>
        {msg && <div className="msg ok">{msg}</div>}
        {err && <div className="msg err">{err}</div>}
      </div>
    </>
  )
}

function MosaicSignIn({ onDone }: { onDone: () => void }) {
  const [username, setUsername] = useState('mosaic.user')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async () => {
    const u = username.trim() || 'user'
    setErr(null)
    setMsg(null)
    setBusy(true)
    try {
      const encoded = await mosaicAuthenticateModal(u)
      addMosaicRecord(u, 'mosaic-signin', encoded)
      setMsg(`Signed in. Encoded result (prefix): ${encoded.slice(0, 48)}…`)
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h2>Mosaic — sign in (modal)</h2>
      <p className="doc">
        Uses <code>webauthn.authenticate.modal</code> with the username you registered in Mosaic (or the Passkey shop for
        the same RP).
      </p>
      <div className="panel">
        <label htmlFor="wcl-ms-u">Username</label>
        <input
          id="wcl-ms-u"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={busy}
          autoComplete="username"
        />
        <div className="row">
          <button type="button" className="primary" disabled={busy} onClick={() => void run()}>
            Sign in with Mosaic
          </button>
        </div>
        {msg && <div className="msg ok">{msg}</div>}
        {err && <div className="msg err">{err}</div>}
      </div>
    </>
  )
}

function MosaicAutofill() {
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [skipped, setSkipped] = useState<string | null>(null)
  const activeRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        await initTransmitMosaicSdk()
        const ok = await mosaicIsAutofillSupported()
        if (cancelled) return
        if (!ok) {
          setSkipped('Autofill is not supported in this browser.')
          return
        }
        activeRef.current = true
        webauthn.authenticate.autofill.activate({
          handlers: {
            onReady: async () => {
              setErr(null)
            },
            onSuccess: async (encoded: string) => {
              setMsg(`Autofill sign-in succeeded. Encoded result (prefix): ${encoded.slice(0, 48)}…`)
            },
            onError: async (e: { errorCode?: string; error_message?: string; message?: string }) => {
              if (e?.errorCode === 'autofill_authentication_aborted') return
              setErr(e?.error_message || e?.message || 'Autofill authentication failed')
            },
          },
        })
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      cancelled = true
      if (activeRef.current) {
        try {
          webauthn.authenticate.autofill.abort()
        } catch {
          /* ignore */
        }
        activeRef.current = false
      }
    }
  }, [])

  return (
    <>
      <h2>Mosaic — passkey autofill</h2>
      <p className="doc">
        Calls <code>webauthn.authenticate.autofill.activate</code> like the Passkey shop. Focus the username field and use
        the browser&apos;s passkey picker when available.
      </p>
      {skipped && <div className="msg err">{skipped}</div>}
      <div className="panel">
        <label htmlFor="wcl-ma-u">Username</label>
        <input
          id="wcl-ma-u"
          type="text"
          name="username"
          autoComplete="username webauthn"
          placeholder="Focus here for passkey autofill"
        />
        <p className="small" style={{ marginTop: '0.75rem' }}>
          Autofill is activated when this tab mounts and aborted when you leave it.
        </p>
        {msg && <div className="msg ok">{msg}</div>}
        {err && <div className="msg err">{err}</div>}
      </div>
    </>
  )
}

function RegisterPlatform({ onDone }: { onDone: () => void }) {
  const [username, setUsername] = useState('local.user')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setErr(null)
    setMsg(null)
    setBusy(true)
    try {
      const cred = await registerPlatformAuthenticator(username.trim() || 'user')
      addCredential(cred, username.trim() || 'user', 'platform', 'platform authenticator')
      setMsg(`Registered. rawId: ${bufferToBase64url(cred.rawId).slice(0, 24)}…`)
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h2>Raw — register (platform)</h2>
      <p className="doc">
        Targets the <strong>platform</strong> authenticator (Touch ID, Face ID, Windows Hello, device PIN where
        applicable). Uses <code>userVerification: &apos;required&apos;</code>. Does not use Transmit.
      </p>
      <div className="panel">
        <label htmlFor="wcl-u1">Username</label>
        <input
          id="wcl-u1"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={busy}
          autoComplete="username"
        />
        <div className="row">
          <button type="button" className="primary" disabled={busy} onClick={() => void run()}>
            Register with platform authenticator
          </button>
        </div>
        {msg && <div className="msg ok">{msg}</div>}
        {err && <div className="msg err">{err}</div>}
      </div>
    </>
  )
}

function RegisterCross({ onDone }: { onDone: () => void }) {
  const [username, setUsername] = useState('roaming.user')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setErr(null)
    setMsg(null)
    setBusy(true)
    try {
      const cred = await registerCrossPlatformAuthenticator(username.trim() || 'user')
      addCredential(cred, username.trim() || 'user', 'cross-platform', 'cross-platform / roaming')
      setMsg(`Registered. rawId: ${bufferToBase64url(cred.rawId).slice(0, 24)}…`)
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h2>Raw — register (cross-platform)</h2>
      <p className="doc">
        Requests a <strong>roaming</strong> authenticator (USB / NFC / BLE security keys). Does not use Transmit.
      </p>
      <div className="panel">
        <label htmlFor="wcl-u2">Username</label>
        <input
          id="wcl-u2"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={busy}
          autoComplete="username"
        />
        <div className="row">
          <button type="button" className="primary" disabled={busy} onClick={() => void run()}>
            Register with cross-platform authenticator
          </button>
        </div>
        {msg && <div className="msg ok">{msg}</div>}
        {err && <div className="msg err">{err}</div>}
      </div>
    </>
  )
}

function RegisterDiscoverable({ onDone }: { onDone: () => void }) {
  const [username, setUsername] = useState('resident.user')
  const [attach, setAttach] = useState<'any' | 'platform' | 'cross-platform'>('any')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setErr(null)
    setMsg(null)
    setBusy(true)
    try {
      const a = attach === 'any' ? undefined : attach
      const cred = await registerDiscoverableCredential(username.trim() || 'user', a)
      addCredential(cred, username.trim() || 'user', 'discoverable', `resident / ${attach}`)
      setMsg(`Discoverable credential created. Use “Raw — discoverable” sign-in without picking an id.`)
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h2>Raw — discoverable (resident key)</h2>
      <p className="doc">
        Sets <code>residentKey: &apos;required&apos;</code> for usernameless authentication. Does not use Transmit.
      </p>
      <div className="panel">
        <label htmlFor="wcl-u3">Username</label>
        <input
          id="wcl-u3"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={busy}
          autoComplete="username"
        />
        <label htmlFor="wcl-att" style={{ marginTop: '0.75rem' }}>
          Authenticator attachment
        </label>
        <select id="wcl-att" value={attach} onChange={(e) => setAttach(e.target.value as typeof attach)} disabled={busy}>
          <option value="any">Any (browser chooses)</option>
          <option value="platform">Platform (this device)</option>
          <option value="cross-platform">Cross-platform (roaming)</option>
        </select>
        <div className="row">
          <button type="button" className="primary" disabled={busy} onClick={() => void run()}>
            Register discoverable credential
          </button>
        </div>
        {msg && <div className="msg ok">{msg}</div>}
        {err && <div className="msg err">{err}</div>}
      </div>
    </>
  )
}

function AuthAllow({ records }: { records: StoredRecord[] }) {
  const rawRecords = useMemo(() => records.filter((r) => r.rawIdB64.length > 0), [records])
  const [id, setId] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (rawRecords.length && !id) setId(rawRecords[rawRecords.length - 1]!.id)
  }, [rawRecords, id])

  const selected = rawRecords.find((r) => r.id === id)
  const run = async () => {
    if (!selected) {
      setErr('Pick a stored raw credential or register under Raw first.')
      return
    }
    setErr(null)
    setMsg(null)
    setBusy(true)
    try {
      await authenticateWithAllowCredentials(selected.rawIdB64)
      setMsg('Authentication succeeded (client-side demo).')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h2>Raw — sign in (allowCredentials)</h2>
      <p className="doc">
        Uses credentials saved by the <strong>Raw</strong> registration tabs (localStorage). Mosaic rows have no{' '}
        <code>rawId</code> here — use Mosaic sign-in instead.
      </p>
      <div className="panel">
        <label htmlFor="wcl-pick">Stored credential</label>
        <select id="wcl-pick" value={id} onChange={(e) => setId(e.target.value)} disabled={busy || !rawRecords.length}>
          {!rawRecords.length ? <option value="">(none — register under Raw first)</option> : null}
          {rawRecords.map((r) => (
            <option key={r.id} value={r.id}>
              {r.username} — {r.flow} — {r.rawIdB64.slice(0, 12)}…
            </option>
          ))}
        </select>
        <div className="row">
          <button type="button" className="primary" disabled={busy || !selected} onClick={() => void run()}>
            Sign in
          </button>
        </div>
        {msg && <div className="msg ok">{msg}</div>}
        {err && <div className="msg err">{err}</div>}
      </div>
    </>
  )
}

function AuthDiscoverable() {
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const run = async () => {
    setErr(null)
    setMsg(null)
    setBusy(true)
    try {
      await authenticateDiscoverable()
      setMsg('Discoverable authentication succeeded. Browser may show a passkey picker.')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h2>Raw — sign in (discoverable)</h2>
      <p className="doc">
        Omits <code>allowCredentials</code>. Requires a <strong>resident</strong> credential from Raw — discoverable
        registration.
      </p>
      <div className="panel">
        <div className="row">
          <button type="button" className="primary" disabled={busy} onClick={() => void run()}>
            Sign in with discoverable credential
          </button>
        </div>
        {msg && <div className="msg ok">{msg}</div>}
        {err && <div className="msg err">{err}</div>}
      </div>
    </>
  )
}

function AuthConditional({ condAvail }: { condAvail: boolean | null }) {
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (condAvail !== true) return
    const ac = new AbortController()
    void authenticateConditional(ac.signal)
      .then((c) => {
        if (c) setMsg('Conditional authentication completed.')
      })
      .catch((e: unknown) => {
        if (ac.signal.aborted) return
        setErr(e instanceof Error ? e.message : String(e))
      })
    return () => {
      ac.abort()
    }
  }, [condAvail])

  return (
    <>
      <h2>Raw — conditional UI (autofill)</h2>
      <p className="doc">
        Browser <code>mediation: &apos;conditional&apos;</code> — not the Transmit Mosaic autofill tab.
      </p>
      {condAvail === false && (
        <div className="msg err">Conditional mediation is not available in this browser context.</div>
      )}
      <div className="panel">
        <label htmlFor="wcl-cond-user">Username (autofill integration)</label>
        <input
          id="wcl-cond-user"
          type="text"
          name="username"
          autoComplete="username webauthn"
          placeholder="Focus here for passkey autofill"
        />
        <p className="small" style={{ marginTop: '0.75rem' }}>
          A conditional request starts when supported. Aborted on leaving this screen.
        </p>
        {msg && <div className="msg ok">{msg}</div>}
        {err && <div className="msg err">{err}</div>}
      </div>
    </>
  )
}

function StoragePanel({
  records,
  onChange,
  onClear,
}: {
  records: StoredRecord[]
  onChange: () => void
  onClear: () => void
}) {
  return (
    <>
      <h2>Stored credentials</h2>
      <p className="doc">Saved in localStorage for this origin: Mosaic rows (encoded prefix) and Raw rows (rawId).</p>
      <div className="panel">
        {records.length === 0 ? (
          <p className="small">No rows yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Flow</th>
                <th>Credential</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>{r.username}</td>
                  <td>{r.flow}</td>
                  <td className="small">
                    {r.rawIdB64 ? `${r.rawIdB64.slice(0, 18)}…` : r.mosaicEncodedPrefix ? `${r.mosaicEncodedPrefix.slice(0, 24)}…` : '—'}
                  </td>
                  <td>
                    <button type="button" className="secondary" onClick={() => { removeCredential(r.id); onChange() }}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="row" style={{ marginTop: '1rem' }}>
          <button type="button" className="secondary" disabled={!records.length} onClick={onClear}>
            Clear all
          </button>
        </div>
      </div>
    </>
  )
}
