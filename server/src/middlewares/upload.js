const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure temporary upload directory exists
const tempDir = path.join(__dirname, '../../tmp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Set up disk storage for temporary holding of files before cloud upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter validator
const fileFilter = (req, file, cb) => {
  const allowedExtensions = [
    '.pdf',
    '.ppt',
    '.pptx',
    '.zip',
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
  ];
  const fileExt = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed files: PDF, PPT, PPTX, ZIP, JPG, PNG, WEBP.`
      ),
      false
    );
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

module.exports = upload;
