# SpotRoute Backend

Minimal Express backend that powers the SpotRoute frontend auth flows.

## Features

- `POST /api/auth/register` – Register DRIVER or USER accounts
- `POST /api/auth/login` – Authenticate returning users
- `GET /api/auth/me` – Retrieve the currently authenticated profile
- `GET /api/health` – Simple readiness probe

Users are stored inside `data/users.json` so the server can restart without losing accounts. DRIVER registrations automatically get starter vehicle, wallet, and profile data so the frontend can render dashboards immediately.

## Setup

```bash
cd backend
cp env.example .env   # adjust secrets + port if needed
npm install
npm run dev           # or: npm start
```

The frontend already points to `http://localhost:8080/api`. Keep the default `PORT=8080` or update `REACT_APP_API_URL` in the frontend `.env`.

## Folder structure

- `src/index.js` – App entry point
- `src/routes/authRoutes.js` – Auth HTTP routes
- `src/controllers/authController.js` – Business logic
- `src/middleware/authMiddleware.js` – JWT guard
- `src/store/userStore.js` – JSON-based persistence
- `src/services/tokenService.js` – JWT helpers
- `data/users.json` – Simple data store

## Testing the API

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{ "name":"Ada Lovelace","email":"ada@example.com","password":"Passw0rd!","phone":"+2348012345678","role":"USER" }'
```

Use the returned `token` in the `Authorization: Bearer <token>` header to query `/api/auth/me`.


