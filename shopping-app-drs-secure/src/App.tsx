import { useEffect, useState } from 'react';
import { initDrs } from './drs';
import { Login } from './Login';
import { Shop } from './Shop';
import { CredentialsBanner, DevTools, type CredentialEntry, type EndpointEntry } from './dev';

const APP_CREDENTIALS: CredentialEntry[] = [
  { label: 'DRS clientId', value: 'FY7MYqSinvz2CzfqZzNhe' },
  { label: 'enableSessionToken', value: 'true' },
];

const APP_ENDPOINTS: EndpointEntry[] = [
  { label: 'DRS', url: 'https://api.transmitsecurity.io/risk-collect/' },
];

/**
 * DRS (Fraud Prevention) is initialized once for the whole app so telemetry
 * and session handling apply to login and shop routes.
 */
export default function App() {
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    void initDrs();
  }, []);

  return (
    <>
      <CredentialsBanner
        appName="Shop with DRS (secure session token)"
        credentials={APP_CREDENTIALS}
        endpoints={APP_ENDPOINTS}
      />
      {user ? (
        <Shop username={user} onLogout={() => setUser(null)} />
      ) : (
        <Login onLogin={setUser} />
      )}
      <DevTools />
    </>
  );
}
