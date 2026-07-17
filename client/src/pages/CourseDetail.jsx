import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { BookOpen, Star, ShieldCheck, Play, Award, Clock, FileText, CheckCircle, Tag, Loader2, X, CreditCard } from 'lucide-react';
import { API } from '../services/api';
import YouTube from 'react-youtube';

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
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentStep, setPaymentStep] = useState('form');
  const [activePreviewLecture, setActivePreviewLecture] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    cardName: '',
    expiry: '',
    cvv: '',
    upiId: '',
    bankName: '',
    wallet: 'Paytm',
    walletMobile: '',
  });

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

  const handleEnroll = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setPaymentError('');
    setPaymentStep('form');
    setPaymentMethod('upi');
    setShowPaymentModal(true);
  };

  const getPayableAmount = () => {
    if (discountInfo?.newPrice !== undefined) {
      return discountInfo.newPrice;
    }

    if (course.discountedPrice && course.discountValidTill && new Date() < new Date(course.discountValidTill)) {
      return course.discountedPrice;
    }

    return course.price;
  };

  const handleProcessDummyPayment = async () => {
    const cardValid =
      paymentForm.cardNumber.replace(/\s/g, '').length >= 12 &&
      paymentForm.cardName.trim() &&
      paymentForm.expiry.length >= 4 &&
      paymentForm.cvv.length >= 3;
    const upiValid = /.+@.+/.test(paymentForm.upiId.trim());
    const netBankingValid = paymentForm.bankName.trim().length >= 2;
    const walletValid = /^\d{10}$/.test(paymentForm.walletMobile.trim());

    const methodValidationMap = {
      card: cardValid,
      upi: upiValid,
      netbanking: netBankingValid,
      wallet: walletValid,
    };

    if (!methodValidationMap[paymentMethod]) {
      setPaymentError('Please fill valid payment details to continue.');
      return;
    }

    setCheckoutLoading(true);
    setPaymentError('');
    try {
      const paymentRes = await API.post('/payments/mock-checkout', {
        courseId: id,
        couponCode: couponApplied ? couponCode : undefined,
      });

      const paymentData = paymentRes.data?.data || {};
      setReceipt({
        transactionId: paymentData.transactionId || `mock_tx_${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        amountPaid: paymentData.amountPaid ?? getPayableAmount(),
        paidAt: new Date().toISOString(),
        paymentMethod,
        methodLabel:
          paymentMethod === 'upi'
            ? `UPI (${paymentForm.upiId || 'upi'})`
            : paymentMethod === 'card'
            ? 'Credit/Debit Card'
            : paymentMethod === 'netbanking'
            ? `Net Banking (${paymentForm.bankName || 'bank'})`
            : `Wallet (${paymentForm.wallet || 'wallet'})`,
      });
      setPaymentStep('success');

      setTimeout(() => {
        setShowPaymentModal(false);
        navigate(`/learn/${id}`);
      }, 4500);
    } catch (err) {
      console.error('Enrollment failed', err.message);
      setPaymentError(err.response?.data?.error?.message || 'Payment processing failed. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (!receipt || !course) {
      return;
    }

    const receiptText = [
      'LearnSphere Dummy Payment Receipt',
      '--------------------------------',
      `Course: ${course.title}`,
      `Student: ${user?.name || 'Learner'}`,
      `Transaction ID: ${receipt.transactionId}`,
      `Payment Method: ${receipt.methodLabel || receipt.paymentMethod || 'Dummy'}`,
      `Amount Paid: $${Number(receipt.amountPaid || 0).toFixed(2)}`,
      `Paid At: ${new Date(receipt.paidAt).toLocaleString()}`,
      'Status: Paid (Dummy Gateway)',
    ].join('\n');

    const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `learnsphere-receipt-${receipt.transactionId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
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
                      chapter.lectures.map((lecture) => {
                        const canPreview = lecture.isPreviewFree;
                        return (
                          <div
                            key={lecture._id}
                            onClick={() => canPreview && setActivePreviewLecture(lecture)}
                            className={`px-5 py-3.5 flex justify-between items-center text-xs transition-all ${
                              canPreview
                                ? 'cursor-pointer hover:bg-slate-800/40 text-slate-200'
                                : 'text-slate-500'
                            }`}
                          >
                            <div className="flex items-center space-x-3">
                              {canPreview ? (
                                <Play className="h-3.5 w-3.5 text-emerald-400 shrink-0 fill-emerald-500/15" />
                              ) : (
                                <Play className="h-3.5 w-3.5 text-slate-650 shrink-0 opacity-40" />
                              )}
                              <span className={`line-clamp-1 ${canPreview ? 'font-semibold text-slate-100' : 'text-slate-400'}`}>
                                {lecture.title}
                              </span>
                            </div>
                            <div className="flex items-center space-x-3 shrink-0">
                              {canPreview && (
                                <span className="bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded text-xxs font-bold uppercase tracking-wider">
                                  Free Preview
                                </span>
                              )}
                              <span className="text-slate-550 font-medium">
                                {Math.round((lecture.duration || 0) / 60)} mins
                              </span>
                            </div>
                          </div>
                        );
                      })
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
                    <span>Proceed to Payment</span>
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

      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            {paymentStep === 'form' ? (
              <>
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-white">Dummy Payment Gateway</h3>
                    <p className="mt-1 text-xs text-slate-400">Complete payment to confirm enrollment</p>
                  </div>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-300">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Test Mode: no real money is charged</span>
                  </div>
                </div>

                <div className="mb-4 rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-sm">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Total Payable</span>
                    <span className="font-bold text-white">${getPayableAmount().toFixed(2)}</span>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => setPaymentMethod('upi')}
                    className={`rounded-lg border px-3 py-2 font-semibold transition-colors ${
                      paymentMethod === 'upi'
                        ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                        : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    UPI
                  </button>
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`rounded-lg border px-3 py-2 font-semibold transition-colors ${
                      paymentMethod === 'card'
                        ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                        : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Card
                  </button>
                  <button
                    onClick={() => setPaymentMethod('netbanking')}
                    className={`rounded-lg border px-3 py-2 font-semibold transition-colors ${
                      paymentMethod === 'netbanking'
                        ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                        : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Net Banking
                  </button>
                  <button
                    onClick={() => setPaymentMethod('wallet')}
                    className={`rounded-lg border px-3 py-2 font-semibold transition-colors ${
                      paymentMethod === 'wallet'
                        ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                        : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Wallet
                  </button>
                </div>

                <div className="space-y-3">
                  {paymentMethod === 'upi' && (
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-400">UPI ID</label>
                      <input
                        type="text"
                        value={paymentForm.upiId}
                        onChange={(e) =>
                          setPaymentForm((prev) => ({ ...prev, upiId: e.target.value }))
                        }
                        placeholder="name@upi"
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {paymentMethod === 'card' && (
                    <>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-400">Card Number</label>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                          <input
                            type="text"
                            maxLength={19}
                            value={paymentForm.cardNumber}
                            onChange={(e) =>
                              setPaymentForm((prev) => ({ ...prev, cardNumber: e.target.value }))
                            }
                            placeholder="4242 4242 4242 4242"
                            className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-600 focus:border-brand-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-400">Card Holder Name</label>
                        <input
                          type="text"
                          value={paymentForm.cardName}
                          onChange={(e) =>
                            setPaymentForm((prev) => ({ ...prev, cardName: e.target.value }))
                          }
                          placeholder="John Doe"
                          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-brand-500 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-400">Expiry</label>
                          <input
                            type="text"
                            maxLength={5}
                            value={paymentForm.expiry}
                            onChange={(e) =>
                              setPaymentForm((prev) => ({ ...prev, expiry: e.target.value }))
                            }
                            placeholder="MM/YY"
                            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-brand-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-400">CVV</label>
                          <input
                            type="password"
                            maxLength={4}
                            value={paymentForm.cvv}
                            onChange={(e) =>
                              setPaymentForm((prev) => ({ ...prev, cvv: e.target.value }))
                            }
                            placeholder="123"
                            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-brand-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {paymentMethod === 'netbanking' && (
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-400">Bank Name</label>
                      <input
                        type="text"
                        value={paymentForm.bankName}
                        onChange={(e) =>
                          setPaymentForm((prev) => ({ ...prev, bankName: e.target.value }))
                        }
                        placeholder="e.g. HDFC, SBI, ICICI"
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {paymentMethod === 'wallet' && (
                    <>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-400">Wallet Provider</label>
                        <select
                          value={paymentForm.wallet}
                          onChange={(e) =>
                            setPaymentForm((prev) => ({ ...prev, wallet: e.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white focus:border-brand-500 focus:outline-none"
                        >
                          <option value="Paytm">Paytm</option>
                          <option value="PhonePe">PhonePe</option>
                          <option value="Amazon Pay">Amazon Pay</option>
                          <option value="Mobikwik">Mobikwik</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-400">Mobile Number</label>
                        <input
                          type="text"
                          maxLength={10}
                          value={paymentForm.walletMobile}
                          onChange={(e) =>
                            setPaymentForm((prev) => ({ ...prev, walletMobile: e.target.value.replace(/\D/g, '') }))
                          }
                          placeholder="10-digit mobile"
                          className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                    </>
                  )}

                  {paymentError && <p className="text-xs font-medium text-red-400">{paymentError}</p>}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => setShowPaymentModal(false)}
                      className="flex-1 rounded-lg border border-slate-700 bg-slate-900 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleProcessDummyPayment}
                      disabled={checkoutLoading}
                      className="flex-1 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                    >
                      {checkoutLoading ? 'Processing...' : 'Process Payment'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-2">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                  <CheckCircle className="h-10 w-10 animate-pulse" />
                </div>
                <h3 className="text-center text-lg font-bold text-white">Payment Successful</h3>
                <p className="mt-1 text-center text-xs text-slate-400">Enrollment confirmed. Redirecting to course player in a moment...</p>

                <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-xs">
                  <div className="mb-2 flex items-center justify-between text-slate-400">
                    <span>Status</span>
                    <span className="font-semibold text-emerald-400">Paid</span>
                  </div>
                  <div className="mb-2 flex items-center justify-between text-slate-400">
                    <span>Amount</span>
                    <span className="font-semibold text-white">${Number(receipt?.amountPaid || 0).toFixed(2)}</span>
                  </div>
                  <div className="mb-2 flex items-center justify-between text-slate-400">
                    <span>Transaction</span>
                    <span className="font-semibold text-slate-300">{receipt?.transactionId}</span>
                  </div>
                  <div className="mb-2 flex items-center justify-between text-slate-400">
                    <span>Method</span>
                    <span className="font-semibold text-slate-300">{receipt?.methodLabel || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Time</span>
                    <span className="font-semibold text-slate-300">
                      {receipt?.paidAt ? new Date(receipt.paidAt).toLocaleTimeString() : '-'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleDownloadReceipt}
                  className="mt-4 w-full rounded-lg border border-brand-500/40 bg-brand-500/10 py-2.5 text-xs font-semibold text-brand-300 hover:bg-brand-500/20"
                >
                  Download Receipt
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Free Preview Video Modal */}
      {activePreviewLecture && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/50">
              <div>
                <span className="bg-emerald-500/15 text-emerald-450 px-2.5 py-0.5 rounded text-xxs font-extrabold uppercase tracking-wider border border-emerald-500/20">
                  Free Preview
                </span>
                <h3 className="text-base font-bold text-white mt-2.5 line-clamp-1">{activePreviewLecture.title}</h3>
              </div>
              <button
                onClick={() => setActivePreviewLecture(null)}
                className="rounded-full p-2 text-slate-450 hover:bg-slate-800 hover:text-white transition-all focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Video Player */}
            <div className="aspect-video w-full bg-black relative">
              <YouTube
                videoId={activePreviewLecture.youtubeVideoId}
                opts={{
                  width: '100%',
                  height: '100%',
                  playerVars: {
                    autoplay: 1,
                    modestbranding: 1,
                    rel: 0,
                  },
                }}
                className="w-full h-full"
              />
            </div>

            {/* Footer with a purchase CTA */}
            {!isEnrolled && (
              <div className="px-6 py-4 bg-slate-950/70 border-t border-slate-850/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-left">
                  <p className="text-xs text-slate-450">Enjoying this preview? Get lifetime access to the full course.</p>
                  <p className="text-sm font-bold text-white mt-1">
                    Price: {course.price === 0 ? 'Free' : `$${getPayableAmount().toFixed(2)}`}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActivePreviewLecture(null);
                    handleEnroll();
                  }}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl px-5 py-2.5 transition-all shadow-md active:scale-97"
                >
                  Enroll Now
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
