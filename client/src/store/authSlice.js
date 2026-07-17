import { createSlice } from '@reduxjs/toolkit';

const AUTH_STORAGE_KEY = 'learnsphere_auth';

const loadStoredAuth = () => {
  if (typeof window === 'undefined') {
    return { user: null, accessToken: null, isAuthenticated: false };
  }

  try {
    const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!rawValue) {
      return { user: null, accessToken: null, isAuthenticated: false };
    }

    const parsedValue = JSON.parse(rawValue);
    return {
      user: parsedValue.user ?? null,
      accessToken: parsedValue.accessToken ?? null,
      isAuthenticated: !!parsedValue.user && !!parsedValue.accessToken,
    };
  } catch (error) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return { user: null, accessToken: null, isAuthenticated: false };
  }
};

const persistAuth = ({ user, accessToken }) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({ user, accessToken })
  );
};

const clearPersistedAuth = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
};

const storedAuth = loadStoredAuth();

const initialState = {
  user: storedAuth.user,
  accessToken: storedAuth.accessToken,
  isAuthenticated: storedAuth.isAuthenticated,
  loading: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, accessToken } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.isAuthenticated = !!user;
      state.loading = false;
      persistAuth({ user, accessToken });
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.loading = false;
      clearPersistedAuth();
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
});

export const { setCredentials, logout, setLoading } = authSlice.actions;
export default authSlice.reducer;
