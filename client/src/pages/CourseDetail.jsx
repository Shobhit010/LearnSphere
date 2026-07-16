import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { BookOpen, Star, ShieldCheck, Play, Award, Clock, FileText, CheckCircle, Tag, Loader2 } from 'lucide-react';
import { API } from '../services/api';

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [course, setCourse] = useState(null);
  const [curriculum, setCurriculum] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [loading, setLoading] = useState(true);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [discountInfo, setDiscountInfo] = useState(null);
  const [couponError, setCouponError] = useState(null);
  const [couponApplied, setCouponApplied] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    fetchCourseDetails();
    fetchReviews();
  }, [id]);

  const fetchCourseDetails = async () => {
    try {
      const res = await API.get(`/courses/${id}`);
      const data = res.data.data;
      setCourse(data.course);
      setCurriculum(data.curriculum);
      setIsEnrolled(data.isEnrolled);
      setProgressPercent(data.progressPercent);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await API.get(`/reviews/course/${id}`);
      setReviews(res.data.data);
    } catch (err) {
      console.error(err.message);
    }
  };

  const applyCoupon = async () => {
    setCouponError(null);
    setDiscountInfo(null);
    setCouponApplied(false);
    
    if (!couponCode.trim()) return;

    try {
      // Simulate verifying coupon on server-side checkout values
      const couponRes = await API.post('/payments/checkout-session', {
        courseId: id,
        couponCode: couponCode.toUpperCase(),
      });
      
      // If Stripe is mock, we handles pricing locally or via simulation
      setCouponApplied(true);
      // Mock calculation for UI preview
      let finalPrice = course.price;
      if (couponCode.toUpperCase() === 'MERN50') {
        finalPrice = course.price * 0.5;
        setDiscountInfo({ discount: '50% Off', newPrice: finalPrice });
      } else {
        finalPrice = Math.max(0, course.price - 10);
        setDiscountInfo({ discount: '$10.00 Off', newPrice: finalPrice });
      }
    } catch (err) {
      setCouponError(err.response?.data?.error?.message || 'Invalid coupon code');
    }
  };

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setCheckoutLoading(true);
    try {
      // Use mock checkout pathway for quick local testing and evaluation
      await API.post('/payments/mock-checkout', {
        courseId: id,
        couponCode: couponApplied ? couponCode : undefined,
      });

      // Enrollment successful, send to player watch page
      navigate(`/learn/${id}`);
    } catch (err) {
      console.error('Enrollment failed', err.message);
      alert(err.response?.data?.error?.message || 'Checkout failed. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh]">
        <Loader2 className="h-10 w-10 text-brand-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading course details...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-md mx-auto py-24 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Course Not Found</h2>
        <Link to="/courses" className="text-brand-450 hover:underline">
          Go back to course discovery
        </Link>
      </div>
    );
  }

  // Calculate stats
  const totalLecturesCount = curriculum.reduce((acc, c) => acc + (c.lectures?.length || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Course Details Column */}
        <div className="lg:col-span-2 space-y-10 animate-fade-in order-2 lg:order-1">
          <div>
            <span className="bg-brand-550/20 text-brand-400 text-xxs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-brand-550/15">
              {course.category}
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mt-4">{course.title}</h1>
            <p className="text-slate-350 text-base mt-2">{course.subtitle}</p>
            
            <div className="flex items-center space-x-6 mt-6 flex-wrap gap-y-3">
              <div className="flex items-center space-x-1.5">
                <Star className="h-4.5 w-4.5 text-amber-400 fill-amber-400" />
                <span className="text-sm font-semibold text-white">{course.ratingsAvg || '0.0'}</span>
                <span className="text-xs text-slate-500">({course.ratingsCount} reviews)</span>
              </div>
              <span className="h-4 w-px bg-slate-800 hidden sm:block" />
              <div className="text-xs text-slate-400">
                Enrolled: <span className="font-semibold text-slate-200">{course.enrollmentCount} students</span>
              </div>
              <span className="h-4 w-px bg-slate-800 hidden sm:block" />
              <div className="text-xs text-slate-400">
                Level: <span className="font-semibold text-slate-200 capitalize">{course.level}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="border-t border-slate-900 pt-8">
            <h2 className="text-lg font-bold text-white mb-3">About this Course</h2>
            <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-line">
              {course.description}
            </p>
          </div>

          {/* Curriculum Index */}
          <div className="border-t border-slate-900 pt-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-white">Curriculum Outline</h2>
              <span className="text-xs text-slate-400">
                {curriculum.length} Chapters • {totalLecturesCount} Lectures
              </span>
            </div>

            <div className="space-y-4">
              {curriculum.map((chapter) => (
                <div key={chapter._id} className="bg-slate-900/30 border border-slate-800/80 rounded-xl overflow-hidden">
                  <div className="bg-slate-900/50 px-5 py-4 border-b border-slate-800/40">
                    <h3 className="font-bold text-sm text-slate-200">
                      {chapter.title}
                    </h3>
                  </div>
                  <div className="divide-y divide-slate-800/30">
                    {chapter.lectures?.length === 0 ? (
                      <div className="p-4 text-xs text-slate-500 italic">No lectures in this chapter.</div>
                    ) : (
                      chapter.lectures.map((lecture) => (
                        <div key={lecture._id} className="px-5 py-3.5 flex justify-between items-center text-xs">
                          <div className="flex items-center space-x-3 text-slate-350">
                            <Play className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                            <span className="line-clamp-1">{lecture.title}</span>
                          </div>
                          <div className="flex items-center space-x-3 shrink-0">
                            {lecture.isPreviewFree && (
                              <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-xxs font-bold">
                                Free Preview
                              </span>
                            )}
                            <span className="text-slate-550 font-medium">
                              {Math.round((lecture.duration || 0) / 60)} mins
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews List */}
          <div className="border-t border-slate-900 pt-8">
            <h2 className="text-lg font-bold text-white mb-6">Student Reviews</h2>
            {reviews.length === 0 ? (
              <p className="text-slate-500 text-xs italic">No reviews submitted yet for this course.</p>
            ) : (
              <div className="space-y-5">
                {reviews.map((r) => (
                  <div key={r._id} className="border-b border-slate-900/60 pb-5">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs text-white">
                          {r.studentId?.avatar ? (
                            <img src={r.studentId.avatar} alt="avatar" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            r.studentId?.name?.charAt(0).toUpperCase() || 'S'
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-200">{r.studentId?.name || 'Student'}</p>
                          <div className="flex items-center mt-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-xxs text-slate-550">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {r.comment && (
                      <p className="text-slate-400 text-xs mt-3 pl-11 leading-relaxed">
                        {r.comment}
                      </p>
                    )}
                    
                    {/* Instructor Reply */}
                    {r.teacherReply && (
                      <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-3 mt-3 ml-11">
                        <p className="text-xxs font-bold text-brand-400">Instructor Response</p>
                        <p className="text-slate-350 text-xs mt-1 leading-relaxed italic">
                          "{r.teacherReply}"
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Purchase Sidebar Widget Column */}
        <div className="lg:col-span-1 order-1 lg:order-2">
          <div className="sticky top-28 glass-panel rounded-2xl p-6 shadow-xl space-y-6 animate-fade-in border border-slate-800">
            
            {/* Thumbnail */}
            <div className="aspect-video w-full rounded-xl bg-slate-950 overflow-hidden relative border border-slate-800/40">
              {course.thumbnail ? (
                <img src={course.thumbnail} alt={course.title} className="object-cover w-full h-full" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-slate-750 bg-slate-950">
                  <BookOpen className="h-10 w-10" />
                </div>
              )}
            </div>

            {/* Price Box */}
            <div className="flex items-baseline justify-between">
              <span className="text-slate-400 text-sm">Course Price:</span>
              <div className="text-right">
                {discountInfo ? (
                  <div className="space-y-0.5">
                    <span className="text-slate-500 line-through text-sm mr-2">${course.price}</span>
                    <span className="text-2xl font-black text-white">${discountInfo.newPrice.toFixed(2)}</span>
                  </div>
                ) : course.discountedPrice && course.discountValidTill && new Date() < new Date(course.discountValidTill) ? (
                  <div className="space-y-0.5">
                    <span className="text-slate-500 line-through text-sm mr-2">${course.price}</span>
                    <span className="text-2xl font-black text-white">${course.discountedPrice.toFixed(2)}</span>
                  </div>
                ) : (
                  <span className="text-2xl font-black text-white">
                    {course.price === 0 ? 'Free' : `$${course.price.toFixed(2)}`}
                  </span>
                )}
              </div>
            </div>

            {/* CTAs */}
            {isEnrolled ? (
              <div className="space-y-3">
                <div className="bg-brand-950/20 border border-brand-550/30 rounded-xl p-3.5 text-center text-brand-350 text-xs">
                  <CheckCircle className="h-5 w-5 text-brand-400 mx-auto mb-1.5" />
                  <span>You are enrolled in this course! Progress: {progressPercent}%</span>
                </div>
                <Link
                  to={`/learn/${course._id}`}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center space-x-2 transition-all shadow-md active:scale-98"
                >
                  <span>Go to Course Player</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Coupon application input */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="COUPONCODE"
                        disabled={couponApplied}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-brand-500 rounded-lg py-2 pl-9 pr-3 text-xs text-white uppercase placeholder-slate-600 focus:outline-none disabled:opacity-40"
                      />
                    </div>
                    <button
                      onClick={applyCoupon}
                      disabled={couponApplied || !couponCode.trim()}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 rounded-lg transition-colors disabled:opacity-40"
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && <p className="text-xxs text-red-400 font-medium">{couponError}</p>}
                  {couponApplied && (
                    <p className="text-xxs text-emerald-400 font-bold">
                      Coupon Applied! {discountInfo?.discount || 'Discount loaded'}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleEnroll}
                  disabled={checkoutLoading}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl py-3.5 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Enroll Now</span>
                  )}
                </button>
              </div>
            )}

            {/* Benefits list */}
            <div className="border-t border-slate-900/60 pt-5 space-y-3.5 text-xs text-slate-400">
              <div className="flex items-center space-x-2.5">
                <Clock className="h-4 w-4 text-brand-450 shrink-0" />
                <span>Full lifetime access</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <FileText className="h-4 w-4 text-indigo-455 shrink-0" />
                <span>Lecture slides & code archives</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <Award className="h-4 w-4 text-violet-455 shrink-0" />
                <span>Verifiable certificate of completion</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
