import { Badge, Booking, Driver, PickupPoint, Rating, Ride, Route, Transaction, User } from "../types";

export const mockRoutes: Route[] = [
  {
    id: '1',
    from: 'Gbagada',
    to: 'Victoria Island',
    price: 1000,
    distance: 12.5,
    duration: '25-35 mins',
  },
  {
    id: '2',
    from: 'Yaba',
    to: 'Lekki',
    price: 1500,
    distance: 18.3,
    duration: '35-45 mins',
  },
  {
    id: '3',
    from: 'Surulere',
    to: 'Ikoyi',
    price: 800,
    distance: 9.2,
    duration: '20-30 mins',
  },
  {
    id: '4',
    from: 'Ikeja',
    to: 'Marina',
    price: 1200,
    distance: 15.8,
    duration: '30-40 mins',
  },
];

export const mockPickupPoints: Record<string, PickupPoint[]> = {
  '1': [
    { id: 'p1', name: 'Gbagada Phase 1', lat: 6.5449, lng: 3.3774, routeId: '1' },
    { id: 'p2', name: 'Gbagada Phase 2', lat: 6.5369, lng: 3.3869, routeId: '1' },
    { id: 'p3', name: 'Pedro Bus Stop', lat: 6.5504, lng: 3.3727, routeId: '1' },
  ],
  '2': [
    { id: 'p4', name: 'Yaba Bus Stop', lat: 6.5134, lng: 3.3711, routeId: '2' },
    { id: 'p5', name: 'Tejuosho', lat: 6.5144, lng: 3.3621, routeId: '2' },
    { id: 'p6', name: 'Sabo', lat: 6.5089, lng: 3.3799, routeId: '2' },
  ],
  '3': [
    { id: 'p7', name: 'Surulere Stadium', lat: 6.4968, lng: 3.3594, routeId: '3' },
    { id: 'p8', name: 'Barclays', lat: 6.5006, lng: 3.3548, routeId: '3' },
  ],
  '4': [
    { id: 'p9', name: 'Ikeja City Mall', lat: 6.6018, lng: 3.3515, routeId: '4' },
    { id: 'p10', name: 'Computer Village', lat: 6.5954, lng: 3.3376, routeId: '4' },
  ],
};

const mockBadges: Badge[] = [
  {
    id: 'b1',
    name: 'Top Rated',
    icon: '⭐',
    description: 'Maintained a 4.5+ rating for 3 months',
    awardedAt: '2024-03-15T00:00:00Z',
  },
  {
    id: 'b2',
    name: '100 Trips',
    icon: '🏆',
    description: 'Completed 100 successful trips',
    awardedAt: '2024-06-20T00:00:00Z',
  },
  {
    id: 'b3',
    name: 'Safe Driver',
    icon: '🛡️',
    description: 'Zero accidents in 6 months',
    awardedAt: '2024-08-10T00:00:00Z',
  },
  {
    id: 'b4',
    name: 'Punctual Pro',
    icon: '⏰',
    description: '95% on-time arrival rate',
    awardedAt: '2024-09-05T00:00:00Z',
  },
];

const mockRatings: Rating[] = [
  {
    id: 'r1',
    bookingId: 'b1',
    rating: 5,
    compliment: 'Friendly & Polite',
    comment: 'Great driver! Very friendly and the car was clean.',
    createdAt: '2024-10-15T14:30:00Z',
  },
  {
    id: 'r2',
    bookingId: 'b2',
    rating: 5,
    compliment: 'Safe Driver',
    comment: 'Felt very safe throughout the journey. Highly recommend!',
    createdAt: '2024-10-20T09:15:00Z',
  },
  {
    id: 'r3',
    bookingId: 'b3',
    rating: 4,
    compliment: 'On Time',
    comment: 'Arrived exactly on time. Professional service.',
    createdAt: '2024-10-22T16:45:00Z',
  },
  {
    id: 'r4',
    bookingId: 'b4',
    rating: 5,
    compliment: 'Clean Car',
    comment: 'The car was spotless! Great experience.',
    createdAt: '2024-10-25T11:20:00Z',
  },
  {
    id: 'r5',
    bookingId: 'b5',
    rating: 5,
    compliment: 'Great Conversation',
    createdAt: '2024-10-28T08:00:00Z',
  },
];

