import { useState } from 'react';
import { clearDrsUser } from './drs';

const PRODUCTS = [
  { id: '1', name: 'Wireless Earbuds', price: 49.99 },
  { id: '2', name: 'USB-C Hub', price: 34.99 },
  { id: '3', name: 'Desk Lamp', price: 29.99 },
  { id: '4', name: 'Notebook Set', price: 12.99 },
  { id: '5', name: 'Water Bottle', price: 24.99 },
];

interface ShopProps {
  username: string;
  onLogout: () => void;
}

export function Shop({ username, onLogout }: ShopProps) {
  const [cart, setCart] = useState<Record<string, number>>({});

  const addToCart = (id: string) => {
    setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  };

  const removeFromCart = (id: string) => {
    setCart((c) => {
      const next = { ...c };
      if (next[id] === 1) delete next[id];
      else if (next[id] != null) next[id]--;
      return next;
    });
  };

  const handleLogout = async () => {
    await clearDrsUser();
    onLogout();
  };

  const totalItems = Object.values(cart).reduce((a, n) => a + n, 0);
  const totalPrice = PRODUCTS.reduce(
    (sum, p) => sum + (cart[p.id] ?? 0) * p.price,
    0
  );

  return (
    <div className="shop">
      <header className="shop-header">
        <h1>Shop</h1>
        <div className="shop-user">
          <span>{username}</span>
          <button type="button" onClick={handleLogout} className="btn btn-ghost">
            Sign out
          </button>
        </div>
      </header>
      <main className="shop-main">
        <section className="products">
          <h2>Products</h2>
          <ul className="product-list">
            {PRODUCTS.map((p) => (
              <li key={p.id} className="product-card">
                <span className="product-name">{p.name}</span>
                <span className="product-price">${p.price.toFixed(2)}</span>
                <div className="product-actions">
                  <button
                    type="button"
                    onClick={() => removeFromCart(p.id)}
                    disabled={!(cart[p.id] > 0)}
                    className="btn btn-sm"
                  >
                    −
                  </button>
                  <span className="product-qty">{cart[p.id] ?? 0}</span>
                  <button
                    type="button"
                    onClick={() => addToCart(p.id)}
                    className="btn btn-sm btn-primary"
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <aside className="cart">
          <h2>Cart</h2>
          {totalItems === 0 ? (
            <p className="cart-empty">Your cart is empty.</p>
          ) : (
            <>
              <ul className="cart-list">
                {PRODUCTS.filter((p) => (cart[p.id] ?? 0) > 0).map((p) => (
                  <li key={p.id}>
                    {p.name} × {cart[p.id]} — ${((cart[p.id] ?? 0) * p.price).toFixed(2)}
                  </li>
                ))}
              </ul>
              <p className="cart-total">Total: ${totalPrice.toFixed(2)}</p>
              <button type="button" className="btn btn-primary btn-block">
                Checkout
              </button>
            </>
          )}
        </aside>
      </main>
    </div>
  );
}
