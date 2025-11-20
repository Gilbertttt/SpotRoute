# Spotroute - Seat-Based Pooled Ride-Sharing MVP

## Overview
Spotroute is a pooled ride-sharing platform for the Nigerian market, allowing users to book seats in private cars (e.g., Corollas) with fixed pricing on predefined routes. The platform features smart pickup points, driver wallet management, and integrated payments via Flutterwave.

## Project Structure
```
├── frontend/         # React + TypeScript SPA
│   ├── src/
│   │   ├── pages/           # Main page components
│   │   ├── services/        # API services and mock data
│   │   ├── types/           # TypeScript type definitions
│   │   ├── styles/          # CSS stylesheets
│   │   └── App.tsx          # Main app with routing
├── backend/          # Java Spring Boot REST API (to be implemented)
├── .spotroute
└── spotroute.md
```

## Tech Stack

### Frontend
- **Framework**: React 19 with TypeScript
- **Routing**: React Router DOM v6
- **Maps**: Google Maps React for pickup points and route display
- **Payments**: Flutterwave React v3 for payment processing
- **HTTP Client**: Axios for API communication
- **Auth**: JWT token-based authentication
- **Notifications**: React Toastify for toast notifications

### Backend (To Be Implemented)
- **Framework**: Java Spring Boot
- **Database**: PostgreSQL
- **Payments**: Flutterwave Java SDK
- **Maps**: Google Maps Java API client
- **Security**: Spring Security + JWT

## Current Features (Frontend MVP)

### User Features
- ✅ User registration and login
- ✅ Browse available rides with fixed routes and pricing
- ✅ View ride details with departure times and available seats
- ✅ Select pickup points on interactive Google Maps
- ✅ Book seats (1-4 per booking)
- ✅ View booking history and status
- ✅ Payment integration (UI ready for Flutterwave)
- ✅ Rate drivers after completed rides (1-5 stars)
- ✅ Add compliments and comments to driver ratings
- ✅ **View driver details** - name, car model, plate number, and phone
- ✅ **Click-to-call drivers** - Direct phone call capability from booking cards
- ✅ **Toast notifications** - Modern, non-intrusive feedback for all user actions

### Driver Features
- ✅ Driver registration with car details
- ✅ Create new rides with route selection
- ✅ Select multiple pickup points along routes
- ✅ View all created rides and their status
- ✅ Wallet dashboard showing earnings and balance
- ✅ Transaction history
- ✅ Request payout functionality
- ✅ Comprehensive driver profile with statistics
- ✅ Display total trips completed
- ✅ Show platform tenure (duration driving)
- ✅ Overall star rating from riders
- ✅ Badges and compliments from riders
- ✅ **View passengers** - Expandable passenger list for each ride
- ✅ **Click-to-call passengers** - Call buttons with passenger phone numbers
- ✅ **Toast notifications** - Modern, non-intrusive feedback for all driver actions

### Routes & Pricing (Mock Data)
- Gbagada → Victoria Island: ₦1,000 (12.5 km, 25-35 mins)
- Yaba → Lekki: ₦1,500 (18.3 km, 35-45 mins)
- Surulere → Ikoyi: ₦800 (9.2 km, 20-30 mins)
- Ikeja → Marina: ₦1,200 (15.8 km, 30-40 mins)

