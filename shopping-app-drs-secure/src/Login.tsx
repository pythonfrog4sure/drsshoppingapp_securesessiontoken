import { useState, type FormEvent } from 'react';
import {
  formatSecureTokenPreview,
  reportPasswordAction,
  reportUsernameAction,
  setAuthenticatedUser,
} from './drs';

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
  const [tokenAfterUsername, setTokenAfterUsername] = useState<string | null>(null);

  const handleUsernameSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const value = username.trim();
    if (!value) {
      setError('Please enter your username');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const token = await reportUsernameAction(value);
      if (!token) {
        setError('Could not obtain a secure session token. Please try again.');
        return;
      }
      setTokenAfterUsername(token);
      setStep('password');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your password');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const token = await reportPasswordAction(username.trim());
      if (!token) {
        setError('Could not obtain a secure session token. Please try again.');
        return;
      }
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
    setTokenAfterUsername(null);
  };

  if (step === 'username') {
    return (
      <div className="login">
        <div className="login-card">
          <h1 className="login-title">Sign in to Shop</h1>
          <p className="login-sub">
            DRS is active on this app. <code className="inline-drs">enableSessionToken: true</code> issues a secure session
            token for backend risk APIs (e.g. Recommendations).
          </p>
          <form onSubmit={handleUsernameSubmit} className="login-form" method="post" autoComplete="on">
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
              autoFocus
            />
            {error && <p className="login-error">{error}</p>}
            <div className="login-actions login-actions--single">
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? 'Continuing…' : 'Log in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="login">
      <div className="login-card">
        <h1 className="login-title">Enter password</h1>
        <p className="login-user">
          Signing in as <strong>{username}</strong>
        </p>
        {tokenAfterUsername ? (
          <p className="login-token-hint" title={tokenAfterUsername}>
            <span className="login-token-hint-label">getSecureSessionToken (after username)</span>
            <code className="login-token-preview">{formatSecureTokenPreview(tokenAfterUsername)}</code>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => void navigator.clipboard.writeText(tokenAfterUsername)}
            >
              Copy
            </button>
          </p>
        ) : null}
        <form onSubmit={handlePasswordSubmit} className="login-form" method="post" autoComplete="on">
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
            autoFocus
          />
          {error && <p className="login-error">{error}</p>}
          <div className="login-actions">
            <button type="button" onClick={goBack} disabled={loading} className="btn btn-secondary">
              Back
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
