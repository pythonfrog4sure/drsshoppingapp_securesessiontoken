# Transmit Security E-Commerce Showcase (DRS & IDO)

This repository contains a multi-application showcase demonstrating the integration of [Transmit Security](https://developer.transmitsecurity.com/) into a standard React + Vite shopping application. 

The project has been expanded into three core modules:
1. **🚀 Shopping Portal Hub** (`/shopping-portal`): A sleek landing page to route you to your desired testing environment.
2. **🛡️ Shopping App (DRS)** (`/shopping-app`): The baseline application secured silently by Transmit Security's **Fraud Prevention (DRS)**.
3. **🌊 Shopping App (IDO)** (`/shopping-app-ido`): An advanced orchestration integration actively leveraging Transmit Security's **Identity Orchestration (IDO)** SDK to dynamically render workflows natively within the React component.

## 🏃‍♂️ How to Run

To run all three applications simultaneously, run the following commands in the root directory:

```bash
npm run install:all
npm run dev
```

Open the Hub URL shown in the terminal: **http://localhost:3000** 
*(Note: The apps operate using `@vitejs/plugin-basic-ssl`, so safely bypass the browser's localhost SSL warnings).*

---

## 🏗️ Architecture & SDK Lifecycle

### 1. Initialization (What happens on Page Load?)
When a user navigates to the login screen of either shopping application, the `Login.tsx` component mounts and hits a `useEffect` hook. That hook triggers `initDrs()` (located in `src/drs.ts`).

- **DRS App:** Calls `initialize()` from `@transmitsecurity/platform-web-sdk` and provides the Client ID (`FY7MY...`). This silently spins up the telemetry data-collection engine in the background.
- **IDO App:** Calls `initialize()` but provides *both* the DRS configuration and the `ido` configuration block. It operates against a separate Sandbox Client ID (`-LNkSy...`) and binds specifically to the App ID `XT72jJDvuoGARxOI3dKyf`. 

### 2. Standard Login Flow (DRS Telemetry)
If the user interacts with the standard login forms:
1. **Screen 1 (Username):** User enters their name and clicks **Continue**. The app calls `drs.triggerActionEvent('login', ...)` to tell the TS fraud engine a login attempt has started.
2. **Screen 2 (Password):** User enters password and clicks **Sign In**. The app triggers the same telemetry action and immediately calls `drs.getSecureSessionToken()`.
3. **Backend Communication:** Although this is purely a frontend demo, the app captures that 300-second expiring secure session token (JWT with device binding) which would traditionally be passed identically alongside your API payloads to authenticate against Recommendations or Risk APIs.

### 3. Orchestrated IDO Flow (What happens when a Button is clicked?)
In `shopping-app-ido`, clicking the **"Start IDO Journey"** button circumvents the standard login flow entirely:

1. **Triggering the Journey:** The onClick handler fires `startIdoJourney('password_auth_with_conditional_passkey_registration')`.
2. **Network Request:** The IDO SDK contacts the Transmit Security backend: *"Start the password/passkey journey for this specific client."*
3. **Payload Reception:** The Transmit Security engine responds with deeply nested JSON containing step instructions (i.e. `IdoServiceResponse`).
4. **Dynamic Unpacking:** Our React component (`Login.tsx`) parses the payload to circumvent SDK v1/v2 payload wrapper differences:
    ```typescript
    const activeFlow = resData?.data?.form_schema ? resData.data : resData?.data?.control_flow?.[0] ...
    ```
5. **Dynamic UI Rendering:** Because the server payload indicates `activeFlow.type === "form"`, React instantly hides the standard view. It reads the array `form_schema` sent by the server, looping through it to generate exact HTML `<input>` elements for exactly what Transmit requested (e.g., username, password).
6. **Submission:** Upon clicking the dynamic form's "Submit" button, React pulls all the user inputs and fires `ido.submitClientResponse('client_input', formData)`. The loop begins again as the frontend waits to see if the server tells it to render another step or grants access!

---

## 🔑 Secure Session Token (DRS)
The app strictly abides by fetching a **Secure Session Token** (rather than a standard session token) as recommended by Mosaic for backend integrations. 
* Available exported via **`getSecureSessionToken()`** in `src/drs.ts`.
* Default expiration is 300 seconds; max available is 3600s. See [DRS SDK reference](https://developer.transmitsecurity.com/sdk-ref/platform/modules/drs#getsecuresessiontoken).

*(Note: The Client Secret is for backend-to-backend Oauth and intentionally omitted from this frontend code.)*
