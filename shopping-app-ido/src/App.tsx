import { useState } from 'react';
import { Login } from './Login';
import { Shop } from './Shop';
import { CredentialsBanner, DevTools, type CredentialEntry, type EndpointEntry } from './dev';

const APP_CREDENTIALS: CredentialEntry[] = [
  { label: 'IDO clientId', value: '-LNkSyvmbee08fv7e9_p9' },
  { label: 'IDO applicationId', value: 'XT72jJDvuoGARxOI3dKyf' },
  { label: 'DRS clientId', value: 'FY7MYqSinvz2CzfqZzNhe' },
  { label: 'Journey', value: 'password_auth_with_conditional_passkey_registration' },
];

const APP_ENDPOINTS: EndpointEntry[] = [
  { label: 'IDO', url: 'https://api.transmitsecurity.io/ido' },
  { label: 'DRS', url: 'https://api.transmitsecurity.io/risk-collect/' },
];

export default function App() {
  const [user, setUser] = useState<string | null>(null);

  return (
    <>
      <CredentialsBanner
        appName="Shop with IDO"
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
