# Shopping App (with Transmit Security DRS)

Simple shopping app with a two-step login (username → password) and [Transmit Security DRS](https://developer.transmitsecurity.com/sdk-ref/platform/modules/drs_overview) (Fraud Prevention) integration.

## Run

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (e.g. http://localhost:5173).

## Login flow

1. **Screen 1:** Enter username → click **Continue**. This reports a login action to Mosaic (username step).
2. **Screen 2:** Enter password → click **Sign in**. This reports again to Mosaic (password step) and, on success, sets the authenticated user for the session.

## DRS integration

- **On login page load:** The SDK is initialized with your client ID and starts collecting telemetry and sending it to Mosaic.
- **On username step (Continue):** `drs.triggerActionEvent('login', …)` is called, then **`drs.getSecureSessionToken('login')`** so Mosaic receives the action and a secure session token (JWT with device binding) is available for your backend.
- **On password step (Sign in):** The same flow runs again; the secure session token is returned for backend use.
- **On logout:** `drs.clearUser()` is called.

### Secure session token

The app uses the **secure session token** (recommended by Mosaic for backend integrations):

- **`getSecureSessionToken(actionType?, expirationSeconds?)`** is exported from `src/drs.ts`. Call it when you need a JWT with device binding to send to your backend (e.g. for the Recommendations API or other Mosaic server calls).
- After each **username** and **password** action, the app also calls `getSecureSessionToken('login', 300)` and the report functions return that token so a future backend can receive it (e.g. in the login API request body or headers).
- Default expiration is 300 seconds (5 minutes); max is 3600. See [DRS SDK reference](https://developer.transmitsecurity.com/sdk-ref/platform/modules/drs#getsecuresessiontoken).

The **client secret** is for **backend-only** use (e.g. OAuth client credentials for the Recommendations API). It is not used in this frontend app.

## Region

The app uses the US endpoint `https://api.transmitsecurity.io/risk-collect/`. For EU, Canada, Australia, or sandbox, change `serverPath` in `src/drs.ts` per the [SDK docs](https://developer.transmitsecurity.com/sdk-ref/platform/modules/drs_overview).