## Recent Changes
- **Nov 2, 2025**: Initial frontend setup with React TypeScript
- **Nov 2, 2025**: Implemented all core pages (Login, Register, Dashboards, Booking, Wallet)
- **Nov 2, 2025**: Added API service layer with mock data for development
- **Nov 2, 2025**: Created responsive UI with mobile-first design
- **Nov 2, 2025**: Integrated Google Maps and Flutterwave SDKs
- **Nov 2, 2025**: Fixed booking flow state management using route IDs instead of objects
- **Nov 2, 2025**: Added payment metadata persistence for post-redirect flows
- **Nov 2, 2025**: Implemented full mock data system with REACT_APP_USE_MOCK_DATA flag
- **Nov 2, 2025**: Fixed booking flow - all features now work without backend server
- **Nov 2, 2025**: **Integrated live Flutterwave payment processing for ride bookings**
- **Nov 2, 2025**: Added payment validation, error handling, and tx_ref tracking
- **Nov 2, 2025**: **Implemented real-time seat updates and ride lifecycle management**
- **Nov 2, 2025**: Added driver ride status controls (Start, Complete, Cancel)
- **Nov 2, 2025**: Implemented smart filtering - hide full/in-progress rides from users
- **Nov 2, 2025**: Added automatic seat count refresh after bookings and status changes
- **Nov 3, 2025**: **Implemented comprehensive driver profile system**
- **Nov 3, 2025**: Added driver rating system (1-5 stars with compliments and comments)
- **Nov 3, 2025**: Created profile statistics display (trips, tenure, rating, badges)
- **Nov 3, 2025**: Fixed profile data refresh to show real-time rating updates
- **Nov 3, 2025**: **Implemented driver-passenger communication features**
- **Nov 3, 2025**: Added driver details display for users (name, plate, phone with call buttons)
- **Nov 3, 2025**: Added expandable passenger list for drivers with call functionality
- **Nov 3, 2025**: Implemented defensive rendering for missing phone numbers
- **Nov 3, 2025**: Added getRideBookings service method for driver passenger management
- **Nov 4, 2025**: **Implemented React Toastify for modern toast notifications**
- **Nov 4, 2025**: Replaced all 30+ alert() dialogs with styled toast notifications
- **Nov 4, 2025**: Added custom CSS styling - errors in red, success in green, warnings in orange
- **Nov 4, 2025**: Configured toast container at top-center with 3-second auto-close
- **Nov 4, 2025**: Enhanced UX with non-blocking, accessible notification system

## Mock Data Mode

The frontend currently runs in **mock data mode**, which allows full testing without a backend server.

### How It Works
- Set `REACT_APP_USE_MOCK_DATA=true` in `.env` to enable mock mode (currently enabled)
- All API calls return mock data instead of making HTTP requests
- Bookings, rides, and transactions are stored in memory
- Changes persist during the session but reset on page reload

### Testing Without Backend
With mock mode enabled, you can:
- Login as user: any email (e.g., `user@example.com`) with any password
- Login as driver: any email containing "driver" (e.g., `driver@example.com`) with any password
- Browse and book available rides (only shows SCHEDULED rides with seats available)
- **Test real Flutterwave payment** - uses your configured test API key
- View booking history with real-time updates
- **Rate completed rides** - Submit 1-5 star ratings with optional compliments and comments
- Create rides (driver account)
- **Manage ride lifecycle** - Start, Complete, or Cancel rides
- View wallet and transactions (driver account)
- **View driver profile** - See complete driver statistics and reputation
- **See real-time seat updates** - available seats decrease when booked
- **See real-time rating updates** - driver profiles reflect new ratings immediately

### Flutterwave Payment Integration
The booking flow now uses **live Flutterwave payment processing**:
- Payment modal opens after booking creation
- Supports card, mobile money, USSD, and bank transfer
- Real-time payment status tracking
- Secure transaction reference (tx_ref) storage
- Automatic callback handling for success/failure/cancellation

