const expressAsyncHandler = require('express-async-handler');
const Certificate = require('../models/Certificate');
const AppError = require('../utils/AppError');

// @desc    Verify a certificate by certificate ID (Public)
// @route   GET /api/v1/certificates/verify/:certificateId
// @access  Public
const verifyCertificate = expressAsyncHandler(async (req, res, next) => {
  const certificate = await Certificate.findOne({
    certificateId: req.params.certificateId,
  })
    .populate('studentId', 'name email avatar')
    .populate('courseId', 'title category ratingsAvg');

  if (!certificate) {
    return next(new AppError('Certificate not found or invalid ID', 404));
  }

  res.status(200).json({
    success: true,
    data: certificate,
    message: 'Certificate is valid and verified',
  });
});

module.exports = {
  verifyCertificate,
};
