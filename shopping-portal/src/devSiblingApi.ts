import type { SiblingAppSnapshot } from './siblingDevApps';

export async function fetchSiblingAppsStatus(): Promise<SiblingAppSnapshot[]> {
  const r = await fetch('/__dev/sibling-apps-status');
  if (!r.ok) throw new Error(`sibling-apps-status ${r.status}`);
  const j = (await r.json()) as { ok?: boolean; apps?: SiblingAppSnapshot[] };
  return j.apps ?? [];
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
