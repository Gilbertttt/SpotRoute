import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import GoogleMapReact from 'google-map-react';
import { bookingService, paymentService, rideService, routeService } from '../services/api';
import type { Booking, PaymentInstructions, Ride, Route, PickupPoint } from '../types';
import '../styles/BookRide.css';

const Marker: React.FC<{ lat: number; lng: number; text: string }> = ({ text }) => (
  <div className="map-marker">{text}</div>
);

const BookRide: React.FC = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [availableRides, setAvailableRides] = useState<Ride[]>([]);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [selectedPickupPoint, setSelectedPickupPoint] = useState<PickupPoint | null>(null);
  const [seatCount, setSeatCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [recentBooking, setRecentBooking] = useState<Booking | null>(null);
  const [paymentInstructions, setPaymentInstructions] = useState<PaymentInstructions | null>(null);
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [transferReference, setTransferReference] = useState('');
  const [transferAmount, setTransferAmount] = useState(0);
  const [confirmingTransfer, setConfirmingTransfer] = useState(false);
  const navigate = useNavigate();

  const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

  useEffect(() => {
    const loadRoutes = async () => {
      try {
        setLoadingRoutes(true);
        const fetchedRoutes = await routeService.getAllRoutes();
        setRoutes(fetchedRoutes);
      } catch (error) {
        console.error('Failed to load routes:', error);
        toast.error('Failed to load routes. Please try again.');
      } finally {
        setLoadingRoutes(false);
      }
    };

    loadRoutes();
  }, []);

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

  const buildPaymentInstructions = (booking: Booking): PaymentInstructions | null => {
    if (booking.paymentInstructions) {
      return booking.paymentInstructions;
    }

    if (booking.ride?.driver?.virtualAccount) {
      return {
        currency: 'NGN',
        totalAmount: booking.totalPrice,
        reference: booking.id,
        beneficiary: booking.ride.driver.virtualAccount,
      };
    }

    return null;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (error) {
      console.error('Clipboard error:', error);
      toast.warning('Unable to copy automatically. Please copy manually.');
    }
  };

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

  const handleConfirmTransfer = async () => {
    if (!recentBooking) {
      toast.error('No booking to confirm.');
      return;
    }

    if (!transferReference.trim()) {
      toast.warning('Please enter the reference from your bank transfer.');
      return;
    }

    const amountToConfirm = transferAmount || paymentInstructions?.totalAmount || totalAmount;

    setConfirmingTransfer(true);
    try {
      const response = await paymentService.confirmTransfer({
        bookingId: recentBooking.id,
        amount: amountToConfirm,
        paymentReference: transferReference.trim(),
        narration: `Transfer for booking ${recentBooking.id}`,
      });

      setRecentBooking(response.booking);
      const updatedInstructions = buildPaymentInstructions(response.booking);
      setPaymentInstructions(updatedInstructions);
      toast.success('Transfer confirmed! Driver has been notified.');
      setShowPaymentPanel(false);
      navigate('/user', {
        state: {
          bookingId: response.booking.id,
          success: true,
        },
      });
    } catch (error) {
      console.error('Transfer confirmation failed:', error);
      const message =
        (error as any)?.response?.data?.message ||
        'Failed to confirm transfer. Please try again or contact support.';
      toast.error(message);
    } finally {
      setConfirmingTransfer(false);
    }
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

    setLoading(true);
    try {
      const booking = await bookingService.createBooking({
        rideId: selectedRide.id,
        pickupPointId: selectedPickupPoint.id,
        seatCount,
      });

      localStorage.setItem('lastBookingId', booking.id);
      setRecentBooking(booking);

      const instructions = buildPaymentInstructions(booking);
      setPaymentInstructions(instructions);
      setTransferAmount(instructions?.totalAmount || totalAmount);
      const generatedReference = `TRF-${Date.now().toString(36).toUpperCase()}`;
      setTransferReference(generatedReference);
      setShowPaymentPanel(Boolean(instructions));

      setRefreshKey((prev) => prev + 1);

      if (instructions) {
        toast.success('Booking created! Transfer to the driver to confirm your seat.');
      } else {
        toast.warning('Booking created, but driver payment details were not found. Please contact support.');
      }
    } catch (error) {
      console.error('Booking failed:', error);
      toast.error('Booking failed. Please try again.');
      setRefreshKey((prev) => prev + 1);
    } finally {
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

          {showPaymentPanel && paymentInstructions && recentBooking && (
            <section className="payment-instructions">
              <div className="payment-header">
                <h2>Transfer to Complete Booking</h2>
                <button className="link-btn" onClick={() => setShowPaymentPanel(false)}>
                  Hide
                </button>
              </div>
              <p className="payment-subtitle">
                Send <strong>₦{transferAmount.toLocaleString()}</strong> to the driver’s virtual account below.
                Once your bank transfer is done, tap “I have transferred” so the driver is notified instantly.
              </p>

              <div className="account-card">
                <div className="account-row">
                  <span className="account-label">Account Name</span>
                  <div className="account-value">
                    {paymentInstructions.beneficiary.accountName}
                    <button
                      className="copy-btn"
                      onClick={() => copyToClipboard(paymentInstructions.beneficiary.accountName)}
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div className="account-row">
                  <span className="account-label">Account Number</span>
                  <div className="account-value account-number">
                    {paymentInstructions.beneficiary.accountNumber}
                    <button
                      className="copy-btn"
                      onClick={() => copyToClipboard(paymentInstructions.beneficiary.accountNumber)}
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div className="account-row">
                  <span className="account-label">Bank</span>
                  <div className="account-value">
                    {paymentInstructions.beneficiary.bankName}
                    <button
                      className="copy-btn"
                      onClick={() => copyToClipboard(paymentInstructions.beneficiary.bankName)}
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div className="account-row">
                  <span className="account-label">Amount</span>
                  <div className="account-value amount">
                    ₦{transferAmount.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="transfer-form">
                <label htmlFor="transfer-reference">Bank transfer reference</label>
                <input
                  id="transfer-reference"
                  type="text"
                  value={transferReference}
                  onChange={(event) => setTransferReference(event.target.value)}
                  placeholder="Enter the reference that appears in your banking app"
                />
                <div className="transfer-actions">
                  <button className="btn-secondary" onClick={() => setShowPaymentPanel(false)}>
                    I’ll pay later
                  </button>
                  <button
                    className="btn-primary"
                    onClick={handleConfirmTransfer}
                    disabled={confirmingTransfer}
                  >
                    {confirmingTransfer ? 'Confirming...' : 'I have transferred'}
                  </button>
                </div>
                <p className="payment-hint">
                  The driver automatically gets a notification with your name once you confirm.
                </p>
              </div>
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
