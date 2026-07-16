import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  BookOpen,
  ThumbsUp,
  ThumbsDown,
  UserCheck,
  UserX,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { API } from '../../services/api';

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [pendingCourses, setPendingCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Rejection feedback state
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [activeRejectId, setActiveRejectId] = useState(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      // 1. Fetch admin aggregates
      const res = await API.get('/analytics/admin');
      setAnalytics(res.data.data);

      // 2. Fetch pending review courses
      const courseRes = await API.get('/courses?myCourses=false'); // fetch courses to review
      const filteredPending = courseRes.data.data.filter((c) => c.status === 'pending');
      setPendingCourses(filteredPending);

      // 3. Fetch users list
      const usersRes = await API.get('/users');
      setUsers(usersRes.data.data);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewCourse = async (courseId, action) => {
    setActionLoading(true);
    try {
      const feedback = action === 'reject' ? rejectFeedback || 'Does not meet criteria' : undefined;
      
      await API.patch(`/courses/${courseId}/review`, {
        action,
        feedback,
      });

      alert(`Course successfully ${action === 'approve' ? 'approved & published' : 'rejected'}`);
      setRejectFeedback('');
      setActiveRejectId(null);
      fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Review action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSuspend = async (userId) => {
    try {
      const res = await API.patch(`/users/${userId}/suspend`);
      alert(res.data.message || 'Suspension state toggled');
      fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Suspension failed');
    }
  };

  const handleApproveTeacher = async (userId) => {
    try {
      const res = await API.patch(`/users/${userId}/approve-teacher`);
      alert(res.data.message || 'Teacher approved successfully');
      fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Teacher approval failed');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete user profile? This action is permanent.')) return;

    try {
      await API.delete(`/users/${userId}`);
      alert('User profile deleted successfully');
      fetchAdminData();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Deletion failed');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh]">
        <Loader2 className="h-10 w-10 text-brand-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading administrator terminal...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
      
      {/* Header title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white">Platform Administrator Panel</h1>
        <p className="text-slate-400 text-sm mt-1">Review course approvals, manage user scopes, and analyze total earnings</p>
      </div>

      {/* Metrics Banner */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Metric 1 */}
          <div className="glass-panel rounded-2xl p-5 flex items-center space-x-4 border border-slate-800">
            <div className="h-12 w-12 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400 border border-brand-500/20 shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-2xl font-black text-white">{analytics.users.total}</span>
              <span className="text-xxs font-semibold uppercase tracking-widest text-slate-500">Registered Users</span>
            </div>
          </div>

          {/* Metric 2 */}
          <div className="glass-panel rounded-2xl p-5 flex items-center space-x-4 border border-slate-800">
            <div className="h-12 w-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20 shrink-0">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-2xl font-black text-white">{analytics.courses.total}</span>
              <span className="text-xxs font-semibold uppercase tracking-widest text-slate-500">Courses Seeded</span>
            </div>
          </div>

          {/* Metric 3 */}
          <div className="glass-panel rounded-2xl p-5 flex items-center space-x-4 border border-slate-800">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shrink-0">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-2xl font-black text-white">${analytics.revenue.totalGross}</span>
              <span className="text-xxs font-semibold uppercase tracking-widest text-slate-500">Gross Platform Volume</span>
            </div>
          </div>

          {/* Metric 4 */}
          <div className="glass-panel rounded-2xl p-5 flex items-center space-x-4 border border-slate-800">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20 shrink-0">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-2xl font-black text-amber-400">${analytics.revenue.platformEarnings}</span>
              <span className="text-xxs font-semibold uppercase tracking-widest text-slate-500">Platform Comm. (20%)</span>
            </div>
          </div>

        </div>
      )}

      {/* Main double column grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Course Approval Queue (Left Column) */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-lg font-bold text-white">Course Review Queue</h2>
          
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
            {pendingCourses.length === 0 ? (
              <p className="text-slate-500 text-xs italic text-center py-6">All course reviews completed. Queue clear!</p>
            ) : (
              pendingCourses.map((course) => (
                <div key={course._id} className="border-b border-slate-900 pb-4 last:border-0 last:pb-0 space-y-3 text-xxs">
                  <div>
                    <h4 className="font-bold text-slate-200 text-sm">{course.title}</h4>
                    <p className="text-slate-500 mt-0.5">By Instructor: {course.teacherId?.name || 'Instructor'}</p>
                  </div>
                  
                  {activeRejectId === course._id ? (
                    <form
                      onSubmit={(e) => handleReviewCourse(course._id, 'reject')}
                      className="space-y-2 pt-1.5"
                    >
                      <textarea
                        required
                        rows={2}
                        value={rejectFeedback}
                        onChange={(e) => setRejectFeedback(e.target.value)}
                        placeholder="Provide rejection reason/feedback..."
                        className="w-full bg-slate-950 border border-slate-900 focus:border-brand-500 rounded-lg p-2 text-xxs text-white placeholder-slate-700"
                      />
                      <div className="flex space-x-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => setActiveRejectId(null)}
                          className="text-slate-500 hover:text-slate-300 py-1 px-2 border border-slate-900 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-1 px-2.5 rounded"
                        >
                          Reject
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleReviewCourse(course._id, 'approve')}
                        disabled={actionLoading}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1.5 rounded-lg flex items-center justify-center space-x-1"
                      >
                        <ThumbsUp className="h-3 w-3" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => setActiveRejectId(course._id)}
                        disabled={actionLoading}
                        className="flex-1 bg-red-650 hover:bg-red-700 text-white font-semibold py-1.5 rounded-lg flex items-center justify-center space-x-1"
                      >
                        <ThumbsDown className="h-3 w-3" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* User Administration list (Right Column) */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-white">Registered Users & Scopes</h2>
          
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-900 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="pb-3">User Details</th>
                  <th className="pb-3">Role Scope</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-900/10">
                    <td className="py-3.5 pr-2">
                      <div className="font-semibold text-slate-200">{u.name}</div>
                      <div className="text-slate-500 text-xxs mt-0.5">{u.email}</div>
                    </td>
                    <td className="py-3.5 capitalize text-slate-400">
                      {u.role}
                    </td>
                    <td className="py-3.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        u.isSuspended
                          ? 'bg-red-950/15 border-red-500/20 text-red-400'
                          : 'bg-emerald-950/15 border-emerald-500/20 text-emerald-400'
                      }`}>
                        {u.isSuspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="py-3.5 text-right space-x-2 shrink-0">
                      {u.role === 'teacher' && !u.isApprovedTeacher && (
                        <button
                          onClick={() => handleApproveTeacher(u._id)}
                          className="bg-brand-600/10 hover:bg-brand-600/20 border border-brand-500/30 text-brand-400 px-2 py-1 rounded text-xxs font-bold"
                          title="Approve Teacher Application"
                        >
                          Approve
                        </button>
                      )}

                      {u.role !== 'admin' && (
                        <>
                          <button
                            onClick={() => handleToggleSuspend(u._id)}
                            className={`px-2 py-1 rounded text-xxs font-bold border ${
                              u.isSuspended
                                ? 'bg-emerald-950/15 border-emerald-500/20 text-emerald-400 hover:bg-emerald-950/30'
                                : 'bg-slate-950 border-slate-900 hover:border-slate-800 text-slate-400'
                            }`}
                          >
                            {u.isSuspended ? 'Unsuspend' : 'Suspend'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u._id)}
                            className="text-slate-650 hover:text-red-400 p-1 align-middle"
                            title="Delete user"
                          >
                            <Trash2 className="h-4 w-4 inline" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
