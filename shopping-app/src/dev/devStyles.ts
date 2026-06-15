/**
 * Self-contained CSS for the developer tools (top credentials banner and
 * bottom dev-console panel). Injected once into the main document and once
 * into the popout window so the layouts match in both.
 */

export const DEV_STYLES = `
.dev-banner {
  position: relative;
  z-index: 950;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  background: linear-gradient(180deg, rgba(8, 12, 28, 0.96), rgba(8, 12, 28, 0.85));
  color: rgba(255, 255, 255, 0.85);
  border-bottom: 1px solid rgba(0, 217, 255, 0.35);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
}
.dev-banner-strip {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  cursor: pointer;
  user-select: none;
  font-size: 12px;
  flex-wrap: wrap;
}
.dev-banner-arrow {
  margin-left: auto;
  color: rgba(255, 255, 255, 0.55);
  font-size: 11px;
  letter-spacing: 0.04em;
}
.dev-banner-app {
  font-weight: 700;
  color: #00ff88;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
.dev-banner-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 217, 255, 0.08);
  border: 1px solid rgba(0, 217, 255, 0.25);
  border-radius: 999px;
  padding: 2px 10px;
  color: rgba(255, 255, 255, 0.85);
}
.dev-banner-pill code,
.dev-banner-pill b {
  font-family: inherit;
}
.dev-banner-pill b {
  color: #00d9ff;
  font-weight: 600;
}
.dev-banner-pill code {
  color: rgba(255, 255, 255, 0.9);
  background: transparent;
  font-size: 11.5px;
}
.dev-banner-detail {
  background: rgba(0, 0, 0, 0.55);
  border-top: 1px dashed rgba(0, 217, 255, 0.25);
  padding: 12px 16px;
  font-size: 12px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
  gap: 24px;
}
@media (max-width: 760px) {
  .dev-banner-detail { grid-template-columns: 1fr; }
}
.dev-banner-detail h4 {
  margin: 0 0 6px;
  color: #00ff88;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.dev-banner-detail ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dev-banner-detail li {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: baseline;
  color: rgba(255, 255, 255, 0.85);
}
.dev-banner-detail li b {
  color: #00d9ff;
  font-weight: 600;
  min-width: 90px;
}
.dev-banner-detail li code {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 1px 6px;
  color: rgba(255, 255, 255, 0.9);
  word-break: break-all;
}
.dev-banner-detail .dev-net-row {
  display: grid;
  grid-template-columns: 56px 1fr auto auto;
  gap: 8px;
  align-items: center;
}
.dev-banner-detail .dev-net-method {
  font-weight: 700;
  color: #ffd166;
  font-size: 11px;
  text-align: center;
  background: rgba(255, 209, 102, 0.12);
  border-radius: 4px;
  padding: 1px 4px;
}
.dev-banner-detail .dev-net-url {
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.dev-banner-detail .dev-net-status {
  font-variant-numeric: tabular-nums;
}
.dev-banner-detail .dev-net-status.ok { color: #00ff88; }
.dev-banner-detail .dev-net-status.bad { color: #ff6b6b; }
.dev-banner-detail .dev-net-status.pending { color: rgba(255, 255, 255, 0.5); }
.dev-banner-detail .dev-net-duration {
  color: rgba(255, 255, 255, 0.55);
  font-variant-numeric: tabular-nums;
  font-size: 11px;
}

/* ─── Dev console (floating panel + popout root) ─────────────────────────── */
.dev-console {
  display: flex;
  flex-direction: column;
  background: rgba(8, 12, 28, 0.95);
  color: rgba(255, 255, 255, 0.9);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  border: 1px solid rgba(0, 217, 255, 0.3);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
}
.dev-console--floating {
  position: fixed;
  right: 16px;
  bottom: 16px;
  width: min(560px, calc(100vw - 32px));
  height: min(360px, calc(100vh - 120px));
  z-index: 9999;
}
.dev-console--collapsed {
  height: auto;
}
.dev-console--popout {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  border-radius: 0;
  border: none;
}
.dev-console-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(0, 217, 255, 0.08);
  border-bottom: 1px solid rgba(0, 217, 255, 0.25);
  flex-wrap: wrap;
}
.dev-console-title {
  font-weight: 700;
  color: #00d9ff;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 11px;
}
.dev-console-tabs {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}
.dev-console-tab {
  border: 1px solid transparent;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  padding: 3px 10px;
  font: inherit;
  border-radius: 6px;
  cursor: pointer;
}
.dev-console-tab:hover { background: rgba(255, 255, 255, 0.05); }
.dev-console-tab.active {
  background: rgba(0, 217, 255, 0.18);
  border-color: rgba(0, 217, 255, 0.45);
  color: #fff;
}
.dev-console-count {
  margin-left: 6px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
}
.dev-console-spacer { flex: 1; }
.dev-console-filter {
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  font: inherit;
  padding: 3px 8px;
  border-radius: 6px;
  min-width: 0;
  width: 130px;
}
.dev-console-filter::placeholder { color: rgba(255, 255, 255, 0.4); }
.dev-console-btn {
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.85);
  font: inherit;
  border-radius: 6px;
  padding: 3px 8px;
  cursor: pointer;
}
.dev-console-btn:hover {
  background: rgba(0, 217, 255, 0.15);
  border-color: rgba(0, 217, 255, 0.45);
  color: #fff;
}
.dev-console-btn[disabled] {
  opacity: 0.4;
  cursor: not-allowed;
}
.dev-console-body {
  flex: 1;
  overflow: auto;
  background: rgba(0, 0, 0, 0.55);
  padding: 6px 0;
}
.dev-console-row {
  padding: 3px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  display: grid;
  grid-template-columns: 64px 56px 1fr;
  gap: 8px;
  align-items: baseline;
}
.dev-console-row:last-child { border-bottom: none; }
.dev-console-time {
  color: rgba(255, 255, 255, 0.4);
  font-variant-numeric: tabular-nums;
  font-size: 11px;
}
.dev-console-level {
  font-size: 10.5px;
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.dev-console-level.log { color: rgba(255, 255, 255, 0.7); }
.dev-console-level.info { color: #00d9ff; }
.dev-console-level.warn { color: #ffd166; }
.dev-console-level.error { color: #ff6b6b; }
.dev-console-level.debug { color: rgba(255, 255, 255, 0.45); }
.dev-console-msg {
  white-space: pre-wrap;
  word-break: break-word;
  color: rgba(255, 255, 255, 0.92);
}
.dev-console-row--error .dev-console-msg { color: #ffb4b4; }
.dev-console-row--warn .dev-console-msg { color: #ffe39a; }
.dev-console-row--net {
  grid-template-columns: 64px 56px 1fr 60px 60px;
}
.dev-console-row--net .dev-console-method {
  font-weight: 700;
  color: #ffd166;
  font-size: 11px;
  text-align: center;
  background: rgba(255, 209, 102, 0.12);
  border-radius: 4px;
  padding: 1px 4px;
}
.dev-console-row--net .dev-console-url {
  color: rgba(255, 255, 255, 0.92);
  white-space: pre-wrap;
  word-break: break-all;
}
.dev-console-row--net .dev-console-status {
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.dev-console-row--net .dev-console-status.ok { color: #00ff88; }
.dev-console-row--net .dev-console-status.bad { color: #ff6b6b; }
.dev-console-row--net .dev-console-status.pending { color: rgba(255, 255, 255, 0.5); }
.dev-console-row--net .dev-console-duration {
  color: rgba(255, 255, 255, 0.55);
  font-size: 11px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.dev-console-empty {
  padding: 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
}
.dev-console-toggle {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 9998;
  background: rgba(8, 12, 28, 0.95);
  color: #00d9ff;
  border: 1px solid rgba(0, 217, 255, 0.5);
  border-radius: 999px;
  padding: 8px 14px;
  font: 12px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
}
.dev-console-toggle:hover { background: rgba(0, 217, 255, 0.18); }
`;

const STYLE_ELEMENT_ID = 'dev-tools-stylesheet';

/** Idempotently inject the dev-tools stylesheet into the given document. */
export function ensureDevStyles(doc: Document): void {
  if (doc.getElementById(STYLE_ELEMENT_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ELEMENT_ID;
  style.textContent = DEV_STYLES;
  doc.head.appendChild(style);
}
