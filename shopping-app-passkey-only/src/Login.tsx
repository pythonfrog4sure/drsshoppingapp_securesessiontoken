import { useEffect, useRef, useState } from 'react';
import { ido, initialize, webauthn } from '@transmitsecurity/platform-web-sdk';
import { initDrs, reportUsernameAction, setAuthenticatedUser } from './drs';

const APP_ID = 'XT72jJDvuoGARxOI3dKyf';
const CLIENT_ID = '-LNkSyvmbee08fv7e9_p9';

const JOURNEY_NAME = 'email_passkey_authentication';

interface LoginProps {
  onLogin: (username: string) => void;
}

function getRejectionMessage(stepOrError: any): string {
  const infoControlFlow = Array.isArray(stepOrError?.data?.control_flow)
    ? stepOrError.data.control_flow.find((step: any) => step?.type === 'information')
    : null;
  const infoText = infoControlFlow?.text || stepOrError?.data?.text;

  if (typeof infoText === 'string' && infoText.trim()) {
    return infoText;
  }

  const reason =
    stepOrError?.data?.failure_data?.reason?.type ||
    stepOrError?.data?.reason?.type;

  if (reason === 'assertion_rejected') {
    return 'Passkey assertion was rejected. Use the same username and an already-registered passkey.';
  }

  return stepOrError?.error_message || stepOrError?.message || 'Authentication rejected';
}

