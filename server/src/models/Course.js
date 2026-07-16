const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a course title'],
      trim: true,
      index: true,
    },
    subtitle: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide a course description'],
    },
    thumbnail: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Please select a category'],
      trim: true,
      index: true,
    },
    subcategory: {
      type: String,
      trim: true,
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    language: {
      type: String,
      default: 'English',
    },
    price: {
      type: Number,
      required: [true, 'Please set a course price'],
      default: 0,
      min: [0, 'Price cannot be negative'],
    },
    discountedPrice: {
      type: Number,
      min: [0, 'Discounted price cannot be negative'],
    },
    discountValidTill: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'published', 'rejected'],
      default: 'draft',
      index: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ratingsAvg: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot be more than 5'],
      set: (val) => Math.round(val * 10) / 10, // Round to 1 decimal place
    },
    ratingsCount: {
      type: Number,
      default: 0,
    },
    enrollmentCount: {
      type: Number,
      default: 0,
    },
    tags: {
      type: [String],
      default: [],
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for efficient searching and filtering
courseSchema.index({ category: 1, status: 1 });
courseSchema.index({ teacherId: 1, status: 1 });

// Full-text index on title, subtitle, description, and tags for course search
courseSchema.index({
  title: 'text',
  subtitle: 'text',
  description: 'text',
  tags: 'text',
}, {
  weights: {
    title: 10,
    subtitle: 5,
    tags: 3,
    description: 1
  },
  name: 'CourseTextIndex'
});

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;
