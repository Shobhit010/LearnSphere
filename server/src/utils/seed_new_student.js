require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const seedNewStudent = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/learnsphere');
    console.log('Connected to MongoDB...');

    const email = 'jane.doe@learnsphere.com';
    const password = 'studentpassword123';

    // Check if student already exists
    let student = await User.findOne({ email });
    if (student) {
      console.log(`Student with email ${email} already exists.`);
    } else {
      student = await User.create({
        name: 'Jane Doe',
        email,
        password,
        role: 'student',
        bio: 'Aspiring computer scientist and full-stack web developer.',
      });
      console.log(`Successfully seeded new student:`);
      console.log(`- Email: ${email}`);
      console.log(`- Password: ${password}`);
    }
    process.exit(0);
  } catch (error) {
    console.error(`Error seeding new student: ${error.message}`);
    process.exit(1);
  }
};

seedNewStudent();
