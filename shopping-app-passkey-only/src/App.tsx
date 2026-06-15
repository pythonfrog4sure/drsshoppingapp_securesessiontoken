import { useCallback, useEffect, useState } from 'react';
import { Login } from './Login';
import { Shop } from './Shop';
import { initDrs, setAuthenticatedUser } from './drs';
import { initWebauthn } from './webauthnSdk';
import { CredentialsBanner, DevTools, type CredentialEntry, type EndpointEntry } from './dev';

const SESSION_STORAGE_KEY = 'passkeyOnly:user';

const APP_CREDENTIALS: CredentialEntry[] = [
  { label: 'WebAuthn clientId', value: '-LNkSyvmbee08fv7e9_p9' },
  { label: 'DRS clientId', value: 'FY7MYqSinvz2CzfqZzNhe' },
  { label: 'Auth flow', value: 'webauthn.authenticate.modal' },
  { label: 'Register flow', value: 'webauthn.register' },
];

const APP_ENDPOINTS: EndpointEntry[] = [
  { label: 'WebAuthn', url: 'https://api.transmitsecurity.io' },
  { label: 'DRS', url: 'https://api.transmitsecurity.io/risk-collect/' },
];

function readPersistedUser(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState<string | null>(readPersistedUser);

  // Initialize Transmit SDKs on page load:
  //  - DRS (fraud signals collection)
  //  - WebAuthn (passkey registration / authentication) — per the quick-start
  //    guide, Step 3 says to init the SDK as soon as the page loads, regardless
  //    of whether the user lands on the Login or Shop view.
  useEffect(() => {
    console.info(
      '[Boot] Shop with Passkey Only → initializing Transmit SDKs on page load',
      JSON.stringify({
        components: ['drs', 'webauthn'],
        drsClientId: 'FY7MYqSinvz2CzfqZzNhe',
        webauthnClientId: '-LNkSyvmbee08fv7e9_p9',
      }),
    );
    void initDrs();
    void initWebauthn();
  }, []);

  // If the page reloads while logged in, re-bind the DRS user context for the new SDK instance.
  useEffect(() => {
    if (user) {
      void setAuthenticatedUser(user);
    }
  }, [user]);

  const handleLogin = useCallback((username: string) => {
    try {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, username);
    } catch (e) {
      console.warn('Failed to persist session', e);
    }
    setUser(username);
  }, []);

  const handleLogout = useCallback(() => {
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear persisted session', e);
    }
    setUser(null);
  }, []);

  return (
    <>
      <CredentialsBanner
        appName="Shop with Passkey Only"
        credentials={APP_CREDENTIALS}
        endpoints={APP_ENDPOINTS}
      />
      {user ? (
        <Shop username={user} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
      <DevTools />
    </>
  );
}