function buildAuthFormPayload(step: any, usernameValue: string): Record<string, string> {
  const schema =
    step?.data?.app_data?.form_schema ||
    step?.data?.form_schema ||
    step?.data?.control_flow?.[0]?.form_schema ||
    step?.clientResponseOptions?.client_input?.schema;

  const payload: Record<string, string> = {};
  const normalizedUsername = usernameValue.trim();

  const applyUsername = (fieldName: string | undefined) => {
    if (!fieldName) return;
    payload[fieldName] = normalizedUsername;
  };

  if (Array.isArray(schema)) {
    for (const field of schema) {
      const name = typeof field?.name === 'string' ? field.name : '';
      const lower = name.toLowerCase();
      if (!name) continue;
      if (field?.type === 'submit' || field?.type === 'button') continue;

      if (
        lower.includes('username') ||
        lower.includes('email') ||
        lower.includes('login') ||
        lower.includes('identifier')
      ) {
        applyUsername(name);
      }
    }

    if (Object.keys(payload).length === 0) {
      const firstTextField = schema.find((field: any) => {
        const type = String(field?.type || '').toLowerCase();
        return field?.name && type !== 'submit' && type !== 'button' && type !== 'password';
      });
      if (firstTextField?.name) {
        applyUsername(firstTextField.name);
      }
    }
  } else if (schema?.properties && typeof schema.properties === 'object') {
    const keys = Object.keys(schema.properties);
    for (const key of keys) {
      const lower = key.toLowerCase();
      if (
        lower.includes('username') ||
        lower.includes('email') ||
        lower.includes('login') ||
        lower.includes('identifier')
      ) {
        applyUsername(key);
      }
    }
    if (Object.keys(payload).length === 0 && keys.length > 0) {
      applyUsername(keys[0]);
    }
  }

  if (Object.keys(payload).length === 0) {
    payload.username = normalizedUsername;
  }

  return payload;
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [autofillSupported, setAutofillSupported] = useState(false);
  const pendingAutofillResultRef = useRef<string | null>(null);
  const autofillActiveRef = useRef(false);
  const loadingRef = useRef(false);

  const abortAutofillIfActive = () => {
    if (!autofillActiveRef.current) {
      return;
    }
    try {
      webauthn.authenticate.autofill.abort();
    } catch (err) {
      console.warn('Failed to abort autofill flow', err);
    }
    autofillActiveRef.current = false;
  };

  const consumePendingAutofillResult = () => {
    const pendingResult = pendingAutofillResultRef.current;
    pendingAutofillResultRef.current = null;
    return pendingResult;
  };

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    initDrs();
    async function initSDK() {
      try {
        await initialize({
          clientId: CLIENT_ID,
          ido: {
            applicationId: APP_ID,
            serverPath: 'https://api.transmitsecurity.io/ido'
          },
          webauthn: {
            serverPath: 'https://api.transmitsecurity.io'
          }
        });
        const supportsAutofill = await webauthn.isAutofillSupported();
        setAutofillSupported(supportsAutofill);
        setSdkReady(true);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize SDK';
        setError(errorMessage);
      }
    }
    initSDK();
  }, []);

  useEffect(() => {
    return () => {
      abortAutofillIfActive();
    };
  }, []);

  const runPasskeyJourney = async (params: { skipAutofillAbort?: boolean } = {}) => {
    const trimmedUsername = username.trim();

    if (!params.skipAutofillAbort) {
      abortAutofillIfActive();
    }
    setError(null);
    setLoading(true);

    try {
      if (trimmedUsername) {
        try {
          await reportUsernameAction(trimmedUsername);
        } catch (err) {
          console.warn('DRS report failed, continuing auth flow', err);
        }
      }

      // Start the journey
      const startRes = await ido.startJourney(JOURNEY_NAME);

      // Enforce that this app only succeeds after an actual passkey assertion.
      let passkeyAssertionSubmitted = false;

      // We know this journey will likely ask for passkey authentication.
      // We will loop to process the steps until success or error.
      let currentStep = startRes;

      while (currentStep) {
        console.log('Journey Step in Passkey Only App:', currentStep);

        // Success check
        if (
          currentStep?.journeyStepId === 'action:success' ||
          currentStep?.type === 'journey_success' ||
          (currentStep as any)?.journey?.status === 'success'
        ) {
          if (!passkeyAssertionSubmitted) {
            throw new Error('Journey completed without passkey challenge. Ensure the journey requires WebAuthn authentication.');
          }
          const authenticatedUser = trimmedUsername || currentStep?.data?.username || 'Passkey User';
          await setAuthenticatedUser(authenticatedUser);
          onLogin(authenticatedUser);
          return;
        }

        // Rejection check
        if (currentStep?.journeyStepId === 'action:rejection') {
          throw new Error(getRejectionMessage(currentStep));
        }

        const controlFlow = Array.isArray(currentStep?.data?.control_flow)
          ? currentStep.data.control_flow
          : [];

        if (currentStep?.journeyStepId === 'action:webauthn_authentication') {
          try {
            const webauthnUsername = currentStep?.data?.username || trimmedUsername;
            const pendingAutofillResult = consumePendingAutofillResult();
            const webauthnEncodedResult = pendingAutofillResult || await webauthn.authenticate.modal({
              username: webauthnUsername || undefined
            });
            currentStep = await ido.submitClientResponse('client_input', {
              webauthn_encoded_result: webauthnEncodedResult
            });
            passkeyAssertionSubmitted = true;
          } catch (modalErr) {
            console.error('Browser passkey modal error:', modalErr);
            throw new Error('Browser passkey authentication failed or was cancelled.');
          }
          continue;
        }

        const webauthnControlFlowStep = controlFlow.find(
          (step: any) => step?.type === 'transmit_platform_web_authn_authentication'
        );
        if (webauthnControlFlowStep) {
          try {
            const webauthnUsername =
              webauthnControlFlowStep?.username ||
              currentStep?.data?.username ||
              trimmedUsername;
            const pendingAutofillResult = consumePendingAutofillResult();
            const webauthnEncodedResult = pendingAutofillResult || await webauthn.authenticate.modal({
              username: webauthnUsername || undefined
            });
            currentStep = await ido.submitClientResponse('client_input', {
              webauthn_encoded_result: webauthnEncodedResult
            });
            passkeyAssertionSubmitted = true;
          } catch (modalErr) {
            console.error('Browser passkey modal error:', modalErr);
            throw new Error('Browser passkey authentication failed or was cancelled.');
          }
          continue;
        }

        if (currentStep?.clientResponseOptions?.passkeys) {
          try {
            const webauthnUsername = currentStep?.data?.username || trimmedUsername;
            const pendingAutofillResult = consumePendingAutofillResult();
            const webauthnEncodedResult = pendingAutofillResult || await webauthn.authenticate.modal({
              username: webauthnUsername || undefined
            });
            currentStep = await ido.submitClientResponse('passkeys', {
              webauthn_encoded_result: webauthnEncodedResult
            });
            passkeyAssertionSubmitted = true;
          } catch (modalErr) {
            console.error('Browser passkey modal error:', modalErr);
            throw new Error('Browser passkey authentication failed or was cancelled.');
          }
          continue;
        }

        // If the current step asks for username/login input, submit it.
        const isAuthForm =
          currentStep?.journeyStepId === 'email_passkey_login_form' ||
          currentStep?.journeyStepId === 'login' ||
          Boolean(currentStep?.data?.app_data?.form_schema) ||
          Boolean(currentStep?.data?.form_schema) ||
          Boolean(currentStep?.data?.control_flow?.[0]?.form_schema);

        if (isAuthForm) {
          const authPayload = buildAuthFormPayload(currentStep, trimmedUsername);
          currentStep = await ido.submitClientResponse('client_input', authPayload);
          continue;
        }

        // Handle generic information steps (like success messages before strictly closing)
        if (
          currentStep?.journeyStepId === 'action:information' ||
          controlFlow.some((step: any) => step?.type === 'information')
        ) {
          const infoStep = controlFlow.find((step: any) => step?.type === 'information');
          const infoTitle = infoStep?.title || currentStep?.data?.title || '';
          const infoText = infoStep?.text || currentStep?.data?.text || '';
          const infoMessage = `${infoTitle} ${infoText}`.toLowerCase();
          const isAssertionFailure =
            currentStep?.data?.assertions_complete === false &&
            (infoMessage.includes('not successful') || infoMessage.includes('failed'));

          if (isAssertionFailure) {
            throw new Error(infoText || 'Passkey authentication was not successful. Please try again.');
          }

          try {
            currentStep = await ido.submitClientResponse('client_input', {});
            continue;
          } catch (err) {
            console.error('Failed to bypass info step', err);
          }
        }

        // If we reach here, it's a fallback form (e.g., password) that we don't want to support.
        // We explicitly error out because this app ONLY allows passkey.
        throw new Error('Journey requested non-passkey authentication. This app only supports Passkey.');
      }

    } catch (err: unknown) {
      console.error('Passkey Auth Failed:', err);
      const errorMessage = getRejectionMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    await runPasskeyJourney();
  };

  useEffect(() => {
    if (!sdkReady || !autofillSupported || loading) {
      return;
    }
    if (autofillActiveRef.current) {
      return;
    }

    autofillActiveRef.current = true;
    webauthn.authenticate.autofill.activate({
      handlers: {
        onReady: () => {
          setError(null);
        },
        onSuccess: async (webauthnEncodedResult: string) => {
          autofillActiveRef.current = false;
          pendingAutofillResultRef.current = webauthnEncodedResult;
          if (loadingRef.current) {
            return;
          }
          await runPasskeyJourney({ skipAutofillAbort: true });
        },
        onError: async (err) => {
          autofillActiveRef.current = false;
          if (err?.errorCode === 'autofill_authentication_aborted') {
            return;
          }
          console.error('Passkey autofill failed:', err);
          setError(getRejectionMessage(err));
        },
      },
    });

    return () => {
      abortAutofillIfActive();
    };
  }, [autofillSupported, loading, sdkReady]);

  return (
    <div className="login">
      <div className="login-card">
        <h1 className="login-title">Passkey Only App</h1>
        <p className="login-subtitle">Direct, passwordless authentication</p>

        {!sdkReady ? (
          <p className="login-status">Initializing SDK...</p>
        ) : (
          <form className="login-form" onSubmit={handleContinue}>
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
                autoComplete="username webauthn"
                autoFocus
              />
            </div>

            {error && <p className="login-error">{error}</p>}

            <div className="login-actions">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ width: '100%', background: 'linear-gradient(135deg, #1d976c 0%, #93f9b9 100%)', color: '#000' }}
              >
                {loading ? 'Authenticating...' : 'Continue'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
