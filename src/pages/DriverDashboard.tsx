import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { rideService, bookingService } from '../services/api';
import type { Ride, Driver, Booking } from '../types';
import '../styles/Dashboard.css';

const DriverDashboard: React.FC = () => {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [expandedRideId, setExpandedRideId] = useState<string | null>(null);
  const [rideBookings, setRideBookings] = useState<Record<string, Booking[]>>({});
 const navigate = useNavigate()

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setDriver(JSON.parse(userData));
    }

    loadRides();
  }, []);

  const loadRides = async () => {
    try {
      const data = await rideService.getDriverRides();
      setRides(data);
    } catch (error) {
      console.error('Failed to load rides:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartRide = async (rideId: string) => {
    const confirmed = window.confirm('Are you sure you want to start this ride? This will notify all passengers.');
    if (!confirmed) return;

    try {
      await rideService.updateRideStatus(rideId, 'IN_PROGRESS');
      await loadRides();
      toast.success('Ride started! Safe travels!');
    } catch (error) {
      console.error('Failed to start ride:', error);
      toast.error('Failed to start ride. Please try again.');
    }
  };

  const handleCancelRide = async (rideId: string) => {
    const confirmed = window.confirm('Are you sure you want to cancel this ride? Passengers will be notified.');
    if (!confirmed) return;

    try {
      await rideService.updateRideStatus(rideId, 'CANCELLED');
      await loadRides();
      toast.success('Ride cancelled.');
    } catch (error) {
      console.error('Failed to cancel ride:', error);
      toast.error('Failed to cancel ride. Please try again.');
    }
  };

  const handleCompleteRide = async (rideId: string) => {
    const confirmed = window.confirm('Are you sure you want to mark this ride as completed? This action cannot be undone.');
    if (!confirmed) return;

    try {
      await rideService.updateRideStatus(rideId, 'COMPLETED');
      await loadRides();
      toast.success('Ride completed successfully!');
    } catch (error) {
      console.error('Failed to complete ride:', error);
      toast.error('Failed to complete ride. Please try again.');
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
      case 'SCHEDULED':
        return 'status-scheduled';
      case 'IN_PROGRESS':
        return 'status-in-progress';
      case 'COMPLETED':
        return 'status-completed';
      case 'CANCELLED':
        return 'status-cancelled';
      default:
        return '';
    }
  };

  const toggleRideDetails = async (rideId: string) => {
    if (expandedRideId === rideId) {
      setExpandedRideId(null);
    } else {
      setExpandedRideId(rideId);
      if (!rideBookings[rideId]) {
        try {
          const bookings = await bookingService.getRideBookings(rideId);
          setRideBookings(prev => ({ ...prev, [rideId]: bookings }));
        } catch (error) {
          console.error('Failed to load bookings:', error);
        }
      }
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1 className="brand">Stonex</h1>
          <div className="header-actions">
            <button onClick={() => navigate('/wallet')} className="btn-wallet">
              Wallet: ₦{driver?.wallet?.balance.toLocaleString() || '0'}
            </button>
            <span className="user-name">{driver?.name}</span>
            <button onClick={handleLogout} className="btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="dashboard-hero driver-hero">
          <div className="hero-stats">
            <div className="stat-card">
              <h3>₦{driver?.wallet?.totalEarnings.toLocaleString() || '0'}</h3>
              <p>Total Earnings</p>
            </div>
            <div className="stat-card">
              <h3>₦{driver?.wallet?.balance.toLocaleString() || '0'}</h3>
              <p>Available Balance</p>
            </div>
            <div className="stat-card">
              <h3>₦{driver?.wallet?.pendingBalance.toLocaleString() || '0'}</h3>
              <p>Pending</p>
            </div>
            <div className="stat-card profile-card" onClick={() => navigate('/driver/profile')}>
              <h3>{driver?.profile?.overallRating?.toFixed(1) ?? '0.0'} ⭐</h3>
              <p>Driver Rating</p>
              <span className="view-profile-link">View Full Profile →</span>
            </div>
          </div>
          <button onClick={() => navigate('/create-ride')} className="btn-primary btn-lg">
            Create New Ride
          </button>
        </div>

        <section className="rides-section">
          <h3>My Rides</h3>
          {loading ? (
            <div className="loading">Loading your rides...</div>
          ) : rides.length === 0 ? (
            <div className="empty-state">
              <p>No rides created yet</p>
              <button onClick={() => navigate('/create-ride')} className="btn-primary">
                Create Your First Ride
              </button>
            </div>
          ) : (
            <div className="rides-grid">
              {rides.map((ride) => (
                <div key={ride.id} className="ride-card">
                  <div className="ride-header">
                    <div className="route-info">
                      <h4>
                        {ride.route.from} → {ride.route.to}
                      </h4>
                      <p className="route-duration">{ride.route.duration}</p>
                    </div>
                    <span className={`status ${getStatusClass(ride.status)}`}>
                      {ride.status}
                    </span>
                  </div>
                  <div className="ride-details">
                    <div className="detail-row">
                      <span className="label">Departure:</span>
                      <span className="value">{formatDate(ride.departureTime)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Available Seats:</span>
                      <span className="value">
                        {ride.availableSeats} / {ride.totalSeats}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Price per Seat:</span>
                      <span className="value">₦{ride.route.price.toLocaleString()}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Pickup Points:</span>
                      <span className="value">{ride.pickupPoints.length} locations</span>
                    </div>
                    <div className="detail-row price-row">
                      <span className="label">Potential Earnings:</span>
                      <span className="value price">
                        ₦{((ride.totalSeats - ride.availableSeats) * ride.route.price).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {ride.availableSeats < ride.totalSeats && (
                    <div className="view-passengers">
                      <button 
                        className="btn-link"
                        onClick={() => toggleRideDetails(ride.id)}
                      >
                        {expandedRideId === ride.id ? '▼ Hide Passengers' : `▶ View Passengers (${ride.totalSeats - ride.availableSeats})`}
                      </button>
                    </div>
                  )}
                  {expandedRideId === ride.id && rideBookings[ride.id] && (
                    <div className="passengers-section">
                      <h4>Passengers</h4>
                      {rideBookings[ride.id].length === 0 ? (
                        <p className="no-passengers">No passengers yet</p>
                      ) : (
                        <div className="passengers-list">
                          {rideBookings[ride.id].map((booking) => (
                            <div key={booking.id} className="passenger-card">
                              <div className="passenger-info">
                                <div className="passenger-name">
                                  <strong>{booking.user.name}</strong>
                                  <span className={`booking-status ${booking.status.toLowerCase()}`}>
                                    {booking.status}
                                  </span>
                                </div>
                                <div className="passenger-details">
                                  <span>📍 {booking.pickupPoint.name}</span>
                                  <span>🪑 {booking.seatCount} seat{booking.seatCount > 1 ? 's' : ''}</span>
                                </div>
                              </div>
                              <div className="passenger-actions">
                                {booking.user.phone ? (
                                  <a 
                                    href={`tel:${booking.user.phone}`} 
                                    className="btn-call"
                                    title={`Call ${booking.user.name}`}
                                  >
                                    📞 {booking.user.phone}
                                  </a>
                                ) : (
                                  <span className="no-phone">No phone</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {ride.status === 'SCHEDULED' && (
                    <div className="ride-actions">
                      <button 
                        className="btn-success btn-sm"
                        onClick={() => handleStartRide(ride.id)}
                      >
                        Start Ride
                      </button>
                      <button 
                        className="btn-danger btn-sm"
                        onClick={() => handleCancelRide(ride.id)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {ride.status === 'IN_PROGRESS' && (
                    <div className="ride-actions">
                      <button 
                        className="btn-success btn-sm"
                        onClick={() => handleCompleteRide(ride.id)}
                      >
                        Complete Ride
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default DriverDashboard;
