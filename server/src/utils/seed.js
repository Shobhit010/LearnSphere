require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const Chapter = require('../models/Chapter');
const Lecture = require('../models/Lecture');
const Enrollment = require('../models/Enrollment');
const Progress = require('../models/Progress');
const Review = require('../models/Review');
const Coupon = require('../models/Coupon');

const seedData = async () => {
  try {
    // 1. Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/learnsphere');
    console.log('Connected to MongoDB for seeding...');

    // 2. Clear collections
    await User.deleteMany({});
    await Course.deleteMany({});
    await Chapter.deleteMany({});
    await Lecture.deleteMany({});
    await Enrollment.deleteMany({});
    await Progress.deleteMany({});
    await Review.deleteMany({});
    await Coupon.deleteMany({});
    console.log('Cleared existing database data...');

    // 3. Create Users
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@learnsphere.com',
      password: 'adminpassword123',
      role: 'admin',
    });

    const teacher = await User.create({
      name: 'Dr. Sarah Jenkins',
      email: 'sarah.jenkins@learnsphere.com',
      password: 'teacherpassword123',
      role: 'teacher',
      isApprovedTeacher: true,
      bio: 'Ph.D. in Computer Science with 10+ years of teaching full-stack web development and AI architectures.',
    });

    const student = await User.create({
      name: 'John Doe',
      email: 'john.doe@learnsphere.com',
      password: 'studentpassword123',
      role: 'student',
      bio: 'Enthusiastic developer learning React and database engines.',
    });

    console.log('Seeded Users:');
    console.log(`- Admin: admin@learnsphere.com / adminpassword123`);
    console.log(`- Teacher: sarah.jenkins@learnsphere.com / teacherpassword123`);
    console.log(`- Student: john.doe@learnsphere.com / studentpassword123`);

    // 4. Create a Course
    const course = await Course.create({
      title: 'Mastering MERN Stack & Cloud Deployments',
      subtitle: 'Build and deploy a scalable production-grade web application from scratch.',
      description: 'Learn MongoDB schemas, Express routers, React state management, and Node.js security structures. This comprehensive course covers Stripe billing, AI prompt engineering integrations, and production deployment strategies.',
      category: 'Web Development',
      subcategory: 'MERN Stack',
      level: 'intermediate',
      language: 'English',
      price: 99.99,
      discountedPrice: 49.99,
      discountValidTill: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      status: 'published',
      teacherId: teacher._id,
      ratingsAvg: 4.8,
      ratingsCount: 1,
      enrollmentCount: 1,
      tags: ['MongoDB', 'Express', 'React', 'Node.js', 'Stripe', 'AI'],
    });

    console.log(`Seeded Course: "${course.title}"`);

    // 5. Create Chapters
    const chapter1 = await Chapter.create({
      title: 'Chapter 1: Getting Started & Scaffold',
      order: 1,
      courseId: course._id,
    });

    const chapter2 = await Chapter.create({
      title: 'Chapter 2: Implementing Mongoose Models',
      order: 2,
      courseId: course._id,
    });

    console.log('Seeded Chapters...');

    // 6. Create Lectures
    // Chapter 1 Lectures
    const lecture1_1 = await Lecture.create({
      title: '1.1 Course Overview & Introduction',
      order: 1,
      chapterId: chapter1._id,
      youtubeVideoId: 'dQw4w9WgXcQ', // Dummy video
      duration: 300, // 5 mins
      isPreviewFree: true,
      transcript: 'Welcome to the Mastering MERN Stack course. In this lecture, we will cover the platform overview, our development timeline, and set up our folder architectures for the client and server. We will learn how Express manages REST endpoints and how React handles state updates in a responsive UI.',
      resources: [
        {
          type: 'pdf',
          url: 'https://res.cloudinary.com/mock/raw/upload/v1234/syllabus.pdf',
          fileName: 'Course_Syllabus.pdf',
          size: 1542000,
        },
      ],
    });

    const lecture1_2 = await Lecture.create({
      title: '1.2 Creating the Folder Structure',
      order: 2,
      chapterId: chapter1._id,
      youtubeVideoId: 'dQw4w9WgXcQ',
      duration: 600, // 10 mins
      isPreviewFree: false,
      transcript: 'Now let us set up the repository. We will create two main directories: server for our Node and Express endpoints, and client for React. We will configure package.json scripts for running both simultaneously using nodemon and dev configurations.',
      resources: [
        {
          type: 'link',
          url: 'https://github.com/example/mern-scaffold',
          fileName: 'GitHub Repository Template',
        },
      ],
    });

    // Chapter 2 Lectures
    const lecture2_1 = await Lecture.create({
      title: '2.1 Mongoose Schemas & Connections',
      order: 1,
      chapterId: chapter2._id,
      youtubeVideoId: 'dQw4w9WgXcQ',
      duration: 800,
      isPreviewFree: false,
      transcript: 'In this section, we design the schemas. We will create a Mongoose connection inside our db.js file. We will define structural fields for Users, including name, email, password hashes, and user roles. We will write middleware pre-hooks for hashing passwords.',
      resources: [],
    });

    console.log('Seeded Lectures...');

    // 7. Enroll student in the course
    await Enrollment.create({
      studentId: student._id,
      courseId: course._id,
    });

    // 8. Initialize course progress for the student
    await Progress.create({
      studentId: student._id,
      courseId: course._id,
      completedLectures: [lecture1_1._id],
      percentComplete: 33.3, // 1 out of 3 lectures completed
      lastAccessedLecture: lecture1_2._id,
    });

    // 9. Add a Review
    await Review.create({
      courseId: course._id,
      studentId: student._id,
      rating: 5,
      comment: 'Excellent course material! The teacher explains complex full-stack database architectures very clearly.',
      teacherReply: 'Thank you, John! Glad you are enjoying the MERN development modules.',
    });

    // 10. Add a coupon
    await Coupon.create({
      code: 'MERN50',
      discountType: 'percentage',
      discountValue: 50,
      createdBy: admin._id,
      usageLimit: 100,
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    });

    console.log('Database seeded successfully! 🌱');
    process.exit(0);
  } catch (error) {
    console.error(`Seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedData();
