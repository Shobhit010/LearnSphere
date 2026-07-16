const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Certificate = require('../models/Certificate');
const { uploadToCloudinary } = require('../config/cloudinary');

/**
 * Generates a PDF certificate for a student completing a course, uploads it, and saves it to the DB.
 * @param {Object} student - Student user object
 * @param {Object} course - Course object
 * @returns {Promise<Object>} - Created Certificate model record
 */
const generateCertificate = async (student, course) => {
  // Return existing certificate if already generated
  const existingCert = await Certificate.findOne({
    studentId: student._id,
    courseId: course._id,
  });
  if (existingCert) {
    return existingCert;
  }

  const certificateId = 'LS-' + uuidv4().substring(0, 8).toUpperCase();
  const fileName = `cert-${certificateId}.pdf`;
  
  // Ensure server tmp directory exists
  const tempDir = path.join(__dirname, '../../tmp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempFilePath = path.join(tempDir, fileName);

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape' });
      const stream = fs.createWriteStream(tempFilePath);
      doc.pipe(stream);

      // Design Certificate: Draw Border
      doc.lineWidth(10);
      doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke('#4F46E5'); // indigo-600

      doc.lineWidth(2);
      doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60).stroke('#818CF8'); // indigo-400

      // Add watermark/logo details
      doc.moveDown(4);
      doc.font('Helvetica-Bold').fontSize(42).fillColor('#1E1B4B').text('LEARN SPHERE', { align: 'center' });
      doc.font('Helvetica').fontSize(14).fillColor('#4B5563').text('E-LEARNING VERIFIED PLATFORM', { align: 'center', characterSpacing: 2 });
      
      doc.moveDown(2);
      doc.font('Helvetica-Oblique').fontSize(22).fillColor('#374151').text('Certificate of Course Completion', { align: 'center' });
      
      doc.moveDown(1.5);
      doc.font('Helvetica').fontSize(14).fillColor('#6B7280').text('This is to certify that', { align: 'center' });
      
      doc.moveDown(1);
      doc.font('Helvetica-Bold').fontSize(28).fillColor('#4F46E5').text(student.name, { align: 'center' });
      
      doc.moveDown(1);
      doc.font('Helvetica').fontSize(14).fillColor('#6B7280').text('has successfully completed the curriculum and project requirements for', { align: 'center' });
      
      doc.moveDown(0.8);
      doc.font('Helvetica-Bold').fontSize(20).fillColor('#1F2937').text(`"${course.title}"`, { align: 'center' });
      
      doc.moveDown(3);
      // Footer info
      const yPosition = doc.y;
      
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#374151');
      doc.text('Dr. Sarah Jenkins', 80, yPosition, { width: 200, align: 'center' });
      doc.font('Helvetica').fontSize(10).fillColor('#6B7280');
      doc.text('Lead Platform Instructor', 80, yPosition + 15, { width: 200, align: 'center' });
      
      doc.font('Helvetica-Bold').fontSize(12).fillColor('#374151');
      doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), 560, yPosition, { width: 200, align: 'center' });
      doc.font('Helvetica').fontSize(10).fillColor('#6B7280');
      doc.text('Date of Completion', 560, yPosition + 15, { width: 200, align: 'center' });

      doc.moveDown(3.5);
      doc.font('Helvetica').fontSize(9).fillColor('#9CA3AF').text(`Certificate ID: ${certificateId}  |  Verify online at: /verify-certificate/${certificateId}`, { align: 'center' });

      doc.end();

      stream.on('finish', async () => {
        try {
          // Upload PDF to Cloudinary / Local filesystem
          const uploadResult = await uploadToCloudinary(tempFilePath, 'certificates');

          // Save certificate record to DB
          const certificate = await Certificate.create({
            studentId: student._id,
            courseId: course._id,
            certificateId: certificateId,
            pdfUrl: uploadResult.url,
          });

          // Send notification to student
          const Notification = require('../models/Notification');
          await Notification.create({
            userId: student._id,
            type: 'certificate',
            message: `Congratulations! You earned a completion certificate for "${course.title}".`,
            link: `/verify-certificate/${certificateId}`,
          });

          resolve(certificate);
        } catch (uploadError) {
          reject(uploadError);
        }
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateCertificate,
};
