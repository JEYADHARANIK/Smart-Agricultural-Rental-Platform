import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axios';
import { Mail, ArrowLeft, AlertCircle, CheckCircle2, Tractor } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await API.post('/auth/forgot-password', { email: email.trim() });
      setLoading(false);
      setSubmitted(true);
    } catch (err) {
      setLoading(false);
      // Follow application security guidelines: Do not leak backend details
      const message = err.response?.data?.message || 'An error occurred while processing your request. Please try again.';
      setError(message);
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
          Forgot your password?
        </h2>
        <p className="mt-2 text-center text-sm text-stone-600 font-medium px-2">
          Enter your registered email and we'll send you a link to reset your password.
        </p>
      </div>

      {/* Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-stone-200/80 sm:rounded-2xl sm:px-10">

          {submitted ? (
            /* Success View */
            <div className="text-center py-2">
              <div className="mx-auto w-12 h-12 bg-forest-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-7 h-7 text-forest-800" />
              </div>
              <h3 className="text-xl font-bold text-stone-900 mb-2">Check your email</h3>
              <p className="text-sm text-stone-600 font-medium mb-6 leading-relaxed">
                If an account exists with this email, we've sent a password reset link. Please check your inbox.
              </p>
              <Link
                to="/login"
                className="inline-flex justify-center items-center py-3 px-5 border border-stone-300 rounded-xl shadow-2xs text-sm font-semibold text-stone-700 bg-white hover:bg-stone-50 active:bg-stone-100 transition-colors w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
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
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold tracking-wide text-stone-700 uppercase mb-1.5">
                    Email Address
                  </label>
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                      <Mail className="w-5 h-5" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError('');
                      }}
                      placeholder="farmer@example.com"
                      className="block w-full pl-11 pr-4 py-3 border border-stone-300 rounded-xl text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 transition-colors bg-white"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-forest-900 hover:bg-forest-800 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forest-700 transition-all duration-150 disabled:opacity-85 disabled:cursor-not-allowed"
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
                          Sending reset link...
                        </span>
                      </div>
                    ) : (
                      <span>Send Reset Link</span>
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

export default ForgotPassword;
