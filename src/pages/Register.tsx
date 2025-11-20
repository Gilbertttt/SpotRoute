import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import '../styles/Auth.css';
import { Eye, EyeOff, Lock, Mail, Phone, User } from 'lucide-react';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'USER' as 'USER' | 'DRIVER',
    carModel: '',
    carPlate: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.role === 'DRIVER' && (!formData.carModel || !formData.carPlate)) {
      setError('Please provide car details for driver registration');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      const response = await authService.register(registerData);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      if (response.user.role === 'DRIVER') {
        navigate('/driver');
      } else {
        navigate('/user');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="brand">SpotRoute</h1>
          <p className="tagline">Smart Pooled Rides</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form space-y-5" >
          <div className="text-center mb-10">
            <h1 className="text-slate-900 mb-2">Create Account</h1>
            <p className="text-slate-600">Join thousands riding smart across Nigeria</p>
          </div>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="role">I want to</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="USER">Book Rides</option>
              <option value="DRIVER">Offer Rides</option>
            </select>
          </div>

          <div className="form-group">
             <label htmlFor="fullName" className="flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 text-slate-700">
                Full Name
              </label>
             <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={ handleChange}
                  className="pl-12 h-14 bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                  required
                />
              </div>
          </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-slate-700">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={(e) => handleChange(e)}
                  className="pl-12 h-14 bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 w-full border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 border"
                  required
                />
              </div>
            </div>

           <div className="space-y-2">
              <label htmlFor="phone" className="text-slate-700">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="phone"
                  type="tel"
                  placeholder="+234 800 000 0000"
                  value={formData.phone}
                  onChange={(e) => handleChange(e)}
                  className="pl-12 h-14 bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 border w-full"
                  required
                />
              </div>
            </div>

          {formData.role === 'DRIVER' && (
            <>
              <div className="form-group">
                <label htmlFor="carModel">Car Model</label>
                <input
                  type="text"
                  id="carModel"
                  name="carModel"
                  value={formData.carModel}
                  onChange={handleChange}
                  placeholder="Toyota Corolla 2020"
                />
              </div>

              <div className="form-group">
                <label htmlFor="carPlate">License Plate</label>
                <input
                  type="text"
                  id="carPlate"
                  name="carPlate"
                  value={formData.carPlate}
                  onChange={handleChange}
                  placeholder="ABC-123-XY"
                />
              </div>
            </>
          )}

          {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-slate-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => handleChange(e)}
                  className="pl-12 pr-12 h-14 bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 w-full border"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500">Must be at least 8 characters</p>
            </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              required
            />
          </div>

           <div className="flex items-start space-x-2 pt-2">
              {/* <Checkbox
                id="terms"
                checked={formData.agreeToTerms}
                onCheckedChange={(checked) =>
                  handleChange('agreeToTerms', checked as boolean)
                }
                className="mt-1"
              /> */}
              <label htmlFor="terms" className="text-sm text-slate-600 cursor-pointer">
                I agree to SpotRoute's{' '}
                <button type="button" className="text-emerald-600 hover:text-emerald-700">
                  Terms of Service
                </button>{' '}
                and{' '}
                <button type="button" className="text-emerald-600 hover:text-emerald-700">
                  Privacy Policy
                </button>
              </label>
            </div>

          <button type="submit" className="w-full h-14 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-emerald-200 btn-primary" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
         {/* Divider */}
         <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gradient-to-br from-emerald-50 via-white to-green-50 text-slate-500 auth-footer">
                  Already have an account?
                </span>
              </div>
            </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
