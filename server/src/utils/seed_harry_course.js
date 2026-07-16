require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const Chapter = require('../models/Chapter');
const Lecture = require('../models/Lecture');
const Enrollment = require('../models/Enrollment');
const Progress = require('../models/Progress');

const videoIds = [
  'tVzUXW6siu0', 'kJEsTjH5mVg', 'BGeDBfCIqas', 'nXba2-mgn1k', '1BsVhumGlNc',
  'CyRlWlaJnTY', 'tLBlhp0SA_0', 'vnnlUCLfn6I', 'vlAWzsGd-Yk', 'XZwBNDGuWGU',
  'fhoDRB53DwY', '5xFRg_TzlAg', 'cvsbHZcDx8w', '1dkfuga2_Ps', '-XwZpYIyCEA',
  'anGMeDGvZhw', '1cEG1T8beO4', 'Xrxd6cEajhM', 'aFicd4-YTfo', '4aBolpJoutw',
  'uTcpbPMZlFE', 'nkaAJYfRDVk', 'hRHV5cjEB1w', 'BZJcNU648Tc', 'ZIofkptpXO8',
  'ntlawluDB-c', 'g1HJ65p5YdI', 'cOw6tgH6P20', 'nm3HrrUuz50', 'ovRU9xHfly4',
  'eHye3PxH4jU', '2PWgbyL3ex8', '-WN74rN9OPI', '6_UoTF7njLM', 'L8NfSewTfxY',
  'n1T6Ve00j24', '8Hk4MmO9ZeQ', 'DWk2mndNTHY', '7AgEjgUtho4', '-uVJlSHueYQ',
  'A5fK2Y8-if8', 'GGlzzLTLzxs', 'SC7GCk1OiVo', 'zJaiTrw-hu8', 'pHI4PBFM0wY',
  'cDLVIoXW-OQ', 'yktqxOHOeR4', 'PIC0Ps_Ci-s', 'ognrhoi0C-w', 'tSzDHVWG1hI',
  'chYx6vVzWVw', 'mpJb9GNxdYI', 'ovKVqo-L2EM', 'NrhP53Divco', 'HGCDMJXS1cc',
  '1R4NGtsj7hw', 'y32sWmu-RI4', 'Jtc3j4ZNZEQ', 'OrWmrQ2wrKU', 'uJbYqm7W_mA',
  'nQAUGxt2qoU', 'FkEbEfHQAZw', 'IFZZAaiatcQ', 'wPWZqewZ4LA', 'ccfq9yW-dYU',
  'oxO1Z5L5S4c', '_8o_BiLAgQM', 'uFbCTidM-xw', 'Xoz_KYfaSkk', 'V4ohRrvu4Ok',
  'KB7GzBv5p4Q', 'mCx5aSEK8YE', 'KtL-SQ20Q0s', 'CO_DAXswOrc', '9JaDBYPmiJ0',
  'gRLdHSabW3o', 'UzYRQURh_pY', 'WYazkpCQNQw', 'aQn7ssqHYp4', 'FeBbjzVOeRU',
  '9H-Ieq6zjIY', 'tcQDnqRakxk', 'Vwxs9YJWsx4', 'CYwEq1GdU4E', 'NoWRBo3Uf8E',
  'bU69doALJGU', 'BTcmvrCTyNg', 'R11tvGM3nDY', 'SksvlZM-5Sk', 'VELNPK0dK84',
  '1YSVEW3i8OQ', 'Kah88N8W5rs', 'bM7bmh955Gs', 'oMrKVEedpHg', '9Om0FMBz1yU',
  'wgwo5hbY7SY', 'yDnxgIRcnso', '-g969furGik', '15jN-KKoSCA', 'eGc35Qj0y4Q',
  'iegMqFnVocA', 'KAIGrGEDm78', 'c2A5XJidIDA', 'AgjdDXofJZ8', 'nhSZ4LhIii8',
  'S4VH8hddg8c', 'zHoWgJD0jw4', 'bio2eP5YXyw', 'VlSNiL_x4mo', '96DGjqlAIxs',
  'KDpm8h8XzC4', 'cXkwFjBrWfk', 'iZdOrqJuPrg', 'SBuZSalHLe0', 'ZP8QyCIUeIA',
  'jIbXtgL0qrg', 'rRiBpNhFgoM', 'M1ELG5Wgtdo', 'SdzMBWT2CDQ', 'J5By-Q4ZhZs',
  '6XVaVITFOgY', 'YuX_R4RGdZw', 'tHTtOJl7ZlI', '0rC-3PyhNnI', 'lvU8fMNVivY',
  'nZ2heJVkawQ', '2JnEq3ZmLH0', 'D7YuI6vOzdY', 'jWi8d3SJYN0', 'sgNZcK8QIyc',
  'QtaorVNAwbI', 'K052tdPqa5U', 'O0UGlA1YVUI', 'DbVI7QnDnjY', 'M6aXSV2HAHo',
  'Ojo_lo0djbQ', 'izwkombjECA', 'IW1hcRXK2yQ', 'iZb0NsF3Xwg'
];

