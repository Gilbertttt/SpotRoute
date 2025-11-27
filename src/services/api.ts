import axios from "axios";
import {
  AuthResponse,
  Booking,
  Driver,
  LoginRequest,
  PickupPoint,
  Rating,
  RegisterRequest,
  Ride,
  Route,
  Transaction,
  User,
  Wallet,
} from "../types";
import {
  createMockBooking,
  mockBookings,
  mockDriver,
  mockPickupPoints,
  mockRides,
  mockRoutes,
  mockTransactions,
  mockUser,
  mockUser2,
} from "./mockData";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080/api";
const USE_MOCK_DATA = process.env.REACT_APP_USE_MOCK_DATA === "true";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const delay = (ms: number = 500) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const authService = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    if (USE_MOCK_DATA) {
      await delay();
      const token = "mock-jwt-token-" + Math.random().toString(36);
      const user = data.email.includes("driver")
        ? mockDriver
        : mockUser || mockUser2;
      return { token, user };
    }
    const response = await api.post<AuthResponse>("/auth/login", data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    if (USE_MOCK_DATA) {
      await delay();
      const token = "mock-jwt-token-" + Math.random().toString(36);
      const user =
        data.role === "DRIVER"
          ? {
              ...mockDriver,
              email: data.email,
              name: data.name,
              phone: data.phone,
            }
          : {
              ...mockUser,
              email: data.email,
              name: data.name,
              phone: data.phone,
            };
      return { token, user };
    }
    const response = await api.post<AuthResponse>("/auth/register", data);
    return response.data;
  },

  getCurrentUser: async (): Promise<User | Driver> => {
    if (USE_MOCK_DATA) {
      await delay();
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        if (userData.role === "DRIVER") {
          return mockDriver;
        }
        return mockUser;
      }
      return mockUser;
    }
    const response = await api.get<User | Driver>("/auth/me");
    return response.data;
  },
};

export const rideService = {
  getAvailableRides: async (from?: string, to?: string): Promise<Ride[]> => {
    if (USE_MOCK_DATA) {
      await delay();
      let rides = [...mockRides];
      if (from) {
        rides = rides.filter((r) =>
          r.route.from.toLowerCase().includes(from.toLowerCase())
        );
      }
      if (to) {
        rides = rides.filter((r) =>
          r.route.to.toLowerCase().includes(to.toLowerCase())
        );
      }
      return rides;
    }
    const response = await api.get<Ride[]>("/rides/available", {
      params: { from, to },
    });
    return response.data;
  },

  getRideById: async (id: string): Promise<Ride> => {
    if (USE_MOCK_DATA) {
      await delay();
      const ride = mockRides.find((r) => r.id === id);
      if (!ride) throw new Error("Ride not found");
      return ride;
    }
    const response = await api.get<Ride>(`/rides/${id}`);
    return response.data;
  },

  createRide: async (data: {
    routeId: string;
    departureTime: string;
    pickupPointIds: string[];
  }): Promise<Ride> => {
    if (USE_MOCK_DATA) {
      await delay();
      const route = mockRoutes.find((r) => r.id === data.routeId);
      if (!route) throw new Error("Route not found");

      const pickupPoints =
        mockPickupPoints[data.routeId]?.filter((p) =>
          data.pickupPointIds.includes(p.id)
        ) || [];

      const newRide: Ride = {
        id: "r" + (mockRides.length + 1),
        driver: mockDriver,
        route,
        departureTime: data.departureTime,
        availableSeats: 4,
        totalSeats: 4,
        pickupPoints,
        status: "SCHEDULED",
        createdAt: new Date().toISOString(),
      };

      mockRides.push(newRide);
      return newRide;
    }
    const response = await api.post<Ride>("/rides", data);
    return response.data;
  },

  getDriverRides: async (): Promise<Ride[]> => {
    if (USE_MOCK_DATA) {
      await delay();
      return mockRides;
    }
    const response = await api.get<Ride[]>("/rides/driver/me");
    return response.data;
  },

  updateRideStatus: async (id: string, status: string): Promise<Ride> => {
    if (USE_MOCK_DATA) {
      await delay();
      const rideIndex = mockRides.findIndex((r) => r.id === id);
      if (rideIndex === -1) throw new Error("Ride not found");
      mockRides[rideIndex] = { ...mockRides[rideIndex], status: status as any };
      return mockRides[rideIndex];
    }
    const response = await api.patch<Ride>(`/rides/${id}/status`, { status });
    return response.data;
  },
};

