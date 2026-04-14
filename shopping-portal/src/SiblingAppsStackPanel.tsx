import { SIBLING_DEV_APPS, type SiblingAppSnapshot } from './siblingDevApps';

export function SiblingAppsStackPanel({
  operation,
  phase,
  apps,
  headline,
}: {
  operation: 'starting' | 'stopping';
  phase: 'running' | 'done' | 'timeout';
  apps: SiblingAppSnapshot[] | null;
  headline: string;
}) {
  const rows: SiblingAppSnapshot[] =
    apps ??
    SIBLING_DEV_APPS.map((a) => ({
      id: a.id,
      port: a.port,
      label: a.label,
      listening: false,
    }));

  const busy = phase === 'running';

  return (
    <div className="portal-dev-stack-panel" role="status" aria-live="polite" aria-busy={busy}>
      <div className="portal-dev-stack-panel-head">
        <span className="portal-dev-stack-panel-title">{headline}</span>
        {phase === 'timeout' ? (
          <span className="portal-dev-stack-panel-badge portal-dev-stack-panel-badge--warn">Some targets did not finish in time</span>
        ) : null}
      </div>
      <ul className="portal-dev-stack-list">
        {rows.map((app) => {
          let statusLabel = '—';
          let barFillClass = 'portal-dev-stack-bar-fill';
          let indeterminate = false;
          let widthPct: number | null = null;

          if (operation === 'starting') {
            if (app.listening) {
              statusLabel = phase === 'done' ? 'Up' : 'Running';
              widthPct = 100;
              barFillClass += ' portal-dev-stack-bar-fill--up';
            } else if (busy) {
              statusLabel = 'Starting…';
              indeterminate = true;
              barFillClass += ' portal-dev-stack-bar-fill--indeterminate-start';
            } else if (phase === 'timeout') {
              statusLabel = 'Not listening';
              widthPct = 35;
              barFillClass += ' portal-dev-stack-bar-fill--warn';
            } else {
              statusLabel = 'Down';
              widthPct = 0;
            }
          } else {
            if (!app.listening) {
              statusLabel = phase === 'done' ? 'Stopped' : 'Stopped';
              widthPct = 100;
              barFillClass += ' portal-dev-stack-bar-fill--down';
            } else if (busy) {
              statusLabel = 'Stopping…';
              indeterminate = true;
              barFillClass += ' portal-dev-stack-bar-fill--indeterminate-stop';
            } else if (phase === 'timeout') {
              statusLabel = 'Still listening';
              widthPct = 35;
              barFillClass += ' portal-dev-stack-bar-fill--warn';
            } else {
              statusLabel = 'Running';
              widthPct = 100;
              barFillClass += ' portal-dev-stack-bar-fill--up';
            }
          }

          return (
            <li key={app.id} className="portal-dev-stack-row">
              <div className="portal-dev-stack-row-meta">
                <span className="portal-dev-stack-name">{app.label}</span>
                <span className="portal-dev-stack-port">:{app.port}</span>
              </div>
              <div className="portal-dev-stack-bar-track">
                {indeterminate ? (
                  <div className={`${barFillClass} portal-dev-stack-bar-fill--striped`} />
                ) : (
                  <div className={barFillClass} style={{ width: widthPct !== null ? `${widthPct}%` : undefined }} />
                )}
              </div>
              <span className="portal-dev-stack-status">{statusLabel}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
