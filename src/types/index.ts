export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'USER' | 'DRIVER';
  createdAt: string;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  awardedAt: string;
}

export interface Rating {
  id: string;
  bookingId: string;
  rating: number;
  comment?: string;
  compliment?: string;
  createdAt: string;
}

export interface DriverProfile {
  tripsCompleted: number;
  overallRating: number;
  totalRatings: number;
  badges: Badge[];
  ratings: Rating[];
  joinDate: string;
}

export interface Driver extends User {
  carModel: string;
  carPlate: string;
  wallet: Wallet;
  profile: DriverProfile;
}

export interface Wallet {
  id: string;
  balance: number;
  pendingBalance: number;
  totalEarnings: number;
}

export interface Route {
  id: string;
  from: string;
  to: string;
  price: number;
  distance: number;
  duration: string;
}

export interface PickupPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  routeId: string;
}

export interface Ride {
  id: string;
  driver: Driver;
  route: Route;
  departureTime: string;
  availableSeats: number;
  totalSeats: number;
  pickupPoints: PickupPoint[];
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
}

export interface Booking {
  id: string;
  user: User;
  ride: Ride;
  pickupPoint: PickupPoint;
  seatCount: number;
  totalPrice: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  rating?: Rating;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: 'BOOKING_PAYMENT' | 'DRIVER_PAYOUT' | 'REFUND';
  amount: number;
  description: string;
  status?: 'PENDING' | 'SUCCESS' | 'FAILED';
  reference?: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User | Driver;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: 'USER' | 'DRIVER';
  carModel?: string;
  carPlate?: string;
}
