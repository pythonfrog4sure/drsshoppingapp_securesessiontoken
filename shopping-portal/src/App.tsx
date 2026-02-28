import './index.css';

function App() {
  return (
    <>
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>

      <main>
        <h1 className="title">Platform Hub</h1>
        <p className="subtitle">Select a shopping experience to launch</p>

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
        </div>
      </main>
    </>
  );
}

export default App;
