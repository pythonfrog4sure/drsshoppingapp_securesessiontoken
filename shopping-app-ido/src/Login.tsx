import { useEffect, useState } from 'react';
import { ido, initialize } from '@transmitsecurity/platform-web-sdk';

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

  const processJourneyStep = (resData: any) => {
    console.log('Journey Step:', resData);

    // Check if the journey completed successfully
    if (resData?.journeyStepId === 'action:success' || resData?.type === 'journey_success' || resData?.journey?.status === 'success') {
      onLogin(formData.username || 'Successful User');
      return;
    }

    // Check if rejection
    if (resData?.journeyStepId === 'action:rejection') {
      setError('Journey rejected');
      setLoading(false);
      return;
    }

    // Dynamic Unpacking as per README
    const activeFlow = resData?.data?.form_schema ? resData.data : resData?.data?.control_flow?.[0] || resData?.data;

    if (activeFlow?.form_schema || activeFlow?.schema) {
      setFormSchema(activeFlow.form_schema || activeFlow.schema || []);
      setFormData({});
      setError(null);
    } else {
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
      // Submit client input
      const resData = await ido.submitClientResponse('client_input', formData);
      processJourneyStep(resData);
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
