import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingService } from '../services/api';
import RateDriver from '../components/RateDriver';
import type { Booking, User } from '../types';
import '../styles/Dashboard.css';

const UserDashboard: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const data = await bookingService.getUserBookings();
      setBookings(data);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'status-confirmed';
      case 'PENDING':
        return 'status-pending';
      case 'COMPLETED':
        return 'status-completed';
      case 'CANCELLED':
        return 'status-cancelled';
      default:
        return '';
    }
  };

  const handleRateClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowRatingModal(true);
  };

  const handleRatingSubmitted = () => {
    loadBookings();
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1 className="brand">Stonex</h1>
          <div className="header-actions">
            <span className="user-name">Hello, {user?.name}</span>
            <button onClick={handleLogout} className="btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-hero">
          <h2>Find Your Ride</h2>
          <p>Book affordable shared rides across Lagos</p>
          <button onClick={() => navigate('/book')} className="btn-primary btn-lg">
            Book a Ride
          </button>
        </div>

        <section className="bookings-section">
          <h3>My Bookings</h3>
          {loading ? (
            <div className="loading">Loading your bookings...</div>
          ) : bookings.length === 0 ? (
            <div className="empty-state">
              <p>No bookings yet</p>
              <button onClick={() => navigate('/book')} className="btn-primary">
                Book Your First Ride
              </button>
            </div>
          ) : (
            <div className="bookings-grid">
              {bookings.map((booking) => (
                <div key={booking.id} className="booking-card">
                  <div className="booking-header">
                    <div className="route-info">
                      <h4>
                        {booking.ride.route.from} → {booking.ride.route.to}
                      </h4>
                      <p className="pickup-point">{booking.pickupPoint.name}</p>
                    </div>
                    <span className={`status ${getStatusClass(booking.status)}`}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="booking-details">
                    <div className="detail-row">
                      <span className="label">Departure:</span>
                      <span className="value">{formatDate(booking.ride.departureTime)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Seats:</span>
                      <span className="value">{booking.seatCount}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Driver:</span>
                      <span className="value">{booking.ride.driver.name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Car:</span>
                      <span className="value">{booking.ride.driver.carModel}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Plate Number:</span>
                      <span className="value">{booking.ride.driver.carPlate}</span>
                    </div>
                    {booking.ride.driver.phone && (
                      <div className="detail-row">
                        <span className="label">Driver Phone:</span>
                        <span className="value">
                          <a href={`tel:${booking.ride.driver.phone}`} className="phone-link">
                            {booking.ride.driver.phone}
                          </a>
                        </span>
                      </div>
                    )}
                    <div className="detail-row price-row">
                      <span className="label">Total:</span>
                      <span className="value price">₦{booking.totalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                  {booking.status === 'PENDING' && (
                    <div className="booking-actions">
                      <button className="btn-danger btn-sm">Cancel</button>
                    </div>
                  )}
                  {booking.status === 'COMPLETED' && !booking.rating && (
                    <div className="booking-actions">
                      <button 
                        className="btn-primary btn-sm"
                        onClick={() => handleRateClick(booking)}
                      >
                        Rate Driver
                      </button>
                    </div>
                  )}
                  {booking.rating && (
                    <div className="booking-rating">
                      <span className="rating-label">Your Rating:</span>
                      <span className="rating-stars">
                        {'★'.repeat(booking.rating.rating)}{'☆'.repeat(5 - booking.rating.rating)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {showRatingModal && selectedBooking && (
        <RateDriver
          booking={selectedBooking}
          onRatingSubmitted={handleRatingSubmitted}
          onClose={() => setShowRatingModal(false)}
        />
      )}
    </div>
  );
};

export default UserDashboard;
