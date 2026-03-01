import { useEffect, useState } from 'react';
import { ido, initialize } from '@transmitsecurity/platform-web-sdk';
import { initDrs, reportUsernameAction, setAuthenticatedUser } from './drs';

const APP_ID = 'XT72jJDvuoGARxOI3dKyf';
const CLIENT_ID = '-LNkSyvmbee08fv7e9_p9';

interface LoginProps {
  onLogin: (username: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamic form state
  const [formSchema, setFormSchema] = useState<any[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    // Initialize DRS for fraud detection
    initDrs();

    async function startJourney() {
      try {
        await initialize({
          clientId: CLIENT_ID,
          ido: {
            applicationId: APP_ID,
            serverPath: 'https://api.transmitsecurity.io/ido'
          }
        });

        const resData = await ido.startJourney('password_auth_with_conditional_passkey_registration');
        processJourneyStep(resData);
      } catch (err: any) {
        setError(err.message || 'Failed to start journey');
        setLoading(false);
      }
    }
    startJourney();
  }, []);

  const processJourneyStep = async (resData: any) => {
    console.log('Journey Step:', resData);

    // Check if the journey completed successfully
    if (resData?.journeyStepId === 'action:success' || resData?.type === 'journey_success' || resData?.journey?.status === 'success') {
      const user = formData.username || 'Successful User';
      // Report successful login to DRS
      await setAuthenticatedUser(user);
      onLogin(user);
      return;
    }

    // Check if rejection
    if (resData?.journeyStepId === 'action:rejection') {
      setError('Journey rejected');
      setLoading(false);
      return;
    }

    // Dynamically unpack the form schema from wherever it might be nested
    const extractedSchema =
      resData?.data?.app_data?.form_schema ||
      resData?.data?.app_data?.schema ||
      resData?.data?.form_schema ||
      resData?.data?.control_flow?.[0]?.form_schema ||
      resData?.data?.schema ||
      resData?.clientResponseOptions?.client_input?.schema ||
      (resData?.clientResponseOptions?.passkeys?.schema ? null : undefined); // Ignoring raw passkey schema as it's often not an array form

    let finalSchema: any[] = [];
    if (extractedSchema && Array.isArray(extractedSchema)) {
      finalSchema = extractedSchema;
    } else if (extractedSchema?.properties) {
      // Sometimes it's a JSON Schema object
      finalSchema = Object.keys(extractedSchema.properties).map(key => ({
        name: key,
        ...extractedSchema.properties[key]
      }));
    } else if (resData?.journeyStepId === 'email_passkey_login_form' || resData?.journeyStepId === 'login') {
      // Hardcode fallback for login form
      finalSchema = [
        { name: 'username', label: 'Email or Username', type: 'string', required: true }
      ];
    } else if (resData?.journeyStepId === 'password') {
      // Hardcode fallback for password
      finalSchema = [
        { name: 'password', label: 'Password', type: 'password', required: true }
      ];
    }

    if (finalSchema.length > 0) {
      setFormSchema(finalSchema);
      setFormData({});
      setError(null);
    } else {
      console.error('Could not find form schema in resData:', resData);
      setError('Unsupported step reached. Check console for details.');
    }

    setLoading(false); // Journey loaded
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Report action to DRS if username is being submitted
      if (formData.username) {
        await reportUsernameAction(formData.username);
      }

      // Submit client input
      const resData = await ido.submitClientResponse('client_input', formData);
      await processJourneyStep(resData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error submitting input');
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="login-card">
        <h1 className="login-title">Shop with IDO</h1>

        {loading ? (
          <p className="login-user">Running Secure Orchestration...</p>
        ) : formSchema && formSchema.length > 0 ? (
          <form onSubmit={handleFormSubmit} className="login-form" autoComplete="on">
            {formSchema.map((field: any, index: number) => {
              if (field.type === 'submit' || field.type === 'button') return null;

              const isPassword = field.name?.toLowerCase().includes('password') || field.type === 'password';
              return (
                <div key={index}>
                  <label htmlFor={field.name}>{field.label || field.name}</label>
                  <input
                    id={field.name}
                    name={field.name}
                    type={isPassword ? 'password' : field.type === 'string' ? 'text' : field.type || 'text'}
                    value={formData[field.name] || ''}
                    onChange={handleInputChange}
                    placeholder={`Enter ${field.label || field.name}`}
                    required={field.required}
                  />
                </div>
              );
            })}
            {error && <p className="login-error">{error}</p>}
            <div className="login-actions">
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'Continuing...' : 'Continue'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            {error ? <p className="login-error">{error}</p> : <p>Initializing...</p>}
          </div>
        )}
      </div>
    </div>
  );
}
