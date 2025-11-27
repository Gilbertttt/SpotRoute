# SpotRoute Backend

Express + MySQL backend that powers the SpotRoute frontend (auth, rides, bookings, wallets). Auth tokens are JWT-based and every entity lives inside MySQL so the data is persistent and queryable.

## Features

- `POST /api/auth/register` – Register DRIVER or USER accounts
- `POST /api/auth/login` – Authenticate returning users
- `GET /api/auth/me` – Retrieve the currently authenticated profile
- `GET /api/rides/available` – Public catalog of upcoming rides
- `POST /api/rides` – Drivers publish new rides
- `POST /api/bookings` – Users reserve seats on a ride
- `GET /api/health` – Simple readiness probe

## Setup

```bash
cd backend
cp env.example .env   # set DB + JWT secrets
npm install
npm run dev           # nodemon
```

Required MySQL database (defaults in `.env`):

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=spotroute
```

Grant the configured user CREATE/ALTER rights because the server runs schema migrations automatically on boot (`src/config/database.js`). Default seed routes are inserted the first time.

The frontend already points to `http://localhost:8080/api`. Keep the default `PORT=8080` or update `REACT_APP_API_URL` in the frontend `.env`.

## Folder structure

- `src/index.js` – App entry point + migrator bootstrap
- `src/config/database.js` – MySQL pool + migrations + seed data
- `src/models/*.js` – Entity models (User, Driver, Route, Ride, Booking)
- `src/controllers/*.js` – Request handlers for auth, rides, bookings
- `src/routes/*.js` – HTTP routers
- `src/middleware/*.js` – JWT auth + role guard
- `src/services/tokenService.js` – JWT helpers

## Testing the API

Register + login + fetch current user:

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{ "name":"Ada Lovelace","email":"ada@example.com","password":"Passw0rd!","phone":"+2348012345678","role":"USER" }'

TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "email":"ada@example.com","password":"Passw0rd!" }' | jq -r .token)

curl http://localhost:8080/api/auth/me -H "Authorization: Bearer $TOKEN"
```

Driver publishes a ride and a user books a seat:

```bash
# driver token -> create ride
curl -X POST http://localhost:8080/api/rides \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "routeId":"<route-id>", "departureTime":"2025-01-01T08:00:00Z", "totalSeats":4 }'

# user token -> book ride
curl -X POST http://localhost:8080/api/bookings \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "rideId":"<ride-id>", "seatCount":2 }'
```


