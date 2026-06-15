import { useEffect, useState } from 'react';
import { initDrs } from './drs';
import { CredentialsBanner, DevTools, type CredentialEntry, type EndpointEntry } from './dev';

/** URL of the standalone "Shop with Passkey Only" app embedded inside this app's iframe. */
const PASSKEY_ONLY_APP_URL = 'https://localhost:3004/';

const APP_CREDENTIALS: CredentialEntry[] = [
  { label: 'DRS clientId (host page)', value: 'FY7MYqSinvz2CzfqZzNhe' },
  { label: 'embedded app', value: PASSKEY_ONLY_APP_URL },
];

const APP_ENDPOINTS: EndpointEntry[] = [
  { label: 'DRS (host page)', url: 'https://api.transmitsecurity.io/risk-collect/' },
  { label: 'Embedded app', url: PASSKEY_ONLY_APP_URL },
];

export default function App() {
  const [iframeKey, setIframeKey] = useState(0);

  useEffect(() => {
    void initDrs();
  }, []);

  const reloadIframe = () => setIframeKey((k) => k + 1);

  return (
    <>
      <CredentialsBanner
        appName="iframe with Passkeys (host)"
        credentials={APP_CREDENTIALS}
        endpoints={APP_ENDPOINTS}
      />
      <div className="iframe-shell">
        <header className="iframe-shell-bar">
        <div className="iframe-shell-title">
          <span className="iframe-shell-icon" aria-hidden>🖼️</span>
          <div>
            <h1>iframe with Passkeys</h1>
            <p>
              Embeds the standalone <strong>Shop with Passkey Only</strong> app
              (<code>https://localhost:3004/</code>) inside an iframe. The passkey
              ceremony is executed entirely within the embedded app.
            </p>
          </div>
        </div>
        <div className="iframe-shell-actions">
          <button type="button" className="iframe-shell-btn" onClick={reloadIframe}>
            Reload embedded app
          </button>
          <a
            className="iframe-shell-btn iframe-shell-btn--link"
            href={PASSKEY_ONLY_APP_URL}
            target="_blank"
            rel="noreferrer"
          >
            Open in new tab ↗
          </a>
        </div>
      </header>

      <div className="iframe-shell-frame-wrap">
        <iframe
          key={iframeKey}
          className="iframe-shell-frame"
          title="Shop with Passkey Only"
          src={PASSKEY_ONLY_APP_URL}
          allow="publickey-credentials-get *; publickey-credentials-create *; clipboard-read; clipboard-write"
        />
      </div>

      <footer className="iframe-shell-footer">
        <span>
          If the iframe is blank, start the passkey-only app on{' '}
          <code>https://localhost:3004</code> (e.g. <code>npm run start:all</code>) and
          accept its self-signed certificate once in a separate tab.
        </span>
      </footer>
      </div>
      <DevTools />
    </>
  );
}
