# My Valentine Reveal

A responsive Valentine experience with day-based reveal cards, Liquid Ether effects, private sender/receiver pages, realtime chat, synchronized background gestures, media sharing, and optional dynamic music.

## Project structure

```text
backend/     Express API, SQLite/WASM database, WebSocket relay, assets
frontend/    React + Vite client
```

## Requirements

- Node.js 20 or newer
- npm
- A modern browser

## Install

Install dependencies for both services from the repository root:

```sh
cd backend
npm install

cd ../frontend
npm install
```

## Environment setup

Create the environment files from the included examples:

```sh
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

On Windows PowerShell, use:

```powershell
Copy-Item frontend/.env.example frontend/.env
Copy-Item backend/.env.example backend/.env
```

### Backend environment

Set these values in `backend/.env`:

```env
PORT=3001
FRONTEND_ORIGIN=http://localhost:8080,http://127.0.0.1:8080
SESSION_SECRET=replace-with-a-long-random-secret
```

Resend is optional and is used for card message delivery:

```env
MESSAGE_RECIPIENT_EMAIL=your-email@example.com
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
```

For Supabase authentication, add:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-publishable-anon-key
```

For dynamic music, add a Jamendo client ID:

```env
JAMENDO_CLIENT_ID=your-client-id
MUSIC_PREVIEW_ENABLED=false
```

### Frontend environment

`frontend/.env` can use:

```env
VITE_API_URL=
VITE_DYNAMIC_MUSIC_MODE=radio
```

Leave `VITE_API_URL` empty for local development. Vite proxies API and WebSocket requests to the backend.

To enable Supabase email verification and Google login:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-anon-key
```

Enable Email and Google providers in Supabase, enable email confirmations, and add the application URLs (for example `http://localhost:8080/login`) to the Supabase Auth redirect allowlist.

## Start the application

Run the backend and frontend in separate terminals.

### Terminal 1: backend

```sh
cd backend
npm run dev
```

The API and WebSocket server run at `http://localhost:3001`.

### Terminal 2: frontend

```sh
cd frontend
npm run dev
```

The web app runs at `http://localhost:8080`.

For phone access on the same Wi-Fi network, start Vite on all network interfaces:

```sh
cd frontend
npm run dev -- --host 0.0.0.0
```

Open the displayed network URL on the phone, such as `http://192.168.x.x:8080`. Add that frontend origin to `FRONTEND_ORIGIN` in `backend/.env`, then restart the backend.

## Main routes

| Route | Purpose |
| --- | --- |
| `/` | Public Valentine presentation |
| `/login` | Sender sign-in |
| `/register` | Sender registration |
| `/dashboard` | Create and manage private pages |
| `/invite/:token` | Receiver invitation entry point |
| `/live/:spaceId` | Authenticated sender live page |

Private pages use expiring and revocable invitation links. Their realtime chat history is stored by page ID, so regenerating an invitation does not start a new conversation. Deleting a private page removes its invitation and stored chat history.

## Dynamic music

Music is selected deterministically by Valentine day and mood. Jamendo is used for the optional radio/full-track mode, while preview mode can use the configured preview provider. If dynamic music is unavailable, each day uses its bundled local song.

Set:

```env
VITE_DYNAMIC_MUSIC_MODE=radio
```

or:

```env
VITE_DYNAMIC_MUSIC_MODE=preview
```

Use provider audio only according to the provider’s licensing and API terms.

## Useful commands

```sh
# Frontend type-check
cd frontend
npx tsc --noEmit -p tsconfig.app.json

# Frontend tests
npm test

# Production frontend build
npm run build

# Backend syntax checks
cd ../backend
node --check src/server.js
node --check src/db.js
```

The backend creates its SQLite/WASM database at `backend/data/app.sqlite`. This runtime data is ignored by Git.
