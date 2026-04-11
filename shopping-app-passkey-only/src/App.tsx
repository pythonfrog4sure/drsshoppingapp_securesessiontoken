import { useState } from 'react';
import { Login } from './Login';
import { Shop } from './Shop';

export default function App() {
  const [user, setUser] = useState<string | null>(null);

  if (user) {
    return <Shop username={user} onLogout={() => setUser(null)} />;
  }
  return <Login onLogin={setUser} />;
}
