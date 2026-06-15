/**
 * In-app developer console.
 *
 * - Patches `console.log/info/warn/error/debug` once per page so every entry is
 *   captured into an in-memory ring buffer and also forwarded to the real
 *   console (so DevTools still works as usual).
 * - Patches `window.fetch` so every outgoing request URL/method/status/duration
 *   is captured.
 *
 * The patching is installed once via `devConsole.install()` (idempotent and
 * safe to call from any module). Subscribers receive a notification on every
 * state change.
 */

export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface LogEvent {
  id: string;
  ts: number;
  level: LogLevel;
  message: string;
}

export interface NetworkEvent {
  id: string;
  ts: number;
  method: string;
  url: string;
  status?: number;
  durationMs?: number;
  ok?: boolean;
  error?: string;
}

export interface DevConsoleSnapshot {
  version: number;
  logs: LogEvent[];
  network: NetworkEvent[];
}

const MAX_ENTRIES = 500;

function safeStringify(value: unknown): string {
  if (value == null) return String(value);
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  if (value instanceof Error) return value.stack || `${value.name}: ${value.message}`;
  try {
    const seen = new WeakSet<object>();
    return JSON.stringify(
      value,
      (_key, val) => {
        if (val && typeof val === 'object') {
          if (seen.has(val as object)) return '[Circular]';
          seen.add(val as object);
        }
        if (val instanceof Error) return { name: val.name, message: val.message, stack: val.stack };
        return val;
      },
      2,
    );
  } catch {
    try {
      return String(value);
    } catch {
      return '[unserializable]';
    }
  }
}

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

class DevConsoleStore {
  private installed = false;
  private logs: LogEvent[] = [];
  private network: NetworkEvent[] = [];
  private snapshot: DevConsoleSnapshot = { version: 0, logs: [], network: [] };
  private listeners = new Set<() => void>();

  install(): void {
    if (this.installed) return;
    this.installed = true;
    this.patchConsole();
    this.patchFetch();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): DevConsoleSnapshot => this.snapshot;

  clear(): void {
    this.logs = [];
    this.network = [];
    this.bumpSnapshot();
  }

  private bumpSnapshot(): void {
    this.snapshot = {
      version: this.snapshot.version + 1,
      logs: this.logs,
      network: this.network,
    };
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        // Don't let one listener break the others.
        // eslint-disable-next-line no-console
        console.debug('[devConsole] listener threw', e);
      }
    });
  }

  private addLog(level: LogLevel, args: unknown[]): void {
    const message = args.map(safeStringify).join(' ');
    this.logs = this.logs.concat({ id: makeId(), ts: Date.now(), level, message });
    if (this.logs.length > MAX_ENTRIES) {
      this.logs = this.logs.slice(-MAX_ENTRIES);
    }
    this.bumpSnapshot();
  }

  private addNetwork(event: NetworkEvent): void {
    this.network = this.network.concat(event);
    if (this.network.length > MAX_ENTRIES) {
      this.network = this.network.slice(-MAX_ENTRIES);
    }
    this.bumpSnapshot();
  }

  private updateNetwork(id: string, patch: Partial<NetworkEvent>): void {
    const idx = this.network.findIndex((e) => e.id === id);
    if (idx < 0) return;
    const next = this.network.slice();
    next[idx] = { ...next[idx], ...patch };
    this.network = next;
    this.bumpSnapshot();
  }

  private patchConsole(): void {
    const levels: LogLevel[] = ['log', 'info', 'warn', 'error', 'debug'];
    for (const level of levels) {
      const orig = console[level].bind(console);
      console[level] = (...args: unknown[]) => {
        try {
          this.addLog(level, args);
        } catch {
          // ignore capture errors
        }
        orig(...args);
      };
    }
  }

  private patchFetch(): void {
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;
    const origFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = (
        init?.method ||
        (input instanceof Request ? input.method : undefined) ||
        'GET'
      ).toUpperCase();
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const id = makeId();
      const start = performance.now();
      this.addNetwork({ id, ts: Date.now(), method, url });
      try {
        const res = await origFetch(input as RequestInfo, init);
        this.updateNetwork(id, {
          status: res.status,
          ok: res.ok,
          durationMs: Math.max(0, Math.round(performance.now() - start)),
        });
        return res;
      } catch (err) {
        this.updateNetwork(id, {
          error: err instanceof Error ? err.message : String(err),
          ok: false,
          durationMs: Math.max(0, Math.round(performance.now() - start)),
        });
        throw err;
      }
    };
  }
}

export const devConsole = new DevConsoleStore();
