import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authService } from '../services/api';
import type { Driver } from '../types';
import '../styles/DriverProfile.css';

const DriverProfile: React.FC = () => {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { driverId } = useParams<{ driverId: string }>();

  useEffect(() => {
    loadDriverProfile();
  }, [driverId]);

  const loadDriverProfile = async () => {
    try {
      const userData = await authService.getCurrentUser();
      if (userData.role === 'DRIVER') {
        setDriver(userData as Driver);
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Failed to load driver profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDrivingDuration = (joinDate: string) => {
    const start = new Date(joinDate);
    const now = new Date();
    const months = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (years > 0) {
      return remainingMonths > 0 
        ? `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`
        : `${years} year${years > 1 ? 's' : ''}`;
    }
    return `${months} month${months !== 1 ? 's' : ''}`;
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={`full-${i}`} className="star full">★</span>);
    }
    if (hasHalfStar) {
      stars.push(<span key="half" className="star half">★</span>);
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<span key={`empty-${i}`} className="star empty">☆</span>);
    }
    return stars;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="driver-profile">
        <div className="loading">Loading profile...</div>
      </div>
    );
  }

  if (!driver || driver.role !== 'DRIVER' || !driver.profile) {
    return (
      <div className="driver-profile">
        <div className="error">Driver profile not found</div>
      </div>
    );
  }

  return (
    <div className="driver-profile">
      <header className="page-header">
        <button onClick={() => navigate('/driver')} className="btn-back">
          ← Back to Dashboard
        </button>
        <h1>Driver Profile</h1>
      </header>

      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar">
            <div className="avatar-circle">
              {driver.name.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="profile-info">
            <h2>{driver.name}</h2>
            <p className="car-info">{driver.carModel} - {driver.carPlate}</p>
            <p className="member-since">
              Member since {formatDate(driver.profile.joinDate)}
            </p>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🚗</div>
            <div className="stat-value">{driver.profile.tripsCompleted}</div>
            <div className="stat-label">Trips Completed</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">⏱️</div>
            <div className="stat-value">
              {calculateDrivingDuration(driver.profile.joinDate)}
            </div>
            <div className="stat-label">Driving with Stonex</div>
          </div>

          <div className="stat-card rating-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-value">{driver.profile.overallRating.toFixed(1)}</div>
            <div className="rating-stars">
              {renderStars(driver.profile.overallRating)}
            </div>
            <div className="stat-label">
              Based on {driver.profile.totalRatings} rating{driver.profile.totalRatings !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {driver.profile.badges && driver.profile.badges.length > 0 && (
          <section className="badges-section">
            <h3>Badges & Achievements</h3>
            <div className="badges-grid">
              {driver.profile.badges.map((badge) => (
                <div key={badge.id} className="badge-card">
                  <div className="badge-icon">{badge.icon}</div>
                  <div className="badge-info">
                    <div className="badge-name">{badge.name}</div>
                    <div className="badge-description">{badge.description}</div>
                    <div className="badge-date">Earned {formatDate(badge.awardedAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {driver.profile.ratings && driver.profile.ratings.length > 0 && (
          <section className="reviews-section">
            <h3>Recent Reviews & Compliments</h3>
            <div className="reviews-list">
              {driver.profile.ratings
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 10)
                .map((rating) => (
                  <div key={rating.id} className="review-card">
                    <div className="review-header">
                      <div className="review-rating">
                        {renderStars(rating.rating)}
                      </div>
                      <div className="review-date">{formatDate(rating.createdAt)}</div>
                    </div>
                    {rating.compliment && (
                      <div className="review-compliment">
                        <span className="compliment-badge">{rating.compliment}</span>
                      </div>
                    )}
                    {rating.comment && (
                      <div className="review-comment">{rating.comment}</div>
                    )}
                  </div>
                ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default DriverProfile;
