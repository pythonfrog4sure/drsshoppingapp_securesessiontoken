# Transmit Security E-Commerce Showcase

A multi-application monorepo demonstrating [Transmit Security](https://developer.transmitsecurity.com/) integrations including DRS (Fraud Prevention), IDO (Identity Orchestration), and Passkey authentication in React + Vite applications.

## Applications

| App | Port | Description |
|-----|------|-------------|
| **Shopping Portal Hub** | https://localhost:3000 | Landing page to navigate between all shopping apps |
| **Shop with DRS** | https://localhost:3001 | Standard login secured with DRS fraud prevention |
| **Shop with IDO** | https://localhost:3002 | Orchestrated login using IDO SDK journeys |
| **Shop with Passkey** | https://localhost:3003 | Passwordless authentication via IDO passkey flow |

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This installs all dependencies for the monorepo and all workspace apps.

### 2. Set Up SSL Certificates (Required for HTTPS)

All apps run on HTTPS which is required for WebAuthn/Passkeys. Generate local CA certificates:

```bash
# Create certs directory
mkdir -p shopping-app-passkey/certs
cd shopping-app-passkey/certs

# Generate CA private key
openssl genrsa -out ca.key 4096

# Generate CA certificate
openssl req -x509 -new -nodes -key ca.key -sha256 -days 365 -out ca.crt \
  -subj "/C=US/ST=California/L=San Francisco/O=Local Dev CA/CN=Local Development CA"

# Generate server private key
openssl genrsa -out server.key 2048

# Create server config for localhost
cat > server.conf << 'EOF'
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = California
L = San Francisco
O = Local Dev
CN = localhost

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

# Generate CSR and sign with CA
openssl req -new -key server.key -out server.csr -config server.conf
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt -days 365 -sha256 -extensions v3_req -extfile server.conf

cd ../..

# Copy certs to all apps
cp -r shopping-app-passkey/certs shopping-app/
cp -r shopping-app-passkey/certs shopping-app-ido/
cp -r shopping-app-passkey/certs shopping-portal/
```

### 3. Trust the CA Certificate (macOS)

To avoid browser SSL warnings:

```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain shopping-app-passkey/certs/ca.crt
```

### 4. Start All Applications

```bash
npm start
```

This starts all 4 apps concurrently with color-coded output:
- **[portal]** (blue) - Shopping Portal Hub
- **[drs]** (green) - Shop with DRS
- **[ido]** (magenta) - Shop with IDO
- **[passkey]** (cyan) - Shop with Passkey

Open **https://localhost:3000** to access the portal hub.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start all apps concurrently |
| `npm run dev` | Alias for `npm start` |
| `npm run build` | Build all apps for production |
| `npm install` | Install all workspace dependencies |

---

## Project Structure

```
drsshoppingapp_securesessiontoken/
├── package.json              # Root monorepo config with workspaces
├── shopping-portal/          # Hub landing page (port 3000)
│   ├── src/
│   │   ├── App.tsx          # Hub UI with app links
│   │   ├── drs.ts           # DRS SDK integration
│   │   └── index.css        # Styling
│   ├── certs/               # SSL certificates (gitignored)
│   └── vite.config.ts       # Vite config with HTTPS
├── shopping-app/             # DRS demo app (port 3001)
│   ├── src/
│   │   ├── Login.tsx        # Two-step login with DRS tracking
│   │   ├── Shop.tsx         # Shop UI after login
│   │   └── drs.ts           # DRS SDK integration
│   └── certs/
├── shopping-app-ido/         # IDO demo app (port 3002)
│   ├── src/
│   │   ├── Login.tsx        # Dynamic IDO journey rendering
│   │   ├── Shop.tsx         # Shop UI after login
│   │   └── drs.ts           # DRS SDK integration
│   └── certs/
└── shopping-app-passkey/     # Passkey demo app (port 3003)
    ├── src/
    │   ├── Login.tsx        # Passkey IDO flow
    │   ├── Shop.tsx         # Shop UI after login
    │   └── drs.ts           # DRS SDK integration
    └── certs/
```

---

## SDK Integration Details

### DRS (Detection & Response Services)

All apps integrate DRS for fraud prevention and risk assessment:

```typescript
// Initialize DRS on page load
import { initDrs } from './drs';
useEffect(() => { initDrs(); }, []);

// Report login actions
await reportUsernameAction(username);
await reportPasswordAction(username);

// Set authenticated user after successful login
await setAuthenticatedUser(username);

// Get secure session token for backend API calls
const token = await getSecureSessionToken('login', 300);
```

**DRS tracks:**
- Device fingerprinting
- Behavioral biometrics
- Login attempts and user actions
- Session binding with secure tokens

### IDO (Identity Orchestration)

The IDO SDK enables server-driven authentication flows:

```typescript
import { ido, initialize } from '@transmitsecurity/platform-web-sdk';

// Initialize IDO
await initialize({
  clientId: CLIENT_ID,
  ido: {
    applicationId: APP_ID,
    serverPath: 'https://api.transmitsecurity.io/ido'
  }
});

// Start a journey
const response = await ido.startJourney('journey_name');

// Submit form data
const response = await ido.submitClientResponse('client_input', formData);
```

**Available Journeys:**
- `password_auth_with_conditional_passkey_registration` - Password + optional passkey

### Passkey / WebAuthn

Passkey authentication is handled via IDO journeys for orchestrated passkey flows.

---

## Configuration

### Client IDs

| SDK | Client ID | Usage |
|-----|-----------|-------|
| DRS | `FY7MYqSinvz2CzfqZzNhe` | Fraud detection |
| IDO | `-LNkSyvmbee08fv7e9_p9` | Orchestration |
| IDO App ID | `XT72jJDvuoGARxOI3dKyf` | Journey binding |

### Server Paths

| Service | URL |
|---------|-----|
| DRS | `https://api.transmitsecurity.io/risk-collect/` |
| IDO | `https://api.transmitsecurity.io/ido` |

---

## Development

### Adding a New App

1. Create a new directory: `shopping-app-newfeature/`
2. Copy structure from existing app
3. Add to `workspaces` in root `package.json`
4. Copy SSL certs: `cp -r shopping-app-passkey/certs shopping-app-newfeature/`
5. Update vite.config.ts with unique port
6. Run `npm install` to link workspace

### SSL Certificate Notes

- Certificates are in `certs/` directories (gitignored)
- Each app needs its own copy of the certs
- Certs are valid for 365 days
- Regenerate if expired using the commands above

---

## Troubleshooting

### SSL Certificate Errors
- Ensure certs are generated and copied to all apps
- Trust the CA certificate in your system keychain
- Clear browser cache and restart browser

### Port Already in Use
- Check for running processes: `lsof -i :3000`
- Kill process: `kill -9 <PID>`

### SDK Initialization Errors
- Verify client IDs are correct
- Check network connectivity to Transmit Security APIs
- Ensure HTTPS is properly configured (required for WebAuthn)

### WebAuthn/Passkey Errors
- WebAuthn requires HTTPS (localhost with valid certs works)
- Ensure browser supports WebAuthn
- Check Transmit Security console for WebAuthn configuration

---

## Resources

- [Transmit Security Developer Portal](https://developer.transmitsecurity.com/)
- [DRS SDK Reference](https://developer.transmitsecurity.com/sdk-ref/platform/modules/drs)
- [IDO SDK Reference](https://developer.transmitsecurity.com/sdk-ref/platform/modules/ido)
- [WebAuthn SDK Reference](https://developer.transmitsecurity.com/sdk-ref/webauthn/interfaces/webauthnsdk/)

---

## License

Private - Internal Use Only
