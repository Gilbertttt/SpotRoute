import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import GoogleMapReact from 'google-map-react';
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';
import { bookingService, rideService } from '../services/api';
import { mockRoutes } from '../services/mockData';
import type { Ride, Route, PickupPoint } from '../types';
import '../styles/BookRide.css';

const Marker: React.FC<{ lat: number; lng: number; text: string }> = ({ text }) => (
  <div className="map-marker">{text}</div>
);

const BookRide: React.FC = () => {
  const [routes] = useState<Route[]>(mockRoutes);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [availableRides, setAvailableRides] = useState<Ride[]>([]);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [selectedPickupPoint, setSelectedPickupPoint] = useState<PickupPoint | null>(null);
  const [seatCount, setSeatCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
  const FLUTTERWAVE_PUBLIC_KEY = process.env.REACT_APP_FLUTTERWAVE_PUBLIC_KEY || '';

  const selectedRoute = routes?.find(r => r.id === selectedRouteId) || null;

  const getUserData = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        return JSON.parse(userStr);
      }
    } catch (error) {
      console.error('Failed to parse user data:', error);
    }
    return { email: 'user@example.com', name: 'Guest User', phone: '+234' };
  };

  const user = getUserData();

  const totalAmount = (selectedRoute?.price || 0) * seatCount;

  const flutterwaveConfig = {
    public_key: FLUTTERWAVE_PUBLIC_KEY,
    tx_ref: `STX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    amount: totalAmount,
    currency: 'NGN',
    payment_options: 'card,mobilemoney,ussd,banktransfer',
    customer: {
      email: user.email,
      phone_number: user.phone,
      name: user.name,
    },
    customizations: {
      title: 'Stonex Ride Booking',
      description: `Booking for ${selectedRoute?.from} to ${selectedRoute?.to}`,
      logo: 'https://stonex-rides.com/logo.png',
    },
  };

  const handleFlutterwavePayment = useFlutterwave(flutterwaveConfig);

  useEffect(() => {
    const loadRides = async () => {
      if (selectedRouteId) {
        setLoading(true);
        try {
          const allRides = await rideService.getAvailableRides();
          const rides = allRides.filter((r: Ride) => 
            r.route.id === selectedRouteId && 
            r.status === 'SCHEDULED' && 
            r.availableSeats > 0
          );
          setAvailableRides(rides);
          
          if (selectedRide) {
            const updatedSelectedRide = allRides.find((r: Ride) => r.id === selectedRide.id);
            if (updatedSelectedRide && (updatedSelectedRide.availableSeats === 0 || updatedSelectedRide.status !== 'SCHEDULED')) {
              setSelectedRide(null);
              setSelectedPickupPoint(null);
              if (updatedSelectedRide.availableSeats === 0) {
                toast.warning('This ride is now fully booked!');
              } else {
                toast.warning('This ride is no longer available for booking');
              }
            } else if (updatedSelectedRide) {
              setSelectedRide(updatedSelectedRide);
            }
          }
        } catch (error) {
          console.error('Failed to load rides:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setAvailableRides([]);
      }
    };
    
    loadRides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRouteId, refreshKey]);

  const handleRouteSelect = (route: Route) => {
    setSelectedRouteId(route.id);
    setSelectedRide(null);
    setSelectedPickupPoint(null);
  };

  const handleRideSelect = (ride: Ride) => {
    setSelectedRide(ride);
    setSelectedPickupPoint(null);
  };

  const handleBooking = async () => {
    if (!selectedRide || !selectedPickupPoint) {
      toast.warning('Please select a pickup point');
      return;
    }

    if (selectedRide.availableSeats === 0) {
      toast.error('Sorry, this ride is fully booked!');
      return;
    }

    if (seatCount > selectedRide.availableSeats) {
      toast.warning(`Only ${selectedRide.availableSeats} seat(s) available`);
      return;
    }

    if (selectedRide.status !== 'SCHEDULED') {
      toast.warning('This ride is no longer available for booking');
      return;
    }

    if (!FLUTTERWAVE_PUBLIC_KEY) {
      toast.error('Payment system is not configured. Please contact support.');
      return;
    }

    setLoading(true);
    try {
      const booking = await bookingService.createBooking({
        rideId: selectedRide.id,
        pickupPointId: selectedPickupPoint.id,
        seatCount,
      });

      localStorage.setItem('lastBookingId', booking.id);

      const txRef = flutterwaveConfig.tx_ref;
      localStorage.setItem('lastPaymentReference', txRef);

      try {
        handleFlutterwavePayment({
          callback: (response) => {
            console.log('Payment response:', response);
            closePaymentModal();
            
            if (response.status === 'successful') {
              setRefreshKey(prev => prev + 1);
              toast.success('Payment successful! Your booking is confirmed.');
              navigate('/user', { 
                state: { 
                  bookingId: booking.id, 
                  paymentReference: txRef,
                  success: true 
                } 
              });
            } else if (response.status === 'cancelled') {
              toast.warning('Payment was cancelled. Your booking is pending payment.');
              setRefreshKey(prev => prev + 1);
              navigate('/user');
            } else {
              toast.error('Payment failed. Please try again.');
              setRefreshKey(prev => prev + 1);
            }
            setLoading(false);
          },
          onClose: () => {
            console.log('Payment modal closed');
            setLoading(false);
          },
        });
      } catch (paymentError) {
        console.error('Payment initialization failed:', paymentError);
        toast.error('Failed to initialize payment. Please check your payment configuration.');
        setRefreshKey(prev => prev + 1);
        setLoading(false);
      }
    } catch (error) {
      console.error('Booking failed:', error);
      toast.error('Booking failed. Please try again.');
      setRefreshKey(prev => prev + 1);
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-NG', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const mapCenter = selectedPickupPoint
    ? { lat: selectedPickupPoint.lat, lng: selectedPickupPoint.lng }
    : { lat: 6.5244, lng: 3.3792 };

  return (
    <div className="book-ride">
      <header className="page-header">
        <button onClick={() => navigate('/user')} className="btn-back">
          ← Back
        </button>
        <h1>Book a Ride</h1>
      </header>

      <div className="booking-container">
        <div className="booking-sidebar">
          <section className="route-selection">
            <h2>Select Route</h2>
            <div className="routes-list">
              {routes.map((route) => (
                <div
                  key={route.id}
                  className={`route-option ${selectedRoute?.id === route.id ? 'selected' : ''}`}
                  onClick={() => handleRouteSelect(route)}
                >
                  <div className="route-name">
                    <strong>{route.from}</strong> → <strong>{route.to}</strong>
                  </div>
                  <div className="route-info">
                    <span className="price">₦{route.price.toLocaleString()}</span>
                    <span className="duration">{route.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {selectedRoute && (
            <section className="ride-selection">
              <h2>Available Rides</h2>
              {loading ? (
                <div className="loading">Loading rides...</div>
              ) : availableRides.length === 0 ? (
                <div className="empty-state">No rides available for this route</div>
              ) : (
                <div className="rides-list">
                  {availableRides.map((ride) => (
                    <div
                      key={ride.id}
                      className={`ride-option ${selectedRide?.id === ride.id ? 'selected' : ''}`}
                      onClick={() => handleRideSelect(ride)}
                    >
                      <div className="ride-time">{formatDate(ride.departureTime)}</div>
                      <div className="ride-info">
                        <span>{ride.driver.name}</span>
                        <span>{ride.driver.carModel}</span>
                      </div>
                      <div className="ride-seats">
                        {ride.availableSeats} {ride.availableSeats === 1 ? 'seat' : 'seats'} left
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {selectedRide && (
            <section className="pickup-selection">
              <h2>Select Pickup Point</h2>
              <div className="pickup-list">
                {selectedRide.pickupPoints.map((point) => (
                  <div
                    key={point.id}
                    className={`pickup-option ${selectedPickupPoint?.id === point.id ? 'selected' : ''}`}
                    onClick={() => setSelectedPickupPoint(point)}
                  >
                    <div className="pickup-icon">📍</div>
                    <div className="pickup-name">{point.name}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {selectedRide && selectedPickupPoint && (
            <section className="seat-selection">
              <h2>Number of Seats</h2>
              <div className="seat-counter">
                <button
                  onClick={() => setSeatCount(Math.max(1, seatCount - 1))}
                  className="btn-counter"
                  disabled={seatCount <= 1}
                >
                  -
                </button>
                <span className="seat-count">{seatCount}</span>
                <button
                  onClick={() => setSeatCount(Math.min(selectedRide.availableSeats, seatCount + 1))}
                  className="btn-counter"
                  disabled={seatCount >= selectedRide.availableSeats}
                >
                  +
                </button>
              </div>
              <div className="booking-summary">
                <div className="summary-row">
                  <span>Price per seat:</span>
                  <span>₦{selectedRoute?.price.toLocaleString()}</span>
                </div>
                <div className="summary-row">
                  <span>Seats:</span>
                  <span>{seatCount}</span>
                </div>
                <div className="summary-row total">
                  <span>Total:</span>
                  <span>₦{((selectedRoute?.price || 0) * seatCount).toLocaleString()}</span>
                </div>
              </div>
              <button onClick={handleBooking} className="btn-primary btn-lg" disabled={loading}>
                {loading ? 'Processing...' : 'Confirm Booking'}
              </button>
            </section>
          )}
        </div>

        <div className="booking-map">
          {selectedRide ? (
            <GoogleMapReact
              bootstrapURLKeys={{ key: GOOGLE_MAPS_API_KEY }}
              center={mapCenter}
              defaultZoom={13}
            >
              {selectedRide.pickupPoints.map((point, idx) => (
                <Marker key={point.id} lat={point.lat} lng={point.lng} text={`${idx + 1}`} />
              ))}
            </GoogleMapReact>
          ) : (
            <div className="map-placeholder">
              <p>Select a route to view pickup points</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookRide;
