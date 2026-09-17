import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, AlertCircle, Tractor, Eye, EyeOff, Info } from 'lucide-react';

// Global window-level initialization guard and callback delegate
if (typeof window !== 'undefined') {
  window.__googleGsiInitialized = window.__googleGsiInitialized || false;
  window.__googleGsiHandler = window.__googleGsiHandler || null;
  window.__googleGsiCallbackDelegate = (response) => {
    if (typeof window.__googleGsiHandler === 'function') {
      window.__googleGsiHandler(response);
    }
  };
}

const Login = () => {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { email, password } = formData;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
    if (infoMessage) setInfoMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    setLoading(true);
    setError('');
    setInfoMessage('');

    try {
      const result = await login(email, password);
      setLoading(false);

      if (result.success) {
        const redirectPath = result.user.role === 'admin' ? '/admin/dashboard' : '/customer/dashboard';
        navigate(redirectPath, { replace: true });
      } else {
        setError(result.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setLoading(false);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  const handleGoogleCredentialResponse = useCallback(async (response) => {
    if (!response?.credential) {
      setError('Google authentication failed. No credential received.');
      return;
    }

    setGoogleLoading(true);
    setError('');
    setInfoMessage('');

    try {
      const result = await googleLogin(response.credential);
      setGoogleLoading(false);

      if (result?.success) {
        const redirectPath = result.user.role === 'admin' ? '/admin/dashboard' : '/customer/dashboard';
        navigate(redirectPath, { replace: true });
      } else if (result?.isNewUser) {
        navigate('/register', {
          state: {
            fromGoogle: true,
            googleUser: result.googleUser,
            warningMessage: result.message || 'Account not found. Please create an account to continue.',
          },
        });
      } else {
        setError(result?.message || 'Google sign-in could not be completed. Please try again.');
      }
    } catch (err) {
      setGoogleLoading(false);
      setError('Google authentication error. Please try again.');
    }
  }, [googleLogin, navigate]);

  // Keep the active response handler attached to the global callback delegate
  useEffect(() => {
    window.__googleGsiHandler = handleGoogleCredentialResponse;
    return () => {
      window.__googleGsiHandler = null;
    };
  }, [handleGoogleCredentialResponse]);

  // One-time initialization function guarded globally on window
  const ensureGsiInitialized = useCallback((clientId) => {
    if (window.__googleGsiInitialized) {
      return true;
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: window.__googleGsiCallbackDelegate,
        auto_select: false,
      });
      window.__googleGsiInitialized = true;
      return true;
    }
    return false;
  }, []);

  // Render official GIS Sign-In button
  const renderGoogleButton = useCallback(() => {
    const container = document.getElementById('googleSignInButtonContainer');
    if (container && window.google?.accounts?.id) {
      container.innerHTML = '';
      window.google.accounts.id.renderButton(container, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 320,
      });
    }
  }, []);

  // One-time script loading, GSI initialization & button rendering
  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId || googleClientId === 'your_google_client_id_here') {
      return;
    }

    const loadScriptAndInit = () => {
      if (window.google?.accounts?.id) {
        ensureGsiInitialized(googleClientId);
        renderGoogleButton();
        return;
      }

      let script = document.getElementById('google-gsi-script');
      if (!script) {
        script = document.createElement('script');
        script.id = 'google-gsi-script';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          ensureGsiInitialized(googleClientId);
          renderGoogleButton();
        };
        document.head.appendChild(script);
      } else {
        script.addEventListener('load', () => {
          ensureGsiInitialized(googleClientId);
          renderGoogleButton();
        });
      }
    };

    loadScriptAndInit();
  }, [ensureGsiInitialized, renderGoogleButton]);

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
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-sm text-stone-600 font-medium">
          Access your agricultural equipment rental dashboard
        </p>
      </div>

      {/* Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-stone-200/80 sm:rounded-2xl sm:px-10">

          {/* Inline Error Message */}
          {error && (
            <div role="alert" className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm flex items-start space-x-2.5 shadow-sm">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Optional Information Message */}
          {infoMessage && (
            <div role="status" className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm flex items-start space-x-2.5 shadow-sm">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <span className="font-medium">{infoMessage}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="label">
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
                  onChange={handleChange}
                  placeholder="farmer@example.com"
                  className="block w-full pl-11 pr-4 py-3 border border-stone-300 rounded-xl text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 transition-colors bg-white"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="label">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-forest-800 hover:text-forest-600 hover:underline focus:outline-none transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="block w-full pl-11 pr-11 py-3 border border-stone-300 rounded-xl text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-forest-500/30 focus:border-forest-500 transition-colors bg-white"
                />
                
                {/* Password Visibility Toggle */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600 focus:outline-none transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Sign In Button with Animated Tractor Loading State */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-forest-600 hover:bg-forest-700 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-forest-600 transition-all duration-150 disabled:opacity-85 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-full flex flex-col items-center justify-center py-0.5">
                    {/* Animated Tractor Track */}
                    <div className="relative w-44 h-5 overflow-hidden flex items-center">
                      <div className="w-full border-b-2 border-dashed border-forest-300/40 absolute bottom-1" />
                      <div className="animate-tractor-drive absolute bottom-0.5 left-0">
                        <Tractor className="w-5 h-5 text-forest-300 drop-shadow-xs" />
                      </div>
                    </div>
                    <span className="text-xs font-semibold tracking-wide text-forest-100 mt-1">
                      Signing you in...
                    </span>
                  </div>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-stone-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-stone-400 font-medium">Or</span>
            </div>
          </div>

          {/* Google Sign-In Container */}
          <div className="mt-6 flex justify-center">
            {googleLoading ? (
              <div className="w-full flex flex-col items-center justify-center py-3 px-4 border border-stone-300 rounded-xl shadow-2xs bg-white">
                <div className="relative w-44 h-5 overflow-hidden flex items-center">
                  <div className="w-full border-b-2 border-dashed border-forest-400/40 absolute bottom-1" />
                  <div className="animate-tractor-drive absolute bottom-0.5 left-0">
                    <Tractor className="w-5 h-5 text-forest-900 drop-shadow-xs" />
                  </div>
                </div>
                <span className="text-xs font-semibold tracking-wide text-stone-700 mt-1">
                  Signing you in with Google...
                </span>
              </div>
            ) : (
              <div id="googleSignInButtonContainer" className="w-full flex justify-center min-h-[44px]"></div>
            )}
          </div>

          {/* Registration Link */}
          <div className="mt-8 text-center border-t border-stone-100 pt-6">
            <p className="text-sm text-stone-600 font-medium">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-forest-800 hover:text-forest-600 hover:underline transition-colors">
                Create an account
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
