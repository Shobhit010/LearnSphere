/**
 * Extracts the 11-character YouTube video ID from various YouTube URL formats
 * @param {string} url - YouTube URL
 * @returns {string|null} - YouTube Video ID or null if invalid
 */
const extractYoutubeId = (url) => {
  if (!url) return null;
  
  // If it's already an 11-character ID, return it directly
  if (url.length === 11 && !url.includes('/') && !url.includes('.')) {
    return url;
  }

  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);

  return match && match[2].length === 11 ? match[2] : null;
};

module.exports = {
  extractYoutubeId,
};
