import { useEffect, useState } from 'react';
import { ido, initialize, webauthn } from '@transmitsecurity/platform-web-sdk';
import { initDrs, reportUsernameAction, setAuthenticatedUser } from './drs';

const APP_ID = 'XT72jJDvuoGARxOI3dKyf';
const CLIENT_ID = '-LNkSyvmbee08fv7e9_p9';

// Available passkey journeys - update these based on your Transmit Security console
const JOURNEYS = {
  // Conditional passkey authentication flow
  PASSKEY_AUTH: 'conditional_passkey_authentication',
  // Passkey registration flow
  PASSKEY_REGISTER: 'username_email_passkey_registration',
};

interface LoginProps {
  onLogin: (username: string) => void;
}

type FlowState = 'init' | 'username' | 'journey' | 'success' | 'error';

export function Login({ onLogin }: LoginProps) {
  const [flowState, setFlowState] = useState<FlowState>('init');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);

  // Dynamic form state for IDO journey
  const [formSchema, setFormSchema] = useState<any[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    // Initialize DRS for fraud detection
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
            serverPath: 'https://api.transmitsecurity.io/cis'
          }
        });
        setSdkReady(true);
        setFlowState('username');
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize SDK';
        setError(errorMessage);
        setFlowState('error');
      }
    }
    initSDK();
  }, []);

  const processJourneyStep = async (resData: any) => {
    console.log('Journey Step:', resData);

    // Check if the journey completed successfully
    if (
      resData?.journeyStepId === 'action:success' ||
      resData?.type === 'journey_success' ||
      resData?.journey?.status === 'success'
    ) {
      const user = formData.username || username || 'Authenticated User';
      // Report successful passkey authentication to DRS
      await setAuthenticatedUser(user);
      setFlowState('success');
      onLogin(user);
      return;
    }

    // Check if rejection
    if (resData?.journeyStepId === 'action:rejection') {
      setError('Authentication rejected. Please try again.');
      setFlowState('error');
      setLoading(false);
      return;
    }

    // Check for WebAuthn registration step (journeyStepId-based detection)
    if (resData?.journeyStepId === 'action:webauthn_registration') {
      console.log('WebAuthn Registration step detected:', resData);
      try {
        const webauthnUsername = resData?.data?.username || formData.username || username;
        // Call WebAuthn SDK to register passkey
        const webauthnEncodedResult = await webauthn.register({
          username: webauthnUsername
        });
        console.log('WebAuthn registration successful, submitting result');

        // Submit the encoded result back to the journey
        const result = await ido.submitClientResponse('client_input', {
          webauthn_encoded_result: webauthnEncodedResult
        });
        await processJourneyStep(result);
        return;
      } catch (err: unknown) {
        console.error('WebAuthn registration failed:', err);
        const errorMessage = err instanceof Error ? err.message : 'Passkey registration failed';
        setError(errorMessage);
        setFlowState('error');
        setLoading(false);
        return;
      }
    }

    // Check for information/success step (journeyStepId-based)
    if (resData?.journeyStepId === 'action:information') {
      console.log('Information step detected:', resData?.data?.title);
      try {
        // Acknowledge the information step and continue
        const result = await ido.submitClientResponse('client_input', {});
        await processJourneyStep(result);
        return;
      } catch (err: unknown) {
        console.error('Failed to continue after information step:', err);
        // If this was a success message, treat as success
        if (resData?.data?.title?.toLowerCase().includes('success')) {
          const user = formData.username || username || 'Authenticated User';
          await setAuthenticatedUser(user);
          setFlowState('success');
          onLogin(user);
          return;
        }
      }
    }

    // Check for WebAuthn authentication step
    if (resData?.journeyStepId === 'action:webauthn_authentication') {
      console.log('WebAuthn Authentication step detected:', resData);
      try {
        const webauthnUsername = resData?.data?.username || formData.username || username;
        // Call WebAuthn SDK to authenticate with passkey
        const webauthnEncodedResult = await webauthn.authenticate.modal({
          username: webauthnUsername
        });
        console.log('WebAuthn authentication successful, submitting result');

        // Submit the encoded result back to the journey
        const result = await ido.submitClientResponse('client_input', {
          webauthn_encoded_result: webauthnEncodedResult
        });
        await processJourneyStep(result);
        return;
      } catch (err: unknown) {
        console.error('WebAuthn authentication failed:', err);
        const errorMessage = err instanceof Error ? err.message : 'Passkey authentication failed';
        setError(errorMessage);
        setFlowState('error');
        setLoading(false);
        return;
      }
    }

    // Check for control_flow-based steps
    const controlFlow = resData?.data?.control_flow?.[0];

    // Handle information/success steps - acknowledge and continue
    if (controlFlow?.type === 'information') {
      console.log('Information step detected:', controlFlow.title);
      try {
        // Acknowledge the information step and continue
        const result = await ido.submitClientResponse('client_input', {});
        await processJourneyStep(result);
        return;
      } catch (err: unknown) {
        console.error('Failed to continue after information step:', err);
        // If this was a success message, treat as success
        if (controlFlow.title?.toLowerCase().includes('success')) {
          const user = formData.username || username || 'Authenticated User';
          await setAuthenticatedUser(user);
          setFlowState('success');
          onLogin(user);
          return;
        }
      }
    }

    // Handle WebAuthn registration (control_flow format)
    if (controlFlow?.type === 'transmit_platform_web_authn_registration') {
      console.log('WebAuthn Registration (control_flow) detected:', controlFlow);
      try {
        const webauthnEncodedResult = await webauthn.register({
          username: controlFlow.username || formData.username || username
        });
        const result = await ido.submitClientResponse('client_input', {
          webauthn_encoded_result: webauthnEncodedResult
        });
        await processJourneyStep(result);
        return;
      } catch (err: unknown) {
        console.error('WebAuthn registration failed:', err);
        const errorMessage = err instanceof Error ? err.message : 'Passkey registration failed';
        setError(errorMessage);
        setFlowState('error');
        setLoading(false);
        return;
      }
    }

    if (controlFlow?.type === 'transmit_platform_web_authn_authentication') {
      console.log('WebAuthn Authentication (control_flow) detected:', controlFlow);
      try {
        const webauthnEncodedResult = await webauthn.authenticate.modal({
          username: controlFlow.username || formData.username || username
        });
        const result = await ido.submitClientResponse('client_input', {
          webauthn_encoded_result: webauthnEncodedResult
        });
        await processJourneyStep(result);
        return;
      } catch (err: unknown) {
        console.error('WebAuthn authentication failed:', err);
        const errorMessage = err instanceof Error ? err.message : 'Passkey authentication failed';
        setError(errorMessage);
        setFlowState('error');
        setLoading(false);
        return;
      }
    }

    // Dynamic Unpacking - extract form schema
    const activeFlow = resData?.data?.form_schema
      ? resData.data
      : resData?.data?.control_flow?.[0] || resData?.data;

    if (activeFlow?.form_schema || activeFlow?.schema) {
      setFormSchema(activeFlow.form_schema || activeFlow.schema || []);
      setFormData((prev) => ({ ...prev })); // Keep existing form data
      setError(null);
      setFlowState('journey');
    } else {
      console.warn('Unsupported journey step:', resData);
      setError('Unsupported step reached. Check console for details.');
      setFlowState('error');
    }

    setLoading(false);
  };

  // Start a passkey journey
  const startJourney = async (journeyName: string) => {
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setError(null);
    setLoading(true);
    setFormData({ username }); // Pre-fill username

    // Report passkey login attempt to DRS
    await reportUsernameAction(username.trim());

    try {
      const resData = await ido.startJourney(journeyName);
      await processJourneyStep(resData);
    } catch (err: unknown) {
      console.error('Journey failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start journey';
      setError(errorMessage);
      setFlowState('error');
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Submit form data to the journey
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Report action to DRS if username is being submitted
      if (formData.username) {
        await reportUsernameAction(formData.username);
      }

      const resData = await ido.submitClientResponse('client_input', formData);
      await processJourneyStep(resData);
    } catch (err: unknown) {
      console.error('Submit failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error submitting input';
      setError(errorMessage);
      setLoading(false);
    }
  };

  // Reset to start
  const handleReset = () => {
    setFlowState('username');
    setFormSchema([]);
    setFormData({});
    setError(null);
    setLoading(false);
  };

  // Render username input screen
  const renderUsernameScreen = () => (
    <div className="login-form">
      <div className="form-group">
        <label htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username or email"
          disabled={loading}
          autoComplete="username webauthn"
          autoFocus
        />
      </div>

      {error && <p className="login-error">{error}</p>}

      <div className="login-actions">
        <button
          type="button"
          onClick={() => startJourney(JOURNEYS.PASSKEY_AUTH)}
          disabled={loading || !sdkReady}
          className="btn btn-primary"
        >
          {loading ? 'Starting...' : 'Sign In with Passkey'}
        </button>

        <div className="login-divider">
          <span>or</span>
        </div>

        <button
          type="button"
          onClick={() => startJourney(JOURNEYS.PASSKEY_REGISTER)}
          disabled={loading || !sdkReady}
          className="btn btn-secondary"
        >
          {loading ? 'Starting...' : 'Register New Passkey'}
        </button>
      </div>

      <p className="login-info">
        Use 'Sign In' if you already have a passkey, or 'Register' to create a new one.
      </p>
    </div>
  );

  // Render dynamic journey form
  const renderJourneyForm = () => (
    <form onSubmit={handleFormSubmit} className="login-form" autoComplete="on">
      {formSchema.map((field: any, index: number) => {
        if (field.type === 'submit' || field.type === 'button') return null;

        const isPassword =
          field.name?.toLowerCase().includes('password') || field.type === 'password';

        return (
          <div key={index} className="form-group">
            <label htmlFor={field.name}>{field.label || field.name}</label>
            <input
              id={field.name}
              name={field.name}
              type={isPassword ? 'password' : field.type === 'string' ? 'text' : field.type || 'text'}
              value={formData[field.name] || ''}
              onChange={handleInputChange}
              placeholder={`Enter ${field.label || field.name}`}
              required={field.required}
              disabled={loading}
            />
          </div>
        );
      })}

      {loading && <p className="login-status">Processing...</p>}
      {error && <p className="login-error">{error}</p>}

      <div className="login-actions">
        <button type="submit" disabled={loading} className="btn btn-primary">
          {loading ? 'Continuing...' : 'Continue'}
        </button>

        <button
          type="button"
          onClick={handleReset}
          disabled={loading}
          className="btn btn-secondary"
        >
          Start Over
        </button>
      </div>
    </form>
  );

  return (
    <div className="login">
      <div className="login-card">
        <h1 className="login-title">Shop with Passkey</h1>
        <p className="login-subtitle">Secure passwordless authentication via IDO</p>

        {flowState === 'init' && (
          <p className="login-status">Initializing SDK...</p>
        )}

        {flowState === 'username' && renderUsernameScreen()}

        {flowState === 'journey' && formSchema.length > 0 && renderJourneyForm()}

        {flowState === 'error' && (
          <div className="login-form">
            <p className="login-error">{error || 'An error occurred'}</p>
            <div className="login-actions">
              <button onClick={handleReset} className="btn btn-secondary">
                Try Again
              </button>
            </div>
          </div>
        )}

        {flowState === 'success' && (
          <p className="login-status">Success! Redirecting...</p>
        )}
      </div>
    </div>
  );
}
