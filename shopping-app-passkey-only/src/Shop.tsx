import { useCallback, useEffect, useState } from 'react';
import { clearDrsUser, formatSecureTokenPreview, getSecureSessionToken } from './drs';

interface ShopProps {
  username: string;
  onLogout: () => void;
}

const products = [
  { id: 1, name: 'Wireless Headphones', price: 79.99, emoji: '🎧' },
  { id: 2, name: 'Smart Watch', price: 199.99, emoji: '⌚' },
  { id: 3, name: 'Laptop Stand', price: 49.99, emoji: '💻' },
  { id: 4, name: 'Mechanical Keyboard', price: 129.99, emoji: '⌨️' },
  { id: 5, name: 'USB-C Hub', price: 59.99, emoji: '🔌' },
  { id: 6, name: 'Webcam HD', price: 89.99, emoji: '📷' },
];

export function Shop({ username, onLogout }: ShopProps) {
  const [secureToken, setSecureToken] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const refreshSecureToken = useCallback(async () => {
    setTokenLoading(true);
    const token = await getSecureSessionToken('login', 300);
    setSecureToken(token);
    setTokenLoading(false);
  }, []);

  useEffect(() => {
    void refreshSecureToken();
  }, [refreshSecureToken, username]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await clearDrsUser();
    } catch (e) {
      console.warn('Failed to clear DRS user on logout', e);
    } finally {
      setSecureToken(null);
      setLoggingOut(false);
      onLogout();
    }
  };

  const handleCopyToken = async () => {
    if (!secureToken) return;
    try {
      await navigator.clipboard.writeText(secureToken);
    } catch (e) {
      console.warn('Clipboard copy failed', e);
    }
  };

  return (
    <div className="shop">
      <header className="shop-header">
        <h1>Shop with Passkey</h1>
        <div className="shop-user">
          <span>Welcome, <strong>{username}</strong></span>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="btn btn-secondary btn-sm"
          >
            {loggingOut ? 'Signing out…' : 'Logout'}
          </button>
        </div>
      </header>

      <section className="shop-secure-token" aria-label="Secure session token for backend">
        <div className="shop-secure-token-row">
          <span className="shop-secure-token-title">getSecureSessionToken( &apos;login&apos; )</span>
          {tokenLoading ? (
            <span className="shop-secure-token-muted">Loading…</span>
          ) : secureToken ? (
            <>
              <code className="shop-secure-token-preview" title={secureToken}>
                {formatSecureTokenPreview(secureToken)}
              </code>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => void refreshSecureToken()}
              >
                Refresh
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => void handleCopyToken()}
              >
                Copy
              </button>
            </>
          ) : (
            <span className="shop-secure-token-muted">No token — try Refresh</span>
          )}
        </div>
        <p className="shop-secure-token-hint">
          Device-bound session token issued by Transmit DRS. Send the full value from your app server to Mosaic APIs (e.g. risk Recommendations). Cleared on Logout.
        </p>
      </section>

      <main className="shop-main">
        <h2>Featured Products</h2>
        <div className="products-grid">
          {products.map((product) => (
            <div key={product.id} className="product-card">
              <span className="product-emoji">{product.emoji}</span>
              <h3 className="product-name">{product.name}</h3>
              <p className="product-price">${product.price.toFixed(2)}</p>
              <button className="btn btn-primary">Add to Cart</button>
            </div>
          ))}
        </div>
      </main>

      <footer className="shop-footer">
        <p>Secured with Transmit Security Passkey Authentication</p>
      </footer>
    </div>
  );
}
