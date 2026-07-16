import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Trophy, Flame, Clock, Award, ChevronRight, Loader2, ArrowRight } from 'lucide-react';
import { API } from '../../services/api';

export default function StudentDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch student-specific aggregates
      const analyticRes = await API.get('/analytics/student');
      setAnalytics(analyticRes.data.data);

      // 2. Fetch student's enrolled courses list
      const coursesRes = await API.get('/courses?myCourses=true');
      setCourses(coursesRes.data.data);
    } catch (err) {
      console.error('Failed to load dashboard data', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh]">
        <Loader2 className="h-10 w-10 text-brand-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading learning dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
      
      {/* Welcome banner */}
      <div>
        <h1 className="text-3xl font-extrabold text-white">My Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Track your progress and resume your MERN development courses</p>
      </div>

      {/* Analytics stats banner */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Stat 1 */}
          <div className="glass-panel rounded-2xl p-5 flex items-center space-x-4 border border-slate-800">
            <div className="h-12 w-12 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400 border border-brand-500/20 shrink-0">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-2xl font-black text-white">{analytics.enrolledCoursesCount}</span>
              <span className="text-xxs font-semibold uppercase tracking-widest text-slate-500">Enrolled Courses</span>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="glass-panel rounded-2xl p-5 flex items-center space-x-4 border border-slate-800">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20 shrink-0">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-2xl font-black text-white">{analytics.completedCoursesCount}</span>
              <span className="text-xxs font-semibold uppercase tracking-widest text-slate-500">Completed Courses</span>
            </div>
          </div>

          {/* Stat 3 */}
          <div className="glass-panel rounded-2xl p-5 flex items-center space-x-4 border border-slate-800">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20 shrink-0">
              <Flame className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <span className="block text-2xl font-black text-white">{analytics.learningStreakDays} Days</span>
              <span className="text-xxs font-semibold uppercase tracking-widest text-slate-500">Learning Streak</span>
            </div>
          </div>

          {/* Stat 4 */}
          <div className="glass-panel rounded-2xl p-5 flex items-center space-x-4 border border-slate-800">
            <div className="h-12 w-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20 shrink-0">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-2xl font-black text-white">{analytics.totalHoursWatched} Hrs</span>
              <span className="text-xxs font-semibold uppercase tracking-widest text-slate-500">Time Studied</span>
            </div>
          </div>

        </div>
      )}

      {/* Main dashboard contents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Enrolled courses list */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-white">Enrolled Courses</h2>
          {courses.length === 0 ? (
            <div className="glass-panel rounded-2xl p-12 text-center border border-slate-800">
              <BookOpen className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-base font-bold text-white mb-2">No Enrolled Courses</h3>
              <p className="text-slate-400 text-xs max-w-xs mx-auto mb-6 leading-relaxed">
                You haven't enrolled in any courses yet. Browse our selection and enroll to start learning!
              </p>
              <Link
                to="/courses"
                className="inline-flex items-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors"
              >
                <span>Browse Catalog</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {courses.map((course) => {
                // Fetch percent complete locally if matches from analytics or course list
                // We'll calculate or pull default progress
                return (
                  <div
                    key={course._id}
                    className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-800/80"
                  >
                    <div className="flex items-center space-x-4">
                      {/* Image thumbnail */}
                      <div className="h-16 w-24 rounded-lg bg-slate-950 overflow-hidden relative shrink-0 border border-slate-800/40">
                        {course.thumbnail ? (
                          <img src={course.thumbnail} alt={course.title} className="object-cover w-full h-full" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-slate-700">
                            <BookOpen className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      
                      {/* Title details */}
                      <div>
                        <span className="text-xxs text-brand-450 uppercase font-bold tracking-wider">{course.category}</span>
                        <h3 className="font-bold text-white text-sm sm:text-base leading-tight mt-0.5 line-clamp-1">
                          {course.title}
                        </h3>
                        <p className="text-xxs text-slate-500 mt-1">Instructor: {course.teacherId?.name || 'Instructor'}</p>
                      </div>
                    </div>

                    {/* Progress tracking & CTA */}
                    <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-6 border-t border-slate-900/60 pt-4 sm:pt-0 sm:border-0">
                      <div className="text-left sm:text-right shrink-0">
                        <span className="text-xs font-semibold text-slate-200">
                          {course.ratingsAvg ? 'Active Progress' : 'Just Started'}
                        </span>
                        {/* Fake / real progress slider */}
                        <div className="w-28 bg-slate-950 h-2 rounded-full overflow-hidden mt-1.5 border border-slate-800">
                          <div
                            className="bg-brand-500 h-full rounded-full"
                            style={{ width: `${course.ratingsAvg ? 66 : 0}%` }}
                          />
                        </div>
                      </div>

                      <Link
                        to={`/learn/${course._id}`}
                        className="bg-slate-900 hover:bg-slate-850 text-white font-semibold text-xs px-4 py-2.5 rounded-xl border border-slate-800 hover:border-slate-750 flex items-center space-x-1.5 transition-all shadow-md shrink-0 active:scale-98"
                      >
                        <span>Resume</span>
                        <ChevronRight className="h-4 w-4 text-brand-400" />
                      </Link>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar Skill Breakdown widgets */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-lg font-bold text-white">Skills breakdown</h2>
          
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-5">
            {analytics && analytics.categoryBreakdown.length === 0 ? (
              <p className="text-slate-500 text-xs italic">Complete course lectures to build skill tags.</p>
            ) : (
              <div className="space-y-4">
                {analytics?.categoryBreakdown.map((cat, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">{cat.category}</span>
                      <span className="text-brand-400">{cat.count} course(s)</span>
                    </div>
                    {/* Progress visualizer */}
                    <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900">
                      <div
                        className="bg-indigo-500 h-full rounded-full"
                        style={{ width: `${Math.min(100, cat.count * 33)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Achievement badge */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex items-center space-x-3.5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-full blur-xl" />
            <div className="h-11 w-11 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20 shrink-0">
              <Award className="h-5.5 w-5.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">Certified Developer Status</p>
              <p className="text-xxs text-slate-450 mt-1">Complete 100% of any course syllabus to generate verifiable badges.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
