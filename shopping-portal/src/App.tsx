import { useEffect, useRef, useState } from 'react';
import './index.css';
import './webauthn-lab/lab.css';
import { fetchSiblingAppsStatus, sleep } from './devSiblingApi';
import { initDrs } from './drs';
import { PortalEmbeddedApp } from './PortalEmbeddedApp';
import { SiblingAppsStackPanel } from './SiblingAppsStackPanel';
import { WebAuthnUseCasesLab } from './webauthn-lab/WebAuthnUseCasesLab';
import type { SiblingAppSnapshot } from './siblingDevApps';

type PortalView =
  | 'hub'
  | 'drs'
  | 'ido'
  | 'passkey'
  | 'passkey-only'
  | 'webauthn-lab';

const EMBEDDED_SHOP_APPS: Record<
  Exclude<PortalView, 'hub' | 'webauthn-lab'>,
  { title: string; src: string }
> = {
  drs: { title: 'Shop with DRS', src: 'https://localhost:3001/' },
  ido: { title: 'Shop with IDO', src: 'https://localhost:3002/' },
  passkey: { title: 'Shop with Passkey', src: 'https://localhost:3003/' },
  'passkey-only': { title: 'Shop with Passkey Only', src: 'https://localhost:3004/' },
};

function shellSingleQuote(s: string): string {
  return `'${String(s).replace(/'/g, `'\\''`)}'`;
}

type DevStackState = {
  operation: 'starting' | 'stopping';
  phase: 'running' | 'done' | 'timeout';
  apps: SiblingAppSnapshot[] | null;
};

function devStackHeadline(op: 'starting' | 'stopping', phase: 'running' | 'done' | 'timeout'): string {
  if (op === 'starting') {
    if (phase === 'running') return 'Starting sibling dev apps…';
    if (phase === 'done') return 'All sibling dev apps are running';
    return 'Start did not finish for every app in time';
  }
  if (phase === 'running') return 'Stopping sibling dev apps…';
  if (phase === 'done') return 'Sibling dev apps stopped (this hub on :3000 keeps running)';
  return 'Stop did not finish for every app in time';
}

function App() {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [hubDevFeedback, setHubDevFeedback] = useState<string | null>(null);
  const [devStack, setDevStack] = useState<DevStackState | null>(null);
  const stackCloseTimerRef = useRef<number | undefined>(undefined);
  const [view, setView] = useState<PortalView>('hub');

  const clearStackCloseTimer = () => {
    if (stackCloseTimerRef.current !== undefined) {
      window.clearTimeout(stackCloseTimerRef.current);
      stackCloseTimerRef.current = undefined;
    }
  };

  const scheduleStackPanelClose = () => {
    clearStackCloseTimer();
    stackCloseTimerRef.current = window.setTimeout(() => {
      setDevStack(null);
      stackCloseTimerRef.current = undefined;
    }, 5000);
  };

  useEffect(() => () => clearStackCloseTimer(), []);

  // DRS uses a different Transmit client than the WebAuthn lab (Mosaic / passkey app).
  // Initialize only on the hub so opening the lab does not overwrite SDK state.
  useEffect(() => {
    if (view === 'hub') {
      void initDrs();
    }
  }, [view]);

  const copyStartAllCommand = async () => {
    const cmd = `cd ${shellSingleQuote(__MONOREPO_ROOT__)} && npm run start:all`;
    try {
      await navigator.clipboard.writeText(cmd);
      setCopyFeedback('Copied. Paste into Terminal and press Return.');
      window.setTimeout(() => setCopyFeedback(null), 4000);
    } catch {
      setCopyFeedback('Could not copy. Run from the monorepo root: npm run start:all');
      window.setTimeout(() => setCopyFeedback(null), 5000);
    }
  };

  const startAllAppsFromDev = async () => {
    clearStackCloseTimer();
    setHubDevFeedback(null);
    setDevStack({ operation: 'starting', phase: 'running', apps: null });

    const fail = (msg: string) => {
      setHubDevFeedback(msg);
      window.setTimeout(() => setHubDevFeedback(null), 7000);
    };

    try {
      try {
        const snap = await fetchSiblingAppsStatus();
        setDevStack({ operation: 'starting', phase: 'running', apps: snap });
      } catch {
        /* first snapshot optional */
      }

      const r = await fetch('/__dev/start-all-apps', { method: 'POST' });
      const j = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        already?: boolean;
        pending?: boolean;
        started?: boolean;
      };

      if (!r.ok && r.status !== 202) {
        setDevStack(null);
        fail(
          r.status === 404
            ? 'Dev controls only work while shopping-portal is running in dev (npm run dev).'
            : 'Could not start other apps.',
        );
        return;
      }

      const pollUntilUp = async () => {
        const deadline = Date.now() + 90_000;
        while (Date.now() < deadline) {
          const apps = await fetchSiblingAppsStatus();
          setDevStack({ operation: 'starting', phase: 'running', apps });
          if (apps.every((a) => a.listening)) {
            setDevStack({ operation: 'starting', phase: 'done', apps });
            scheduleStackPanelClose();
            return;
          }
          await sleep(400);
        }
        const apps = await fetchSiblingAppsStatus();
        setDevStack({ operation: 'starting', phase: 'timeout', apps });
        scheduleStackPanelClose();
      };

      if (j.already) {
        const apps = await fetchSiblingAppsStatus();
        setDevStack({ operation: 'starting', phase: 'done', apps });
        scheduleStackPanelClose();
        return;
      }

      if (j.pending || j.started) {
        await pollUntilUp();
        return;
      }

      await pollUntilUp();
    } catch {
      setDevStack(null);
      fail('Request failed. Is the portal dev server running?');
    }
  };

  const stopAllAppsFromDev = async () => {
    clearStackCloseTimer();
    setHubDevFeedback(null);
    setDevStack({ operation: 'stopping', phase: 'running', apps: null });

    const fail = (msg: string) => {
      setHubDevFeedback(msg);
      window.setTimeout(() => setHubDevFeedback(null), 7000);
    };

    try {
      try {
        const snap = await fetchSiblingAppsStatus();
        setDevStack({ operation: 'stopping', phase: 'running', apps: snap });
      } catch {
        /* optional */
      }

      const r = await fetch('/__dev/stop-all-apps', { method: 'POST' });
      const j = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        pending?: boolean;
        stopped?: boolean;
        noneRunning?: boolean;
        error?: string;
      };

      if (!r.ok) {
        setDevStack(null);
        fail(
          r.status === 404
            ? 'Dev controls only work while shopping-portal is running in dev (npm run dev).'
            : 'Could not stop other apps.',
        );
        return;
      }

      if (j.error === 'stop-not-supported-on-windows') {
        setDevStack(null);
        fail('Stopping from the hub is not supported on Windows; close the sibling processes manually.');
        return;
      }

      const pollUntilDown = async () => {
        const deadline = Date.now() + 45_000;
        while (Date.now() < deadline) {
          const apps = await fetchSiblingAppsStatus();
          setDevStack({ operation: 'stopping', phase: 'running', apps });
          if (apps.every((a) => !a.listening)) {
            setDevStack({ operation: 'stopping', phase: 'done', apps });
            scheduleStackPanelClose();
            return;
          }
          await sleep(350);
        }
        const apps = await fetchSiblingAppsStatus();
        setDevStack({ operation: 'stopping', phase: 'timeout', apps });
        scheduleStackPanelClose();
      };

      if (j.pending) {
        await pollUntilDown();
        return;
      }

      if (j.noneRunning) {
        const apps = await fetchSiblingAppsStatus();
        setDevStack({ operation: 'stopping', phase: 'done', apps });
        scheduleStackPanelClose();
        return;
      }

      await pollUntilDown();
    } catch {
      setDevStack(null);
      fail('Request failed. Is the portal dev server running?');
    }
  };

  if (view === 'webauthn-lab') {
    return <WebAuthnUseCasesLab onBack={() => setView('hub')} />;
  }

  if (view !== 'hub') {
    const cfg = EMBEDDED_SHOP_APPS[view];
    return <PortalEmbeddedApp title={cfg.title} src={cfg.src} onBack={() => setView('hub')} />;
  }

  return (
    <>
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>

      {import.meta.env.DEV ? (
        <>
          <header className="portal-top-bar">
            <div className="portal-top-bar-actions">
              <button type="button" className="portal-top-bar-btn" onClick={() => void startAllAppsFromDev()}>
                Start all apps
              </button>
              <button type="button" className="portal-top-bar-btn portal-top-bar-btn--stop" onClick={() => void stopAllAppsFromDev()}>
                Stop all apps
              </button>
            </div>
            {hubDevFeedback ? <span className="portal-top-bar-feedback">{hubDevFeedback}</span> : null}
          </header>
          {devStack ? (
            <SiblingAppsStackPanel
              operation={devStack.operation}
              phase={devStack.phase}
              apps={devStack.apps}
              headline={devStackHeadline(devStack.operation, devStack.phase)}
            />
          ) : null}
        </>
      ) : null}

      <main
        className={[
          'portal-hub-main',
          import.meta.env.DEV ? 'portal-hub-main--dev-bar' : '',
          import.meta.env.DEV && devStack ? 'portal-hub-main--dev-stack' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <h1 className="title">Platform Hub</h1>
        <p className="subtitle">Select a shopping experience to launch</p>

        <div className="start-panel">
          <p className="start-panel-title">Other dev apps not running?</p>
          <p className="start-panel-hint">
            By default only this hub runs (<code className="inline-code">npm start</code> at the repo root). Use{' '}
            <strong>Start all apps</strong> / <strong>Stop all apps</strong> above (dev only) to start or stop the other Vite apps without using the terminal,
            or copy the command below. For automatic hub-only startup at login, use a Launch Agent (see{' '}
            <code className="inline-code">scripts/com.drsshoppingapp.devservers.plist</code>).
          </p>
          <button type="button" className="start-panel-btn" onClick={() => void copyStartAllCommand()}>
            Copy command to start other apps
          </button>
          {copyFeedback ? <p className="start-panel-feedback">{copyFeedback}</p> : null}
        </div>

        <div className="cards-container">
          <button type="button" className="card card-drs" onClick={() => setView('drs')}>
            <span className="card-icon">🛡️</span>
            <h2 className="card-title">Shop with DRS</h2>
            <p className="card-desc">
              Experience the standard shopping platform secured with Transmit Security's <strong>Risk & Fraud Prevention (DRS)</strong> module.
            </p>
            <span className="card-btn">Open DRS app &rarr;</span>
          </button>

          <button type="button" className="card card-ido" onClick={() => setView('ido')}>
            <span className="card-icon">🌊</span>
            <h2 className="card-title">Shop with IDO</h2>
            <p className="card-desc">
              Experience the extended shopping platform integrated with Transmit Security's <strong>Orchestration (IDO)</strong> SDKs and Journeys.
            </p>
            <span className="card-btn">Open IDO app &rarr;</span>
          </button>

          <button type="button" className="card card-passkey" onClick={() => setView('passkey')}>
            <span className="card-icon">🔑</span>
            <h2 className="card-title">Shop with Passkey</h2>
            <p className="card-desc">
              Experience passwordless authentication with Transmit Security's <strong>WebAuthn/Passkey SDK</strong> for secure biometric login.
            </p>
            <span className="card-btn">Open Passkey app &rarr;</span>
          </button>

          <button type="button" className="card card-passkey card-passkey-only" onClick={() => setView('passkey-only')}>
            <span className="card-icon">🚀</span>
            <h2 className="card-title">Shop with Passkey Only</h2>
            <p className="card-desc">
              Experience the streamlined <strong>Passkey-only</strong> flow. Direct authentication with no fallback.
            </p>
            <span className="card-btn">Open Passkey Only app &rarr;</span>
          </button>

          <button type="button" className="card card-wcl" onClick={() => setView('webauthn-lab')}>
            <span className="card-icon">🧪</span>
            <h2 className="card-title">WebAuthn use cases lab</h2>
            <p className="card-desc">
              Transmit Mosaic WebAuthn (same credentials as the Passkey shop) plus optional raw browser WebAuthn demos — runs inside this hub (no extra port).
            </p>
            <span className="card-btn">Open lab &rarr;</span>
          </button>
        </div>
      </main>
    </>
  );
}

export default App;
