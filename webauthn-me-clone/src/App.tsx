import { useCallback, useEffect, useMemo, useState } from 'react'
import { RegisterDebuggerPanel } from './components/RegisterDebuggerPanel'
import {
  authenticateWithCredential,
  isWebAuthnSupported,
  registerWithPublicKeyOptions,
} from './lib/webauthnDemo'
import { base64urlToBuffer } from './lib/base64url'

const STORAGE_KEY = 'webauthn-me-clone:v1'

type Stored = {
  username: string
  rawIdB64: string
}

function loadStored(): Stored | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Stored
  } catch {
    return null
  }
}

function saveStored(data: Stored) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function clearStored() {
  localStorage.removeItem(STORAGE_KEY)
}

export default function App() {
  const supported = useMemo(() => isWebAuthnSupported(), [])
  const [step, setStep] = useState(1)
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [rawIdB64, setRawIdB64] = useState('')
  const [publicKeyB64, setPublicKeyB64] = useState<string | null>(null)

  useEffect(() => {
    const s = loadStored()
    if (s) {
      setUsername(s.username)
      setRawIdB64(s.rawIdB64)
    }
  }, [])

  const resetDemo = useCallback(() => {
    clearStored()
    setStep(1)
    setUsername('')
    setRawIdB64('')
    setPublicKeyB64(null)
    setError(null)
  }, [])

  const handleRegisterFromPanel = async (publicKey: PublicKeyCredentialCreationOptions) => {
    setError(null)
    setBusy(true)
    setStep(2)
    try {
      const result = await registerWithPublicKeyOptions(publicKey)
      setRawIdB64(result.rawIdB64)
      setPublicKeyB64(result.publicKeyB64)
      const uname = typeof publicKey.user.name === 'string' ? publicKey.user.name : String(publicKey.user.name)
      saveStored({ username: uname, rawIdB64: result.rawIdB64 })
      setUsername(uname)
      setStep(3)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      setStep(1)
    } finally {
      setBusy(false)
    }
  }

  const onLogin = async () => {
    const stored = loadStored()
    if (!stored?.rawIdB64) {
      setError('No credential in storage. Register first.')
      return
    }
    setError(null)
    setBusy(true)
    setStep(5)
    try {
      const id = base64urlToBuffer(stored.rawIdB64)
      await authenticateWithCredential(id)
      setStep(6)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      setStep(4)
    } finally {
      setBusy(false)
    }
  }

  const allowDisplay = rawIdB64
    ? `allowCredentials: [
  {
    type: 'public-key',
    id: "${rawIdB64}"
  }
],`
    : ''

  if (!supported) {
    return (
      <div className="app">
        <div className="unsupported">
          <h1>Web Authentication</h1>
          <p>
            This browser does not support the Web Authentication API, or public-key credentials are
            unavailable.
          </p>
          <p className="hint">Try a current Chrome, Edge, Firefox, or Safari build.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="hero">
        <h1>Web Authentication</h1>
        <p>
          Registration mirrors the options on the{' '}
          <a href="https://www.webauthn.me/debugger" target="_blank" rel="noreferrer">
            webauthn.me debugger
          </a>
          ; then continue the flow to authenticate.
        </p>
      </header>

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      {step === 1 && (
        <section className="step">
          <h2>
            <span className="step-num">1</span>
            Register (full options)
          </h2>
          <RegisterDebuggerPanel
            initialUserName={username}
            disabled={busy}
            onValidationError={setError}
            onRegister={handleRegisterFromPanel}
          />
          <div className="row" style={{ marginTop: '1rem' }}>
            {rawIdB64 ? (
              <button type="button" className="ghost" onClick={() => setStep(4)} disabled={busy}>
                Skip to login
              </button>
            ) : null}
            <button type="button" className="ghost" onClick={resetDemo} disabled={busy}>
              Reset demo
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="step">
          <h2>
            <span className="step-num">2</span>
            Touch your authenticator
          </h2>
          <p className="hint">Complete the prompt from your browser or device.</p>
        </section>
      )}

      {step === 3 && (
        <section className="step">
          <h2>
            <span className="step-num">3</span>
            Your new credential
          </h2>
          <p className="hint">
            The relying party stores the credential id and verifies attestations / assertions. For this
            demo, values are shown only in your browser.
          </p>
          <label>rawId (base64url)</label>
          <div className="code-block">{rawIdB64}</div>
          <label style={{ marginTop: '1rem' }}>Public key (COSE, if exposed)</label>
          <div className="code-block">{publicKeyB64 ?? 'Not exposed by this authenticator / browser.'}</div>
          <div className="row" style={{ marginTop: '1rem' }}>
            <button type="button" onClick={() => setStep(4)} disabled={busy}>
              Next
            </button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="step">
          <h2>
            <span className="step-num">4</span>
            Authenticate with your credential
          </h2>
          <p className="hint">
            A real server sends an authentication challenge and checks the signature. Here, only the
            browser talks to the authenticator.
          </p>
          <div className="code-block">{allowDisplay || 'Register first to see allowCredentials.'}</div>
          <div className="row">
            <button type="button" onClick={onLogin} disabled={busy || !rawIdB64}>
              Login
            </button>
            <button type="button" className="ghost" onClick={() => setStep(1)} disabled={busy}>
              Back
            </button>
          </div>
        </section>
      )}

      {step === 5 && (
        <section className="step">
          <h2>
            <span className="step-num">5</span>
            Touch your authenticator
          </h2>
          <p className="hint">Use the same factor you registered with.</p>
        </section>
      )}

      {step === 6 && (
        <section className="step">
          <h2>
            <span className="step-num">6</span>
            Login successful
          </h2>
          <div className="success-banner">Assertion verified in the browser (demo only).</div>
          <div className="row" style={{ marginTop: '1rem' }}>
            <button type="button" className="ghost" onClick={resetDemo}>
              Start over
            </button>
          </div>
        </section>
      )}

      <footer className="footer-note">
        Client-only demo: challenges are generated in the page, not by a server. Not affiliated with
        Auth0 / Okta or webauthn.me.
      </footer>
    </div>
  )
}
