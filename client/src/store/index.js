import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import { injectStore } from '../services/api';

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

// Inject store into API wrapper to prevent circular import issues
injectStore(store);