const seedHarryCourse = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/learnsphere');
    console.log('Connected to MongoDB...');

    // 1. Create or Find Teacher: Code with Harry
    let teacher = await User.findOne({ email: 'harry@learnsphere.com' });
    if (!teacher) {
      teacher = await User.create({
        name: 'Code with Harry',
        email: 'harry@learnsphere.com',
        password: 'harrypassword123',
        role: 'teacher',
        isApprovedTeacher: true,
        bio: 'Highly popular developer and educator. Teaching web development and programming to millions of students online.',
      });
      console.log('Created teacher account: Code with Harry');
    } else {
      console.log('Found existing teacher account for Code with Harry');
    }

    // 2. Clear existing course if it exists (so we run clean)
    const existingCourse = await Course.findOne({ title: 'Sigma Web Development Express Course', teacherId: teacher._id });
    if (existingCourse) {
      console.log('Found existing Sigma Web Development course, cleaning it up...');
      const chapters = await Chapter.find({ courseId: existingCourse._id });
      const chapterIds = chapters.map(c => c._id);
      
      await Lecture.deleteMany({ chapterId: { $in: chapterIds } });
      await Chapter.deleteMany({ courseId: existingCourse._id });
      await Enrollment.deleteMany({ courseId: existingCourse._id });
      await Progress.deleteMany({ courseId: existingCourse._id });
      await Course.deleteOne({ _id: existingCourse._id });
      console.log('Cleaned up previous course data.');
    }

    // 3. Create Course
    const course = await Course.create({
      title: 'Sigma Web Development Express Course',
      subtitle: 'Complete Web Development Playlist - 139 Lectures',
      description: 'The ultimate web development course covering frontend, backend, databases, and modern web application scaling. Taught by Code with Harry.',
      category: 'Web Development',
      subcategory: 'Full Stack Development',
      level: 'beginner',
      language: 'English',
      price: 99.99,
      discountedPrice: 49.99,
      discountValidTill: new Date('2028-12-31'),
      status: 'published',
      teacherId: teacher._id,
      ratingsAvg: 4.9,
      ratingsCount: 235,
      tags: ['HTML', 'CSS', 'JavaScript', 'Node.js', 'Express', 'React', 'MongoDB'],
    });
    console.log(`Created course: ${course.title} (ID: ${course._id})`);

    // 4. Define Chapter ranges
    const chapterDefinitions = [
      { title: 'Chapter 1: HTML & CSS Core Basics', range: [1, 20] },
      { title: 'Chapter 2: Modern Responsive Layouts & Projects', range: [21, 40] },
      { title: 'Chapter 3: JavaScript Programming Deep Dive', range: [41, 60] },
      { title: 'Chapter 4: DOM Manipulation & Web APIs', range: [61, 80] },
      { title: 'Chapter 5: Backend Foundations with Node.js', range: [81, 100] },
      { title: 'Chapter 6: Building APIs with Express.js', range: [101, 120] },
      { title: 'Chapter 7: Databases & React Framework Integration', range: [121, 139] }
    ];

    let firstLectureId = null;

    // Create Chapters and Lectures
    for (let cIdx = 0; cIdx < chapterDefinitions.length; cIdx++) {
      const def = chapterDefinitions[cIdx];
      const chapter = await Chapter.create({
        title: def.title,
        order: cIdx + 1,
        courseId: course._id,
      });
      console.log(`- Created Chapter: ${chapter.title}`);

      const start = def.range[0];
      const end = def.range[1];
      let order = 1;

      for (let idx = start; idx <= end; idx++) {
        const videoId = videoIds[idx - 1];
        if (!videoId) continue;

        const lecture = await Lecture.create({
          title: `Lecture ${idx}: Sigma Web Development Module ${idx}`,
          order,
          chapterId: chapter._id,
          youtubeVideoId: videoId,
          duration: 600 + (idx * 5), // dynamic dummy duration
          isPreviewFree: idx === 1,  // make first video free preview
          transcript: `Welcome to Lecture ${idx} of the Sigma Web Development course with Code with Harry. In this tutorial, we will explore core web technologies, learn about clean code practices, and build components. Make sure to check the repository for code snippets.`,
        });

        if (!firstLectureId) {
          firstLectureId = lecture._id;
        }

        order++;
      }
      console.log(`  -> Added lectures for ${chapter.title}`);
    }

    // 5. Auto-enroll Jane Doe and John Doe so they can view/watch it in dashboard
    const students = await User.find({ role: 'student' });
    console.log(`Auto-enrolling ${students.length} students in the Harry course...`);
    for (const student of students) {
      await Enrollment.create({
        studentId: student._id,
        courseId: course._id,
      });

      await Progress.create({
        studentId: student._id,
        courseId: course._id,
        completedLectures: [],
        percentComplete: 0,
        lastAccessedLecture: firstLectureId,
      });
      
      console.log(`- Enrolled: ${student.name} (${student.email})`);
    }

    console.log('Seeding Code with Harry course completed successfully! 🚀');
    process.exit(0);
  } catch (error) {
    console.error(`Seeding Harry course failed: ${error.message}`);
    process.exit(1);
  }
};

seedHarryCourse();
