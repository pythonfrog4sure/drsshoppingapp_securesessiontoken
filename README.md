# Transmit Security E-Commerce Showcase

A multi-application monorepo demonstrating [Transmit Security](https://developer.transmitsecurity.com/) integrations including DRS (Fraud Prevention), IDO (Identity Orchestration), and Passkey authentication in React + Vite applications.

## Applications

| App | Port | Description |
|-----|------|-------------|
| **Shopping Portal Hub** | https://localhost:3000 | Landing page to navigate between all shopping apps |
| **Shop with DRS** | https://localhost:3001 | Standard login secured with DRS fraud prevention |
| **Shop with IDO** | https://localhost:3002 | Orchestrated login using IDO SDK journeys |
| **Shop with Passkey** | https://localhost:3003 | Passwordless authentication via IDO passkey flow |
| **Shop with Passkey Only** | https://localhost:3004 | Direct WebAuthn SDK only (no IDO orchestration); register + sign-in + autofill |
| **DRS (secure session token)** | https://localhost:3005 | DRS login with `getSecureSessionToken` display for backend APIs |
| **iframe with Passkeys** | https://localhost:3006 | Hosts the Passkey Only app inside an iframe to demo embedded WebAuthn |
| **WebAuthn clone** | https://localhost:3010 | webauthn.me-style raw WebAuthn debugger (no Transmit SDK) |
| **WebAuthn use cases lab** | https://localhost:3000 (embedded) | Interactive Mosaic + raw WebAuthn demos inside the portal hub |

All apps use **`@transmitsecurity/platform-web-sdk` v2.x** (lockfile resolves `2.1.1`). See the [v2 migration guide](https://developer.transmitsecurity.com/sdk-ref/platform/migration) for breaking changes from v1.

---

## Mosaic Test Portal on GitHub

**Repository:** [github.com/pythonfrog4sure/mosaictestportal](https://github.com/pythonfrog4sure/mosaictestportal)

The **shopping-portal** UI can be deployed as a static site with **GitHub Pages** (workflow: `.github/workflows/deploy-mosaictestportal.yml`). The build uses `VITE_BASE_PATH=/mosaictestportal/` so assets resolve under that path.

1. **Clone:** `git clone git@github.com:pythonfrog4sure/mosaictestportal.git`
2. On GitHub: **Settings → Pages →** set the publishing source to **GitHub Actions** (if prompted).
3. Push to `main`; the workflow publishes the hub to **[pythonfrog4sure.github.io/mosaictestportal](https://pythonfrog4sure.github.io/mosaictestportal/)**.

The deployed hub is a **static preview**: embedded shops (`localhost:3001`–`3010`), dev Start/Stop controls, and local HTTPS flows are for **local development** only. Full demos still require running the monorepo on your machine.

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
cp -r shopping-app-passkey/certs shopping-app-drs-secure/
cp -r shopping-app-passkey/certs shopping-app-ido/
cp -r shopping-app-passkey/certs shopping-portal/
cp -r shopping-app-passkey/certs shopping-app-passkey-only/
cp -r shopping-app-passkey/certs shopping-app-iframe-passkey/
cp -r shopping-app-passkey/certs webauthn-me-clone/
```

### 3. Trust the CA Certificate (macOS)

To avoid browser SSL warnings:

```bash
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain shopping-app-passkey/certs/ca.crt
```

### 4. Start the portal (default)

```bash
npm start
```

This starts **shopping-portal** only (the hub on **https://localhost:3000**). Other workspace apps stay stopped until you start them (use **Start all apps** in the hub while running `npm run dev` for shopping-portal, or run `npm run start:all` from the repo root).

To start **every** dev server in one terminal (old behavior):

```bash
npm run start:full
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start **shopping-portal** only (hub on port 3000) |
| `npm run dev` | Alias for `npm start` |
| `npm run start:all` | Start sibling dev apps in the same order as the stack panel (DRS, DRS secure, IDO, passkeys, WebAuthn clone; ports 3001–3005 and 3010); use when the hub is already running |
| `npm run start:full` | Start portal + all sibling apps in one process tree |
| `npm run build` | Build all apps for production |
| `npm install` | Install all workspace dependencies |

---

## Project Structure

```
mosaictestportal/
├── package.json                    # Root monorepo config with workspaces
├── shopping-portal/                # Hub landing page (port 3000)
│   ├── src/
│   │   ├── App.tsx                 # Hub UI, dev stack panel, app links
│   │   ├── webauthn-lab/           # Embedded WebAuthn use cases lab
│   │   ├── drs.ts                  # DRS SDK integration
│   │   └── dev/                    # Dev console + credentials banner
│   └── certs/
├── shopping-app/                   # DRS demo app (port 3001)
├── shopping-app-drs-secure/        # DRS + secure session token (port 3005)
├── shopping-app-ido/               # IDO journey demo (port 3002)
├── shopping-app-passkey/           # IDO + WebAuthn orchestration (port 3003)
├── shopping-app-passkey-only/      # Direct WebAuthn SDK only (port 3004)
├── shopping-app-iframe-passkey/    # iframe host for passkey-only (port 3006)
└── webauthn-me-clone/              # Raw WebAuthn tutorial (port 3010)
```

---

## WebAuthn Use Cases Lab

Open the portal hub and click **WebAuthn use cases lab**. The lab exercises both **Mosaic (Transmit SDK v2.x)** and **raw browser WebAuthn**:

| Tab | API / pattern |
|-----|---------------|
| Mosaic — register | `webauthn.register({ username })` |
| Mosaic — register (options) | `register({ username, options: { registerAsDiscoverable, allowCrossPlatformAuthenticators, displayName, timeout } })` |
| Mosaic — sign in | `webauthn.authenticate.modal({ username })` |
| Mosaic — sign in (identifier) | `authenticate.modal({ identifier, identifierType })` — v2.x alternative to username |
| Mosaic — approve | `webauthn.approve.modal({ username, approvalData })` — passkey-signed transaction approval |
| Mosaic — autofill | `webauthn.authenticate.autofill.activate({ handlers })` / `.abort()` |
| Raw — platform / cross-platform / discoverable | `navigator.credentials.create` with various authenticator options |
| Raw — allowCredentials / discoverable / conditional | `navigator.credentials.get` patterns |

Reference: [WebAuthn SDK modules](https://developer.transmitsecurity.com/sdk-ref/authnsdk/modules)

---

## SDK Integration Details

> **Platform SDK v2.x breaking changes** ([migration guide](https://developer.transmitsecurity.com/sdk-ref/platform/migration)):
> - `serverPath` is **required** for every module (`drs`, `ido`, `webauthn`, `idv`).
> - DRS is **disabled by default** — pass an explicit `drs: { serverPath, ... }` block to enable it.
> - DRS renames: `unidentifiedUser()` → `clearUser()`, `identifyUser()` / `setUser()` → `setAuthenticatedUser()`.
> - WebAuthn methods use a **single parameter object** (e.g. `register({ username })` not `register(username)`).
> - IDO types moved to `@transmitsecurity/platform-web-sdk/ido` subpath exports.

### DRS (Detection & Response Services)

All apps integrate DRS for fraud prevention and risk assessment:

```typescript
// Initialize DRS explicitly (v2.x — not enabled by default)
import { initialize, drs } from '@transmitsecurity/platform-web-sdk';

initialize({
  clientId: DRS_CLIENT_ID,
  drs: {
    serverPath: 'https://api.transmitsecurity.io/risk-collect/',
    enableSessionToken: true,
  },
});

// Report login actions
await drs.triggerActionEvent('login', { claimedUserId, claimedUserIdType: 'account_id' });

// Set authenticated user after successful login (v2.x name)
await drs.setAuthenticatedUser(username);

// Clear user on logout (v2.x name)
await drs.clearUser();

// Get secure session token for backend API calls
const token = await drs.getSecureSessionToken('login', 300);
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

**Available Journeys (by app):**

| App | Journey name | Purpose |
|-----|--------------|---------|
| Shop with IDO | `password_auth_with_conditional_passkey_registration` | Password login + optional passkey registration |
| Shop with Passkey / Passkey Only | `email_passkey_authentication` | Passkey sign-in |
| Shop with Passkey / Passkey Only | `username_email_passkey_registration` | Passkey registration |

### Passkey / WebAuthn

Passkey flows use either **IDO-orchestrated** journeys (Passkey shop) or the **WebAuthn SDK directly** (Passkey Only app):

```typescript
import { webauthn, initialize } from '@transmitsecurity/platform-web-sdk';

// v2.x: single initialize with explicit serverPath per module
await initialize({
  clientId: CLIENT_ID,
  webauthn: { serverPath: 'https://api.transmitsecurity.io' },
});

// Register (v2.x object-parameter pattern)
const encoded = await webauthn.register({
  username: 'user@example.com',
  options: {
    registerAsDiscoverable: true,
    allowCrossPlatformAuthenticators: true,
    displayName: 'Demo User',
    timeout: 60,
  },
});

// Sign in by username
const authResult = await webauthn.authenticate.modal({ username: 'user@example.com' });

// Sign in by identifier (v2.x)
const authById = await webauthn.authenticate.modal({
  identifier: 'user@example.com',
  identifierType: 'email',
});

// Passkey autofill (conditional UI)
webauthn.authenticate.autofill.activate({
  handlers: { onReady, onSuccess, onError },
});

// Transaction approval signed with passkey (v2.x)
const approval = await webauthn.approve.modal({
  username: 'user@example.com',
  approvalData: { amount: '149.99', currency: 'USD', action: 'checkout' },
});
```

When using IDO, submit the encoded result back to the journey:

```typescript
await ido.submitClientResponse('client_input', { webauthn_encoded_result: encoded });
```

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
| WebAuthn | `https://api.transmitsecurity.io` (default paths under `/v1/auth/webauthn/...`) |

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
- [Platform SDK v2 Migration Guide](https://developer.transmitsecurity.com/sdk-ref/platform/migration)
- [Platform SDK Changelog](https://developer.transmitsecurity.com/sdk-ref/platform/changelog)
- [DRS SDK Reference](https://developer.transmitsecurity.com/sdk-ref/platform/modules/drs)
- [IDO SDK Reference](https://developer.transmitsecurity.com/sdk-ref/platform/modules/ido)
- [WebAuthn SDK Reference](https://developer.transmitsecurity.com/sdk-ref/authnsdk/modules)

---

## License

Private - Internal Use Only
