import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { devConsole, type NetworkEvent } from './devConsole';
import { ensureDevStyles } from './devStyles';

export interface CredentialEntry {
  /** Short label shown in the strip (e.g. "DRS clientId"). */
  label: string;
  /** The value. Long strings are word-broken when the panel is expanded. */
  value: string;
}

export interface EndpointEntry {
  label: string;
  url: string;
}

export interface CredentialsBannerProps {
  /** Short app name shown as the first pill. */
  appName: string;
  /** Credentials (client IDs, app IDs, journey names, etc.). */
  credentials: CredentialEntry[];
  /** Configured server URLs the app talks to. */
  endpoints: EndpointEntry[];
  /**
   * Only show recent network calls whose URL matches one of these prefixes.
   * Defaults to all endpoints' origins so noise from local Vite/HMR is hidden.
   */
  endpointHostFilters?: string[];
  /** How many recent calls to show in the expanded view. Default 6. */
  recentLimit?: number;
}

function useNetworkSnapshot(): NetworkEvent[] {
  const snap = useSyncExternalStore(devConsole.subscribe, devConsole.getSnapshot, devConsole.getSnapshot);
  return snap.network;
}

function getOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function CredentialsBanner({
  appName,
  credentials,
  endpoints,
  endpointHostFilters,
  recentLimit = 6,
}: CredentialsBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const network = useNetworkSnapshot();

  useEffect(() => {
    ensureDevStyles(document);
  }, []);

  const allowedOrigins = useMemo(() => {
    if (endpointHostFilters && endpointHostFilters.length) return endpointHostFilters;
    return endpoints
      .map((e) => getOrigin(e.url))
      .filter((o): o is string => Boolean(o));
  }, [endpoints, endpointHostFilters]);

  const recent = useMemo(() => {
    const filtered = network.filter((n) => {
      if (allowedOrigins.length === 0) return true;
      const origin = getOrigin(n.url);
      return origin ? allowedOrigins.some((o) => origin.startsWith(o)) : false;
    });
    return filtered.slice(-recentLimit).reverse();
  }, [network, allowedOrigins, recentLimit]);

  return (
    <div className="dev-banner" aria-label="Configured credentials and endpoints">
      <div
        className="dev-banner-strip"
        onClick={() => setExpanded((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
      >
        <span className="dev-banner-app">{appName}</span>
        {credentials.map((c) => (
          <span className="dev-banner-pill" key={`${c.label}-${c.value}`}>
            <b>{c.label}</b>
            <code>{c.value}</code>
          </span>
        ))}
        <span className="dev-banner-pill" title="Configured server URLs">
          <b>endpoints</b>
          <code>{endpoints.length}</code>
        </span>
        <span className="dev-banner-arrow">{expanded ? '▼ hide details' : '▶ show details'}</span>
      </div>
      {expanded && (
        <div className="dev-banner-detail">
          <section>
            <h4>Configured endpoints</h4>
            <ul>
              {endpoints.map((e) => (
                <li key={`${e.label}-${e.url}`}>
                  <b>{e.label}</b>
                  <code>{e.url}</code>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h4>Recent calls{allowedOrigins.length ? ' (filtered to configured origins)' : ''}</h4>
            <ul>
              {recent.length === 0 ? (
                <li>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Nothing recorded yet. Network calls appear here in real time.
                  </span>
                </li>
              ) : (
                recent.map((n) => {
                  const statusClass = n.error || (n.status && n.status >= 400)
                    ? 'bad'
                    : n.status
                      ? 'ok'
                      : 'pending';
                  return (
                    <li key={n.id} className="dev-net-row">
                      <span className="dev-net-method">{n.method}</span>
                      <span className="dev-net-url" title={n.url}>{n.url}</span>
                      <span className={`dev-net-status ${statusClass}`}>
                        {n.error ? 'ERR' : n.status ?? '…'}
                      </span>
                      <span className="dev-net-duration">
                        {n.durationMs != null ? `${n.durationMs}ms` : ''}
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
