import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Users,
  DollarSign,
  TrendingUp,
  Star,
  Plus,
  ArrowRight,
  ExternalLink,
  MessageCircle,
  AlertCircle,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { API } from '../../services/api';

export default function TeacherDashboard() {
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // New course modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCategory, setCourseCategory] = useState('Web Development');
  const [coursePrice, setCoursePrice] = useState('49.99');
  const [courseDesc, setCourseDesc] = useState('');

  // Reviews reply states
  const [activeReviews, setActiveReviews] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [activeReplyId, setActiveReplyId] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await API.get('/analytics/teacher');
      setAnalytics(res.data.data);

      // Fetch reviews matching their courses (can search reviews of first course or write aggregate review list)
      if (res.data.data.coursePerformance?.length > 0) {
        // Query reviews for the first course to demonstrate review reply capabilities
        const firstCourseId = res.data.data.coursePerformance[0].courseId;
        const reviewRes = await API.get(`/reviews/course/${firstCourseId}`);
        setActiveReviews(reviewRes.data.data);
      }
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!courseTitle.trim() || submitLoading) return;

    setSubmitLoading(true);
    try {
      const res = await API.post('/courses', {
        title: courseTitle,
        description: courseDesc || 'Learn building and writing MERN applications.',
        category: courseCategory,
        price: parseFloat(coursePrice) || 0,
      });

      setModalOpen(false);
      setCourseTitle('');
      setCourseDesc('');
      
      // Navigate straight to the curriculum editor/builder!
      navigate(`/teacher/courses/${res.data.data._id}/edit`);
    } catch (err) {
      console.error(err.message);
      alert('Failed to create course draft');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSubmitForReview = async (courseId) => {
    try {
      await API.patch(`/courses/${courseId}/submit`);
      alert('Course published successfully!');
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to publish course. Ensure you have added chapters.');
    }
  };

  const handleReplyReview = async (e, reviewId) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      await API.post(`/reviews/${reviewId}/reply`, { replyText });
      setReplyText('');
      setActiveReplyId(null);
      
      // Refresh reviews list
      if (analytics.coursePerformance?.length > 0) {
        const firstCourseId = analytics.coursePerformance[0].courseId;
        const reviewRes = await API.get(`/reviews/course/${firstCourseId}`);
        setActiveReviews(reviewRes.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to submit reply');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh]">
        <Loader2 className="h-10 w-10 text-brand-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading instructor logs...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
      
      {/* Header bar with create CTA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Instructor Panel</h1>
          <p className="text-slate-400 text-sm mt-1">Manage curriculum timelines, monetization rates, and student logs</p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl flex items-center space-x-1.5 transition-all shadow-md shadow-brand-500/10 active:scale-98"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>New Course</span>
        </button>
      </div>

      {/* Analytics aggregates banner */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          
          {/* Stat 1 */}
          <div className="glass-panel rounded-2xl p-5 space-y-3 border border-slate-800">
            <span className="text-xxs font-semibold uppercase tracking-widest text-slate-500">Gross Sales</span>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-slate-500" />
              <span className="text-2xl font-black text-white">${analytics.grossRevenue}</span>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="glass-panel rounded-2xl p-5 space-y-3 border border-slate-800">
            <span className="text-xxs font-semibold uppercase tracking-widest text-slate-500">Net Earnings</span>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-brand-400" />
              <span className="text-2xl font-black text-brand-400">${analytics.netRevenue}</span>
            </div>
          </div>

          {/* Stat 3 */}
          <div className="glass-panel rounded-2xl p-5 space-y-3 border border-slate-800">
            <span className="text-xxs font-semibold uppercase tracking-widest text-slate-500">Enrollments</span>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-slate-500" />
              <span className="text-2xl font-black text-white">{analytics.totalEnrollments}</span>
            </div>
          </div>

          {/* Stat 4 */}
          <div className="glass-panel rounded-2xl p-5 space-y-3 border border-slate-800">
            <span className="text-xxs font-semibold uppercase tracking-widest text-slate-500">Average Rating</span>
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
              <span className="text-2xl font-black text-white">{analytics.averageRating}</span>
            </div>
          </div>

          {/* Stat 5 */}
          <div className="glass-panel rounded-2xl p-5 space-y-3 border border-slate-800">
                <span className="text-xxs font-semibold uppercase tracking-widest text-slate-500">Syllabus Completion</span>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-emerald-450" />
              <span className="text-2xl font-black text-white">{analytics.completionRate}%</span>
            </div>
          </div>

        </div>
      )}

      {/* Main grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Course listing performance list */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-white">Course Catalog Management</h2>
          
          {analytics?.coursePerformance?.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800">
              <BookOpen className="h-12 w-12 text-slate-650 mx-auto mb-4" />
              <h3 className="text-base font-bold text-white mb-2">No Courses Scaffolds Found</h3>
              <p className="text-slate-400 text-xs max-w-xs mx-auto mb-5 leading-relaxed">
                Click "New Course" at the top right to start modeling your course chapters and lectures.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {analytics?.coursePerformance.map((course) => (
                <div
                  key={course.courseId}
                  className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-800/80"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <h3 className="font-bold text-white text-sm sm:text-base leading-tight">
                        {course.title}
                      </h3>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${
                        course.status === 'published'
                          ? 'bg-emerald-950/15 border-emerald-500/35 text-emerald-450'
                          : course.status === 'pending'
                          ? 'bg-amber-950/15 border-amber-500/35 text-amber-450'
                          : course.status === 'rejected'
                          ? 'bg-red-950/15 border-red-500/35 text-red-450'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}>
                        {course.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xxs text-slate-500 flex-wrap gap-y-1 pt-1">
                      <span>Price: ${course.price}</span>
                      <span>•</span>
                      <span>Students: {course.enrollments}</span>
                      <span>•</span>
                      <span>Ratings: {course.rating} ★</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto border-t border-slate-900/60 pt-4 sm:pt-0 sm:border-0 justify-end">
                    {course.status === 'draft' && (
                      <button
                        onClick={() => handleSubmitForReview(course.courseId)}
                        className="bg-slate-950 border border-slate-900 hover:border-slate-800 text-slate-350 text-xxs font-semibold py-2 px-3 rounded-lg transition-colors"
                      >
                        Publish
                      </button>
                    )}
                    
                    <Link
                      to={`/teacher/courses/${course.courseId}/edit`}
                      className="bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xxs py-2 px-3.5 rounded-lg flex items-center space-x-1 transition-all"
                    >
                      <span>Edit Curriculum</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reviews reply panel */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-lg font-bold text-white">Student Review Logs</h2>
          <div className="glass-panel rounded-2xl p-5 border border-slate-800">
            {activeReviews.length === 0 ? (
              <p className="text-slate-500 text-xs italic">No reviews found for your active course modules.</p>
            ) : (
              <div className="space-y-4">
                {activeReviews.map((rev) => (
                  <div key={rev._id} className="border-b border-slate-900 pb-4 last:border-0 last:pb-0 space-y-2 text-xxs">
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-slate-200">{rev.studentId?.name || 'Student'}</span>
                      <span className="text-slate-500">{new Date(rev.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-2.5 w-2.5 ${
                            i < rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-slate-400 leading-relaxed italic">"{rev.comment || 'No comment text.'}"</p>
                    
                    {/* Reply triggers */}
                    {rev.teacherReply ? (
                      <div className="bg-slate-950 border border-slate-900 rounded p-2 text-slate-400 italic">
                        <span className="font-bold text-brand-450 block not-italic">You responded:</span>
                        "{rev.teacherReply}"
                      </div>
                    ) : activeReplyId === rev._id ? (
                      <form onSubmit={(e) => handleReplyReview(e, rev._id)} className="space-y-2 pt-1.5">
                        <textarea
                          rows={2}
                          required
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type response to student..."
                          className="w-full bg-slate-950 border border-slate-900 focus:border-brand-500 rounded-lg p-2 text-xxs text-white focus:outline-none placeholder-slate-700"
                        />
                        <div className="flex space-x-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => setActiveReplyId(null)}
                            className="text-slate-500 hover:text-slate-300 py-1 px-2 border border-slate-900 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="bg-brand-600 hover:bg-brand-700 text-white font-semibold py-1 px-2.5 rounded"
                          >
                            Send
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        onClick={() => setActiveReplyId(rev._id)}
                        className="text-brand-450 hover:underline flex items-center space-x-1 font-semibold pt-1"
                      >
                        <MessageCircle className="h-3 w-3 shrink-0" />
                        <span>Write Response</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Creation Modal dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-fade-in relative">
            <h2 className="text-xl font-extrabold text-white mb-4">Create New Course Draft</h2>
            
            <form onSubmit={handleCreateCourse} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-400 mb-1.5">Course Title</label>
                <input
                  type="text"
                  required
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  placeholder="e.g. Complete Node.js Microservices"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-700 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-400 mb-1.5">Category</label>
                  <select
                    value={courseCategory}
                    onChange={(e) => setCourseCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="Web Development">Web Development</option>
                    <option value="Database Design">Database Design</option>
                    <option value="AI Integration">AI Integration</option>
                    <option value="Cloud Deployments">Cloud Deployments</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-400 mb-1.5">Price ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={coursePrice}
                    onChange={(e) => setCoursePrice(e.target.value)}
                    placeholder="99.99"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-700 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-400 mb-1.5">Brief Description</label>
                <textarea
                  rows={4}
                  value={courseDesc}
                  onChange={(e) => setCourseDesc(e.target.value)}
                  placeholder="Detail course curriculum and student requirements..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-700 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex space-x-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-slate-450 hover:text-slate-200 border border-slate-850 px-4 py-2 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-2 rounded-xl transition-all"
                >
                  {submitLoading ? 'Creating...' : 'Create Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
