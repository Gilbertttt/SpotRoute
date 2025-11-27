import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import GoogleMapReact from 'google-map-react';
import { rideService, routeService } from '../services/api';
import type { Route, PickupPoint } from '../types';
import '../styles/CreateRide.css';

const Marker: React.FC<{ lat: number; lng: number; text: string }> = ({ text }) => (
  <div className="map-marker">{text}</div>
);


const CreateRide: React.FC = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [availablePickupPoints, setAvailablePickupPoints] = useState<PickupPoint[]>([]);
  const [selectedPickupPoints, setSelectedPickupPoints] = useState<string[]>([]);
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
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

  const handleRouteSelect = async (route: Route) => {
    setSelectedRoute(route);
    setSelectedPickupPoints([]);
    try {
      const points = await routeService.getPickupPoints(route.id);
      setAvailablePickupPoints(points);
    } catch (error) {
      console.error('Failed to load pickup points:', error);
      toast.error('Failed to load pickup points. Please try again.');
      setAvailablePickupPoints([]);
    }
  };

  const togglePickupPoint = (pointId: string) => {
    setSelectedPickupPoints((prev) =>
      prev.includes(pointId) ? prev.filter((id) => id !== pointId) : [...prev, pointId]
    );
  };

  const handleCreateRide = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRoute) {
      toast.warning('Please select a route');
      return;
    }

    if (selectedPickupPoints.length === 0) {
      toast.warning('Please select at least one pickup point');
      return;
    }

    if (!departureDate || !departureTime) {
      toast.warning('Please select departure date and time');
      return;
    }

    const departureDateTime = new Date(`${departureDate}T${departureTime}`);
    if (departureDateTime <= new Date()) {
      toast.warning('Departure time must be in the future');
      return;
    }

    setLoading(true);
    try {
      await rideService.createRide({
        routeId: selectedRoute.id,
        departureTime: departureDateTime.toISOString(),
        pickupPointIds: selectedPickupPoints,
      });

      toast.success('Ride created successfully!');
      navigate('/driver');
    } catch (error) {
      console.error('Failed to create ride:', error);
      toast.error('Failed to create ride. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const mapCenter = availablePickupPoints.length > 0
    ? { lat: availablePickupPoints[0].lat, lng: availablePickupPoints[0].lng }
    : { lat: 6.5244, lng: 3.3792 };

  return (
    <div className="create-ride">
      <header className="page-header">
        <button onClick={() => navigate('/driver')} className="btn-back">
          ← Back
        </button>
        <h1>Create New Ride</h1>
      </header>

      <div className="create-container">
        <div className="create-sidebar">
          <form onSubmit={handleCreateRide} className="create-form">
            <section className="form-section">
              <h2>Select Route</h2>
              {loadingRoutes ? (
                <div className="loading">Loading routes...</div>
              ) : routes.length === 0 ? (
                <div className="empty-state">No routes available</div>
              ) : (
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
                      <span className="price">₦{route.price.toLocaleString()}/seat</span>
                      <span className="distance">{route.distance} km</span>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </section>

            {selectedRoute && (
              <>
                <section className="form-section">
                  <h2>Pickup Points</h2>
                  <p className="helper-text">Select pickup locations along your route</p>
                  <div className="pickup-list">
                    {availablePickupPoints.map((point) => (
                      <label key={point.id} className="pickup-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedPickupPoints.includes(point.id)}
                          onChange={() => togglePickupPoint(point.id)}
                        />
                        <span className="pickup-name">📍 {point.name}</span>
                      </label>
                    ))}
                  </div>
                </section>

                <section className="form-section">
                  <h2>Departure Time</h2>
                  <div className="form-group">
                    <label htmlFor="departureDate">Date</label>
                    <input
                      type="date"
                      id="departureDate"
                      value={departureDate}
                      onChange={(e) => setDepartureDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="departureTime">Time</label>
                    <input
                      type="time"
                      id="departureTime"
                      value={departureTime}
                      onChange={(e) => setDepartureTime(e.target.value)}
                      required
                    />
                  </div>
                </section>

                <section className="ride-summary">
                  <h3>Ride Summary</h3>
                  <div className="summary-item">
                    <span>Route:</span>
                    <span>
                      {selectedRoute.from} → {selectedRoute.to}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span>Distance:</span>
                    <span>{selectedRoute.distance} km</span>
                  </div>
                  <div className="summary-item">
                    <span>Duration:</span>
                    <span>{selectedRoute.duration}</span>
                  </div>
                  <div className="summary-item">
                    <span>Price per seat:</span>
                    <span>₦{selectedRoute.price.toLocaleString()}</span>
                  </div>
                  <div className="summary-item">
                    <span>Pickup points:</span>
                    <span>{selectedPickupPoints.length} selected</span>
                  </div>
                  <div className="summary-item total">
                    <span>Potential earnings (4 seats):</span>
                    <span>₦{(selectedRoute.price * 4).toLocaleString()}</span>
                  </div>
                </section>

                <button type="submit" className="btn-primary btn-lg" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Ride'}
                </button>
              </>
            )}
          </form>
        </div>

        <div className="create-map">
          {selectedRoute && availablePickupPoints.length > 0 ? (
            <GoogleMapReact
              bootstrapURLKeys={{ key: GOOGLE_MAPS_API_KEY }}
              center={mapCenter}
              defaultZoom={13}
            >
              {availablePickupPoints
                .filter((point) => selectedPickupPoints.includes(point.id))
                .map((point, idx) => (
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

export default CreateRide;
