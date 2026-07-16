const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Check if credentials are set and are not the default mock placeholders
const isCloudinaryConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloudinary_cloud_name' &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'mock_cloudinary' &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_KEY !== 'your_cloudinary_api_key' &&
  process.env.CLOUDINARY_API_KEY !== 'mock_key' &&
  process.env.CLOUDINARY_API_SECRET;

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('Cloudinary service initialized successfully.');
} else {
  console.log('Using local file system fallback for uploads (Cloudinary keys missing or mock).');
}

/**
 * Uploads a local file to Cloudinary or falls back to returning the local path
 * @param {string} filePath - Absolute path to local file
 * @param {string} folder - Folder name in Cloudinary
 * @returns {Promise<{url: string, public_id: string}>}
 */
const uploadToCloudinary = async (filePath, folder = 'learnsphere') => {
  if (isCloudinaryConfigured) {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: folder,
        resource_type: 'auto',
      });
      // Delete temporary local file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return {
        url: result.secure_url,
        public_id: result.public_id,
      };
    } catch (error) {
      console.error('Cloudinary upload error, falling back to local file link:', error.message);
      // Fallback below
    }
  }

  // Fallback: copy file to public uploads directory if it's not already there, and return static path
  const fileName = path.basename(filePath);
  const publicDir = path.join(__dirname, '../../public/uploads');

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const destPath = path.join(publicDir, fileName);
  if (filePath !== destPath && fs.existsSync(filePath)) {
    fs.copyFileSync(filePath, destPath);
    fs.unlinkSync(filePath); // delete temp file
  }

  // Return a relative link that our server will serve statically
  const fileUrl = `/uploads/${fileName}`;
  return {
    url: fileUrl,
    public_id: fileName,
  };
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  isCloudinaryConfigured,
};
