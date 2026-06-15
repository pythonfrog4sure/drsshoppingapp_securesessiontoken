import { useEffect, useRef, useState } from 'react';
import { webauthn } from '@transmitsecurity/platform-web-sdk';
import { initDrs, reportUsernameAction, setAuthenticatedUser } from './drs';
import { initWebauthn, WEBAUTHN_CLIENT_ID, WEBAUTHN_SERVER_PATH } from './webauthnSdk';

// Direct WebAuthn integration per the quick-start guide:
// https://developer.transmitsecurity.com/guides/webauthn/quick_start_sdk
//
// This app drives the passkey ceremony entirely via the WebAuthn SDK — no IDO
// journey. Conditional UI (autofill) is OFF by default and only activates
// when the user explicitly toggles it on. The SDK itself is initialized on
// page load in App.tsx via initWebauthn().

interface LoginProps {
  onLogin: (username: string) => void;
}

function getSdkErrorMessage(err: any, fallback: string): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (err?.errorCode === 'username_already_registered') {
    return 'This username already has a registered passkey. Try Sign In instead.';
  }
  return err?.message || err?.errorMessage || fallback;
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [platformSupported, setPlatformSupported] = useState<boolean | null>(null);
  const [autofillSupported, setAutofillSupported] = useState(false);

  // Autofill (conditional UI) is OFF by default. The user must opt in via the
  // toggle in the UI before the SDK activates the conditional credential flow.
  const [autofillEnabled, setAutofillEnabled] = useState(false);
  const autofillActiveRef = useRef(false);
  /**
   * Resolver for the in-flight autofill abort. When abortAutofillIfActive() is
   * called, it installs a resolver here that the autofill onError callback
   * will invoke once the browser has processed the cancellation. This avoids
   * the "A request is already pending" InvalidStateError when starting a
   * register/modal ceremony immediately after toggling autofill off.
   */
  const autofillAbortResolverRef = useRef<(() => void) | null>(null);
  const loadingRef = useRef(false);
  const usernameRef = useRef('');

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  /**
   * Cancel any in-flight conditional UI request and wait until the browser has
   * actually finalized the cancellation. Without this wait, a subsequent
   * navigator.credentials.create()/get() can fail with
   * "InvalidStateError: A request is already pending".
   */
  const abortAutofillIfActive = async (): Promise<void> => {
    if (!autofillActiveRef.current) return;

    const aborted = new Promise<void>((resolve) => {
      autofillAbortResolverRef.current = resolve;
    });

    try {
      console.info('[Passkey] autofill → abort()');
      webauthn.authenticate.autofill.abort();
    } catch (err) {
      console.warn('Failed to abort autofill flow', err);
    }
    autofillActiveRef.current = false;

    // Wait for the autofill onError to fire (with the abort error code), or
    // a short fallback timeout if for some reason the callback doesn't fire.
    await Promise.race([
      aborted,
      new Promise<void>((resolve) => setTimeout(resolve, 250)),
    ]);
    autofillAbortResolverRef.current = null;
  };

  // Await the SDK initialization that App.tsx kicked off on page load.
  // initWebauthn() returns a cached promise so this never re-initializes.
  useEffect(() => {
    let cancelled = false;
    void initDrs();
    (async () => {
      try {
        const caps = await initWebauthn();
        if (cancelled) return;
        setPlatformSupported(caps.platformAuthenticatorSupported);
        setAutofillSupported(caps.autofillSupported);
        setSdkReady(true);
      } catch (err: unknown) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to initialize SDK';
        setError(message);
      }
    })();

    return () => {
      cancelled = true;
      void abortAutofillIfActive();
    };
  }, []);

  // Activate / deactivate the conditional UI autofill flow when the toggle
  // changes (and only when the SDK is ready, the device supports autofill,
  // and no ceremony is currently in flight).
  useEffect(() => {
    if (!sdkReady) return;
    if (!autofillSupported) return;

    if (!autofillEnabled || loading) {
      void abortAutofillIfActive();
      return;
    }

    if (autofillActiveRef.current) return;
    autofillActiveRef.current = true;

    console.info(
      '[Passkey] autofill → activate()',
      JSON.stringify({ clientId: WEBAUTHN_CLIENT_ID, serverPath: WEBAUTHN_SERVER_PATH }),
    );

    webauthn.authenticate.autofill.activate({
      handlers: {
        onReady: () => {
          setError(null);
        },
        onSuccess: async (webauthnEncodedResult: string) => {
          autofillActiveRef.current = false;
          if (loadingRef.current) return;
          console.info(
            '[Passkey] autofill → success',
            JSON.stringify({ encodedResultLength: webauthnEncodedResult?.length ?? 0 }),
          );
          const authenticatedUser = usernameRef.current.trim() || 'Passkey User';
          try {
            await setAuthenticatedUser(authenticatedUser);
          } catch (err) {
            console.warn('DRS setAuthenticatedUser failed after autofill', err);
          }
          onLogin(authenticatedUser);
        },
        onError: async (err) => {
          autofillActiveRef.current = false;
          // If a register/modal ceremony is waiting on the abort to settle,
          // unblock it now.
          if (autofillAbortResolverRef.current) {
            autofillAbortResolverRef.current();
            autofillAbortResolverRef.current = null;
          }
          const benignAutofillErrorCodes = new Set([
            'autofill_authentication_aborted',
            'webauthn_authentication_canceled',
            'authentication_aborted_timeout',
          ]);
          if (err?.errorCode && benignAutofillErrorCodes.has(err.errorCode)) {
            console.info('[Passkey] autofill → aborted/benign', JSON.stringify({ errorCode: err.errorCode }));
            return;
          }
          console.error('[Passkey] autofill → error', err);
          setError(getSdkErrorMessage(err, 'Passkey autofill failed.'));
        },
      },
    });

    return () => {
      void abortAutofillIfActive();
    };
  }, [autofillEnabled, autofillSupported, loading, sdkReady, onLogin]);

  // Step 5.1: Authenticate credentials on device via the modal flow.
  // IMPORTANT: We do NOT await any network round-trip (e.g. DRS report) before
  // invoking webauthn.authenticate.modal — browsers require WebAuthn to be
  // triggered within the user-activation window of the click, and awaiting a
  // fetch first can consume that activation and cause a NotAllowedError that
  // the SDK reports as "Authentication was canceled by the user or got
  // timeout". DRS reporting is fired in parallel.
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const clickTs = performance.now();
    const trimmedUsername = username.trim();
    setError(null);
    setLoading(true);

    if (trimmedUsername) {
      void reportUsernameAction(trimmedUsername).catch((err) => {
        console.warn('DRS report failed (continuing flow)', err);
      });
    }

    try {
      // Cancel any in-flight conditional UI autofill request and wait until
      // the browser has fully processed the cancellation, otherwise the next
      // navigator.credentials.get() throws "A request is already pending".
      await abortAutofillIfActive();

      console.info(
        '[Passkey] webauthn.authenticate.modal → calling',
        JSON.stringify({
          username: trimmedUsername || '(none)',
          clientId: WEBAUTHN_CLIENT_ID,
          serverPath: WEBAUTHN_SERVER_PATH,
          msSinceClick: Math.round(performance.now() - clickTs),
        }),
      );

      const webauthnEncodedResult = await webauthn.authenticate.modal({
        username: trimmedUsername || undefined,
      });

      console.info(
        '[Passkey] webauthn.authenticate.modal → success',
        JSON.stringify({
          encodedResultLength: webauthnEncodedResult?.length ?? 0,
          totalMs: Math.round(performance.now() - clickTs),
        }),
      );

      const authenticatedUser = trimmedUsername || 'Passkey User';
      void setAuthenticatedUser(authenticatedUser).catch((err) => {
        console.warn('DRS setAuthenticatedUser failed', err);
      });
      onLogin(authenticatedUser);
    } catch (err: any) {
      console.error('[Passkey] webauthn.authenticate.modal → error', err, {
        msSinceClick: Math.round(performance.now() - clickTs),
      });
      setError(getSdkErrorMessage(err, 'Browser passkey authentication failed or was cancelled.'));
    } finally {
      setLoading(false);
    }
  };

  // Step 4.2: Register credentials on device.
  // Same user-activation discipline as handleSignIn: no awaited work before
  // webauthn.register().
  const handleRegister = async () => {
    const clickTs = performance.now();
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Please enter a username to register a new passkey.');
      return;
    }
    setError(null);
    setLoading(true);

    void reportUsernameAction(trimmedUsername).catch((err) => {
      console.warn('DRS report failed (continuing flow)', err);
    });

    try {
      // Cancel any in-flight conditional UI autofill request and wait until
      // the browser has fully processed the cancellation, otherwise the next
      // navigator.credentials.create() throws "A request is already pending".
      await abortAutofillIfActive();

      console.info(
        '[Passkey] webauthn.register → calling',
        JSON.stringify({
          username: trimmedUsername,
          clientId: WEBAUTHN_CLIENT_ID,
          serverPath: WEBAUTHN_SERVER_PATH,
          msSinceClick: Math.round(performance.now() - clickTs),
        }),
      );

      const webauthnEncodedResult = await webauthn.register({ username: trimmedUsername });

      console.info(
        '[Passkey] webauthn.register → success',
        JSON.stringify({
          encodedResultLength: webauthnEncodedResult?.length ?? 0,
          totalMs: Math.round(performance.now() - clickTs),
        }),
      );

      void setAuthenticatedUser(trimmedUsername).catch((err) => {
        console.warn('DRS setAuthenticatedUser failed', err);
      });
      onLogin(trimmedUsername);
    } catch (err: any) {
      console.error('[Passkey] webauthn.register → error', err, {
        msSinceClick: Math.round(performance.now() - clickTs),
      });
      setError(getSdkErrorMessage(err, 'Browser passkey registration failed or was cancelled.'));
    } finally {
      setLoading(false);
    }
  };

  const onToggleAutofill = () => {
    setAutofillEnabled((prev) => {
      const next = !prev;
      console.info('[Passkey] autofill toggle →', next ? 'ON' : 'OFF');
      return next;
    });
  };

  return (
    <div className="login">
      <div className="login-card">
        <h1 className="login-title">Passkey Only App</h1>
        <p className="login-subtitle">Direct WebAuthn SDK — no IDO journey</p>

        {!sdkReady ? (
          <p className="login-status">Initializing SDK...</p>
        ) : platformSupported === false ? (
          <p className="login-error">
            This device does not support WebAuthn / platform authenticators.
          </p>
        ) : (
          <>
            <div className="login-autofill-toggle" role="group" aria-label="Autofill control">
              <div className="login-autofill-toggle-label">
                <strong>Passkey autofill (conditional UI)</strong>
                <span>
                  {autofillSupported
                    ? autofillEnabled
                      ? 'On — browser may offer passkeys directly from the username field.'
                      : 'Off — sign-in / register use the modal flow only.'
                    : 'Not supported on this browser.'}
                </span>
              </div>
              <button
                type="button"
                className={`autofill-switch ${autofillEnabled ? 'is-on' : 'is-off'}`}
                role="switch"
                aria-checked={autofillEnabled}
                aria-disabled={!autofillSupported || loading}
                disabled={!autofillSupported || loading}
                onClick={onToggleAutofill}
              >
                <span className="autofill-switch-track">
                  <span className="autofill-switch-thumb" />
                </span>
                <span className="autofill-switch-state">{autofillEnabled ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            <form className="login-form" onSubmit={handleSignIn}>
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  disabled={loading}
                  autoComplete={autofillEnabled ? 'username webauthn' : 'username'}
                  autoFocus
                />
              </div>

              {error && <p className="login-error">{error}</p>}

              <div className="login-actions">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #1d976c 0%, #93f9b9 100%)', color: '#000' }}
                >
                  {loading ? 'Working…' : 'Sign in with Passkey'}
                </button>

                <div className="login-divider">
                  <span>or</span>
                </div>

                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={loading}
                  className="btn btn-secondary"
                >
                  {loading ? 'Working…' : 'Register New Passkey'}
                </button>
              </div>

              <p className="login-info">
                Calls <code>webauthn.authenticate.modal()</code> for sign-in and{' '}
                <code>webauthn.register()</code> for registration directly against{' '}
                <code>{WEBAUTHN_SERVER_PATH}</code>. No IDO journey.
                {autofillSupported
                  ? ' Toggle autofill above to enable the conditional UI flow on the username field.'
                  : ''}
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
