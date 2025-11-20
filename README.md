# SpotRoute

A seat-based pooled ride-sharing platform built with React + TypeScript for the Nigerian market.

## Getting Started

### Prerequisites
- Node.js 20.x
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install --legacy-peer-deps
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Then edit `.env` and add your API keys:
- `REACT_APP_GOOGLE_MAPS_API_KEY` - Get from [Google Cloud Console](https://console.cloud.google.com/)
- `REACT_APP_FLUTTERWAVE_PUBLIC_KEY` - Get from [Flutterwave Dashboard](https://dashboard.flutterwave.com/)

### Running the App

Development server (port 5000):
```bash
npm start
```

Production build:
```bash
npm run build
```

## Features

### User Flow
1. **Login/Register** - Create account as User or Driver
2. **Browse Rides** - View available rides with fixed pricing
3. **Book Seats** - Select route, pickup point, and number of seats
4. **Payment** - Pay via Flutterwave integration
5. **Track Bookings** - View booking history and status

### Driver Flow
1. **Login/Register** - Create driver account with car details
2. **Create Rides** - Select route, pickup points, and departure time
3. **Manage Rides** - View all created rides and their status
4. **Wallet** - Track earnings, view transactions, request payouts

## Tech Stack

- **React 19** with **TypeScript**
- **React Router DOM** for routing
- **Axios** for API calls
- **Google Maps React** for map integration
- **Flutterwave React v3** for payments
- **CSS** for styling (no framework)

## Project Structure

```
frontend/
├── src/
│   ├── pages/              # Page components
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── UserDashboard.tsx
│   │   ├── DriverDashboard.tsx
│   │   ├── BookRide.tsx
│   │   ├── CreateRide.tsx
│   │   └── Wallet.tsx
│   ├── services/           # API services
│   │   ├── api.ts         # API client and endpoints
│   │   └── mockData.ts    # Mock data for development
│   ├── types/             # TypeScript types
│   │   └── index.ts
│   ├── styles/            # CSS files
│   ├── App.tsx            # Main app with routing
│   └── index.tsx          # Entry point
├── public/
└── package.json
```

## Mock Data

The app currently uses mock data for development. Available routes:
- Gbagada → Victoria Island: ₦1,000
- Yaba → Lekki: ₦1,500
- Surulere → Ikoyi: ₦800
- Ikeja → Marina: ₦1,200

## Backend Integration

The frontend is ready to connect to a Java Spring Boot backend. Update `REACT_APP_API_URL` in `.env` to point to your backend API.

Expected backend endpoints are defined in `src/services/api.ts`:
- `POST /auth/login` - User authentication
- `POST /auth/register` - User registration
- `GET /auth/me` - Get current user
- `GET /rides/available` - Get available rides
- `POST /rides` - Create ride (driver)
- `POST /bookings` - Create booking
- `GET /bookings/user/me` - Get user bookings
- `GET /wallet` - Get wallet info
- `POST /wallet/payout` - Request payout
- `POST /payments/initialize` - Initialize payment
- `POST /payments/verify` - Verify payment

## Environment Variables

```env
PORT=5000
REACT_APP_API_URL=http://localhost:8080/api
REACT_APP_GOOGLE_MAPS_API_KEY=your_api_key_here
REACT_APP_FLUTTERWAVE_PUBLIC_KEY=your_public_key_here
WDS_SOCKET_PORT=0
```

## Development Notes

- Host checking is disabled for iframe embedding
- Mock data simulates backend responses
- Payment flow stores references in localStorage
- All currency displays use Nigerian Naira (₦)

## Next Steps

1. Set up Java Spring Boot backend
2. Configure PostgreSQL database
3. Implement backend API endpoints
4. Replace mock data with real API calls
5. Set up Flutterwave webhooks
6. Add real-time features
7. Deploy to production

## License

MIT
