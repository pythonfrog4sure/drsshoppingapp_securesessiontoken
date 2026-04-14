/**
 * Loads a sibling dev app (another localhost port) inside the portal, same tab — like WebAuthn lab navigation.
 */
export function PortalEmbeddedApp({
  title,
  src,
  onBack,
}: {
  title: string
  src: string
  onBack: () => void
}) {
  return (
    <div className="portal-embedded-app">
      <header className="portal-embedded-app-bar">
        <button type="button" className="portal-embedded-app-back" onClick={onBack}>
          ← Platform Hub
        </button>
        <span className="portal-embedded-app-title">{title}</span>
      </header>
      <iframe className="portal-embedded-app-frame" title={title} src={src} />
    </div>
  )
}
