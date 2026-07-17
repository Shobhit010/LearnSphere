import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2 } from 'lucide-react';

import Navbar from './components/common/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import CoursesList from './pages/CoursesList';
import CourseDetail from './pages/CourseDetail';
import StudentDashboard from './pages/student/StudentDashboard';
import CoursePlayer from './pages/student/CoursePlayer';
import CertificateVerify from './pages/CertificateVerify';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import CourseBuilder from './pages/teacher/CourseBuilder';

import { logout, setCredentials, setLoading } from './store/authSlice';
import { API } from './services/api';

const isJwtExpired = (token) => {
  if (!token) {
    return true;
  }

  try {
    const payload = token.split('.')[1];
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      '='
    );
    const decodedPayload = JSON.parse(atob(paddedPayload));

    if (!decodedPayload.exp) {
      return true;
    }

    return Date.now() >= decodedPayload.exp * 1000;
  } catch (error) {
    return true;
  }
};

// Route Guard: Authentication
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useSelector((state) => state.auth);

  if (loading) return null; // Wait for initial auth check
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Route Guard: Role Based Access Control
function RoleRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading } = useSelector((state) => state.auth);

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  const hasRole = allowedRoles.includes(user.role);
  return hasRole ? children : <Navigate to="/" replace />;
}

export default function App() {
  const dispatch = useDispatch();
  const { accessToken, loading } = useSelector((state) => state.auth);

  // Check user session on app boot
  useEffect(() => {
    const initAuth = async () => {
      if (accessToken && !isJwtExpired(accessToken)) {
        dispatch(setLoading(false));
        return;
      }

      try {
        const res = await API.post('/auth/refresh');
        const { user, accessToken } = res.data.data;
        dispatch(setCredentials({ user, accessToken }));
      } catch (err) {
        if (accessToken && !isJwtExpired(accessToken)) {
          dispatch(setLoading(false));
          return;
        }

        dispatch(logout());
      }
    };

    initAuth();
  }, [accessToken, dispatch]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950">
        <Loader2 className="h-12 w-12 text-brand-500 animate-spin mb-4" />
        <h2 className="text-white font-bold text-base tracking-wide">Syncing LearnSphere Session...</h2>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
        <Navbar />
        <main className="flex-1">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/courses" element={<CoursesList />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/verify-certificate/:certificateId" element={<CertificateVerify />} />

            {/* Student Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/learn/:courseId"
              element={
                <ProtectedRoute>
                  <CoursePlayer />
                </ProtectedRoute>
              }
            />

            {/* Teacher Protected Routes */}
            <Route
              path="/teacher/dashboard"
              element={
                <RoleRoute allowedRoles={['teacher']}>
                  <TeacherDashboard />
                </RoleRoute>
              }
            />
            <Route
              path="/teacher/courses/:id/edit"
              element={
                <RoleRoute allowedRoles={['teacher']}>
                  <CourseBuilder />
                </RoleRoute>
              }
            />

            {/* Fallback Redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
