import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [metaTokenError, setMetaTokenError] = useState(null); // Alert state for Meta API token issues

  // Synchronize token state with localStorage and Axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [token]);

  // Request interceptor to attach bearer token dynamically
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          config.headers['Authorization'] = `Bearer ${storedToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
    };
  }, []);

  // Handle Axios response interceptors to capture expired tokens
  useEffect(() => {
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const errorData = error.response?.data;
        // Check if error is related to Meta Access Token issues
        if (errorData?.errorType === 'META_API_ERROR' && errorData?.actionRequired === 'reauthenticate') {
          setMetaTokenError({
            message: errorData.message || 'Your Meta Access Token has expired or is invalid.',
            actionRequired: 'reauthenticate'
          });
        }
        
        // If 401 unauthorized from our own backend, log out user
        if (error.response?.status === 401) {
          logout(false);
        }

        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Fetch current user on mount if token exists
  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await axios.get(`${API_URL}/api/auth/me`);
        setUser(response.data.data.user);
      } catch (err) {
        console.error('Failed to load user session:', err.message);
        logout(false);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, [token]);

  // Login handler
  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      const { token: receivedToken, user: receivedUser } = response.data.data;
      setToken(receivedToken);
      setUser(receivedUser);
      setMetaTokenError(null);
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || 'Login failed. Please check your credentials.';
      return { success: false, message: msg };
    }
  };

  // Signup handler
  const signup = async (userData) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/signup`, userData);
      const { token: receivedToken, user: receivedUser } = response.data.data;
      setToken(receivedToken);
      setUser(receivedUser);
      setMetaTokenError(null);
      return { success: true };
    } catch (error) {
      const msg = error.response?.data?.message || 'Registration failed. Please check your inputs.';
      return { success: false, message: msg };
    }
  };

  // Logout handler
  const logout = async (callApi = true) => {
    try {
      if (callApi && token) {
        await axios.post(`${API_URL}/api/auth/logout`);
      }
    } catch (err) {
      console.warn('Logout API call failed:', err.message);
    } finally {
      setToken(null);
      setUser(null);
      setMetaTokenError(null);
      setLoading(false);
      localStorage.removeItem('token');
      sessionStorage.clear();
    }
  };

  // Profile updating helper
  const updateProfileData = (updatedUser) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      signup,
      logout,
      metaTokenError,
      setMetaTokenError,
      updateProfile: updateProfileData,
      isAuthenticated: !!user
    }}>
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
