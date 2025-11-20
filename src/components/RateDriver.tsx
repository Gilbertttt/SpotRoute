import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { bookingService } from '../services/api';
import type { Booking } from '../types';
import '../styles/RateDriver.css';

interface RateDriverProps {
  booking: Booking;
  onRatingSubmitted: () => void;
  onClose: () => void;
}

const COMPLIMENTS = [
  'Friendly & Polite',
  'Safe Driver',
  'Clean Car',
  'Great Conversation',
  'On Time',
  'Helpful',
  'Professional',
  'Good Music'
];

const RateDriver: React.FC<RateDriverProps> = ({ booking, onRatingSubmitted, onClose }) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedCompliment, setSelectedCompliment] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.warning('Please select a rating');
      return;
    }

    setLoading(true);
    try {
      await bookingService.rateBooking(booking.id, {
        rating,
        compliment: selectedCompliment || undefined,
        comment: comment.trim() || undefined,
      });

      toast.success('Thank you for your feedback!');
      onRatingSubmitted();
      onClose();
    } catch (error) {
      console.error('Failed to submit rating:', error);
      toast.error('Failed to submit rating. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      const isActive = i <= (hoveredRating || rating);
      stars.push(
        <button
          key={i}
          type="button"
          className={`star-button ${isActive ? 'active' : ''}`}
          onMouseEnter={() => setHoveredRating(i)}
          onMouseLeave={() => setHoveredRating(0)}
          onClick={() => setRating(i)}
        >
          {isActive ? '★' : '☆'}
        </button>
      );
    }
    return stars;
  };

  return (
    <div className="rate-driver-modal">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Rate Your Driver</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="driver-info">
          <div className="driver-avatar">
            {booking.ride.driver.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3>{booking.ride.driver.name}</h3>
            <p>{booking.ride.driver.carModel} - {booking.ride.driver.carPlate}</p>
          </div>
        </div>

        <div className="rating-section">
          <p className="section-label">How was your ride?</p>
          <div className="star-rating">
            {renderStars()}
          </div>
          {rating > 0 && (
            <p className="rating-text">
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </p>
          )}
        </div>

        <div className="compliments-section">
          <p className="section-label">Add a compliment (optional)</p>
          <div className="compliments-grid">
            {COMPLIMENTS.map((compliment) => (
              <button
                key={compliment}
                type="button"
                className={`compliment-button ${selectedCompliment === compliment ? 'selected' : ''}`}
                onClick={() => setSelectedCompliment(
                  selectedCompliment === compliment ? null : compliment
                )}
              >
                {compliment}
              </button>
            ))}
          </div>
        </div>

        <div className="comment-section">
          <p className="section-label">Additional comments (optional)</p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share more about your experience..."
            rows={4}
            maxLength={500}
          />
          <p className="char-count">{comment.length}/500</p>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary" disabled={loading}>
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn-primary" disabled={loading || rating === 0}>
            {loading ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RateDriver;
