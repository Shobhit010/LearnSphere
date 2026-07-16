import axios from 'axios';
import { setCredentials, logout } from '../store/authSlice';

let apiVal = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';
if (apiVal && !apiVal.endsWith('/api/v1') && !apiVal.endsWith('/api/v1/')) {
  apiVal = apiVal.endsWith('/') ? `${apiVal}api/v1` : `${apiVal}/api/v1`;
}
const API_BASE_URL = apiVal;

export const API = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Send httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

let store;

// Inject store dynamically to avoid circular dependencies
export const injectStore = (_store) => {
  store = _store;
};

// Request Interceptor: Attach Access Token if available
API.interceptors.request.use(
  (config) => {
    if (store) {
      const token = store.getState().auth.accessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Auto-refresh access tokens on 401 Unauthorized
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401, not a retry, and not an auth request (like login/refresh itself)
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/register') &&
      !originalRequest.url.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;

      try {
        console.log('Access token expired. Attempting token refresh...');
        
        // Call refresh endpoint to get new access token
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const { accessToken, user } = refreshResponse.data.data;

        if (store) {
          // Update Redux state with new tokens
          store.dispatch(setCredentials({ accessToken, user }));
        }

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return API(originalRequest);
      } catch (refreshError) {
        console.error('Session refresh failed. Logging out user.', refreshError.message);
        if (store) {
          store.dispatch(logout());
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);