export const bookingService = {
  createBooking: async (data: {
    rideId: string;
    pickupPointId: string;
    seatCount: number;
  }): Promise<Booking> => {
    if (USE_MOCK_DATA) {
      await delay();
      return createMockBooking(data);
    }
    const response = await api.post<Booking>("/bookings", data);
    return response.data;
  },

  getUserBookings: async (): Promise<Booking[]> => {
    if (USE_MOCK_DATA) {
      await delay();
      return mockBookings;
    }
    const response = await api.get<Booking[]>("/bookings/user/me");
    return response.data;
  },

  getBookingById: async (id: string): Promise<Booking> => {
    if (USE_MOCK_DATA) {
      await delay();
      const booking = mockBookings.find((b) => b.id === id);
      if (!booking) throw new Error("Booking not found");
      return booking;
    }
    const response = await api.get<Booking>(`/bookings/${id}`);
    return response.data;
  },

  cancelBooking: async (id: string): Promise<Booking> => {
    if (USE_MOCK_DATA) {
      await delay();
      const bookingIndex = mockBookings.findIndex((b) => b.id === id);
      if (bookingIndex === -1) throw new Error("Booking not found");
      mockBookings[bookingIndex] = {
        ...mockBookings[bookingIndex],
        status: "CANCELLED" as any,
      };
      return mockBookings[bookingIndex];
    }
    const response = await api.patch<Booking>(`/bookings/${id}/cancel`);
    return response.data;
  },

  rateBooking: async (
    id: string,
    ratingData: {
      rating: number;
      compliment?: string;
      comment?: string;
    }
  ): Promise<Rating> => {
    if (USE_MOCK_DATA) {
      await delay();
      const bookingIndex = mockBookings.findIndex((b) => b.id === id);
      if (bookingIndex === -1) throw new Error("Booking not found");

      const newRating: Rating = {
        id: "rating-" + Math.random().toString(36).substr(2, 9),
        bookingId: id,
        rating: ratingData.rating,
        compliment: ratingData.compliment,
        comment: ratingData.comment,
        createdAt: new Date().toISOString(),
      };

      mockBookings[bookingIndex] = {
        ...mockBookings[bookingIndex],
        rating: newRating,
      };

      const driver = mockBookings[bookingIndex].ride.driver;
      if (driver.profile.ratings) {
        driver.profile.ratings.push(newRating);
      }
      driver.profile.totalRatings += 1;
      driver.profile.overallRating =
        (driver.profile.overallRating * (driver.profile.totalRatings - 1) +
          ratingData.rating) /
        driver.profile.totalRatings;

      return newRating;
    }
    const response = await api.post<Rating>(`/bookings/${id}/rate`, ratingData);
    return response.data;
  },

  getRideBookings: async (rideId: string): Promise<Booking[]> => {
    if (USE_MOCK_DATA) {
      await delay();
      return mockBookings.filter((b) => b.ride.id === rideId);
    }
    const response = await api.get<Booking[]>(`/rides/${rideId}/bookings`);
    return response.data;
  },
};

export const routeService = {
  getAllRoutes: async (): Promise<Route[]> => {
    if (USE_MOCK_DATA) {
      await delay();
      return mockRoutes;
    }
    const response = await api.get<Route[]>("/routes");
    return response.data;
  },

  getPickupPoints: async (routeId: string): Promise<PickupPoint[]> => {
    if (USE_MOCK_DATA) {
      await delay();
      return mockPickupPoints[routeId] || [];
    }
    const response = await api.get<PickupPoint[]>(
      `/routes/${routeId}/pickup-points`
    );
    return response.data;
  },
};

export const walletService = {
  getWallet: async (): Promise<Wallet> => {
    if (USE_MOCK_DATA) {
      await delay();
      return mockDriver.wallet!;
    }
    const response = await api.get<Wallet>("/wallet");
    return response.data;
  },

  getTransactions: async (): Promise<Transaction[]> => {
    if (USE_MOCK_DATA) {
      await delay();
      return mockTransactions;
    }
    const response = await api.get<Transaction[]>("/wallet/transactions");
    return response.data;
  },

  requestPayout: async (amount: number): Promise<Transaction> => {
    if (USE_MOCK_DATA) {
      await delay();
      const transaction: Transaction = {
        id: "t" + (mockTransactions.length + 1),
        amount,
        type: "DRIVER_PAYOUT",
        description: "Payout request",
        status: "SUCCESS",
        createdAt: new Date().toISOString(),
      };
      mockTransactions.push(transaction);
      return transaction;
    }
    const response = await api.post<Transaction>("/wallet/payout", { amount });
    return response.data;
  },
};

export const paymentService = {
  initializePayment: async (
    bookingId: string
  ): Promise<{ reference: string; link: string }> => {
    if (USE_MOCK_DATA) {
      await delay();
      const reference = "FLW-" + Math.random().toString(36).substring(7);
      return {
        reference,
        link: "",
      };
    }
    const response = await api.post<{ reference: string; link: string }>(
      "/payments/initialize",
      {
        bookingId,
      }
    );
    return response.data;
  },

  verifyPayment: async (reference: string): Promise<{ status: string }> => {
    if (USE_MOCK_DATA) {
      await delay();
      return { status: "success" };
    }
    const response = await api.post<{ status: string }>("/payments/verify", {
      reference,
    });
    return response.data;
  },
};

export default api;
