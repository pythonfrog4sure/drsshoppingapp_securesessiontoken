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
  return (
    <div className="shop">
      <header className="shop-header">
        <h1>Shop with Passkey</h1>
        <div className="shop-user">
          <span>Welcome, <strong>{username}</strong></span>
          <button onClick={onLogout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </header>

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
