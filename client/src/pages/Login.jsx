import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Mail, Lock, LogIn, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { setCredentials } from '../store/authSlice';
import { API } from '../services/api';

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await API.post('/auth/login', { email, password });
      const { user, accessToken } = res.data.data;
      
      dispatch(setCredentials({ user, accessToken }));

      // Redirect depending on user role
      if (user.role === 'teacher') {
        navigate('/teacher/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.error?.message ||
        'Invalid email or password. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full glass-panel rounded-2xl p-8 shadow-2xl animate-fade-in relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-white">Welcome Back</h2>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to resume your learning journey
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-950/20 border border-red-500/30 rounded-xl p-4 flex items-start space-x-3 text-red-200 text-sm">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs text-brand-450 hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-850 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center space-x-2 transition-colors shadow-lg shadow-brand-500/10 active:scale-[0.98]"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <LogIn className="h-5 w-5" />
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-400 border-t border-slate-900 pt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-brand-450 font-semibold hover:underline">
            Register Here
          </Link>
        </div>
      </div>
    </div>
  );
}
