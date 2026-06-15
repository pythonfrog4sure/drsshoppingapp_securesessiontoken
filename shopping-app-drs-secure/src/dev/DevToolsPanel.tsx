import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { devConsole, type LogEvent, type NetworkEvent } from './devConsole';
import { ensureDevStyles } from './devStyles';

type Tab = 'logs' | 'network';

function useDevConsoleSnapshot() {
  return useSyncExternalStore(devConsole.subscribe, devConsole.getSnapshot, devConsole.getSnapshot);
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

function LogsView({ logs, filter }: { logs: LogEvent[]; filter: string }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => {
    if (!filter) return logs;
    const lower = filter.toLowerCase();
    return logs.filter(
      (l) => l.message.toLowerCase().includes(lower) || l.level.includes(lower),
    );
  }, [logs, filter]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [filtered]);

  return (
    <div className="dev-console-body" ref={bodyRef}>
      {filtered.length === 0 ? (
        <div className="dev-console-empty">No log entries yet.</div>
      ) : (
        filtered.map((l) => (
          <div
            key={l.id}
            className={`dev-console-row dev-console-row--${l.level === 'error' || l.level === 'warn' ? l.level : 'log'}`}
          >
            <span className="dev-console-time">{formatTime(l.ts)}</span>
            <span className={`dev-console-level ${l.level}`}>{l.level}</span>
            <span className="dev-console-msg">{l.message}</span>
          </div>
        ))
      )}
    </div>
  );
}

function NetworkView({ network, filter }: { network: NetworkEvent[]; filter: string }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => {
    if (!filter) return network;
    const lower = filter.toLowerCase();
    return network.filter(
      (n) => n.url.toLowerCase().includes(lower) || n.method.toLowerCase().includes(lower),
    );
  }, [network, filter]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [filtered]);

  return (
    <div className="dev-console-body" ref={bodyRef}>
      {filtered.length === 0 ? (
        <div className="dev-console-empty">No network calls yet.</div>
      ) : (
        filtered.map((n) => {
          const statusClass = n.error || (n.status && n.status >= 400)
            ? 'bad'
            : n.status
              ? 'ok'
              : 'pending';
          return (
            <div key={n.id} className="dev-console-row dev-console-row--net">
              <span className="dev-console-time">{formatTime(n.ts)}</span>
              <span className="dev-console-method">{n.method}</span>
              <span className="dev-console-url" title={n.url}>{n.url}</span>
              <span className={`dev-console-status ${statusClass}`}>
                {n.error ? 'ERR' : n.status ?? '…'}
              </span>
              <span className="dev-console-duration">
                {n.durationMs != null ? `${n.durationMs}ms` : ''}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}

interface ConsoleBodyProps {
  tab: Tab;
  setTab: (t: Tab) => void;
  filter: string;
  setFilter: (s: string) => void;
  variant: 'floating' | 'popout';
  onClear: () => void;
  onClose?: () => void;
  onPopOut?: () => void;
  isPoppedOut?: boolean;
}

function ConsoleBody({
  tab,
  setTab,
  filter,
  setFilter,
  variant,
  onClear,
  onClose,
  onPopOut,
  isPoppedOut,
}: ConsoleBodyProps) {
  const { logs, network } = useDevConsoleSnapshot();
  return (
    <div className={`dev-console dev-console--${variant}`}>
      <div className="dev-console-bar">
        <span className="dev-console-title">Dev Console</span>
        <div className="dev-console-tabs">
          <button
            type="button"
            className={`dev-console-tab ${tab === 'logs' ? 'active' : ''}`}
            onClick={() => setTab('logs')}
          >
            Logs
            <span className="dev-console-count">{logs.length}</span>
          </button>
          <button
            type="button"
            className={`dev-console-tab ${tab === 'network' ? 'active' : ''}`}
            onClick={() => setTab('network')}
          >
            Network
            <span className="dev-console-count">{network.length}</span>
          </button>
        </div>
        <span className="dev-console-spacer" />
        <input
          type="text"
          className="dev-console-filter"
          placeholder="Filter…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button type="button" className="dev-console-btn" onClick={onClear}>
          Clear
        </button>
        {onPopOut && (
          <button
            type="button"
            className="dev-console-btn"
            onClick={onPopOut}
            disabled={isPoppedOut}
            title={isPoppedOut ? 'Already popped out' : 'Open in a separate window'}
          >
            {isPoppedOut ? 'Popped ↗' : 'Pop out ↗'}
          </button>
        )}
        {onClose && (
          <button type="button" className="dev-console-btn" onClick={onClose} title="Minimize">
            ✕
          </button>
        )}
      </div>
      {tab === 'logs' ? (
        <LogsView logs={logs} filter={filter} />
      ) : (
        <NetworkView network={network} filter={filter} />
      )}
    </div>
  );
}

interface PopoutHostProps {
  children: React.ReactNode;
  onClose: () => void;
}

/** Opens a window.open() popup once and portals React content into it. */
function PopoutHost({ children, onClose }: PopoutHostProps) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const w = window.open(
      '',
      'dev-console-popout',
      'width=900,height=600,resizable=yes,scrollbars=yes',
    );
    if (!w) {
      onClose();
      return;
    }
    w.document.title = 'Dev Console';
    w.document.body.style.margin = '0';
    w.document.body.style.background = '#05070f';
    ensureDevStyles(w.document);
    const div = w.document.createElement('div');
    div.style.height = '100vh';
    w.document.body.appendChild(div);
    setContainer(div);

    const handleUnload = () => onClose();
    w.addEventListener('beforeunload', handleUnload);

    const interval = window.setInterval(() => {
      if (w.closed) {
        window.clearInterval(interval);
        onClose();
      }
    }, 500);

    return () => {
      w.removeEventListener('beforeunload', handleUnload);
      window.clearInterval(interval);
      if (!w.closed) w.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!container) return null;
  return createPortal(children, container);
}

export function DevTools() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('logs');
  const [filter, setFilter] = useState('');
  const [poppedOut, setPoppedOut] = useState(false);

  useEffect(() => {
    ensureDevStyles(document);
  }, []);

  const handleClear = () => devConsole.clear();

  const handlePopOut = () => {
    setPoppedOut(true);
    setOpen(false);
  };

  const handlePopoutClose = () => {
    setPoppedOut(false);
  };

  return (
    <>
      {!open && !poppedOut && (
        <button
          type="button"
          className="dev-console-toggle"
          onClick={() => setOpen(true)}
          title="Show developer console"
        >
          ▣ Dev Console
        </button>
      )}
      {open && !poppedOut && (
        <ConsoleBody
          tab={tab}
          setTab={setTab}
          filter={filter}
          setFilter={setFilter}
          variant="floating"
          onClear={handleClear}
          onClose={() => setOpen(false)}
          onPopOut={handlePopOut}
          isPoppedOut={poppedOut}
        />
      )}
      {poppedOut && (
        <PopoutHost onClose={handlePopoutClose}>
          <ConsoleBody
            tab={tab}
            setTab={setTab}
            filter={filter}
            setFilter={setFilter}
            variant="popout"
            onClear={handleClear}
          />
        </PopoutHost>
      )}
    </>
  );
}
