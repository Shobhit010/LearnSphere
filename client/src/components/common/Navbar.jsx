import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { LogOut, User, Bell, BookOpen, Menu, X, PlusCircle } from 'lucide-react';
import { logout } from '../../store/authSlice';
import { API } from '../../services/api';

export default function Navbar() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications if logged in
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      // Poll notifications count every 30s
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const fetchNotifications = async () => {
    try {
      const res = await API.get('/notifications');
      setNotifications(res.data.data);
      
      const countRes = await API.get('/notifications/unread-count');
      setUnreadCount(countRes.data.data.count);
    } catch (err) {
      console.error('Failed to load notifications', err.message);
    }
  };

  const handleMarkRead = async (id = null) => {
    try {
      await API.patch('/notifications/mark-read', { notificationId: id });
      fetchNotifications();
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await API.post('/auth/logout');
      dispatch(logout());
      navigate('/login');
    } catch (err) {
      console.error('Logout error', err.message);
    }
  };

  return (
    <nav className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-900 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center space-x-2 text-brand-400">
          <BookOpen className="h-7 w-7 text-brand-500 animate-pulse" />
          <span className="font-bold text-xl tracking-tight text-white hover:text-brand-400 transition-colors">
            LearnSphere
          </span>
        </Link>

        {/* Desktop nav items */}
        <div className="hidden md:flex items-center space-x-6">
          <Link to="/courses" className="text-slate-300 hover:text-white transition-colors">
            Browse Courses
          </Link>

          {isAuthenticated ? (
            <>
              {/* Dashboards based on roles */}
              {user.role === 'student' && (
                <Link to="/dashboard" className="text-slate-300 hover:text-white transition-colors">
                  My Learning
                </Link>
              )}
              {user.role === 'teacher' && (
                <Link to="/teacher/dashboard" className="flex items-center space-x-1 text-slate-300 hover:text-white transition-colors">
                  <PlusCircle className="h-4 w-4 text-brand-400" />
                  <span>Instructor Area</span>
                </Link>
              )}
              {/* Notification Center */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative p-1 text-slate-400 hover:text-white transition-colors focus:outline-none"
                >
                  <Bell className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-brand-600 text-white text-xxs font-bold px-1.5 py-0.5 rounded-full animate-bounce">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications dropdown panel */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-2 z-50 animate-fade-in">
                    <div className="flex justify-between items-center px-4 py-2 border-b border-slate-800">
                      <span className="font-semibold text-sm text-slate-200">Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => handleMarkRead()}
                          className="text-xxs text-brand-400 hover:text-brand-300"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-slate-500">
                          No notifications
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n._id}
                            onClick={() => {
                              handleMarkRead(n._id);
                              if (n.link) navigate(n.link);
                              setNotificationsOpen(false);
                            }}
                            className={`px-4 py-3 border-b border-slate-800/40 hover:bg-slate-850 cursor-pointer transition-colors ${
                              !n.isRead ? 'bg-brand-950/20' : ''
                            }`}
                          >
                            <p className="text-xs text-slate-300">{n.message}</p>
                            <span className="text-xxs text-slate-500 mt-1 block">
                              {new Date(n.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Dropdown */}
              <div className="flex items-center space-x-3 border-l border-slate-800 pl-4">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-full bg-brand-650 flex items-center justify-center font-bold text-sm text-white">
                    {user.avatar ? (
                      <img src={user.avatar} alt="avatar" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className="text-xxs text-slate-400 capitalize">{user.role}</p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-full text-slate-400 hover:text-red-400 hover:bg-slate-900 transition-all focus:outline-none"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="text-slate-350 hover:text-white font-medium text-sm px-4 py-2"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors shadow-md shadow-brand-500/10"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="md:hidden flex items-center space-x-4">
          {isAuthenticated && unreadCount > 0 && (
            <Link to="/dashboard" className="relative p-1 text-slate-400">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 bg-brand-600 text-white text-xxs font-bold px-1 py-0.2 rounded-full">
                {unreadCount}
              </span>
            </Link>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-slate-400 hover:text-white focus:outline-none"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-4 pt-4 border-t border-slate-900 space-y-3 animate-fade-in">
          <Link
            to="/courses"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-white py-2"
          >
            Browse Courses
          </Link>

          {isAuthenticated ? (
            <>
              {/* User Profile info header in mobile drawer */}
              <div className="flex items-center space-x-3 pb-3 border-b border-slate-900 mb-2">
                <div className="h-9 w-9 rounded-full bg-brand-650 flex items-center justify-center font-bold text-sm text-white shrink-0">
                  {user.avatar ? (
                    <img src={user.avatar} alt="avatar" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{user.name}</p>
                  <p className="text-xxs text-slate-450 capitalize leading-none mt-0.5">{user.role}</p>
                </div>
              </div>

              {user.role === 'student' && (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-slate-300 hover:text-white py-2"
                >
                  My Learning
                </Link>
              )}
              {user.role === 'teacher' && (
                <Link
                  to="/teacher/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-slate-300 hover:text-white py-2"
                >
                  Instructor Area
                </Link>
              )}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left text-red-400 hover:text-red-300 py-2 border-t border-slate-900 mt-2"
              >
                Sign Out
              </button>
            </>
          ) : (
            <div className="flex flex-col space-y-2 pt-2 border-t border-slate-900">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center text-slate-300 hover:text-white py-2 border border-slate-800 rounded-lg"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2 rounded-lg"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
