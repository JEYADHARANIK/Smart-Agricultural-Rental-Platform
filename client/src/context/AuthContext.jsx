import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Fetch current user on mount if token exists
  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (token) {
        try {
          const res = await API.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.user);
          } else {
            logout();
          }
        } catch (err) {
          console.error('Error hydrating user context:', err);
          logout();
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    fetchCurrentUser();
  }, [token]);

  // Login handler
  const login = async (email, password) => {
    try {
      const res = await API.post('/auth/login', { email, password });
      if (res.data.success) {
        const { token: authToken, user: userData } = res.data;
        localStorage.setItem('token', authToken);
        setToken(authToken);
        setUser(userData);
        return { success: true, user: userData };
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please check your credentials.';
      return { success: false, message };
    }
  };

  // Register handler (Customer only)
  const register = async (userData) => {
    try {
      const res = await API.post('/auth/register', userData);
      if (res.data.success) {
        const { token: authToken, user: newUserData } = res.data;
        localStorage.setItem('token', authToken);
        setToken(authToken);
        setUser(newUserData);
        return { success: true, user: newUserData };
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed. Please try again.';
      return { success: false, message };
    }
  };

  // Google Login handler
  const googleLogin = async (credential) => {
    try {
      const res = await API.post('/auth/google', { credential });
      if (res.data.success) {
        const { token: authToken, user: userData } = res.data;
        localStorage.setItem('token', authToken);
        setToken(authToken);
        setUser(userData);
        return { success: true, user: userData };
      } else if (res.data.isNewUser) {
        return {
          success: false,
          isNewUser: true,
          message: res.data.message || 'Account not found. Please create an account to continue.',
          googleUser: res.data.googleUser,
        };
      }
    } catch (err) {
      if (err.response?.data?.isNewUser) {
        return {
          success: false,
          isNewUser: true,
          message: err.response.data.message || 'Account not found. Please create an account to continue.',
          googleUser: err.response.data.googleUser,
        };
      }
      const message = err.response?.data?.message || 'Google sign-in failed. Please try again.';
      return { success: false, message };
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        googleLogin,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        isCustomer: user?.role === 'customer',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
