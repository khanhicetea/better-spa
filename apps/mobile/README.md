# KitKit Mobile

Expo SDK 57 client for the KitKit backend. Better Auth owns email/password sessions in
Expo SecureStore, while authenticated application data uses the existing oRPC API.

## Run locally

Install dependencies and prepare the database from the repository root:

```bash
pnpm install
pnpm db:up
pnpm db:migrate
```

### 1. Start the backend on the local network

```bash
HOST=0.0.0.0 pnpm dev
```

Keep this terminal running. The backend uses port `3000`.

### 2. Find the computer's local IP address

On macOS, run:

```bash
ipconfig getifaddr en0
```

For example, if the command prints `192.168.1.50`, the backend URL visible to Expo is
`http://192.168.1.50:3000`. The address may change when reconnecting to Wi-Fi.

### 3. Configure the mobile app

Create or update `apps/mobile/.env.local`:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.50:3000
```

Replace the example IP with the address from the previous step. Do not use `localhost` for
a physical device because it refers to the phone itself.

### 4. Start the iOS Simulator

In a second terminal, restart Expo with a cleared cache so it loads the current environment:

```bash
pnpm --filter @kitkit/mobile exec expo start --ios --clear
```

The simulator and backend terminals must remain running. On boot, the app requests
`/api/health/live` and prints `[API health] connected` or `[API health] unavailable` in the
Expo terminal with the configured URL and request latency. If it cannot connect, open
`http://<LOCAL_IP>:3000/api/health/live` in Simulator Safari to verify that the backend is
reachable.

### Run on a physical iPhone

Connect the Mac and iPhone to the same Wi-Fi network, install Expo Go, and then run:

```bash
pnpm --filter @kitkit/mobile exec expo start --lan --clear
```

Scan the QR code with the iPhone. Keep `EXPO_PUBLIC_API_URL` set to the Mac's local IP.
Production builds must use a publicly reachable HTTPS backend URL.

The app scheme is `kitkit`. The backend trusts this scheme for Better Auth redirects
and trusts Expo's `exp://` origins only while `NODE_ENV=development`.

## Commands

```bash
pnpm --filter @kitkit/mobile start
pnpm --filter @kitkit/mobile ios
pnpm --filter @kitkit/mobile android
pnpm --filter @kitkit/mobile web
pnpm --filter @kitkit/mobile check-types
```
