import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, User, Mail, Lock, Phone, MapPin, Home, AlertCircle, Loader2, Tractor, Info } from 'lucide-react';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const pageLocation = useLocation();

  const fromGoogle = pageLocation.state?.fromGoogle || false;
  const googleUser = pageLocation.state?.googleUser || null;
  const warningMessage = pageLocation.state?.warningMessage || 'Account not found. Please create an account to continue.';

  const [formData, setFormData] = useState({
    name: googleUser?.name || '',
    email: googleUser?.email || '',
    password: '',
    confirmPassword: '',
    phone: '',
    location: '',
    address: '',
    googleId: googleUser?.googleId || '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { name, email, password, confirmPassword, phone, location, address } = formData;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const validateForm = () => {
    if (!name.trim()) return 'Name is required';
    if (!email.trim()) return 'Email is required';

    // Basic email validation regex
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) return 'Please enter a valid email address';

    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters long';
    if (password !== confirmPassword) return 'Passwords do not match';

    if (!phone.trim()) return 'Phone number is required';
    if (!location.trim()) return 'Location/City is required';
    if (!address.trim()) return 'Address is required';

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    // Payload sent to backend without confirmPassword or role selector
    const payload = {
      name,
      email: email.toLowerCase(),
      password,
      phone,
      location,
      address,
      googleId: formData.googleId || undefined,
      authProvider: fromGoogle ? 'google' : 'local',
    };

    const result = await register(payload);
    setLoading(false);

    if (result.success) {
      navigate('/customer/dashboard', { replace: true });
    } else {
      setError(result.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-cream-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-forest-900 flex items-center justify-center shadow-md text-forest-300 hover:scale-105 transition-transform duration-200">
            <Tractor className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
          Create a Customer Account
        </h2>
        <p className="mt-2 text-center text-sm text-stone-600">
          Register to browse and rent agricultural equipment
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-4 shadow-sm border border-stone-200 sm:rounded-2xl sm:px-10">

          {/* Warning banner for new Google Sign-In user */}
          {fromGoogle && (
            <div className="mb-6 bg-amber-50 border border-amber-200/90 text-amber-900 px-4 py-3.5 rounded-xl text-sm flex items-start space-x-3 shadow-xs">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">
                  {warningMessage}
                </p>
                {googleUser?.email && (
                  <p className="text-xs text-amber-700 mt-1 font-medium">
                    Completing registration for verified Google account: <span className="font-bold text-amber-900">{googleUser.email}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-stone-700">Full Name *</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <User className="w-5 h-5" />
                </div>
                <input
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="block w-full pl-10 pr-3 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 text-sm text-stone-800"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-sm font-medium text-stone-700">Email Address *</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  name="email"
                  type="email"
                  required
                  readOnly={fromGoogle}
                  value={email}
                  onChange={handleChange}
                  placeholder="farmer@example.com"
                  className={`block w-full pl-10 pr-3 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 text-sm text-stone-800 ${
                    fromGoogle ? 'bg-stone-100 cursor-not-allowed text-stone-600 font-medium' : ''
                  }`}
                />
              </div>
            </div>

            {/* Passwords Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700">Password *</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={handleChange}
                    placeholder="Min 6 characters"
                    className="block w-full pl-10 pr-3 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 text-sm text-stone-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700">Confirm Password *</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    name="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    className="block w-full pl-10 pr-3 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 text-sm text-stone-800"
                  />
                </div>
              </div>
            </div>

            {/* Phone & Location Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700">Phone Number *</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Phone className="w-5 h-5" />
                  </div>
                  <input
                    name="phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 000-0000"
                    className="block w-full pl-10 pr-3 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 text-sm text-stone-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700">Location / City *</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <input
                    name="location"
                    type="text"
                    required
                    value={location}
                    onChange={handleChange}
                    placeholder="e.g. Springfield"
                    className="block w-full pl-10 pr-3 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 text-sm text-stone-800"
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-stone-700">Farm Address *</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <Home className="w-5 h-5" />
                </div>
                <input
                  name="address"
                  type="text"
                  required
                  value={address}
                  onChange={handleChange}
                  placeholder="123 Rural Route, Green Valley"
                  className="block w-full pl-10 pr-3 py-2.5 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 text-sm text-stone-800"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-forest-900 hover:bg-forest-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forest-700 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    <span>Register Account</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center border-t border-stone-100 pt-6">
            <p className="text-sm text-stone-600">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-forest-700 hover:text-forest-600">
                Sign In
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Register;