import { useEffect, useState } from 'react';
import { initDrs, reportUsernameAction, reportPasswordAction, setAuthenticatedUser } from './drs';
type Step = 'username' | 'password';

interface LoginProps {
  onLogin: (username: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [step, setStep] = useState<Step>('username');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize DRS on login page load (risk/fraud profiling)
  useEffect(() => {
    initDrs();
  }, []);

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = username.trim();
    if (!value) {
      setError('Please enter your username');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await reportUsernameAction(value);
      setStep('password');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your password');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await reportPasswordAction(username.trim());
      await setAuthenticatedUser(username.trim());
      onLogin(username.trim());
    } catch {
      setError('Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setStep('username');
    setPassword('');
    setError(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'username') {
      handleUsernameSubmit(e);
    } else {
      handlePasswordSubmit(e);
    }
  };

  return (
    <div className="login">
      <div className="login-card">
        <h1 className="login-title">Sign in to Shop</h1>
        {/* Single form with both fields so password-manager extensions don't inject broken UI */}
        <form
          onSubmit={handleFormSubmit}
          className="login-form"
          method="post"
          autoComplete="on"
        >
          {step === 'password' && (
            <p className="login-user">Signing in as <strong>{username}</strong></p>
          )}
          <div className={step === 'username' ? undefined : 'login-field-hidden'}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={loading}
              autoFocus={step === 'username'}
              tabIndex={step === 'username' ? 0 : -1}
              aria-hidden={step === 'password'}
            />
          </div>
          <div className={step === 'password' ? undefined : 'login-field-hidden'}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
              autoFocus={step === 'password'}
              tabIndex={step === 'password' ? 0 : -1}
              aria-hidden={step === 'username'}
            />
          </div>
          {error && <p className="login-error">{error}</p>}
          <div className="login-actions">
            {step === 'password' ? (
              <>
                <button type="button" onClick={goBack} disabled={loading} className="btn btn-secondary">
                  Back
                </button>
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </>
            ) : (
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'Continuing…' : 'Continue'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
