const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_stripe_key');
const expressAsyncHandler = require('express-async-handler');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Progress = require('../models/Progress');
const Payment = require('../models/Payment');
const Coupon = require('../models/Coupon');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');

// Helper to check if Stripe is properly configured
const isStripeConfigured =
  process.env.STRIPE_SECRET_KEY &&
  process.env.STRIPE_SECRET_KEY !== 'sk_test_your_stripe_secret_key' &&
  process.env.STRIPE_SECRET_KEY !== 'sk_test_mock_stripe_key';

// @desc    Create Stripe Checkout Session
// @route   POST /api/v1/payments/checkout-session
// @access  Private
const createCheckoutSession = expressAsyncHandler(async (req, res, next) => {
  const { courseId, couponCode } = req.body;

  const course = await Course.findById(courseId);
  if (!course || course.isDeleted) {
    return next(new AppError('Course not found', 404));
  }

  // Check if student is already enrolled
  const existingEnrollment = await Enrollment.findOne({
    studentId: req.user.id,
    courseId,
  });

  if (existingEnrollment) {
    return next(new AppError('You are already enrolled in this course', 400));
  }

  // Calculate price (handling discounts and coupons)
  let coursePrice = course.price;
  
  // Use discounted price if active
  if (course.discountedPrice && course.discountValidTill && new Date() < course.discountValidTill) {
    coursePrice = course.discountedPrice;
  }

  let coupon = null;
  if (couponCode) {
    coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
    if (!coupon || !coupon.isValid()) {
      return next(new AppError('Invalid or expired coupon code', 400));
    }

    if (coupon.discountType === 'percentage') {
      coursePrice = coursePrice * (1 - coupon.discountValue / 100);
    } else {
      coursePrice = Math.max(0, coursePrice - coupon.discountValue);
    }
  }

  // Force price to 2 decimal places
  coursePrice = Math.round(coursePrice * 100) / 100;

  // Handle free courses directly
  if (coursePrice === 0) {
    return res.status(200).json({
      success: true,
      freeEnrollment: true,
      message: 'Course is free. Direct enrollment triggered.',
      data: { courseId, couponCode },
    });
  }

  if (!isStripeConfigured) {
    return next(
      new AppError(
        'Stripe is not configured on this server. Please use the /payments/mock-checkout endpoint for local testing.',
        501
      )
    );
  }

  // Create Stripe line items
  const lineItem = {
    price_data: {
      currency: 'usd',
      product_data: {
        name: course.title,
        description: course.subtitle || 'LearnSphere Course',
        images: course.thumbnail ? [course.thumbnail] : [],
      },
      unit_amount: Math.round(coursePrice * 100), // in cents
    },
    quantity: 1,
  };

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [lineItem],
    metadata: {
      studentId: req.user.id.toString(),
      courseId: courseId.toString(),
      couponId: coupon ? coupon._id.toString() : '',
    },
    success_url: `${req.protocol}://${req.get('host')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${req.protocol}://${req.get('host')}/payment-cancel`,
  });

  res.status(200).json({
    success: true,
    data: {
      sessionId: session.id,
      sessionUrl: session.url,
    },
  });
});

// @desc    Secure Stripe Webhook (Verifies payment on webhook signature)
// @route   POST /api/v1/payments/webhook
// @access  Public (Called by Stripe)
const stripeWebhook = expressAsyncHandler(async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body, // Must be raw buffer
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock_webhook_secret'
    );
  } catch (err) {
    return res.status(400).send(`Webhook Signature Verification Failed: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    // Retrieve details from metadata
    const { studentId, courseId, couponId } = session.metadata;
    const amountTotal = session.amount_total / 100; // convert cents to dollars
    const paymentIntentId = session.payment_intent || session.id;

    // Enroll student and set up progress
    await enrollStudentInCourse({
      studentId,
      courseId,
      amount: amountTotal,
      paymentIntentId,
      couponId: couponId || null,
      gateway: 'stripe',
    });
  }

  res.status(200).json({ received: true });
});

// @desc    Simulate Mock Checkout (For testing / review without active Stripe API credentials)
// @route   POST /api/v1/payments/mock-checkout
// @access  Private
const simulateMockCheckout = expressAsyncHandler(async (req, res, next) => {
  const { courseId, couponCode } = req.body;

  const course = await Course.findById(courseId);
  if (!course || course.isDeleted) {
    return next(new AppError('Course not found', 404));
  }

  const existingEnrollment = await Enrollment.findOne({
    studentId: req.user.id,
    courseId,
  });

  if (existingEnrollment) {
    return next(new AppError('You are already enrolled in this course', 400));
  }

  // Calculate pricing
  let finalPrice = course.price;
  
  if (course.discountedPrice && course.discountValidTill && new Date() < course.discountValidTill) {
    finalPrice = course.discountedPrice;
  }

  let coupon = null;
  if (couponCode) {
    coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
    if (!coupon || !coupon.isValid()) {
      return next(new AppError('Invalid or expired coupon code', 400));
    }

    if (coupon.discountType === 'percentage') {
      finalPrice = finalPrice * (1 - coupon.discountValue / 100);
    } else {
      finalPrice = Math.max(0, finalPrice - coupon.discountValue);
    }
  }

  finalPrice = Math.round(finalPrice * 100) / 100;

  const paymentIntentId = 'mock_tx_' + Math.random().toString(36).substring(2, 10).toUpperCase();

  // Create enrollment
  const enrollment = await enrollStudentInCourse({
    studentId: req.user.id,
    courseId,
    amount: finalPrice,
    paymentIntentId,
    couponId: coupon ? coupon._id : null,
    gateway: 'stripe',
  });

  res.status(200).json({
    success: true,
    data: enrollment,
    message: 'Mock Checkout simulated successfully. Course access granted!',
  });
});

// Helper function to handle database writes for enrollment, payment, and progress
const enrollStudentInCourse = async ({ studentId, courseId, amount, paymentIntentId, couponId, gateway }) => {
  // Check double enrollment
  const existing = await Enrollment.findOne({ studentId, courseId });
  if (existing) return existing;

  // 1. Create Enrollment
  const enrollment = await Enrollment.create({
    studentId,
    courseId,
  });

  // 2. Initialize Progress
  await Progress.create({
    studentId,
    courseId,
    completedLectures: [],
    percentComplete: 0,
  });

  // 3. Create Payment record
  await Payment.create({
    studentId,
    courseId,
    amount,
    paymentGateway: gateway,
    paymentIntentId,
    status: 'succeeded',
    couponUsed: couponId,
  });

  // 4. Increment course enrollment count
  await Course.findByIdAndUpdate(courseId, {
    $inc: { enrollmentCount: 1 },
  });

  // 5. Update coupon usage
  if (couponId) {
    await Coupon.findByIdAndUpdate(couponId, {
      $inc: { usageCount: 1 },
    });
  }

  // 6. Push notification
  const student = await User.findById(studentId);
  const course = await Course.findById(courseId);
  await Notification.create({
    userId: studentId,
    type: 'enrollment',
    message: `You have successfully enrolled in the course: "${course.title}". Happy learning!`,
    link: `/courses/${courseId}`,
  });

  return enrollment;
};

module.exports = {
  createCheckoutSession,
  stripeWebhook,
  simulateMockCheckout,
};
