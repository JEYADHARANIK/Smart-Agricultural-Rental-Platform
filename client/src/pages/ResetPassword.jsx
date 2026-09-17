import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../api/axios';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Tractor, ArrowLeft, RefreshCw } from 'lucide-react';

const ResetPassword = () => {
  const { token } = useParams();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [invalidToken, setInvalidToken] = useState(false);

  const validateForm = () => {
    if (!password) return 'Password is required.';
    if (password.length < 6) return 'Password must be at least 6 characters long.';
    if (!confirmPassword) return 'Please confirm your new password.';
    if (password !== confirmPassword) return 'Passwords do not match.';
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

    try {
      const res = await API.post(`/auth/reset-password/${token}`, {
        password,
        confirmPassword,
      });

      setLoading(false);
      if (res.data?.success) {
        setSuccess(true);
      }
    } catch (err) {
      setLoading(false);
      const message = err.response?.data?.message || 'Password reset failed. Please try again.';
      
      // Check if error is due to invalid or expired token
      if (
        err.response?.status === 400 &&
        (message.toLowerCase().includes('token') || message.toLowerCase().includes('expired') || message.toLowerCase().includes('invalid'))
      ) {
        setInvalidToken(true);
      } else {
        setError(message);
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-cream-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-forest-900 flex items-center justify-center shadow-md text-forest-300 hover:scale-105 transition-transform duration-200">
            <Tractor className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-5 text-center text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
          Create a new password
        </h2>
        <p className="mt-2 text-center text-sm text-stone-600 font-medium px-2">
          Enter your new password below.
        </p>
      </div>

      {/* Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-stone-200/80 sm:rounded-2xl sm:px-10">

          {success ? (
            /* Success View */
            <div className="text-center py-2">
              <div className="mx-auto w-12 h-12 bg-forest-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-7 h-7 text-forest-800" />
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-2">Password reset successful</h3>
              <p className="text-sm text-stone-600 font-medium mb-6">
                You can now sign in with your new password.
              </p>
              <Link
                to="/login"
                className="inline-flex justify-center items-center py-3 px-5 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-forest-600 hover:bg-forest-700 transition-colors w-full"
              >
                <span>Back to Login</span>
              </Link>
            </div>
          ) : invalidToken ? (
            /* Invalid/Expired Token View */
            <div className="text-center py-2">
              <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-7 h-7 text-amber-700" />
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-2">Link Invalid or Expired</h3>
              <p className="text-sm text-stone-600 font-medium mb-6 leading-relaxed">
                This password reset link is invalid or has expired. Please request a new password reset link.
              </p>
              <Link
                to="/forgot-password"
                className="inline-flex justify-center items-center py-3 px-5 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-forest-600 hover:bg-forest-700 transition-colors w-full mb-3"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                <span>Request New Reset Link</span>
              </Link>
              <Link
                to="/login"
                className="inline-flex justify-center items-center text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                <span>Back to Login</span>
              </Link>
            </div>
          ) : (
            /* Form View */
            <>
              {error && (
                <div role="alert" className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm flex items-start space-x-2.5 shadow-sm">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSubmit}>
                {/* New Password Field */}
                <div>
                  <label htmlFor="password" className="label">
                    New Password
                  </label>
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="Min 6 characters"
                      className="block w-full pl-11 pr-11 py-3 border border-stone-300 rounded-xl text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 transition-colors bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 focus:outline-none transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label htmlFor="confirmPassword" className="label">
                    Confirm New Password
                  </label>
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="Re-enter new password"
                      className="block w-full pl-11 pr-11 py-3 border border-stone-300 rounded-xl text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 transition-colors bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 focus:outline-none transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-forest-600 hover:bg-forest-700 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forest-600 transition-all duration-150 disabled:opacity-85 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-full flex flex-col items-center justify-center py-0.5">
                        <div className="relative w-44 h-5 overflow-hidden flex items-center">
                          <div className="w-full border-b-2 border-dashed border-forest-300/40 absolute bottom-1" />
                          <div className="animate-tractor-drive absolute bottom-0.5 left-0">
                            <Tractor className="w-5 h-5 text-forest-300 drop-shadow-xs" />
                          </div>
                        </div>
                        <span className="text-xs font-semibold tracking-wide text-forest-100 mt-1">
                          Resetting password...
                        </span>
                      </div>
                    ) : (
                      <span>Reset Password</span>
                    )}
                  </button>
                </div>
              </form>

              {/* Back to Login Link */}
              <div className="mt-8 text-center border-t border-stone-100 pt-6">
                <Link
                  to="/login"
                  className="inline-flex items-center text-sm font-semibold text-forest-800 hover:text-forest-600 hover:underline transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  <span>Back to Login</span>
                </Link>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
