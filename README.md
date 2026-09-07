# My Valentine Reveal Project

## Project info

**URL**: https://zingy-creponne-851bec.netlify.app/

## How can I edit this code?

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone https://github.com/Rupesh8299/my-valentine-reveal.git

# Step 2: Navigate to the project directory.
cd my-valentine-reveal

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

### Environment configuration

The frontend reads `VITE_API_URL` and the backend reads `PORT`,
`FRONTEND_ORIGIN`, and `MESSAGE_RECIPIENT_EMAIL`. Copy the example files
before running the split services:

```sh
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

Leave `VITE_API_URL` empty during local development so Vite proxies `/api` to
the backend. Set it to the deployed backend origin when the frontend and
backend run on separate hosts. Songs, illustrations, and fonts are served by
the backend under `/api/assets`.

The backend sends messages through Resend using `RESEND_API_KEY`,
`RESEND_FROM_EMAIL`, and `MESSAGE_RECIPIENT_EMAIL` from `backend/.env`. The
frontend only receives a success response after Resend accepts the submission;
it never receives the recipient or API key. `RESEND_FROM_EMAIL` must be a
verified Resend sender in production. The onboarding sender is limited by
Resend and is intended for testing.

### Private lover pages

The sender flow is separate from the Valentine card message flow:

- `POST /api/auth/register` and `POST /api/auth/login` create an authenticated sender session.
- `POST /api/spaces` creates a private page and returns a seven-day invitation token.
- `/dashboard` lets the signed-in sender create pages and copy invitation links.
- `/invite/:token` validates an invitation before opening the presentation for the assigned lover name.

The SQLite/WASM database is created at `backend/data/app.sqlite` and is ignored by Git.
Set a long random `SESSION_SECRET`; production cookies are marked `Secure` automatically.

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