**Test Mode:** Currently using Flutterwave test key (`FLWPUBK_TEST-...`)
- Use [Flutterwave test cards](https://developer.flutterwave.com/docs/integration-guides/testing-helpers/) for testing
- Test Card: `5531886652142950` | CVV: `564` | PIN: `3310` | OTP: `12345`

### Real-Time Seat Updates & Ride Management
**Seat Availability System:**
- When drivers create rides, they appear with 4 available seats
- When users book seats, available count decreases immediately
- Fully booked rides (0 seats) automatically hide from booking list
- Seat counts refresh after every booking (success, failure, or cancellation)

**Ride Lifecycle (Driver Controls):**
1. **SCHEDULED** - Ride is bookable by users, shows "Start Ride" and "Cancel" buttons
2. **IN_PROGRESS** - Ride started by driver, hidden from user booking, shows "Complete Ride" button
3. **COMPLETED** - Ride finished, no longer appears in active lists
4. **CANCELLED** - Ride cancelled by driver, removed from user booking options

**Smart Filtering:**
- Users only see SCHEDULED rides with available seats > 0
- Rides IN_PROGRESS, COMPLETED, or CANCELLED are hidden from booking
- When selected ride becomes unavailable, user is auto-notified and selection cleared

### Driver Profile & Rating System
**Driver Profiles Display:**
- Total trips completed by the driver
- Tenure with platform (e.g., "2 months with Spotroute")
- Overall star rating calculated from all rider ratings
- Badges earned from rider compliments (Friendly, Safe Driver, Clean Car, etc.)
- Individual rating reviews with comments and timestamps

**Rating System:**
- Users can rate drivers after ride completion (COMPLETED status)
- 1-5 star rating with visual star selector
- 8 predefined compliments: Friendly, Safe Driver, Clean Car, Punctual, Great Conversation, Smooth Ride, Professional, Helpful
- Optional comment field for detailed feedback
- Each rating contributes to driver's overall average
- Badges increment when specific compliments are selected

**Real-Time Profile Updates:**
- Driver profiles fetch fresh data on each view
- New ratings appear immediately in the profile
- Overall rating average updates automatically
- Badge counts reflect the latest compliments

### Switching to Real Backend
To connect to a real backend:
1. Set `REACT_APP_USE_MOCK_DATA=false` in `.env`
2. Set `REACT_APP_API_URL` to your backend server URL
3. Restart the frontend

## Environment Variables Required

### Frontend (.env)
```
PORT=5000
REACT_APP_API_URL=http://localhost:8080/api
REACT_APP_USE_MOCK_DATA=true
REACT_APP_GOOGLE_MAPS_API_KEY=<your_google_maps_api_key>
REACT_APP_FLUTTERWAVE_PUBLIC_KEY=<your_flutterwave_public_key>
WDS_SOCKET_PORT=0
```

### Backend (application.properties) - To Be Configured
```
spring.datasource.url=jdbc:postgresql://localhost:5432/spotroute
flutterwave.secret.key=<your_flutterwave_secret_key>
google.maps.api.key=<your_google_maps_api_key>
jwt.secret=<your_jwt_secret>
```

## Installation & Setup

### Frontend
```bash
cd frontend
npm install
npm start
```

The app will run on port 3000 by default.

### Backend (Not Yet Implemented)
The Java Spring Boot backend needs to be set up with:
- Spring Boot Starter Web
- Spring Boot Starter Data JPA
- PostgreSQL Driver
- Spring Security + JWT
- Flutterwave Java SDK
- Google Maps Java Client

## Next Steps

### Immediate Backend Tasks
1. Set up Spring Boot project structure
2. Configure PostgreSQL database connection
3. Create entity models (User, Driver, Route, Ride, Booking, etc.)
4. Implement Spring Security with JWT authentication
5. Create REST API endpoints matching frontend service calls
6. Integrate Flutterwave payment processing
7. Add Google Maps API for route validation

### Future Enhancements
- Real-time ride tracking with GPS
- Push notifications for ride updates
- Admin dashboard for route management
- Automated payout scheduling
- SMS notifications via Twilio
- Email confirmations
- Driver verification system
- Driver response to ratings
- Filtering rides by driver rating
- Top-rated drivers showcase

## User Preferences
- Focus on MVP features first
- Build frontend before backend
- Use Nigerian Naira (₦) currency
- Target Nigerian market (Lagos routes)
- Clean, mobile-responsive design
- Fixed pricing model (no surge pricing)

## Architecture Decisions

### Why React + TypeScript?
- Type safety prevents runtime errors
- Better IDE support and autocomplete
- Easier refactoring and maintenance

### Why Mock Data First?
- Allows frontend development independently
- Faster iteration and testing
- Easy to replace with real API calls later

### Why Flutterwave?
- Popular payment gateway in Nigeria
- Supports Naira transactions
- Good documentation and SDK support

### Why Google Maps?
- Accurate Nigerian location data
- Familiar interface for users
- Rich API for pickup point selection

## Database Schema (Planned)

### Core Tables
- `users` - User accounts (riders and drivers)
- `routes` - Predefined routes with fixed pricing
- `pickup_points` - Smart pickup locations for each route
- `rides` - Driver-created ride instances
- `bookings` - User seat reservations
- `wallets` - Driver earnings and balances
- `transactions` - Payment and payout records

## Notes
- Currently using mock data for development
- All API calls will fail until backend is implemented
- Payment flow is UI-only until Flutterwave is configured
- Google Maps requires API key to display maps
- React 19 compatibility required `--legacy-peer-deps` for some packages
