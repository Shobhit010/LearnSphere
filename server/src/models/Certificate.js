const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    certificateId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    pdfUrl: {
      type: String,
      required: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index so a student gets only one certificate per course
certificateSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

const Certificate = mongoose.model('Certificate', certificateSchema);

module.exports = Certificate;
