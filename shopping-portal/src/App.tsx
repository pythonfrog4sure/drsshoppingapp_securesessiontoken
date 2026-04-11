import { useEffect, useState } from 'react';
import './index.css';
import { initDrs } from './drs';

function shellSingleQuote(s: string): string {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

function App() {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Initialize DRS on hub page load for navigation tracking
  useEffect(() => {
    initDrs();
  }, []);

  const copyStartAllCommand = async () => {
    const cmd = `cd ${shellSingleQuote(__MONOREPO_ROOT__)} && npm start`;
    try {
      await navigator.clipboard.writeText(cmd);
      setCopyFeedback('Copied. Paste into Terminal and press Return.');
      window.setTimeout(() => setCopyFeedback(null), 4000);
    } catch {
      setCopyFeedback('Could not copy. Run from the monorepo root: npm start');
      window.setTimeout(() => setCopyFeedback(null), 5000);
    }
  };

  return (
    <>
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>

      <main>
        <h1 className="title">Platform Hub</h1>
        <p className="subtitle">Select a shopping experience to launch</p>

        <div className="start-panel">
          <p className="start-panel-title">Dev servers not running?</p>
          <p className="start-panel-hint">
            A web page cannot start processes on your Mac. Copy the command below, paste it into
            Terminal, then reload the app links. For automatic startup at login, use a Launch Agent
            (see repo <code className="inline-code">scripts/com.drsshoppingapp.devservers.plist</code>
            ).
          </p>
          <button type="button" className="start-panel-btn" onClick={() => void copyStartAllCommand()}>
            Copy command to start all apps
          </button>
          {copyFeedback ? <p className="start-panel-feedback">{copyFeedback}</p> : null}
        </div>

        <div className="cards-container">
          <a href="https://localhost:3001" className="card card-drs" target="_blank" rel="noopener noreferrer">
            <span className="card-icon">🛡️</span>
            <h2 className="card-title">Shop with DRS</h2>
            <p className="card-desc">
              Experience the standard shopping platform secured with Transmit Security's <strong>Risk & Fraud Prevention (DRS)</strong> module.
            </p>
            <span className="card-btn">Launch DRS App &rarr;</span>
          </a>

          <a href="https://localhost:3002" className="card card-ido" target="_blank" rel="noopener noreferrer">
            <span className="card-icon">🌊</span>
            <h2 className="card-title">Shop with IDO</h2>
            <p className="card-desc">
              Experience the extended shopping platform integrated with Transmit Security's <strong>Orchestration (IDO)</strong> SDKs and Journeys.
            </p>
            <span className="card-btn">Launch IDO App &rarr;</span>
          </a>

          <a href="https://localhost:3003" className="card card-passkey" target="_blank" rel="noopener noreferrer">
            <span className="card-icon">🔑</span>
            <h2 className="card-title">Shop with Passkey</h2>
            <p className="card-desc">
              Experience passwordless authentication with Transmit Security's <strong>WebAuthn/Passkey SDK</strong> for secure biometric login.
            </p>
            <span className="card-btn">Launch Passkey App &rarr;</span>
          </a>

          <a href="https://localhost:3004" className="card card-passkey" target="_blank" rel="noopener noreferrer" style={{ background: 'linear-gradient(135deg, #1d976c 0%, #93f9b9 100%)' }}>
            <span className="card-icon">🚀</span>
            <h2 className="card-title">Shop with Passkey Only</h2>
            <p className="card-desc">
              Experience the streamlined <strong>Passkey-only</strong> flow. Direct authentication with no fallback.
            </p>
            <span className="card-btn">Launch Passkey Only App &rarr;</span>
          </a>
        </div>
      </main>
    </>
  );
}

export default App;