export const mockDriver: Driver = {
  id: 'd1',
  email: 'driver@example.com',
  name: 'John Doe',
  phone: '+2348012345678',
  role: 'DRIVER',
  carModel: 'Toyota Corolla 2020',
  carPlate: 'ABC-123-XY',
  createdAt: '2024-01-01T00:00:00Z',
  wallet: {
    id: 'w1',
    balance: 25000,
    pendingBalance: 5000,
    totalEarnings: 150000,
  },
  profile: {
    tripsCompleted: 127,
    overallRating: 4.8,
    totalRatings: 115,
    badges: mockBadges,
    ratings: mockRatings,
    joinDate: '2023-06-15T00:00:00Z',
  },
};

export const mockRides: Ride[] = [
  {
    id: 'r1',
    driver: mockDriver,
    route: mockRoutes[0],
    departureTime: new Date(Date.now() + 3600000).toISOString(),
    availableSeats: 2,
    totalSeats: 4,
    pickupPoints: mockPickupPoints['1'],
    status: 'SCHEDULED',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'r2',
    driver: mockDriver,
    route: mockRoutes[1],
    departureTime: new Date(Date.now() + 7200000).toISOString(),
    availableSeats: 4,
    totalSeats: 4,
    pickupPoints: mockPickupPoints['2'],
    status: 'SCHEDULED',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'r3',
    driver: mockDriver,
    route: mockRoutes[2],
    departureTime: new Date(Date.now() + 1800000).toISOString(),
    availableSeats: 1,
    totalSeats: 4,
    pickupPoints: mockPickupPoints['3'],
    status: 'SCHEDULED',
    createdAt: new Date().toISOString(),
  },
];

export const mockUser: User = 
{
  id: 'u1',
  email: 'user@example.com',
  name: 'Jane Smith',
  phone: '+2348087654321',
  role: 'USER',
  createdAt: '2024-01-01T00:00:00Z',
}
export const mockUser2: User = {
  id: 'u2',
  email: 'gilbert@example.com',
  name: 'Gilbert',
  phone: '+2348087654322',
  role: 'USER',
  createdAt: '2024-01-01T00:00:00Z'
}


export let mockBookings: Booking[] = [];

export const mockTransactions: Transaction[] = [
  {
    id: 't1',
    amount: 5000,
    type: 'BOOKING_PAYMENT',
    description: 'Ride from Gbagada to VI',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 't2',
    amount: 3000,
    type: 'DRIVER_PAYOUT',
    description: 'Withdrawal to bank account',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

let bookingCounter = 1;

export const createMockBooking = (data: {
  rideId: string;
  pickupPointId: string;
  seatCount: number;
}): Booking => {
  const ride = mockRides.find(r => r.id === data.rideId);
  const pickupPoint = ride?.pickupPoints.find(p => p.id === data.pickupPointId);
  
  if (!ride || !pickupPoint) {
    throw new Error('Ride or pickup point not found');
  }

  const booking: Booking = {
    id: `b${bookingCounter++}`,
    user: mockUser,
    ride,
    pickupPoint,
    seatCount: data.seatCount,
    totalPrice: ride.route.price * data.seatCount,
    status: 'CONFIRMED',
    paymentStatus: 'PAID',
    createdAt: new Date().toISOString(),
  };

  mockBookings.push(booking);
  
  const rideIndex = mockRides.findIndex(r => r.id === data.rideId);
  if (rideIndex !== -1) {
    mockRides[rideIndex] = {
      ...mockRides[rideIndex],
      availableSeats: mockRides[rideIndex].availableSeats - data.seatCount,
    };
  }

  return booking;
};
