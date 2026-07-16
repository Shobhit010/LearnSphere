const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: [true, 'Please select a rating between 1 and 5'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating must be at most 5'],
    },
    comment: {
      type: String,
      trim: true,
      default: '',
    },
    teacherReply: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure a student can only submit one review per course
reviewSchema.index({ courseId: 1, studentId: 1 }, { unique: true });

// Static method to calculate average rating and ratings count
reviewSchema.statics.calculateAverageRating = async function (courseId) {
  const stats = await this.aggregate([
    {
      $match: { courseId: courseId },
    },
    {
      $group: {
        _id: '$courseId',
        ratingsAvg: { $avg: '$rating' },
        ratingsCount: { $sum: 1 },
      },
    },
  ]);

  try {
    if (stats.length > 0) {
      await mongoose.model('Course').findByIdAndUpdate(courseId, {
        ratingsAvg: stats[0].ratingsAvg,
        ratingsCount: stats[0].ratingsCount,
      });
    } else {
      await mongoose.model('Course').findByIdAndUpdate(courseId, {
        ratingsAvg: 0,
        ratingsCount: 0,
      });
    }
  } catch (err) {
    console.error('Error updating average rating:', err);
  }
};

// Call calculateAverageRating after save
reviewSchema.post('save', async function () {
  await this.constructor.calculateAverageRating(this.courseId);
});

// Call calculateAverageRating after delete
reviewSchema.post('deleteOne', { document: true, query: false }, async function () {
  await this.constructor.calculateAverageRating(this.courseId);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
